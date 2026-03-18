import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { nombre, grupo, email } = await req.json();

    // Validaciones
    if (!nombre?.trim() || !grupo?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'El correo electrónico no es válido.' }, { status: 400 });
    }

    // Verificar que la sesión de examen esté activa
    const { data: sesion } = await supabaseAdmin
      .from('sesion_examen')
      .select('activa')
      .single();

    if (!sesion?.activa) {
      return NextResponse.json(
        { error: 'El examen no está habilitado aún. Espera las instrucciones del profesor.' },
        { status: 403 }
      );
    }

    // ──── MEJORA 1: Bloqueo robusto de duplicados ────────────────────
    // Verificar por email
    const { data: porEmail } = await supabaseAdmin
      .from('alumnos')
      .select('id, estado')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (porEmail) {
      // Si ya finalizó, bloquear por completo
      if (porEmail.estado === 'finalizado') {
        return NextResponse.json(
          { error: 'Ya completaste el examen con este correo. No puedes presentarlo de nuevo.' },
          { status: 409 }
        );
      }
      // Si está en progreso, permitir retomar (reconexión)
      return NextResponse.json({
        alumno_id: porEmail.id,
        reconexion: true,
        estado: porEmail.estado,
        mensaje: 'Reconectado a tu sesión existente.',
      }, { status: 200 });
    }

    // Verificar por IP (máximo 2 exámenes por IP para evitar abuso)
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
    const ipLimpia = ip.split(',')[0].trim();

    const { count: examenesPorIP } = await supabaseAdmin
      .from('alumnos')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ipLimpia);

    if ((examenesPorIP ?? 0) >= 3) {
      return NextResponse.json(
        { error: 'Se ha alcanzado el límite de registros desde esta computadora. Consulta al profesor.' },
        { status: 429 }
      );
    }

    // Registrar alumno
    const { data: alumno, error } = await supabaseAdmin
      .from('alumnos')
      .insert({
        nombre: nombre.trim(),
        grupo:  grupo.trim(),
        email:  email.toLowerCase().trim(),
        ip_address: ipLimpia,
        fecha_inicio: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ alumno_id: alumno.id }, { status: 201 });
  } catch (err: unknown) {
    console.error('[registro]', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
