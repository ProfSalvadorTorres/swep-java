'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type AlumnoReporte = {
  id: string;
  nombre: string;
  grupo: string;
  email: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  parte1_calificacion: number | null;
  parte2_calificacion: number | null;
  calificacion_final:  number | null;
  tema_parte2: string | null;
  url_codigo_java: string | null;
  url_evidencia:   string | null;
};

export default function PanelProfesorPage() {
  const router = useRouter();
  const [sesionActiva, setSesionActiva] = useState<boolean | null>(null);
  const [alumnos, setAlumnos]           = useState<AlumnoReporte[]>([]);
  const [loading, setLoading]           = useState(true);
  const [accion, setAccion]             = useState('');
  // Para calificación manual Parte II
  const [editando, setEditando]         = useState<string | null>(null);
  const [calif2,   setCalif2]           = useState<string>('');

  const cargarDatos = useCallback(async () => {
    try {
      const res = await fetch('/api/profesor/panel');
      const data = await res.json();
      if (res.status === 401) { router.push('/profesor'); return; }
      setSesionActiva(data.sesion_activa);
      setAlumnos(data.alumnos ?? []);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!sessionStorage.getItem('profesor_auth')) { router.push('/profesor'); return; }
    cargarDatos();
    const interval = setInterval(cargarDatos, 15000); // auto-refresh cada 15s
    return () => clearInterval(interval);
  }, [router, cargarDatos]);

  const accionSesion = async (tipo: 'iniciar' | 'finalizar') => {
    setAccion(tipo);
    await fetch('/api/profesor/panel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: tipo }),
    });
    await cargarDatos();
    setAccion('');
  };

  const guardarCalif2 = async (alumnoId: string) => {
    const val = parseFloat(calif2);
    if (isNaN(val) || val < 0 || val > 5) {
      alert('Ingresa un valor entre 0 y 5'); return;
    }
    await fetch('/api/profesor/panel', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alumno_id: alumnoId, parte2_calificacion: val }),
    });
    setEditando(null); setCalif2('');
    await cargarDatos();
  };

  const descargarCSV = async () => {
    const res  = await fetch('/api/profesor/generar-reporte', { method: 'POST' });
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `reporte_examen_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const finalizados = alumnos.filter(a => a.estado === 'finalizado').length;
  const promedio    = alumnos.filter(a => a.calificacion_final != null)
    .reduce((sum, a, _, arr) => sum + (a.calificacion_final! / arr.length), 0);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-green-400 font-mono animate-pulse">Cargando panel...</p>
    </div>
  );

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-mono text-white flex items-center gap-2">
            🎓 Panel del Profesor
          </h1>
          <p className="text-slate-500 text-sm">SWEP-J · Se actualiza cada 15 segundos</p>
        </div>
        <button onClick={() => { sessionStorage.removeItem('profesor_auth'); router.push('/profesor'); }}
          className="btn-secondary text-sm">
          🔒 Salir
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total registrados', val: alumnos.length, color: 'text-blue-400' },
          { label: 'Finalizados', val: finalizados, color: 'text-green-400' },
          { label: 'En progreso', val: alumnos.length - finalizados, color: 'text-yellow-400' },
          { label: 'Promedio grupal', val: alumnos.length ? promedio.toFixed(2) : '—', color: 'text-purple-400' },
        ].map(({ label, val, color }) => (
          <div key={label} className="card text-center">
            <p className={`text-3xl font-bold font-mono ${color}`}>{val}</p>
            <p className="text-slate-500 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Control de sesión */}
      <div className="card mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${sesionActiva ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
          <div>
            <p className="font-semibold text-slate-200">
              Sesión: {sesionActiva ? 'ACTIVA — Alumnos pueden presentar' : 'INACTIVA'}
            </p>
            <p className="text-slate-500 text-xs">
              {sesionActiva
                ? 'Los alumnos pueden registrarse y presentar el examen.'
                : 'Debes iniciar la sesión para que los alumnos accedan.'}
            </p>
          </div>
        </div>
        <div className="flex gap-3 shrink-0">
          {!sesionActiva ? (
            <button
              onClick={() => accionSesion('iniciar')}
              disabled={!!accion}
              className="btn-primary"
            >
              {accion === 'iniciar' ? '⟳ Iniciando...' : '▶ Iniciar primer examen'}
            </button>
          ) : (
            <button
              onClick={() => { if (confirm('¿Finalizar la sesión? Los alumnos ya no podrán acceder.')) accionSesion('finalizar'); }}
              disabled={!!accion}
              className="btn-danger"
            >
              {accion === 'finalizar' ? '⟳ Finalizando...' : '⏹ Finalizar examen'}
            </button>
          )}
          <button onClick={descargarCSV} className="btn-secondary">
            📊 Descargar Excel
          </button>
        </div>
      </div>

      {/* Tabla de alumnos */}
      <div className="card overflow-x-auto">
        <h2 className="font-mono text-slate-400 text-sm mb-4">
          📋 Reporte de calificaciones ({alumnos.length} alumnos)
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              {['#','Nombre','Grupo','Estado','Tema','Parte I','Parte II','Final','Archivos'].map(h => (
                <th key={h} className="py-2 px-3 text-slate-500 font-mono text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alumnos.length === 0 && (
              <tr><td colSpan={9} className="py-8 text-center text-slate-600 font-mono">
                Sin alumnos registrados aún...
              </td></tr>
            )}
            {alumnos.map((a, idx) => (
              <tr key={a.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                <td className="py-2 px-3 text-slate-600 font-mono">{idx + 1}</td>
                <td className="py-2 px-3 text-slate-200 font-medium">{a.nombre}</td>
                <td className="py-2 px-3 text-slate-400 font-mono">{a.grupo}</td>
                <td className="py-2 px-3">
                  <span className={`badge text-xs ${
                    a.estado === 'finalizado'     ? 'bg-green-900/30 text-green-400 border-green-700'  :
                    a.estado === 'parte1_enviada' ? 'bg-blue-900/30 text-blue-400 border-blue-700'     :
                    a.estado === 'examen_iniciado'? 'bg-yellow-900/30 text-yellow-400 border-yellow-700' :
                    'bg-slate-800 text-slate-500 border-slate-700'
                  }`}>
                    {a.estado.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-2 px-3 text-slate-400 font-mono text-xs">{a.tema_parte2 ?? '—'}</td>
                <td className="py-2 px-3 font-mono text-blue-400">
                  {a.parte1_calificacion != null ? a.parte1_calificacion.toFixed(2) : '—'}
                </td>
                <td className="py-2 px-3">
                  {editando === a.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min="0" max="5" step="0.5"
                        value={calif2}
                        onChange={e => setCalif2(e.target.value)}
                        className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-100 text-xs"
                      />
                      <button onClick={() => guardarCalif2(a.id)} className="text-green-400 hover:text-green-300 text-xs px-1">✓</button>
                      <button onClick={() => setEditando(null)} className="text-slate-500 hover:text-slate-400 text-xs px-1">✗</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditando(a.id); setCalif2(a.parte2_calificacion?.toString() ?? ''); }}
                      className="font-mono text-green-400 hover:text-green-300 flex items-center gap-1 group"
                    >
                      {a.parte2_calificacion != null ? a.parte2_calificacion.toFixed(2) : '—'}
                      <span className="opacity-0 group-hover:opacity-100 text-xs text-slate-600">✏️</span>
                    </button>
                  )}
                </td>
                <td className="py-2 px-3 font-mono font-bold text-white">
                  {a.calificacion_final != null ? a.calificacion_final.toFixed(2) : '—'}
                </td>
                <td className="py-2 px-3">
                  <div className="flex gap-2">
                    {a.url_codigo_java  && <a href={a.url_codigo_java}  target="_blank" className="text-blue-400 hover:text-blue-300 text-xs">📄 .java</a>}
                    {a.url_evidencia    && <a href={a.url_evidencia}    target="_blank" className="text-purple-400 hover:text-purple-300 text-xs">🖼 evidencia</a>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
