'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
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

type SortKey = 'nombre' | 'grupo' | 'estado' | 'parte1_calificacion' | 'parte2_calificacion' | 'calificacion_final';
type SortDir = 'asc' | 'desc';

export default function PanelProfesorPage() {
  const router = useRouter();
  const [sesionActiva, setSesionActiva] = useState<boolean | null>(null);
  const [alumnos, setAlumnos]           = useState<AlumnoReporte[]>([]);
  const [loading, setLoading]           = useState(true);
  const [accion, setAccion]             = useState('');
  // Para calificación manual Parte II
  const [editando, setEditando]         = useState<string | null>(null);
  const [calif2,   setCalif2]           = useState<string>('');

  // ── Mejora 4: filtros y ordenamiento ──
  const [busqueda, setBusqueda]         = useState('');
  const [filtroGrupo, setFiltroGrupo]   = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [sortKey, setSortKey]           = useState<SortKey>('nombre');
  const [sortDir, setSortDir]           = useState<SortDir>('asc');

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
    const interval = setInterval(cargarDatos, 15000);
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

  // ── Mejora 4: listas únicas de grupos y estados para los filtros ──
  const gruposUnicos  = useMemo(() => Array.from(new Set(alumnos.map(a => a.grupo))).sort(), [alumnos]);
  const estadosUnicos = useMemo(() => Array.from(new Set(alumnos.map(a => a.estado))).sort(), [alumnos]);

  // ── Mejora 4: filtrar + ordenar alumnos ──
  const alumnosFiltrados = useMemo(() => {
    let lista = [...alumnos];

    // Filtro por búsqueda (nombre o email)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      lista = lista.filter(a =>
        a.nombre.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
      );
    }

    // Filtro por grupo
    if (filtroGrupo !== 'todos') {
      lista = lista.filter(a => a.grupo === filtroGrupo);
    }

    // Filtro por estado
    if (filtroEstado !== 'todos') {
      lista = lista.filter(a => a.estado === filtroEstado);
    }

    // Ordenamiento
    lista.sort((a, b) => {
      let valA: string | number | null;
      let valB: string | number | null;

      switch (sortKey) {
        case 'nombre':
          valA = a.nombre.toLowerCase();
          valB = b.nombre.toLowerCase();
          break;
        case 'grupo':
          valA = a.grupo;
          valB = b.grupo;
          break;
        case 'estado':
          valA = a.estado;
          valB = b.estado;
          break;
        case 'parte1_calificacion':
          valA = a.parte1_calificacion;
          valB = b.parte1_calificacion;
          break;
        case 'parte2_calificacion':
          valA = a.parte2_calificacion;
          valB = b.parte2_calificacion;
          break;
        case 'calificacion_final':
          valA = a.calificacion_final;
          valB = b.calificacion_final;
          break;
        default:
          return 0;
      }

      // Nulls siempre al final
      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return lista;
  }, [alumnos, busqueda, filtroGrupo, filtroEstado, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return '\u2195';
    return sortDir === 'asc' ? '\u2191' : '\u2193';
  };

  const finalizados = alumnos.filter(a => a.estado === 'finalizado').length;
  const enProgreso  = alumnos.filter(a => a.estado === 'examen_iniciado' || a.estado === 'parte1_enviada').length;
  const conCalif    = alumnos.filter(a => a.calificacion_final != null);
  const promedio    = conCalif.length
    ? conCalif.reduce((sum, a) => sum + a.calificacion_final!, 0) / conCalif.length
    : 0;

  // Estadísticas de aprobados/reprobados (aprobado >= 3.0 de 5.0 = 60%)
  const aprobados   = conCalif.filter(a => a.calificacion_final! >= 3.0).length;
  const reprobados  = conCalif.length - aprobados;

  const etiquetaEstado = (estado: string) => {
    const mapa: Record<string, string> = {
      registrado: 'Registrado',
      examen_iniciado: 'En examen',
      parte1_enviada: 'Parte I enviada',
      finalizado: 'Finalizado',
    };
    return mapa[estado] ?? estado.replace(/_/g, ' ');
  };

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
            &#127891; Panel del Profesor
          </h1>
          <p className="text-slate-500 text-sm">SWEP-J &middot; Se actualiza cada 15 segundos</p>
        </div>
        <button onClick={() => { sessionStorage.removeItem('profesor_auth'); router.push('/profesor'); }}
          className="btn-secondary text-sm">
          &#128274; Salir
        </button>
      </div>

      {/* Stats mejorados */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Registrados',  val: alumnos.length,          color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'En progreso',  val: enProgreso,              color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { label: 'Finalizados',  val: finalizados,             color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
          { label: 'Promedio',     val: conCalif.length ? promedio.toFixed(2) : '\u2014', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
          { label: 'Aprobados',    val: aprobados,               color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Reprobados',   val: reprobados,              color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className={`rounded-xl border p-4 text-center ${bg}`}>
            <p className={`text-2xl font-bold font-mono ${color}`}>{val}</p>
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
              Sesi&oacute;n: {sesionActiva ? 'ACTIVA \u2014 Alumnos pueden presentar' : 'INACTIVA'}
            </p>
            <p className="text-slate-500 text-xs">
              {sesionActiva
                ? 'Los alumnos pueden registrarse y presentar el examen.'
                : 'Debes iniciar la sesi\u00f3n para que los alumnos accedan.'}
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
              {accion === 'iniciar' ? '\u27F3 Iniciando...' : '\u25B6 Iniciar primer examen'}
            </button>
          ) : (
            <button
              onClick={() => { if (confirm('\u00bfFinalizar la sesi\u00f3n? Los alumnos ya no podr\u00e1n acceder.')) accionSesion('finalizar'); }}
              disabled={!!accion}
              className="btn-danger"
            >
              {accion === 'finalizar' ? '\u27F3 Finalizando...' : '\u23F9 Finalizar examen'}
            </button>
          )}
          <button onClick={descargarCSV} className="btn-secondary">
            &#128202; Descargar CSV
          </button>
        </div>
      </div>

      {/* ── Mejora 4: Barra de filtros ── */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          {/* Búsqueda */}
          <div className="flex-1 w-full">
            <label className="text-slate-500 text-xs font-mono block mb-1">Buscar alumno</label>
            <input
              type="text"
              placeholder="Nombre o email..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 text-sm placeholder-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Filtro grupo */}
          <div className="w-full md:w-48">
            <label className="text-slate-500 text-xs font-mono block mb-1">Grupo</label>
            <select
              value={filtroGrupo}
              onChange={e => setFiltroGrupo(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:border-blue-500 focus:outline-none transition-colors"
            >
              <option value="todos">Todos los grupos</option>
              {gruposUnicos.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Filtro estado */}
          <div className="w-full md:w-48">
            <label className="text-slate-500 text-xs font-mono block mb-1">Estado</label>
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:border-blue-500 focus:outline-none transition-colors"
            >
              <option value="todos">Todos los estados</option>
              {estadosUnicos.map(e => (
                <option key={e} value={e}>{etiquetaEstado(e)}</option>
              ))}
            </select>
          </div>

          {/* Botón limpiar */}
          {(busqueda || filtroGrupo !== 'todos' || filtroEstado !== 'todos') && (
            <button
              onClick={() => { setBusqueda(''); setFiltroGrupo('todos'); setFiltroEstado('todos'); }}
              className="text-slate-500 hover:text-slate-300 text-xs font-mono py-2 px-3 border border-slate-700 rounded-lg hover:border-slate-500 transition-colors whitespace-nowrap"
            >
              &#10005; Limpiar filtros
            </button>
          )}
        </div>

        {/* Resumen de filtros */}
        <div className="mt-3 text-xs text-slate-600 font-mono">
          Mostrando {alumnosFiltrados.length} de {alumnos.length} alumnos
          {filtroGrupo !== 'todos' && <span className="text-blue-400/60"> &middot; Grupo: {filtroGrupo}</span>}
          {filtroEstado !== 'todos' && <span className="text-green-400/60"> &middot; Estado: {etiquetaEstado(filtroEstado)}</span>}
        </div>
      </div>

      {/* Tabla de alumnos mejorada */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              <th className="py-3 px-3 text-slate-500 font-mono text-xs">#</th>
              <th className="py-3 px-3 text-slate-500 font-mono text-xs cursor-pointer hover:text-slate-300 select-none" onClick={() => handleSort('nombre')}>
                Nombre <span className="text-slate-600 ml-1">{sortIcon('nombre')}</span>
              </th>
              <th className="py-3 px-3 text-slate-500 font-mono text-xs cursor-pointer hover:text-slate-300 select-none" onClick={() => handleSort('grupo')}>
                Grupo <span className="text-slate-600 ml-1">{sortIcon('grupo')}</span>
              </th>
              <th className="py-3 px-3 text-slate-500 font-mono text-xs cursor-pointer hover:text-slate-300 select-none" onClick={() => handleSort('estado')}>
                Estado <span className="text-slate-600 ml-1">{sortIcon('estado')}</span>
              </th>
              <th className="py-3 px-3 text-slate-500 font-mono text-xs">Tema</th>
              <th className="py-3 px-3 text-slate-500 font-mono text-xs cursor-pointer hover:text-slate-300 select-none" onClick={() => handleSort('parte1_calificacion')}>
                Parte I <span className="text-slate-600 ml-1">{sortIcon('parte1_calificacion')}</span>
              </th>
              <th className="py-3 px-3 text-slate-500 font-mono text-xs cursor-pointer hover:text-slate-300 select-none" onClick={() => handleSort('parte2_calificacion')}>
                Parte II <span className="text-slate-600 ml-1">{sortIcon('parte2_calificacion')}</span>
              </th>
              <th className="py-3 px-3 text-slate-500 font-mono text-xs cursor-pointer hover:text-slate-300 select-none" onClick={() => handleSort('calificacion_final')}>
                Final <span className="text-slate-600 ml-1">{sortIcon('calificacion_final')}</span>
              </th>
              <th className="py-3 px-3 text-slate-500 font-mono text-xs">Archivos</th>
            </tr>
          </thead>
          <tbody>
            {alumnosFiltrados.length === 0 && (
              <tr><td colSpan={9} className="py-12 text-center text-slate-600 font-mono">
                {alumnos.length === 0
                  ? 'Sin alumnos registrados a\u00fan...'
                  : 'Ning\u00fan alumno coincide con los filtros aplicados.'}
              </td></tr>
            )}
            {alumnosFiltrados.map((a, idx) => (
              <tr key={a.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                <td className="py-2 px-3 text-slate-600 font-mono">{idx + 1}</td>
                <td className="py-2 px-3">
                  <div>
                    <p className="text-slate-200 font-medium">{a.nombre}</p>
                    <p className="text-slate-600 text-xs font-mono">{a.email}</p>
                  </div>
                </td>
                <td className="py-2 px-3 text-slate-400 font-mono">{a.grupo}</td>
                <td className="py-2 px-3">
                  <span className={`inline-block px-2 py-1 rounded-md text-xs font-mono font-medium border ${
                    a.estado === 'finalizado'     ? 'bg-green-900/30 text-green-400 border-green-700'  :
                    a.estado === 'parte1_enviada' ? 'bg-blue-900/30 text-blue-400 border-blue-700'     :
                    a.estado === 'examen_iniciado'? 'bg-yellow-900/30 text-yellow-400 border-yellow-700' :
                    'bg-slate-800 text-slate-500 border-slate-700'
                  }`}>
                    {etiquetaEstado(a.estado)}
                  </span>
                </td>
                <td className="py-2 px-3 text-slate-400 font-mono text-xs max-w-[120px] truncate" title={a.tema_parte2 ?? ''}>
                  {a.tema_parte2 ?? '\u2014'}
                </td>
                <td className="py-2 px-3 font-mono text-blue-400">
                  {a.parte1_calificacion != null ? a.parte1_calificacion.toFixed(2) : '\u2014'}
                </td>
                <td className="py-2 px-3">
                  {editando === a.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min="0" max="5" step="0.5"
                        value={calif2}
                        onChange={e => setCalif2(e.target.value)}
                        className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-100 text-xs focus:border-green-500 focus:outline-none"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') guardarCalif2(a.id); if (e.key === 'Escape') setEditando(null); }}
                      />
                      <button onClick={() => guardarCalif2(a.id)} className="text-green-400 hover:text-green-300 text-xs px-1" title="Guardar">&#10003;</button>
                      <button onClick={() => setEditando(null)} className="text-slate-500 hover:text-slate-400 text-xs px-1" title="Cancelar">&#10007;</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditando(a.id); setCalif2(a.parte2_calificacion?.toString() ?? ''); }}
                      className="font-mono text-green-400 hover:text-green-300 flex items-center gap-1 group"
                      title="Clic para editar"
                    >
                      {a.parte2_calificacion != null ? a.parte2_calificacion.toFixed(2) : '\u2014'}
                      <span className="opacity-0 group-hover:opacity-100 text-xs text-slate-600">&#9998;</span>
                    </button>
                  )}
                </td>
                <td className="py-2 px-3 font-mono font-bold">
                  <span className={
                    a.calificacion_final == null ? 'text-slate-600' :
                    a.calificacion_final >= 3.0  ? 'text-green-400' :
                    'text-red-400'
                  }>
                    {a.calificacion_final != null ? a.calificacion_final.toFixed(2) : '\u2014'}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <div className="flex gap-2">
                    {a.url_codigo_java && (
                      <a href={a.url_codigo_java} target="_blank" rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-xs hover:underline">
                        &#128196; .java
                      </a>
                    )}
                    {a.url_evidencia && (
                      <a href={a.url_evidencia} target="_blank" rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 text-xs hover:underline">
                        &#128248; evidencia
                      </a>
                    )}
                    {!a.url_codigo_java && !a.url_evidencia && (
                      <span className="text-slate-700 text-xs">\u2014</span>
                    )}
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
