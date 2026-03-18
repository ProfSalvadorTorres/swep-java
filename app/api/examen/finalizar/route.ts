import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { evaluarCodigoJava, checklistACalificacion } from '@/lib/evaluador';
import { enviarResultadosAlumno } from '@/lib/email';

export async function POST(req: NextRequest) {
  // ── Paso 0: leer FormData ──
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (e) {
    return NextResponse.json(
      { error: 'Error leyendo FormData.', detalle: String(e) },
      { status: 400 }
    );
  }

  const alumnoId         = formData.get('alumno_id') as string;
  const sinArchivos      = formData.get('sin_archivos') === 'true';
  const archivoJava      = formData.get('archivo_java') as File | null;
  const archivoEvidencia = formData.get('archivo_evidencia') as File | null;

  if (!alumnoId) {
    return NextResponse.json({ error: 'alumno_id requerido.' }, { status: 400 });
  }
  if (!sinArchivos && (!archivoJava || !archivoEvidencia)) {
    return NextResponse.json({
      error: 'Faltan archivos obligatorios.',
      detalle: `java: ${!!archivoJava}, evidencia: ${!!archivoEvidencia}`,
    }, { status: 400 });
  }

  try {
    // ── Paso 1: verificar alumno ──
    const { data: alumno, error: errAlumno } = await supabaseAdmin
      .from('alumnos')
      .select('nombre, email, grupo, estado')
      .eq('id', alumnoId)
      .single();

    if (errAlumno || !alumno) {
      return NextResponse.json(
        { error: 'Alumno no encontrado.', detalle: errAlumno?.message },
        { status: 404 }
      );
    }
    if (alumno.estado === 'finalizado') {
      return NextResponse.json({ error: 'El examen ya fue finalizado.' }, { status: 409 });
    }

    // ── Paso 2-4: archivos y evaluación (solo si hay archivos) ──
    let urlJavaFinal: string | null = null;
    let urlEvidFinal: string | null = null;
    let checklist = null;
    let califPartII = 0;

    if (!sinArchivos && archivoJava && archivoEvidencia) {
      // Leer archivos
      let javaBytes: ArrayBuffer;
      let evidBytes: ArrayBuffer;
      try {
        javaBytes = await archivoJava.arrayBuffer();
        evidBytes = await archivoEvidencia.arrayBuffer();
      } catch (e) {
        return NextResponse.json(
          { error: 'Error leyendo archivos subidos.', detalle: String(e) },
          { status: 400 }
        );
      }

      // Subir a Supabase Storage
      const javaPath = `${alumnoId}/${archivoJava.name}`;
      const evidPath = `${alumnoId}/${archivoEvidencia.name}`;

      try {
        const { error: errJava } = await supabaseAdmin.storage
          .from('evidencias-examen')
          .upload(javaPath, javaBytes, { contentType: 'text/x-java-source', upsert: true });

        if (errJava) {
          console.error('[finalizar] error subiendo .java:', errJava);
          if (errJava.message?.includes('not found') || errJava.message?.includes('Bucket')) {
            try {
              await supabaseAdmin.storage.createBucket('evidencias-examen', { public: false });
              await supabaseAdmin.storage
                .from('evidencias-examen')
                .upload(javaPath, javaBytes, { contentType: 'text/x-java-source', upsert: true });
            } catch (bucketErr) {
              console.error('[finalizar] error creando bucket:', bucketErr);
            }
          }
        }

        const { error: errEvid } = await supabaseAdmin.storage
          .from('evidencias-examen')
          .upload(evidPath, evidBytes, { contentType: archivoEvidencia.type, upsert: true });

        if (errEvid) console.error('[finalizar] error subiendo evidencia:', errEvid);

        const { data: urlJava } = await supabaseAdmin.storage
          .from('evidencias-examen').createSignedUrl(javaPath, 604800);
        const { data: urlEvid } = await supabaseAdmin.storage
          .from('evidencias-examen').createSignedUrl(evidPath, 604800);

        urlJavaFinal = urlJava?.signedUrl ?? null;
        urlEvidFinal = urlEvid?.signedUrl ?? null;
      } catch (storageErr) {
        console.error('[finalizar] error de storage (continuando):', storageErr);
      }

      // Evaluar código Java automáticamente
      try {
        const codigoTexto = new TextDecoder().decode(javaBytes);
        checklist   = evaluarCodigoJava(codigoTexto);
        califPartII = checklistACalificacion(checklist);
      } catch (evalErr) {
        console.error('[finalizar] error evaluando código:', evalErr);
      }
    }
    // Si sinArchivos === true, califPartII queda en 0

    // ── Paso 5: obtener calificación Parte I ──
    const { data: resultado, error: errRes } = await supabaseAdmin
      .from('resultados')
      .select('parte1_calificacion, tema_parte2')
      .eq('alumno_id', alumnoId)
      .single();

    if (errRes) {
      console.error('[finalizar] error obteniendo resultados:', errRes);
    }

    const calif1     = resultado?.parte1_calificacion ?? 0;
    const califNum1  = typeof calif1 === 'string' ? parseFloat(calif1) : calif1;
    const califFinal = parseFloat((califNum1 + califPartII).toFixed(2));
    const temaParte2 = resultado?.tema_parte2 ?? '';

    // ── Paso 6: actualizar resultados en DB ──
    const { error: errUpdRes } = await supabaseAdmin
      .from('resultados')
      .update({
        parte2_calificacion: califPartII,
        parte2_checklist:    checklist,
        calificacion_final:  califFinal,
        url_codigo_java:     urlJavaFinal,
        url_evidencia:       urlEvidFinal,
        updated_at:          new Date().toISOString(),
      })
      .eq('alumno_id', alumnoId);

    if (errUpdRes) console.error('[finalizar] error actualizando resultados:', errUpdRes);

    // ── Paso 7: actualizar estado del alumno ──
    const { error: errEst } = await supabaseAdmin
      .from('alumnos')
      .update({ estado: 'finalizado', fecha_fin: new Date().toISOString() })
      .eq('id', alumnoId);

    if (errEst) console.error('[finalizar] error actualizando estado:', errEst);

    // ── Paso 8: obtener preguntas para el email (sin relación embebida) ──
    let preguntasParaEmail: {
      orden: number;
      pregunta: string;
      opcion_a: string; opcion_b: string;
      opcion_c: string; opcion_d: string;
      respuesta_alumno: string | null;
      respuesta_correcta: string;
      es_correcta: boolean | null;
      justificacion: string;
    }[] = [];

    try {
      // Query 1: datos del examen del alumno
      const { data: examData } = await supabaseAdmin
        .from('examenes_alumno')
        .select('id, pregunta_id, orden, respuesta_alumno, es_correcta')
        .eq('alumno_id', alumnoId)
        .order('orden');

      if (examData && examData.length > 0) {
        // Query 2: datos de las preguntas
        const pregIds = examData.map(r => r.pregunta_id);
        const { data: pregData } = await supabaseAdmin
          .from('preguntas')
          .select('id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, justificacion')
          .in('id', pregIds);

        if (pregData) {
          const mapaPreg: Record<number, typeof pregData[0]> = {};
          for (const p of pregData) {
            mapaPreg[p.id] = p;
          }

          preguntasParaEmail = examData.map(row => {
            const preg = mapaPreg[row.pregunta_id];
            return {
              orden:              row.orden,
              pregunta:           preg?.pregunta ?? '(pregunta no encontrada)',
              opcion_a:           preg?.opcion_a ?? '',
              opcion_b:           preg?.opcion_b ?? '',
              opcion_c:           preg?.opcion_c ?? '',
              opcion_d:           preg?.opcion_d ?? '',
              respuesta_alumno:   row.respuesta_alumno,
              respuesta_correcta: (preg?.respuesta_correcta ?? '').trim(),
              es_correcta:        row.es_correcta,
              justificacion:      preg?.justificacion ?? '',
            };
          });
        }
      }
    } catch (pregErr) {
      console.error('[finalizar] error construyendo preguntas para email:', pregErr);
      // Continuar sin preguntas en el email
    }

    // ── Paso 9: enviar email (no bloquear si falla) ──
    let emailEnviado = false;
    try {
      await enviarResultadosAlumno({
        emailAlumno:    alumno.email,
        nombreAlumno:   alumno.nombre,
        grupo:          alumno.grupo,
        parte1Correctas: resultado?.parte1_calificacion
          ? Math.round((califNum1 / 5) * 40) : 0,
        parte1Total:    40,
        parte1Calif:    califNum1,
        parte2Calif:    califPartII,
        califFinal,
        checklist,
        temaParteII:    temaParte2,
        preguntasConRespuestas: preguntasParaEmail,
      });
      emailEnviado = true;
    } catch (emailErr) {
      console.error('[finalizar] error enviando email (no crítico):', emailErr);
      // El email falló pero el examen ya se guardó — NO fallar
    }

    return NextResponse.json({
      success: true,
      calificacion_final: califFinal,
      parte1: califNum1,
      parte2: califPartII,
      email_enviado: emailEnviado,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack?.slice(0, 300) : '';
    console.error('[finalizar] error general:', msg, stack);
    return NextResponse.json(
      { error: 'Error al finalizar el examen.', detalle: msg },
      { status: 500 }
    );
  }
}
