-- ═══════════════════════════════════════════════════════════════
-- SWEP-J  —  Schema de base de datos para Supabase (PostgreSQL)
-- Ejecuta este script en: Supabase → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════

-- ─── Extensión UUID ──────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Tabla: preguntas ────────────────────────────────────────
-- Banco de 100 preguntas (se llena con el script seed.sql)
CREATE TABLE IF NOT EXISTS preguntas (
  id                SERIAL PRIMARY KEY,
  tema              TEXT NOT NULL,
  pregunta          TEXT NOT NULL,
  opcion_a          TEXT NOT NULL,
  opcion_b          TEXT NOT NULL,
  opcion_c          TEXT NOT NULL,
  opcion_d          TEXT NOT NULL,
  respuesta_correcta CHAR(1) NOT NULL CHECK (respuesta_correcta IN ('a','b','c','d')),
  justificacion     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Tabla: sesion_examen ─────────────────────────────────────
-- Controla cuándo el profesor habilita/cierra el examen
CREATE TABLE IF NOT EXISTS sesion_examen (
  id            SERIAL PRIMARY KEY,
  activa        BOOLEAN DEFAULT FALSE,
  iniciada_at   TIMESTAMPTZ,
  cerrada_at    TIMESTAMPTZ,
  nombre_examen TEXT DEFAULT 'Primer Examen POO Java'
);

-- Insertar fila inicial (siempre habrá solo 1 fila)
INSERT INTO sesion_examen (activa) VALUES (FALSE)
ON CONFLICT DO NOTHING;

-- ─── Tabla: alumnos ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alumnos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre        TEXT NOT NULL,
  grupo         TEXT NOT NULL,
  email         TEXT NOT NULL,
  fecha_inicio  TIMESTAMPTZ DEFAULT NOW(),
  fecha_fin     TIMESTAMPTZ,
  -- Estado: 'registrado' | 'parte1_enviada' | 'finalizado'
  estado        TEXT DEFAULT 'registrado',
  -- IP para control anti-duplicado dentro de la sesión
  ip_address    TEXT,
  CONSTRAINT email_unico_activo UNIQUE (email)
);

-- ─── Tabla: examenes_alumno ───────────────────────────────────
-- Guarda las 40 preguntas asignadas a cada alumno + sus respuestas
CREATE TABLE IF NOT EXISTS examenes_alumno (
  id                 SERIAL PRIMARY KEY,
  alumno_id          UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  pregunta_id        INT  NOT NULL REFERENCES preguntas(id),
  orden              INT  NOT NULL,          -- posición 1-40 en el examen
  respuesta_alumno   CHAR(1),               -- null hasta que responda
  es_correcta        BOOLEAN,               -- null hasta calificación
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Tabla: resultados ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS resultados (
  id                  SERIAL PRIMARY KEY,
  alumno_id           UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  -- Parte I
  parte1_correctas    INT DEFAULT 0,
  parte1_total        INT DEFAULT 40,
  parte1_calificacion NUMERIC(4,2) DEFAULT 0,   -- sobre 5.0
  -- Parte II
  parte2_calificacion NUMERIC(4,2),             -- sobre 5.0 (manual)
  parte2_checklist    JSONB,                    -- detalle automático
  -- Final
  calificacion_final  NUMERIC(4,2),             -- sobre 10.0
  -- Archivos subidos (URLs de Supabase Storage)
  url_codigo_java     TEXT,
  url_evidencia       TEXT,
  -- Tema aleatorio asignado en Parte II
  tema_parte2         TEXT,
  -- Timestamp
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Índices para performance ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_examenes_alumno_id ON examenes_alumno(alumno_id);
CREATE INDEX IF NOT EXISTS idx_resultados_alumno_id ON resultados(alumno_id);

-- ─── Row Level Security (RLS) ────────────────────────────────
-- Las API Routes usan service_role_key, no necesitan RLS abierto.
-- Deshabilitamos RLS para acceso seguro desde server-side.
ALTER TABLE preguntas         DISABLE ROW LEVEL SECURITY;
ALTER TABLE sesion_examen     DISABLE ROW LEVEL SECURITY;
ALTER TABLE alumnos           DISABLE ROW LEVEL SECURITY;
ALTER TABLE examenes_alumno   DISABLE ROW LEVEL SECURITY;
ALTER TABLE resultados        DISABLE ROW LEVEL SECURITY;

-- ─── Bucket de Storage ───────────────────────────────────────
-- Ejecuta esto también en Supabase → Storage → New Bucket
-- Nombre: "evidencias-examen" (privado)
-- O créalo manualmente desde el dashboard de Supabase.
