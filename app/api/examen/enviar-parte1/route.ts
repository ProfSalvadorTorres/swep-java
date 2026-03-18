import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { alumno_id, respuestas } = await req.json();
    // respuestas: { [examen_id]: 'a'|'b'|'c'|'d' }

    if (!alumno_id) return NextResponse.json({ error: 'alumno_id requerido.' }, { status: 400 });

    // Verificar que el alumno puede enviar (no enviado ya)
    const { data: alumno } = await supabaseAdmin
      .from('alumnos').select('estado').eq('id', alumno_id).single();

    if (!alumno || alumno.estado === 'parte1_enviada' || alumno.estado === 'finalizado') {
      return NextResponse.json({ error: 'La Parte I ya fue enviada.' }, { status: 409 });
    }

    // Obtener las respuestas correctas para las preguntas del alumno
    const { data: examData, error: errExam } = await supabaseAdmin
      .from('examenes_alumno')
      .select('id, pregunta_id, preguntas(respuesta_correcta)')
      .eq('alumno_id', alumno_id);

    if (errExam || !examData) throw errExam;

    // Calificar y actualizar cada fila
    let correctas = 0;
    const updates = examData.map((row: any) => {
      const respAlumno = respuestas[row.id] ?? null;
      const esCorrecta = respAlumno === row.preguntas.respuesta_correcta;
      if (esCorrecta) correctas++;
      return {
        id: row.id,
        respuesta_alumno: respAlumno,
        es_correcta: respAlumno ? esCorrecta : false,
      };
    });

    // Upsert en batch
    const { error: errUp } = await supabaseAdmin
      .from('examenes_alumno')
      .upsert(updates, { onConflict: 'id' });

    if (errUp) throw errUp;

    // Calificación Parte I sobre 5.0
    const calif = parseFloat(((correctas / 40) * 5).toFixed(2));

    // Actualizar resultados
    await supabaseAdmin
      .from('resultados')
      .update({
        parte1_correctas:    correctas,
        parte1_total:        40,
        parte1_calificacion: calif,
      })
      .eq('alumno_id', alumno_id);

    // Actualizar estado alumno
    await supabaseAdmin
      .from('alumnos')
      .update({ estado: 'parte1_enviada' })
      .eq('id', alumno_id);

    return NextResponse.json({ correctas, total: 40, calificacion: calif });
  } catch (err) {
    console.error('[enviar-parte1]', err);
    return NextResponse.json({ error: 'Error al calificar la Parte I.' }, { status: 500 });
  }
}
