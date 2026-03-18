'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ResultadosPage() {
  const router = useRouter();
  const [nombre, setNombre]   = useState('');
  const [email, setEmail]     = useState('');
  const [calif, setCalif]     = useState('—');
  const [correctas, setCorrectas] = useState('—');
  const [tema, setTema]       = useState('');

  useEffect(() => {
    const n  = sessionStorage.getItem('alumno_nombre')    ?? '';
    const e  = sessionStorage.getItem('alumno_email')     ?? '';
    const c  = sessionStorage.getItem('parte1_calif')     ?? '—';
    const co = sessionStorage.getItem('parte1_correctas') ?? '—';
    const t  = sessionStorage.getItem('tema_parte2')      ?? '';
    setNombre(n); setEmail(e); setCalif(c); setCorrectas(co); setTema(t);
    if (!n) router.push('/');
  }, [router]);

  return (
    <div className="animate-fade-in max-w-2xl mx-auto text-center">
      {/* Icono de éxito */}
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500 mb-4">
          <span className="text-5xl">🎉</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">¡Examen completado!</h1>
        <p className="text-slate-400">
          Gracias, <span className="text-green-400 font-semibold">{nombre}</span>. Tu examen ha sido enviado exitosamente.
        </p>
      </div>

      {/* Resumen */}
      <div className="card mb-6 text-left">
        <h2 className="font-mono text-slate-400 text-sm mb-4">📊 Resumen de tu examen</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-slate-700">
            <span className="text-slate-400">Parte I — Opción múltiple</span>
            <span className="font-mono text-blue-400 font-bold">{correctas}/40 · {parseFloat(calif).toFixed(2)}/5.0</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-700">
            <span className="text-slate-400">Parte II — Tema asignado</span>
            <span className="font-mono text-green-400 font-bold">"{tema}"</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-slate-400">Calificación Parte II</span>
            <span className="font-mono text-slate-500 italic">Pendiente de revisión del profesor</span>
          </div>
        </div>
      </div>

      {/* Correo */}
      <div className="card border-green-500/20 bg-green-900/10 mb-8">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📧</span>
          <div className="text-left">
            <p className="text-green-400 font-semibold">Resultados enviados</p>
            <p className="text-slate-400 text-sm">
              Revisa tu correo <strong className="text-white">{email}</strong> con las respuestas correctas de la Parte I.
            </p>
          </div>
        </div>
      </div>

      {/* Instrucciones finales */}
      <div className="card border-yellow-500/20 bg-yellow-900/10 text-left mb-8">
        <h3 className="text-yellow-400 font-semibold mb-2">📋 ¿Qué sigue?</h3>
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="flex gap-2"><span className="text-yellow-400">1.</span> El profesor revisará tu código de la Parte II.</li>
          <li className="flex gap-2"><span className="text-yellow-400">2.</span> La calificación final se publicará una vez que se complete la revisión.</li>
          <li className="flex gap-2"><span className="text-yellow-400">3.</span> Puedes retirarte del aula en orden.</li>
        </ul>
      </div>

      <p className="text-slate-600 text-xs font-mono">
        SWEP-J · Sistema de Evaluación de Programación en Java
      </p>
    </div>
  );
}
