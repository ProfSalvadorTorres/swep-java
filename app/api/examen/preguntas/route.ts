import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const alumnoId = req.nextUrl.searchParams.get('alumno_id');
  if (!alumnoId) return NextResponse.json({ error: 'alumno_id requerido.' }, { status: 400 });

  try {
    // Obtener preguntas del examen con join a la tabla preguntas
    const { data, error } = await supabaseAdmin
      .from('examenes_alumno')
      .select(`
        id,
        orden,
        respuesta_alumno,
        preguntas (
          id,
          pregunta,
          opcion_a,
          opcion_b,
          opcion_c,
          opcion_d,
          tema
        )
      `)
      .eq('alumno_id', alumnoId)
      .order('orden', { ascending: true });

    if (error) throw error;

    // Formatear para el cliente (NO incluir respuesta_correcta)
    const preguntas = data.map((row: any) => ({
      examen_id: row.id,
      orden:     row.orden,
      pregunta:  row.preguntas.pregunta,
      opcion_a:  row.preguntas.opcion_a,
      opcion_b:  row.preguntas.opcion_b,
      opcion_c:  row.preguntas.opcion_c,
      opcion_d:  row.preguntas.opcion_d,
      tema:      row.preguntas.tema,
      respuesta_alumno: row.respuesta_alumno,
    }));

    return NextResponse.json({ preguntas });
  } catch (err) {
    console.error('[preguntas]', err);
    return NextResponse.json({ error: 'Error al obtener preguntas.' }, { status: 500 });
  }
}
