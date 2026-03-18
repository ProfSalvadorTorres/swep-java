import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Devuelve el estado actual del alumno para control de flujo en el frontend
export async function GET(req: NextRequest) {
  const alumnoId = req.nextUrl.searchParams.get('alumno_id');
  if (!alumnoId) return NextResponse.json({ error: 'alumno_id requerido.' }, { status: 400 });

  try {
    const { data: alumno } = await supabaseAdmin
      .from('alumnos')
      .select('id, estado, fecha_inicio')
      .eq('id', alumnoId)
      .single();

    if (!alumno) return NextResponse.json({ error: 'Alumno no encontrado.' }, { status: 404 });

    // Calcular tiempo restante (90 min desde inicio)
    const inicio = new Date(alumno.fecha_inicio).getTime();
    const ahora  = Date.now();
    const transcurrido = Math.floor((ahora - inicio) / 1000);
    const limiteSegs   = 90 * 60;
    const restante     = Math.max(0, limiteSegs - transcurrido);

    return NextResponse.json({
      estado: alumno.estado,
      segundos_restantes: restante,
      tiempo_agotado: restante <= 0,
    });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
