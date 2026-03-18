import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { seleccionarTemaAleatorio } from '@/lib/evaluador';

export async function POST(req: NextRequest) {
  try {
    const { alumno_id } = await req.json();
    if (!alumno_id) return NextResponse.json({ error: 'alumno_id requerido.' }, { status: 400 });

    // Verificar que el alumno existe y no tiene examen generado
    const { data: alumno } = await supabaseAdmin
      .from('alumnos')
      .select('id, estado')
      .eq('id', alumno_id)
      .single();

    if (!alumno) return NextResponse.json({ error: 'Alumno no encontrado.' }, { status: 404 });
    if (alumno.estado !== 'registrado') {
      return NextResponse.json({ error: 'Ya tienes un examen activo.' }, { status: 409 });
    }

    // Seleccionar 40 preguntas aleatorias sin repetición
    const { data: todasPreguntas, error: errPreg } = await supabaseAdmin
      .from('preguntas')
      .select('id');

    if (errPreg || !todasPreguntas) throw errPreg;

    // Fisher-Yates shuffle y tomar 40
    const ids = todasPreguntas.map(p => p.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    const seleccionadas = ids.slice(0, 40);

    // Insertar registros en examenes_alumno
    const registros = seleccionadas.map((pregId, idx) => ({
      alumno_id,
      pregunta_id: pregId,
      orden: idx + 1,
    }));

    const { error: errInsert } = await supabaseAdmin
      .from('examenes_alumno')
      .insert(registros);

    if (errInsert) throw errInsert;

    // Asignar tema para Parte II
    const temaParte2 = seleccionarTemaAleatorio();

    // Crear registro en resultados
    await supabaseAdmin.from('resultados').insert({
      alumno_id,
      tema_parte2: temaParte2,
    });

    // Actualizar estado del alumno
    await supabaseAdmin
      .from('alumnos')
      .update({ estado: 'examen_iniciado' })
      .eq('id', alumno_id);

    return NextResponse.json({ tema_parte2: temaParte2 }, { status: 201 });
  } catch (err) {
    console.error('[generar-examen]', err);
    return NextResponse.json({ error: 'Error al generar el examen.' }, { status: 500 });
  }
}
