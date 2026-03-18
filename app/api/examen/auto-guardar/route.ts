import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Guarda respuestas parciales en la BD cada X segundos
export async function POST(req: NextRequest) {
  try {
    const { alumno_id, respuestas } = await req.json();
    // respuestas: { [examen_id]: 'a'|'b'|'c'|'d' }

    if (!alumno_id || !respuestas) {
      return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
    }

    // Verificar que el alumno no haya enviado ya la Parte I
    const { data: alumno } = await supabaseAdmin
      .from('alumnos')
      .select('estado')
      .eq('id', alumno_id)
      .single();

    if (!alumno || alumno.estado === 'parte1_enviada' || alumno.estado === 'finalizado') {
      return NextResponse.json({ error: 'Parte I ya enviada.' }, { status: 409 });
    }

    // Guardar cada respuesta con UPDATE individual (no upsert)
    const entries = Object.entries(respuestas);
    if (entries.length === 0) {
      return NextResponse.json({ guardadas: 0 });
    }

    let guardadas = 0;
    for (const [examenId, resp] of entries) {
      const { error } = await supabaseAdmin
        .from('examenes_alumno')
        .update({ respuesta_alumno: resp as string })
        .eq('id', parseInt(examenId));

      if (!error) guardadas++;
    }

    return NextResponse.json({ guardadas, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[auto-guardar]', err);
    return NextResponse.json({ error: 'Error al guardar.' }, { status: 500 });
  }
}
