import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    const { data: alumnos } = await supabaseAdmin
      .from('alumnos')
      .select(`nombre, grupo, email, estado, fecha_inicio, fecha_fin,
        resultados(parte1_calificacion, parte1_correctas, parte2_calificacion,
                   calificacion_final, tema_parte2)`)
      .order('nombre');

    const filas = (alumnos ?? []).map((a: any) => {
      const r = a.resultados?.[0] ?? {};
      return [
        `"${a.nombre}"`,
        `"${a.grupo}"`,
        `"${a.email}"`,
        `"${a.estado}"`,
        `"${r.parte1_correctas ?? ''}/40"`,
        `"${r.parte1_calificacion ?? ''}"`,
        `"${r.parte2_calificacion ?? 'Pendiente'}"`,
        `"${r.calificacion_final ?? 'Pendiente'}"`,
        `"${r.tema_parte2 ?? ''}"`,
      ].join(',');
    });

    const csv =
      '"Nombre","Grupo","Email","Estado","P1 Correctas","P1 Calif","P2 Calif","Final","Tema P2"\n' +
      filas.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="reporte_examen_${new Date().toISOString().slice(0,10)}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Error al generar reporte.' }, { status: 500 });
  }
}
