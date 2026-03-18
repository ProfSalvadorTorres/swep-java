import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { evaluarCodigoJava, checklistACalificacion } from '@/lib/evaluador';
import { enviarResultadosAlumno } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const formData        = await req.formData();
    const alumnoId        = formData.get('alumno_id') as string;
    const archivoJava     = formData.get('archivo_java') as File;
    const archivoEvidencia= formData.get('archivo_evidencia') as File;

    if (!alumnoId || !archivoJava || !archivoEvidencia) {
      return NextResponse.json({ error: 'Faltan archivos obligatorios.' }, { status: 400 });
    }

    // Verificar que puede finalizar
    const { data: alumno } = await supabaseAdmin
      .from('alumnos')
      .select('nombre, email, grupo, estado')
      .eq('id', alumnoId)
      .single();

    if (!alumno) return NextResponse.json({ error: 'Alumno no encontrado.' }, { status: 404 });
    if (alumno.estado === 'finalizado') {
      return NextResponse.json({ error: 'El examen ya fue finalizado.' }, { status: 409 });
    }

    // ─── 1. Subir archivos a Supabase Storage ──────────────────────
    const javaBytes = await archivoJava.arrayBuffer();
    const evidBytes = await archivoEvidencia.arrayBuffer();

    const javaPath = `${alumnoId}/${archivoJava.name}`;
    const evidPath = `${alumnoId}/${archivoEvidencia.name}`;

    const { error: errJava } = await supabaseAdmin.storage
      .from('evidencias-examen')
      .upload(javaPath, javaBytes, { contentType: 'text/x-java-source', upsert: true });
    if (errJava) throw errJava;

    const { error: errEvid } = await supabaseAdmin.storage
      .from('evidencias-examen')
      .upload(evidPath, evidBytes, { contentType: archivoEvidencia.type, upsert: true });
    if (errEvid) throw errEvid;

    // URLs públicas (firmadas, 7 días)
    const { data: urlJava } = await supabaseAdmin.storage
      .from('evidencias-examen').createSignedUrl(javaPath, 604800);
    const { data: urlEvid } = await supabaseAdmin.storage
      .from('evidencias-examen').createSignedUrl(evidPath, 604800);

    // ─── 2. Evaluar código Java automáticamente ─────────────────────
    const codigoTexto = new TextDecoder().decode(javaBytes);
    const checklist   = evaluarCodigoJava(codigoTexto);
    const califPartII = checklistACalificacion(checklist);

    // ─── 3. Obtener calificación Parte I ────────────────────────────
    const { data: resultado } = await supabaseAdmin
      .from('resultados')
      .select('parte1_calificacion, tema_parte2')
      .eq('alumno_id', alumnoId)
      .single();

    const calif1     = resultado?.parte1_calificacion ?? 0;
    const califFinal = parseFloat((calif1 + califPartII).toFixed(2));
    const temaParte2 = resultado?.tema_parte2 ?? '';

    // ─── 4. Actualizar resultados en DB ─────────────────────────────
    await supabaseAdmin
      .from('resultados')
      .update({
        parte2_calificacion: califPartII,
        parte2_checklist:    checklist,
        calificacion_final:  califFinal,
        url_codigo_java:     urlJava?.signedUrl ?? null,
        url_evidencia:       urlEvid?.signedUrl ?? null,
        updated_at:          new Date().toISOString(),
      })
      .eq('alumno_id', alumnoId);

    // Actualizar estado y fecha fin del alumno
    await supabaseAdmin
      .from('alumnos')
      .update({ estado: 'finalizado', fecha_fin: new Date().toISOString() })
      .eq('id', alumnoId);

    // ─── 5. Obtener preguntas con respuestas para el email ──────────
    const { data: examData } = await supabaseAdmin
      .from('examenes_alumno')
      .select(`
        id, orden, respuesta_alumno, es_correcta,
        preguntas(pregunta, opcion_a, opcion_b, opcion_c, opcion_d,
                  respuesta_correcta, justificacion)
      `)
      .eq('alumno_id', alumnoId)
      .order('orden');

    const preguntasParaEmail = (examData ?? []).map((row: any) => ({
      orden:             row.orden,
      pregunta:          row.preguntas.pregunta,
      opcion_a:          row.preguntas.opcion_a,
      opcion_b:          row.preguntas.opcion_b,
      opcion_c:          row.preguntas.opcion_c,
      opcion_d:          row.preguntas.opcion_d,
      respuesta_alumno:  row.respuesta_alumno,
      respuesta_correcta:row.preguntas.respuesta_correcta,
      es_correcta:       row.es_correcta,
      justificacion:     row.preguntas.justificacion,
    }));

    // ─── 6. Enviar correo al alumno (con CC al profesor) ────────────
    await enviarResultadosAlumno({
      emailAlumno:    alumno.email,
      nombreAlumno:   alumno.nombre,
      grupo:          alumno.grupo,
      parte1Correctas: resultado?.parte1_calificacion
        ? Math.round((resultado.parte1_calificacion / 5) * 40) : 0,
      parte1Total:    40,
      parte1Calif:    calif1,
      parte2Calif:    califPartII,
      califFinal,
      checklist,
      temaParteII:    temaParte2,
      preguntasConRespuestas: preguntasParaEmail,
    });

    return NextResponse.json({
      success: true,
      calificacion_final: califFinal,
      parte1: calif1,
      parte2: califPartII,
    });
  } catch (err) {
    console.error('[finalizar-examen]', err);
    return NextResponse.json({ error: 'Error al finalizar el examen.' }, { status: 500 });
  }
}
