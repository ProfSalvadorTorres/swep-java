import { Resend } from 'resend';
import { ChecklistPartII } from './evaluador';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM    = process.env.FROM_EMAIL    ?? 'examen@swep-java.com';
const PROFESOR = process.env.PROFESOR_EMAIL ?? 'storresnonius@gmail.com';

// ─── Email al alumno al finalizar el examen ───────────────────────────────────
export async function enviarResultadosAlumno(params: {
  emailAlumno: string;
  nombreAlumno: string;
  grupo: string;
  parte1Correctas: number;
  parte1Total: number;
  parte1Calif: number;
  parte2Calif: number | null;
  califFinal: number | null;
  checklist: ChecklistPartII | null;
  temaParteII: string;
  preguntasConRespuestas: {
    orden: number;
    pregunta: string;
    respuesta_alumno: string | null;
    respuesta_correcta: string;
    es_correcta: boolean | null;
    justificacion: string;
    opcion_a: string; opcion_b: string;
    opcion_c: string; opcion_d: string;
  }[];
}) {
  const {
    emailAlumno, nombreAlumno, grupo,
    parte1Correctas, parte1Total, parte1Calif,
    parte2Calif, califFinal, checklist,
    temaParteII, preguntasConRespuestas,
  } = params;

  const opcionLabel = (letra: string, p: typeof preguntasConRespuestas[0]) => {
    const mapa: Record<string, string> = {
      a: p.opcion_a, b: p.opcion_b, c: p.opcion_c, d: p.opcion_d,
    };
    return mapa[letra] ?? letra;
  };

  const preguntasHTML = preguntasConRespuestas.map((p) => {
    const icono = p.es_correcta ? '✅' : '❌';
    const colorFila = p.es_correcta ? '#0f2d0f' : '#2d0f0f';
    return `
      <tr style="background:${colorFila}; border-bottom: 1px solid #334155;">
        <td style="padding:8px; color:#94a3b8; text-align:center;">${p.orden}</td>
        <td style="padding:8px; color:#e2e8f0;">${p.pregunta}</td>
        <td style="padding:8px; color:#fbbf24; text-align:center;">${p.respuesta_alumno?.toUpperCase() ?? '—'}) ${p.respuesta_alumno ? opcionLabel(p.respuesta_alumno, p) : ''}</td>
        <td style="padding:8px; color:#22c55e; text-align:center;">${p.respuesta_correcta.toUpperCase()}) ${opcionLabel(p.respuesta_correcta, p)}</td>
        <td style="padding:8px; text-align:center; font-size:18px;">${icono}</td>
        <td style="padding:8px; color:#94a3b8; font-size:12px;">${p.justificacion}</td>
      </tr>`;
  }).join('');

  const checkHTML = checklist ? `
    <h3 style="color:#22c55e; margin-top:24px;">📋 Checklist automático Parte II</h3>
    <table style="width:100%; border-collapse:collapse; font-family:monospace;">
      ${Object.entries({
        'Arreglo de objetos':        checklist.tiene_arreglo_objetos,
        'Clase Scanner':             checklist.tiene_scanner,
        'Ciclo for':                 checklist.tiene_for,
        'Switch-case':               checklist.tiene_switch,
        'Constructor mínimo':        checklist.tiene_constructor_minimo,
        'Constructor intermedio':    checklist.tiene_constructor_intermedio,
        'Constructor máximo':        checklist.tiene_constructor_maximo,
        'Atributo final (constante)':checklist.tiene_atributo_final,
        'Atributo static (de clase)':checklist.tiene_atributo_static,
        'Getters':                   checklist.tiene_getter,
        'Setters':                   checklist.tiene_setter,
        'toString()':                checklist.tiene_toString,
        'pedirDatos()':              checklist.tiene_pedirDatos,
        'mostrarDatos()':            checklist.tiene_mostrarDatos,
        'menú()':                    checklist.tiene_menu,
      }).map(([label, ok]) =>
        `<tr><td style="padding:6px; color:#e2e8f0;">${label}</td>
         <td style="padding:6px; text-align:right; font-size:16px;">${ok ? '✅' : '❌'}</td></tr>`
      ).join('')}
    </table>
    <p style="color:#94a3b8;">Puntaje automático Parte II: <strong style="color:#22c55e;">${checklist.puntaje_auto}/100</strong> (sujeto a revisión manual del profesor)</p>
  ` : '';

  const html = `
<!DOCTYPE html>
<html>
<body style="background:#0f172a; color:#e2e8f0; font-family:system-ui,sans-serif; padding:32px; margin:0;">
  <div style="max-width:900px; margin:0 auto; background:#1e293b; border-radius:12px; border:1px solid #334155; overflow:hidden;">

    <div style="background:linear-gradient(135deg,#1e3a5f,#0f2d1f); padding:32px; border-bottom:2px solid #22c55e;">
      <h1 style="margin:0; color:#22c55e; font-family:monospace;">⚡ SWEP-J</h1>
      <p style="margin:4px 0 0; color:#94a3b8;">Sistema Web de Evaluación de Programación en Java</p>
    </div>

    <div style="padding:32px;">
      <h2 style="color:#e2e8f0;">Resultados del examen — ${nombreAlumno}</h2>
      <p style="color:#94a3b8;">Grupo: <strong style="color:#e2e8f0;">${grupo}</strong></p>

      <table style="width:100%; border-collapse:collapse; margin:16px 0; border-radius:8px; overflow:hidden;">
        <tr style="background:#0f172a;">
          <th style="padding:12px; color:#7dd3fc; text-align:left;">Sección</th>
          <th style="padding:12px; color:#7dd3fc; text-align:right;">Calificación</th>
        </tr>
        <tr style="background:#1e293b;">
          <td style="padding:12px; color:#e2e8f0;">Parte I — Opción múltiple (${parte1Correctas}/${parte1Total} correctas)</td>
          <td style="padding:12px; color:#22c55e; text-align:right; font-weight:bold;">${parte1Calif.toFixed(2)} / 5.0</td>
        </tr>
        <tr style="background:#0f172a;">
          <td style="padding:12px; color:#e2e8f0;">Parte II — Programación en Java (tema: ${temaParteII})</td>
          <td style="padding:12px; color:#22c55e; text-align:right; font-weight:bold;">${parte2Calif != null ? parte2Calif.toFixed(2) + ' / 5.0' : 'Pendiente revisión'}</td>
        </tr>
        <tr style="background:#0f2d1f; border-top:2px solid #22c55e;">
          <td style="padding:16px; color:#22c55e; font-weight:bold; font-size:18px;">CALIFICACIÓN FINAL</td>
          <td style="padding:16px; color:#22c55e; font-weight:bold; font-size:24px; text-align:right;">
            ${califFinal != null ? califFinal.toFixed(2) + ' / 10.0' : 'Pendiente'}
          </td>
        </tr>
      </table>

      ${checkHTML}

      <h3 style="color:#7dd3fc; margin-top:32px;">📝 Revisión Parte I — Preguntas y respuestas</h3>
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="background:#0f172a;">
            <th style="padding:8px; color:#7dd3fc;">#</th>
            <th style="padding:8px; color:#7dd3fc; text-align:left;">Pregunta</th>
            <th style="padding:8px; color:#fbbf24;">Tu respuesta</th>
            <th style="padding:8px; color:#22c55e;">Correcta</th>
            <th style="padding:8px; color:#7dd3fc;">✓/✗</th>
            <th style="padding:8px; color:#94a3b8; text-align:left;">Justificación</th>
          </tr>
        </thead>
        <tbody>${preguntasHTML}</tbody>
      </table>
    </div>

    <div style="padding:16px 32px; background:#0f172a; border-top:1px solid #334155; text-align:center;">
      <p style="color:#475569; font-size:12px; margin:0;">SWEP-J © ${new Date().getFullYear()} — Sistema Web de Evaluación de Programación en Java</p>
    </div>
  </div>
</body>
</html>`;

  return resend.emails.send({
    from: FROM,
    to:   emailAlumno,
    cc:   PROFESOR,
    subject: `[SWEP-J] Resultados del examen — ${nombreAlumno} (${grupo})`,
    html,
  });
}

// ─── Email de reporte al profesor al cerrar la sesión ────────────────────────
export async function enviarReporteProfesor(params: {
  totalAlumnos: number;
  promedioFinal: number;
  csvData: string;
}) {
  const { totalAlumnos, promedioFinal, csvData } = params;
  return resend.emails.send({
    from: FROM,
    to:   PROFESOR,
    subject: `[SWEP-J] Reporte final del examen — ${totalAlumnos} alumnos`,
    html: `
      <div style="background:#0f172a; color:#e2e8f0; padding:32px; font-family:monospace;">
        <h2 style="color:#22c55e;">📊 Reporte final SWEP-J</h2>
        <p>Alumnos evaluados: <strong>${totalAlumnos}</strong></p>
        <p>Promedio grupal: <strong>${promedioFinal.toFixed(2)} / 10.0</strong></p>
        <p>Se adjunta el archivo Excel con el reporte completo.</p>
      </div>`,
    attachments: [{
      filename: `reporte_examen_${new Date().toISOString().slice(0,10)}.csv`,
      content: Buffer.from(csvData, 'utf-8').toString('base64'),
    }],
  });
}
