'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const instrucciones = [
  { num: '01', icon: '📖', text: 'Lee con mucha atención TODAS las instrucciones antes de comenzar.' },
  { num: '02', icon: '📱', text: 'Pasa a dejar tu celular sobre la mesa del profesor ANTES de oprimir "Iniciar Examen".' },
  { num: '03', icon: '▶', text: 'Al oprimir "Iniciar Examen" se generarán TUS 40 preguntas de opción múltiple del banco y el problema de programación que deberás resolver.' },
  { num: '04', icon: '🚫', text: 'No está permitido hacer uso de ninguna IA (ChatGPT, Claude, Copilot, etc.). El hacerlo invalida tu examen automáticamente.' },
  { num: '05', icon: '📝', text: 'Resuelve la Parte I (opción múltiple). Al oprimir "Enviar Parte I" ya no podrás modificar ninguna respuesta.' },
  { num: '06', icon: '💻', text: 'Resuelve la Parte II: codifica en Java el problema generado aplicando TODAS las restricciones indicadas.' },
  { num: '07', icon: '📤', text: 'Al terminar, sube tu archivo fuente (.java) y una imagen o PDF de la ejecución de tu programa.' },
  { num: '08', icon: '✅', text: 'Oprime "Finalizar Examen". El sistema analizará ambas partes y enviará tus resultados a tu correo electrónico.' },
];

export default function InstruccionesPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [acepta, setAcepta] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const n = sessionStorage.getItem('alumno_nombre');
    if (!n) { router.push('/'); return; }
    setNombre(n);
  }, [router]);

  const handleIniciar = async () => {
    if (!acepta) return;
    const alumnoId = sessionStorage.getItem('alumno_id');
    if (!alumnoId) { router.push('/'); return; }

    setLoading(true);
    try {
      // Genera el examen en el servidor
      const res = await fetch('/api/examen/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumno_id: alumnoId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Error al generar el examen.');
        setLoading(false); return;
      }
      sessionStorage.setItem('tema_parte2', data.tema_parte2);
      router.push('/examen/parte1');
    } catch {
      alert('Error de conexión. Intenta de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      {/* Saludo */}
      <div className="mb-8 text-center">
        <span className="badge bg-green-500/10 text-green-400 border border-green-500/30 text-sm mb-3">
          ⚡ Examen en curso
        </span>
        <h1 className="text-2xl font-bold text-white mb-1">
          Bienvenido, <span className="text-green-400 font-mono">{nombre}</span>
        </h1>
        <p className="text-slate-400 text-sm">Lee cuidadosamente antes de comenzar.</p>
      </div>

      {/* Instrucciones */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-slate-200 mb-5 flex items-center gap-2">
          <span className="text-green-400 font-mono">📋</span> Instrucciones del examen
        </h2>
        <div className="space-y-3">
          {instrucciones.map((ins) => (
            <div
              key={ins.num}
              className="flex items-start gap-4 p-3 rounded-lg bg-slate-900/60 border border-slate-700/50"
            >
              <span className="font-mono text-green-400 text-sm font-bold shrink-0 mt-0.5 w-6 text-center">
                {ins.icon}
              </span>
              <div className="flex gap-3">
                <span className="font-mono text-slate-600 text-xs font-bold shrink-0 mt-1">{ins.num}</span>
                <p className="text-slate-300 text-sm leading-relaxed">{ins.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Estructura del examen */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card border-blue-500/20 bg-blue-900/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-400 text-xl">📝</span>
            <span className="font-mono text-blue-400 font-semibold text-sm">PARTE I</span>
          </div>
          <p className="text-slate-300 text-sm">40 preguntas de opción múltiple</p>
          <p className="text-slate-500 text-xs mt-1">Generadas aleatoriamente del banco de 100</p>
          <p className="text-blue-400 font-mono font-bold mt-2">50% de la calificación</p>
        </div>
        <div className="card border-green-500/20 bg-green-900/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-400 text-xl">💻</span>
            <span className="font-mono text-green-400 font-semibold text-sm">PARTE II</span>
          </div>
          <p className="text-slate-300 text-sm">Problema de programación en Java</p>
          <p className="text-slate-500 text-xs mt-1">Tema aleatorio asignado al iniciar</p>
          <p className="text-green-400 font-mono font-bold mt-2">50% de la calificación</p>
        </div>
      </div>

      {/* Timer info */}
      <div className="card border-yellow-500/20 bg-yellow-900/10 mb-6 flex items-center gap-3">
        <span className="text-3xl">⏱</span>
        <div>
          <p className="text-yellow-400 font-semibold">Tiempo límite: 90 minutos</p>
          <p className="text-slate-400 text-sm">El examen se cerrará automáticamente al vencer el tiempo.</p>
        </div>
      </div>

      {/* Checkbox de aceptación */}
      <label className="flex items-start gap-3 cursor-pointer card border-slate-600 mb-6 hover:border-green-500/40 transition-colors">
        <input
          type="checkbox"
          checked={acepta}
          onChange={e => setAcepta(e.target.checked)}
          className="mt-1 w-5 h-5 accent-green-500 cursor-pointer"
        />
        <span className="text-slate-300 text-sm leading-relaxed">
          He leído y entendido todas las instrucciones. Confirmo que{' '}
          <strong className="text-white">ya dejé mi celular</strong> en la mesa del profesor y que
          no haré uso de ninguna IA durante el examen.
        </span>
      </label>

      {/* Botón iniciar */}
      <button
        onClick={handleIniciar}
        disabled={!acepta || loading}
        className="btn-primary w-full justify-center py-4 text-lg disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading
          ? <><span className="animate-spin text-xl">⟳</span> Generando tu examen...</>
          : <><span className="text-xl">▶</span> Iniciar Examen</>
        }
      </button>
    </div>
  );
}
