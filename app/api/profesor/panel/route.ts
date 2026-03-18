import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { enviarReporteProfesor } from '@/lib/email';

// GET — cargar datos del panel
export async function GET() {
  try {
    const { data: sesion } = await supabaseAdmin
      .from('sesion_examen').select('activa').single();

    const { data: alumnos } = await supabaseAdmin
      .from('alumnos')
      .select(`
        id, nombre, grupo, email, estado, fecha_inicio, fecha_fin,
        resultados(parte1_calificacion, parte2_calificacion,
                   calificacion_final, tema_parte2,
                   url_codigo_java, url_evidencia)
      `)
      .order('fecha_inicio', { ascending: true });

    const alumnosFlat = (alumnos ?? []).map((a: any) => ({
      ...a,
      ...(a.resultados?.[0] ?? {}),
      resultados: undefined,
    }));

    return NextResponse.json({
      sesion_activa: sesion?.activa ?? false,
      alumnos: alumnosFlat,
    });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

// POST — iniciar / finalizar sesión
export async function POST(req: NextRequest) {
  try {
    const { accion } = await req.json();

    if (accion === 'iniciar') {
      await supabaseAdmin.from('sesion_examen')
        .update({ activa: true, iniciada_at: new Date().toISOString(), cerrada_at: null })
        .eq('id', 1);
    } else if (accion === 'finalizar') {
      await supabaseAdmin.from('sesion_examen')
        .update({ activa: false, cerrada_at: new Date().toISOString() })
        .eq('id', 1);

      // Generar y enviar reporte CSV al profesor
      const { data: alumnos } = await supabaseAdmin
        .from('alumnos')
        .select(`id, nombre, grupo, email, estado,
          resultados(parte1_calificacion, parte2_calificacion, calificacion_final)`)
        .order('nombre');

      const filas = (alumnos ?? []).map((a: any) => {
        const r = a.resultados?.[0] ?? {};
        return `"${a.nombre}","${a.grupo}","${a.email}","${a.estado}","${r.parte1_calificacion ?? ''}","${r.parte2_calificacion ?? ''}","${r.calificacion_final ?? ''}"`;
      });
      const csv = `"Nombre","Grupo","Email","Estado","Parte I","Parte II","Final"\n${filas.join('\n')}`;
      const totFinalizados = (alumnos ?? []).filter((a: any) => a.resultados?.[0]?.calificacion_final != null);
      const prom = totFinalizados.reduce((s: number, a: any) =>
        s + a.resultados[0].calificacion_final / totFinalizados.length, 0);

      await enviarReporteProfesor({
        totalAlumnos: alumnos?.length ?? 0,
        promedioFinal: prom,
        csvData: csv,
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

// PATCH — actualizar calificación manual Parte II
export async function PATCH(req: NextRequest) {
  try {
    const { alumno_id, parte2_calificacion } = await req.json();

    const { data: res } = await supabaseAdmin
      .from('resultados')
      .select('parte1_calificacion')
      .eq('alumno_id', alumno_id)
      .single();

    const calif1 = res?.parte1_calificacion ?? 0;
    const final  = parseFloat((calif1 + parte2_calificacion).toFixed(2));

    await supabaseAdmin.from('resultados')
      .update({
        parte2_calificacion,
        calificacion_final: final,
        updated_at: new Date().toISOString(),
      })
      .eq('alumno_id', alumno_id);

    return NextResponse.json({ ok: true, calificacion_final: final });
  } catch {
    return NextResponse.json({ error: 'Error al actualizar.' }, { status: 500 });
  }
}
