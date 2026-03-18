'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Timer from '@/components/Timer';
import ExamGuard from '@/components/ExamGuard';

type PreguntaExamen = {
  examen_id: number;
  orden: number;
  pregunta: string;
  opcion_a: string;
  opcion_b: string;
  opcion_c: string;
  opcion_d: string;
};

export default function Parte1Page() {
  const router = useRouter();
  const [preguntas, setPreguntas]       = useState<PreguntaExamen[]>([]);
  const [respuestas, setRespuestas]     = useState<Record<number, string>>({});
  const [enviando, setEnviando]         = useState(false);
  const [loading, setLoading]           = useState(true);
  const [confirmando, setConfirmando]   = useState(false);
  const [preguntaActual, setPreguntaActual] = useState(0);
  // ── Mejora 2: alertas de foco ──
  const [alertaFoco, setAlertaFoco]     = useState(0);
  // ── Mejora 3: estado de auto-guardado ──
  const [ultimoGuardado, setUltimoGuardado] = useState<string | null>(null);
  const [guardando, setGuardando]       = useState(false);
  // ── Mejora 1: timer real del servidor ──
  const [tiempoInicial, setTiempoInicial]   = useState(90);
  const respuestasRef = useRef(respuestas);
  respuestasRef.current = respuestas;

  // ────────────────────────────────────────────────────────────────────
  // CARGA INICIAL: verificar estado del alumno + cargar preguntas
  // ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const alumnoId = sessionStorage.getItem('alumno_id');
    if (!alumnoId) { router.push('/'); return; }

    // Mejora 1: verificar que el alumno puede estar aquí
    const verificarEstado = async () => {
      try {
        const estadoRes = await fetch(`/api/examen/estado?alumno_id=${alumnoId}`);
        const estadoData = await estadoRes.json();

        if (estadoData.estado === 'finalizado') {
          alert('Ya finalizaste el examen. No puedes presentarlo de nuevo.');
          router.push('/resultados');
          return false;
        }
        if (estadoData.estado === 'parte1_enviada') {
          router.push('/examen/parte2');
          return false;
        }
        if (estadoData.tiempo_agotado) {
          alert('Tu tiempo ha expirado.');
          router.push('/resultados');
          return false;
        }
        // Timer sincronizado con servidor
        setTiempoInicial(Math.ceil(estadoData.segundos_restantes / 60));
        return true;
      } catch {
        return true; // si falla la verificación, continuar
      }
    };

    verificarEstado().then(async (puedeEntrar) => {
      if (!puedeEntrar) return;

      const res = await fetch(`/api/examen/preguntas?alumno_id=${alumnoId}`);
      const data = await res.json();
      if (data.preguntas) {
        setPreguntas(data.preguntas);
        // Restaurar respuestas: primero del servidor, luego de sessionStorage
        const guardadasServer: Record<number, string> = {};
        data.preguntas.forEach((p: { examen_id: number; respuesta_alumno: string | null }) => {
          if (p.respuesta_alumno) guardadasServer[p.examen_id] = p.respuesta_alumno;
        });
        const guardadasLocal = sessionStorage.getItem('respuestas_p1');
        const locales = guardadasLocal ? JSON.parse(guardadasLocal) : {};
        // Merge: servidor tiene prioridad, locales rellenan si hay algo nuevo
        setRespuestas({ ...guardadasServer, ...locales });
      }
      setLoading(false);
    });
  }, [router]);

  // ────────────────────────────────────────────────────────────────────
  // MEJORA 3: AUTO-GUARDADO cada 30 segundos
  // ────────────────────────────────────────────────────────────────────
  const autoGuardar = useCallback(async () => {
    const alumnoId = sessionStorage.getItem('alumno_id');
    if (!alumnoId) return;
    const resps = respuestasRef.current;
    if (Object.keys(resps).length === 0) return;

    setGuardando(true);
    try {
      const res = await fetch('/api/examen/auto-guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumno_id: alumnoId, respuestas: resps }),
      });
      const data = await res.json();
      if (res.ok) {
        setUltimoGuardado(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch { /* silencioso */ }
    setGuardando(false);
  }, []);

  useEffect(() => {
    const interval = setInterval(autoGuardar, 30000); // cada 30 seg
    return () => clearInterval(interval);
  }, [autoGuardar]);

  // ────────────────────────────────────────────────────────────────────
  // SELECCIONAR OPCIÓN
  // ────────────────────────────────────────────────────────────────────
  const seleccionar = (examenId: number, opcion: string) => {
    const nuevas = { ...respuestas, [examenId]: opcion };
    setRespuestas(nuevas);
    sessionStorage.setItem('respuestas_p1', JSON.stringify(nuevas));
  };

  const respondidas      = Object.keys(respuestas).length;
  const porcentaje       = preguntas.length ? Math.round((respondidas / preguntas.length) * 100) : 0;
  const todasRespondidas = respondidas === preguntas.length;

  // ────────────────────────────────────────────────────────────────────
  // ENVIAR PARTE I
  // ────────────────────────────────────────────────────────────────────
  const enviarParte1 = useCallback(async () => {
    const alumnoId = sessionStorage.getItem('alumno_id');
    if (!alumnoId) return;
    setEnviando(true);
    try {
      const res = await fetch('/api/examen/enviar-parte1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumno_id: alumnoId, respuestas }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); setEnviando(false); return; }

      sessionStorage.setItem('parte1_calif', data.calificacion);
      sessionStorage.setItem('parte1_correctas', data.correctas);
      router.push('/examen/parte2');
    } catch {
      alert('Error al enviar. Intenta de nuevo.');
      setEnviando(false);
    }
  }, [respuestas, router]);

  const handleTimeUp = useCallback(() => {
    alert('El tiempo se agotó. Tu Parte I se enviará automáticamente.');
    enviarParte1();
  }, [enviarParte1]);

  // ── Mejora 2: callback cuando pierde foco ──
  const handleFocusLost = useCallback(() => {
    setAlertaFoco(prev => prev + 1);
  }, []);

  // ────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="text-4xl animate-spin mb-4">&#10227;</div>
        <p className="text-slate-400 font-mono">Cargando preguntas...</p>
      </div>
    </div>
  );

  const p = preguntas[preguntaActual];
  const opciones = [
    { letra: 'a', texto: p?.opcion_a },
    { letra: 'b', texto: p?.opcion_b },
    { letra: 'c', texto: p?.opcion_c },
    { letra: 'd', texto: p?.opcion_d },
  ];

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-24">
      {/* Mejora 2: guardia anti-cheating */}
      <ExamGuard activo={true} onIntentoCopia={handleFocusLost} />

      {/* Timer sincronizado con servidor */}
      <Timer duracionMinutos={tiempoInicial} onTimeUp={handleTimeUp} />

      {/* Mejora 2: alerta de cambio de ventana */}
      {alertaFoco > 0 && (
        <div className="fixed top-16 left-4 z-50 card border-2 border-red-500 bg-red-900/30 max-w-xs animate-fade-in">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <span className="text-lg">🚨</span>
            <div>
              <p className="font-bold">Cambio de ventana detectado</p>
              <p className="text-red-400/70 text-xs">
                Se han registrado {alertaFoco} salida(s). Esto queda registrado.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold font-mono text-white">
            <span className="text-blue-400">PARTE I</span> — Opción múltiple
          </h1>
          <p className="text-slate-500 text-sm">
            {respondidas}/{preguntas.length} respondidas · {porcentaje}% completado
          </p>
        </div>
        <div className="text-right">
          <span className="badge bg-blue-500/10 text-blue-400 border border-blue-500/30 text-sm">
            Pregunta {preguntaActual + 1} de {preguntas.length}
          </span>
          {/* Mejora 3: indicador de auto-guardado */}
          <p className="text-xs mt-1 font-mono">
            {guardando ? (
              <span className="text-yellow-400">&#10227; Guardando...</span>
            ) : ultimoGuardado ? (
              <span className="text-green-500/60">Guardado {ultimoGuardado}</span>
            ) : (
              <span className="text-slate-600">Auto-guardado activo</span>
            )}
          </p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${((preguntaActual + 1) / preguntas.length) * 100}%` }}
        />
      </div>

      {/* Pregunta */}
      {p && (
        <div className="card mb-6 animate-fade-in">
          <div className="flex items-start gap-4 mb-6">
            <span className="font-mono text-blue-400 font-bold text-2xl shrink-0">
              {String(preguntaActual + 1).padStart(2, '0')}
            </span>
            <p className="text-slate-100 text-base leading-relaxed">{p.pregunta}</p>
          </div>

          <div className="space-y-3">
            {opciones.map(({ letra, texto }) => {
              const seleccionada = respuestas[p.examen_id] === letra;
              return (
                <button
                  key={letra}
                  onClick={() => seleccionar(p.examen_id, letra)}
                  className={`w-full text-left p-4 rounded-lg border transition-all duration-200 flex items-start gap-3 ${
                    seleccionada
                      ? 'border-green-500 bg-green-500/10 text-green-300'
                      : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500 hover:bg-slate-800'
                  }`}
                >
                  <span className={`font-mono font-bold shrink-0 w-6 h-6 rounded flex items-center justify-center text-sm ${
                    seleccionada ? 'bg-green-500 text-black' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {letra.toUpperCase()}
                  </span>
                  <span className="text-sm leading-relaxed">{texto}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Navegación entre preguntas */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setPreguntaActual(i => Math.max(0, i - 1))}
          disabled={preguntaActual === 0}
          className="btn-secondary disabled:opacity-30"
        >
          &#8592; Anterior
        </button>

        {/* Mini-mapa de progreso */}
        <div className="flex flex-wrap gap-1 max-w-xs justify-center">
          {preguntas.map((preg, idx) => (
            <button
              key={idx}
              onClick={() => setPreguntaActual(idx)}
              className={`w-6 h-6 rounded text-xs font-mono font-bold transition-all ${
                idx === preguntaActual
                  ? 'bg-blue-500 text-white scale-110'
                  : respuestas[preg.examen_id]
                    ? 'bg-green-500/80 text-black'
                    : 'bg-slate-700 text-slate-500'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <button
          onClick={() => setPreguntaActual(i => Math.min(preguntas.length - 1, i + 1))}
          disabled={preguntaActual === preguntas.length - 1}
          className="btn-secondary disabled:opacity-30"
        >
          Siguiente &#8594;
        </button>
      </div>

      {/* Aviso sin responder */}
      {!todasRespondidas && (
        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-3 mb-4 text-yellow-400/80 text-sm flex gap-2">
          <span>&#9888;&#65039;</span>
          <span>Tienes {preguntas.length - respondidas} pregunta(s) sin responder. Puedes enviar sin responderlas, pero recibir&aacute;n 0 puntos.</span>
        </div>
      )}

      {/* Botón enviar */}
      {!confirmando ? (
        <button
          onClick={() => setConfirmando(true)}
          disabled={enviando}
          className="btn-primary w-full justify-center py-4 text-lg"
        >
          Enviar Parte I
        </button>
      ) : (
        <div className="card border-yellow-500/40 bg-yellow-900/10">
          <p className="text-yellow-300 font-semibold mb-2">&#9888;&#65039; ¿Estás seguro?</p>
          <p className="text-slate-400 text-sm mb-4">
            Una vez enviada la Parte I, <strong className="text-white">NO podrás modificar ninguna respuesta</strong>.
            {!todasRespondidas && (
              <span className="text-yellow-400"> Tienes {preguntas.length - respondidas} sin responder.</span>
            )}
          </p>
          <div className="flex gap-3">
            <button onClick={enviarParte1} disabled={enviando} className="btn-primary flex-1 justify-center">
              {enviando ? 'Enviando...' : 'Confirmar envio'}
            </button>
            <button onClick={() => setConfirmando(false)} className="btn-secondary flex-1 justify-center">
              &#8592; Revisar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
