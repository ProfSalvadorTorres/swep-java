# ⚡ SWEP-J — Sistema Web de Evaluación de Programación en Java

Aplicación web para aplicar exámenes automatizados en el curso introductorio de Java con UML.
**Stack:** Next.js 14 · Supabase · Resend · Vercel

---

## 🗂 Estructura del proyecto

```
swep-java/
├── app/
│   ├── page.tsx                        # Página de registro del alumno
│   ├── instrucciones/page.tsx          # Instrucciones antes del examen
│   ├── examen/
│   │   ├── parte1/page.tsx             # 40 preguntas opción múltiple + timer
│   │   ├── parte2/page.tsx             # Problema de programación Java
│   │   └── finalizar/page.tsx          # Subir archivos y finalizar
│   ├── resultados/page.tsx             # Pantalla de confirmación final
│   ├── profesor/
│   │   ├── page.tsx                    # Login del profesor
│   │   └── panel/page.tsx              # Panel de control + reporte
│   └── api/
│       ├── registro/route.ts           # POST: registrar alumno
│       ├── examen/
│       │   ├── generar/route.ts        # POST: genera 40 preguntas + tema
│       │   ├── preguntas/route.ts      # GET: obtener preguntas del alumno
│       │   ├── enviar-parte1/route.ts  # POST: califica opción múltiple
│       │   └── finalizar/route.ts      # POST: sube archivos + evalúa + email
│       └── profesor/
│           ├── login/route.ts          # POST: autenticar profesor
│           ├── panel/route.ts          # GET/POST/PATCH: panel control
│           └── generar-reporte/route.ts # POST: descarga CSV
├── components/
│   └── Timer.tsx                       # Contador regresivo 90 min
├── lib/
│   ├── supabase.ts                     # Clientes Supabase
│   ├── evaluador.ts                    # Checklist automático Java
│   └── email.ts                        # Plantillas de correo Resend
└── sql/
    ├── schema.sql                      # Crear tablas en Supabase
    └── seed_preguntas.sql              # Insertar 100 preguntas
```

---

## 🚀 Guía de despliegue paso a paso

### Paso 1 — Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta gratuita.
2. Crea un nuevo proyecto (elige región más cercana a México).
3. En **SQL Editor**, ejecuta primero `sql/schema.sql` y luego `sql/seed_preguntas.sql`.
4. En **Storage**, crea un bucket llamado `evidencias-examen` (privado).
5. Copia tus credenciales desde **Settings → API**:
   - `Project URL`
   - `anon public key`
   - `service_role key`

### Paso 2 — Crear cuenta en Resend

1. Ve a [resend.com](https://resend.com) y crea una cuenta gratuita.
2. Crea una API Key.
3. Agrega y verifica tu dominio o usa `onboarding@resend.dev` para pruebas.

### Paso 3 — Subir el código a GitHub

```bash
cd swep-java
git init
git add .
git commit -m "feat: SWEP-J MVP inicial"
git remote add origin https://github.com/TU_USUARIO/swep-java.git
git push -u origin main
```

### Paso 4 — Desplegar en Vercel

1. Ve a [vercel.com](https://vercel.com) → **New Project**.
2. Importa tu repositorio de GitHub.
3. Agrega las siguientes **Environment Variables**:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Tu Project URL de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tu anon key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Tu service_role key de Supabase |
| `RESEND_API_KEY` | Tu API key de Resend |
| `PROFESOR_EMAIL` | `storresnonius@gmail.com` |
| `FROM_EMAIL` | `examen@tudominio.com` (o `onboarding@resend.dev`) |
| `PROFESOR_PASSWORD` | La contraseña del panel del profesor |

4. Click en **Deploy**. En ~2 minutos tendrás la URL del examen.

---

## 👨‍🏫 Flujo del profesor el día del examen

1. Accede a `https://tu-app.vercel.app/profesor`
2. Ingresa tu contraseña para entrar al **Panel**.
3. Haz click en **▶ Iniciar primer examen** — esto habilita el sistema para los alumnos.
4. Comparte la URL del examen: `https://tu-app.vercel.app`
5. Monitorea en tiempo real cuántos alumnos van finalizando.
6. Al terminar el tiempo, haz click en **⏹ Finalizar examen**.
7. El sistema genera el reporte CSV y lo envía a `storresnonius@gmail.com`.
8. También puedes descargar el reporte directamente con **📊 Descargar Excel**.
9. Para cada alumno puedes hacer click en la calificación de **Parte II** para editarla manualmente.

---

## 👨‍🎓 Flujo del alumno

| Paso | Página | Descripción |
|---|---|---|
| 1 | `/` | Registro: grupo, nombre, email |
| 2 | `/instrucciones` | Lee las 8 instrucciones y acepta |
| 3 | `/examen/parte1` | Responde 40 preguntas con timer visible |
| 4 | `/examen/parte2` | Lee el problema asignado y lo codifica en su IDE |
| 5 | `/examen/finalizar` | Sube `.java` y evidencia de ejecución |
| 6 | `/resultados` | Confirmación + correo con resultados |

---

## 📧 Correos automáticos

**Al alumno al finalizar:**
- Calificación Parte I con todas las preguntas y justificaciones
- Checklist automático de la Parte II
- Calificación final (si Parte II ya fue revisada)

**Al profesor al cerrar sesión:**
- Reporte CSV con todos los alumnos y calificaciones

---

## 🔐 Seguridad implementada

- Validación de email en frontend y backend
- Un solo examen por correo electrónico (bloqueo de duplicados)
- Parte I bloqueada tras envío (no se puede modificar)
- Finalizar examen requiere ambos archivos subidos
- Las respuestas correctas NUNCA se envían al frontend
- Archivos almacenados en Supabase Storage privado con URLs firmadas

---

## 📊 Modelo de calificación

| Parte | Peso | Descripción |
|---|---|---|
| Parte I | 50% (5.0 pts) | 40 preguntas × 0.125 pts cada una |
| Parte II | 50% (5.0 pts) | Checklist automático + override manual del profesor |
| **Total** | **100% (10.0 pts)** | |

---

*SWEP-J · Curso Introductorio de Java · ISIA*
