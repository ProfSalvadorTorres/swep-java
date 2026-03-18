import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  // ── Paso 0: leer el body ──
  let body: { alumno_id?: string; respuestas?: Record<string, string> };
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json(
      { error: 'Body JSON inválido.', detalle: String(e) },
      { status: 400 }
    );
  }

  const { alumno_id, respuestas } = body;
  if (!alumno_id) {
    return NextResponse.json({ error: 'alumno_id requerido.' }, { status: 400 });
  }
  if (!respuestas || typeof respuestas !== 'object') {
    return NextResponse.json({ error: 'respuestas requerido (objeto).', detalle: typeof respuestas }, { status: 400 });
  }

  try {
    // ── Paso 1: verificar alumno ──
    const { data: alumno, error: errAlumno } = await supabaseAdmin
      .from('alumnos')
      .select('id, estado')
      .eq('id', alumno_id)
      .single();

    if (errAlumno) {
      return NextResponse.json(
        { error: 'Error al buscar alumno.', detalle: errAlumno.message, code: errAlumno.code },
        { status: 500 }
      );
    }
    if (!alumno) {
      return NextResponse.json({ error: 'Alumno no encontrado.' }, { status: 404 });
    }
    if (alumno.estado === 'parte1_enviada' || alumno.estado === 'finalizado') {
      return NextResponse.json({ error: 'La Parte I ya fue enviada anteriormente.' }, { status: 409 });
    }

    // ── Paso 2: obtener preguntas asignadas ──
    const { data: examData, error: errExam } = await supabaseAdmin
      .from('examenes_alumno')
      .select('id, pregunta_id')
      .eq('alumno_id', alumno_id);

    if (errExam) {
      return NextResponse.json(
        { error: 'Error al obtener examen.', detalle: errExam.message, code: errExam.code },
        { status: 500 }
      );
    }
    if (!examData || examData.length === 0) {
      return NextResponse.json(
        { error: 'No tienes preguntas asignadas. ¿Generaste tu examen?', filas: 0 },
        { status: 404 }
      );
    }

    // ── Paso 3: obtener respuestas correctas ──
    const preguntaIds = examData.map((r) => r.pregunta_id);
    const { data: preguntasData, error: errPreg } = await supabaseAdmin
      .from('preguntas')
      .select('id, respuesta_correcta')
      .in('id', preguntaIds);

    if (errPreg) {
      return NextResponse.json(
        { error: 'Error al obtener respuestas correctas.', detalle: errPreg.message },
        { status: 500 }
      );
    }
    if (!preguntasData || preguntasData.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron preguntas en el banco.', preguntaIds: preguntaIds.slice(0, 5) },
        { status: 500 }
      );
    }

    // Mapa: pregunta_id → respuesta correcta (trim por si CHAR tiene espacios)
    const mapaCorrectas: Record<number, string> = {};
    for (const p of preguntasData) {
      mapaCorrectas[p.id] = typeof p.respuesta_correcta === 'string'
        ? p.respuesta_correcta.trim().toLowerCase()
        : '';
    }

    // ── Paso 4: calificar ──
    let correctas = 0;
    const totalPreguntas = examData.length;
    const erroresUpdate: string[] = [];

    for (const row of examData) {
      // Las keys de respuestas siempre son strings en JSON
      const respAlumno = respuestas[String(row.id)] ?? null;
      const correcta = mapaCorrectas[row.pregunta_id] ?? '';
      const respTrimmed = respAlumno ? respAlumno.trim().toLowerCase() : '';
      const esCorrecta = respTrimmed !== '' && respTrimmed === correcta;
      if (esCorrecta) correctas++;

      // Actualizar fila en examenes_alumno
      const { error: errUpd } = await supabaseAdmin
        .from('examenes_alumno')
        .update({
          respuesta_alumno: respAlumno,
          es_correcta: esCorrecta,
        })
        .eq('id', row.id);

      if (errUpd) {
        erroresUpdate.push(`fila ${row.id}: ${errUpd.message}`);
      }
    }

    // ── Paso 5: calcular calificación sobre 5.0 ──
    const calif = parseFloat(((correctas / totalPreguntas) * 5).toFixed(2));

    // ── Paso 6: actualizar tabla resultados ──
    const { error: errRes } = await supabaseAdmin
      .from('resultados')
      .update({
        parte1_correctas: correctas,
        parte1_total: totalPreguntas,
        parte1_calificacion: calif,
      })
      .eq('alumno_id', alumno_id);

    if (errRes) {
      console.error('[enviar-parte1] error resultados:', errRes);
      // No fallar aquí, la calificación ya se calculó
    }

    // ── Paso 7: actualizar estado del alumno ──
    const { error: errEst } = await supabaseAdmin
      .from('alumnos')
      .update({ estado: 'parte1_enviada' })
      .eq('id', alumno_id);

    if (errEst) {
      console.error('[enviar-parte1] error estado:', errEst);
    }

    return NextResponse.json({
      correctas,
      total: totalPreguntas,
      calificacion: calif,
      ...(erroresUpdate.length > 0 ? { advertencias: erroresUpdate.length } : {}),
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : '';
    console.error('[enviar-parte1] error general:', msg, stack);
    return NextResponse.json(
      { error: 'Error interno al calificar.', detalle: msg },
      { status: 500 }
    );
  }
}
