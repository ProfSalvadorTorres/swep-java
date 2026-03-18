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

    // Verificar duplicado (email ya registrado)
    const { data: existente } = await supabaseAdmin
      .from('alumnos')
      .select('id, estado')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe un registro con este correo. Solo puedes presentar el examen una vez.' },
        { status: 409 }
      );
    }

    // Registrar alumno
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
    const { data: alumno, error } = await supabaseAdmin
      .from('alumnos')
      .insert({
        nombre: nombre.trim(),
        grupo:  grupo.trim(),
        email:  email.toLowerCase().trim(),
        ip_address: ip.split(',')[0].trim(),
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
