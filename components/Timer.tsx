'use client';
import { useEffect, useState, useCallback } from 'react';

interface TimerProps {
  duracionMinutos: number;
  onTimeUp: () => void;
}

export default function Timer({ duracionMinutos, onTimeUp }: TimerProps) {
  const [segundosRestantes, setSegundosRestantes] = useState(duracionMinutos * 60);
  const [urgente, setUrgente] = useState(false);

  const tick = useCallback(() => {
    setSegundosRestantes(prev => {
      if (prev <= 1) { onTimeUp(); return 0; }
      if (prev <= 600) setUrgente(true); // últimos 10 minutos
      return prev - 1;
    });
  }, [onTimeUp]);

  useEffect(() => {
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  const horas   = Math.floor(segundosRestantes / 3600);
  const minutos = Math.floor((segundosRestantes % 3600) / 60);
  const segs    = segundosRestantes % 60;
  const formato = `${String(horas).padStart(2,'0')}:${String(minutos).padStart(2,'0')}:${String(segs).padStart(2,'0')}`;

  const porcentaje = (segundosRestantes / (duracionMinutos * 60)) * 100;

  return (
    <div className={`fixed top-16 right-4 z-50 card border-2 transition-colors ${
      urgente ? 'border-red-500 bg-red-900/20' : 'border-slate-700'
    }`}>
      <div className="flex items-center gap-3">
        <span className={`text-lg ${urgente ? 'animate-pulse' : ''}`}>
          {urgente ? '🔴' : '⏱'}
        </span>
        <div>
          <p className={`font-mono text-xl font-bold ${urgente ? 'text-red-400' : 'text-green-400'}`}>
            {formato}
          </p>
          <p className="text-slate-500 text-xs">Tiempo restante</p>
        </div>
      </div>
      {/* Barra de progreso */}
      <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            urgente ? 'bg-red-500' : 'bg-green-500'
          }`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}
