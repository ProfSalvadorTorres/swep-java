import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const correcta = process.env.PROFESOR_PASSWORD;
    if (!correcta || password !== correcta) {
      return NextResponse.json({ error: 'Contraseña incorrecta.' }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
