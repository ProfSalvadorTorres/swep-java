'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function FinalizarPage() {
  const router = useRouter();
  const [archivoJava, setArchivoJava]     = useState<File | null>(null);
  const [archivoEvidencia, setArchivoEvidencia] = useState<File | null>(null);
  const [subiendo, setSubiendo]           = useState(false);
  const [error, setError]                 = useState('');
  const javaRef      = useRef<HTMLInputElement>(null);
  const evidRef      = useRef<HTMLInputElement>(null);

  const validarJava = (f: File) => f.name.endsWith('.java');
  const validarEvid = (f: File) => /\.(pdf|jpg|jpeg|png)$/i.test(f.name);

  const handleJava = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!validarJava(f)) { setError('El archivo de código debe tener extensión .java'); return; }
    setArchivoJava(f); setError('');
  };

  const handleEvidencia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!validarEvid(f)) { setError('La evidencia debe ser PDF, JPG o PNG'); return; }
    setArchivoEvidencia(f); setError('');
  };

  const handleFinalizar = async () => {
    if (!archivoJava)      { setError('Debes subir tu archivo .java'); return; }
    if (!archivoEvidencia) { setError('Debes subir la evidencia de ejecución'); return; }

    const alumnoId = sessionStorage.getItem('alumno_id');
    if (!alumnoId) { router.push('/'); return; }

    setSubiendo(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('alumno_id',         alumnoId);
      formData.append('archivo_java',      archivoJava);
      formData.append('archivo_evidencia', archivoEvidencia);

      const res = await fetch('/api/examen/finalizar', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al finalizar'); setSubiendo(false); return; }

      // Limpiar session
      sessionStorage.removeItem('respuestas_p1');
      router.push('/resultados');
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
      setSubiendo(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto pb-16">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">
          <span className="text-green-400 font-mono">Paso final</span> — Subir evidencias
        </h1>
        <p className="text-slate-400 text-sm">
          Sube tu código fuente y la evidencia de ejecución para completar el examen.
        </p>
      </div>

      {/* Upload Java */}
      <div className="card mb-4">
        <h3 className="font-mono text-blue-400 font-semibold mb-3 flex items-center gap-2">
          <span>📄</span> Archivo de código fuente
        </h3>
        <p className="text-slate-500 text-xs mb-3">
          Extensión requerida: <code className="text-green-400">.java</code>
        </p>
        <div
          onClick={() => javaRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            archivoJava
              ? 'border-green-500 bg-green-900/10'
              : 'border-slate-600 hover:border-blue-500 bg-slate-900/40'
          }`}
        >
          {archivoJava ? (
            <div>
              <div className="text-3xl mb-2">✅</div>
              <p className="text-green-400 font-mono text-sm">{archivoJava.name}</p>
              <p className="text-slate-500 text-xs mt-1">{(archivoJava.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <div className="text-3xl mb-2 text-slate-500">📁</div>
              <p className="text-slate-400 text-sm">Clic para seleccionar tu archivo <strong>.java</strong></p>
            </div>
          )}
        </div>
        <input ref={javaRef} type="file" accept=".java" onChange={handleJava} className="hidden" />
      </div>

      {/* Upload Evidencia */}
      <div className="card mb-6">
        <h3 className="font-mono text-blue-400 font-semibold mb-3 flex items-center gap-2">
          <span>🖼</span> Evidencia de ejecución
        </h3>
        <p className="text-slate-500 text-xs mb-3">
          Extensiones permitidas: <code className="text-green-400">.pdf .jpg .png</code>
        </p>
        <div
          onClick={() => evidRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            archivoEvidencia
              ? 'border-green-500 bg-green-900/10'
              : 'border-slate-600 hover:border-blue-500 bg-slate-900/40'
          }`}
        >
          {archivoEvidencia ? (
            <div>
              <div className="text-3xl mb-2">✅</div>
              <p className="text-green-400 font-mono text-sm">{archivoEvidencia.name}</p>
              <p className="text-slate-500 text-xs mt-1">{(archivoEvidencia.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <div className="text-3xl mb-2 text-slate-500">🖼</div>
              <p className="text-slate-400 text-sm">Captura de pantalla o PDF de la ejecución</p>
            </div>
          )}
        </div>
        <input ref={evidRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleEvidencia} className="hidden" />
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-400 text-sm mb-4 flex gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Checklist visual */}
      <div className="card border-slate-700 mb-6">
        <h3 className="text-slate-400 font-mono text-sm mb-3">✅ Antes de finalizar verifica:</h3>
        <ul className="space-y-2 text-sm">
          {[
            ['Respondiste todas las preguntas de la Parte I', true],
            ['Tu código Java implementa TODAS las restricciones', true],
            ['Subiste el archivo .java',          !!archivoJava],
            ['Subiste la evidencia de ejecución', !!archivoEvidencia],
          ].map(([label, ok], i) => (
            <li key={i} className="flex items-center gap-2">
              <span className={ok ? 'text-green-400' : 'text-slate-600'}>{ok ? '✅' : '⭕'}</span>
              <span className={ok ? 'text-slate-300' : 'text-slate-500'}>{label as string}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={handleFinalizar}
        disabled={!archivoJava || !archivoEvidencia || subiendo}
        className="btn-primary w-full justify-center py-4 text-lg disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {subiendo
          ? <><span className="animate-spin text-xl">⟳</span> Procesando y enviando resultados...</>
          : <><span className="text-xl">🏁</span> Finalizar Examen</>
        }
      </button>

      <p className="text-center text-slate-600 text-xs mt-3">
        Al finalizar recibirás un correo con tus resultados y las respuestas correctas.
      </p>
    </div>
  );
}
