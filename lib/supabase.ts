import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente público (browser) — solo lectura anónima
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente servidor (API routes) — acceso completo con service role
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

// Tipos de las tablas
export type Alumno = {
  id: string;
  nombre: string;
  grupo: string;
  email: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: 'registrado' | 'parte1_enviada' | 'finalizado';
};

export type Pregunta = {
  id: number;
  tema: string;
  pregunta: string;
  opcion_a: string;
  opcion_b: string;
  opcion_c: string;
  opcion_d: string;
  respuesta_correcta: 'a' | 'b' | 'c' | 'd';
  justificacion: string;
};

export type ExamenAlumno = {
  id: number;
  alumno_id: string;
  pregunta_id: number;
  orden: number;
  respuesta_alumno: string | null;
  es_correcta: boolean | null;
};

export type Resultado = {
  id: number;
  alumno_id: string;
  parte1_correctas: number;
  parte1_total: number;
  parte1_calificacion: number;
  parte2_calificacion: number | null;
  parte2_checklist: Record<string, boolean> | null;
  calificacion_final: number | null;
  url_codigo_java: string | null;
  url_evidencia: string | null;
  tema_parte2: string;
};
