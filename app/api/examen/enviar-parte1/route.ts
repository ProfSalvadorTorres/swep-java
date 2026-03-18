import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { alumno_id, respuestas } = await req.json();
    // respuestas: { [examen_id]: 'a'|'b'|'c'|'d' }

    if (!alumno_id) return NextResponse.json({ error: 'alumno_id requerido.' }, { status: 400 });

    // Verificar que el alumno puede enviar (no enviado ya)
    const { data: alumno, error: errAlumno } = await supabaseAdmin
      .from('alumnos').select('estado').eq('id', alumno_id).single();

    if (errAlumno || !alumno) {
      console.error('[enviar-parte1] alumno no encontrado:', errAlumno);
      return NextResponse.json({ error: 'Alumno no encontrado.' }, { status: 404 });
    }

    if (alumno.estado === 'parte1_enviada' || alumno.estado === 'finalizado') {
      return NextResponse.json({ error: 'La Parte I ya fue enviada.' }, { status: 409 });
    }

    // ── Paso 1: obtener las preguntas asignadas al alumno ──
    const { data: examData, error: errExam } = await supabaseAdmin
      .from('examenes_alumno')
      .select('id, pregunta_id')
      .eq('alumno_id', alumno_id);

    if (errExam || !examData || examData.length === 0) {
      console.error('[enviar-parte1] examData error:', errExam, 'filas:', examData?.length);
      return NextResponse.json({ error: 'No se encontraron preguntas del examen.' }, { status: 404 });
    }

    // ── Paso 2: obtener las respuestas correctas de la tabla preguntas ──
    const preguntaIds = examData.map((row: { pregunta_id: number }) => row.pregunta_id);
    const { data: preguntasData, error: errPreg } = await supabaseAdmin
      .from('preguntas')
      .select('id, respuesta_correcta')
      .in('id', preguntaIds);

    if (errPreg || !preguntasData) {
      console.error('[enviar-parte1] preguntas error:', errPreg);
      return NextResponse.json({ error: 'Error al obtener respuestas correctas.' }, { status: 500 });
    }

    // Crear mapa de pregunta_id → respuesta_correcta (trimmed por si CHAR tiene espacios)
    const mapaCorrectas: Record<number, string> = {};
    preguntasData.forEach((p: { id: number; respuesta_correcta: string }) => {
      mapaCorrectas[p.id] = p.respuesta_correcta.trim();
    });

    // ── Paso 3: calificar cada pregunta ──
    let correctas = 0;
    const totalPreguntas = examData.length;

    const updates = examData.map((row: { id: number; pregunta_id: number }) => {
      const respAlumno = respuestas[String(row.id)] ?? respuestas[row.id] ?? null;
      const correcta = mapaCorrectas[row.pregunta_id];
      const esCorrecta = respAlumno != null && correcta != null && respAlumno.trim() === correcta;
      if (esCorrecta) correctas++;
      return {
        id: row.id,
        respuesta_alumno: respAlumno,
        es_correcta: respAlumno ? esCorrecta : false,
      };
    });

    // ── Paso 4: guardar calificaciones por pregunta ──
    // Actualizar una por una para evitar problemas con upsert y columnas NOT NULL
    for (const upd of updates) {
      const { error: errUpd } = await supabaseAdmin
        .from('examenes_alumno')
        .update({
          respuesta_alumno: upd.respuesta_alumno,
          es_correcta: upd.es_correcta,
        })
        .eq('id', upd.id);

      if (errUpd) {
        console.error('[enviar-parte1] error actualizando fila', upd.id, errUpd);
      }
    }

    // ── Paso 5: calcular calificación Parte I sobre 5.0 ──
    const calif = parseFloat(((correctas / totalPreguntas) * 5).toFixed(2));

    // ── Paso 6: actualizar resultados ──
    const { error: errRes } = await supabaseAdmin
      .from('resultados')
      .update({
        parte1_correctas:    correctas,
        parte1_total:        totalPreguntas,
        parte1_calificacion: calif,
      })
      .eq('alumno_id', alumno_id);

    if (errRes) console.error('[enviar-parte1] error resultados:', errRes);

    // ── Paso 7: actualizar estado alumno ──
    const { error: errEst } = await supabaseAdmin
      .from('alumnos')
      .update({ estado: 'parte1_enviada' })
      .eq('id', alumno_id);

    if (errEst) console.error('[enviar-parte1] error estado:', errEst);

    return NextResponse.json({ correctas, total: totalPreguntas, calificacion: calif });
  } catch (err) {
    console.error('[enviar-parte1] error general:', err);
    return NextResponse.json({ error: 'Error al calificar la Parte I.' }, { status: 500 });
  }
}
