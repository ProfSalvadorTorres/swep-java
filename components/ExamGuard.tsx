'use client';
import { useEffect, useRef } from 'react';

interface ExamGuardProps {
  activo: boolean;
  onIntentoCopia?: () => void;
}

/**
 * Mejora 2 — Protección anti-cheating:
 * - Bloquea refresh / cierre de pestaña (beforeunload)
 * - Deshabilita clic derecho durante el examen
 * - Detecta pérdida de foco (alt-tab / cambio de ventana)
 * - Bloquea atajos de teclado (Ctrl+C en el contexto de preguntas,
 *   Ctrl+U para ver fuente, F12 para devtools)
 */
export default function ExamGuard({ activo, onIntentoCopia }: ExamGuardProps) {
  const alertasMostradas = useRef(0);

  useEffect(() => {
    if (!activo) return;

    // ── beforeunload: advertir al cerrar/refrescar ──────────────────
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '¿Seguro que quieres salir? Tus respuestas no enviadas podrían perderse.';
      return e.returnValue;
    };

    // ── Bloquear clic derecho ───────────────────────────────────────
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // ── Bloquear atajos peligrosos ──────────────────────────────────
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 — DevTools
      if (e.key === 'F12') { e.preventDefault(); return; }
      // Ctrl+U — Ver fuente
      if (e.ctrlKey && e.key === 'u') { e.preventDefault(); return; }
      // Ctrl+Shift+I — DevTools
      if (e.ctrlKey && e.shiftKey && e.key === 'I') { e.preventDefault(); return; }
      // Ctrl+Shift+J — Console
      if (e.ctrlKey && e.shiftKey && e.key === 'J') { e.preventDefault(); return; }
    };

    // ── Detectar cambio de pestaña / ventana ────────────────────────
    const handleVisibility = () => {
      if (document.hidden && alertasMostradas.current < 3) {
        alertasMostradas.current++;
        onIntentoCopia?.();
      }
    };

    // ── Bloquear arrastrar texto (anti-copiar preguntas) ────────────
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload',     handleBeforeUnload);
    document.addEventListener('contextmenu',    handleContextMenu);
    document.addEventListener('keydown',        handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('dragstart',      handleDragStart);

    // CSS: deshabilitar selección de texto en preguntas
    document.body.style.userSelect = 'none';
    document.body.style.setProperty('-webkit-user-select', 'none');

    return () => {
      window.removeEventListener('beforeunload',     handleBeforeUnload);
      document.removeEventListener('contextmenu',    handleContextMenu);
      document.removeEventListener('keydown',        handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('dragstart',      handleDragStart);
      document.body.style.userSelect = '';
      document.body.style.removeProperty('-webkit-user-select');
    };
  }, [activo, onIntentoCopia]);

  return null; // componente invisible, solo hooks
}
