'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function FinalizarPage() {
  const router = useRouter();
  const [archivoJava, setArchivoJava]     = useState<File | null>(null);
  const [archivoEvidencia, setArchivoEvidencia] = useState<File | null>(null);
  const [subiendo, setSubiendo]           = useState(false);
  const [error, setError]                 = useState('');
  const [confirmarSinArchivos, setConfirmarSinArchivos] = useState(false);
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

  const enviarFinalizacion = async (sinArchivos: boolean) => {
    const alumnoId = sessionStorage.getItem('alumno_id');
    if (!alumnoId) { router.push('/'); return; }

    if (!sinArchivos) {
      if (!archivoJava)      { setError('Debes subir tu archivo .java'); return; }
      if (!archivoEvidencia) { setError('Debes subir la evidencia de ejecución'); return; }
    }

    setSubiendo(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('alumno_id', alumnoId);
      formData.append('sin_archivos', sinArchivos ? 'true' : 'false');

      if (!sinArchivos && archivoJava && archivoEvidencia) {
        formData.append('archivo_java',      archivoJava);
        formData.append('archivo_evidencia', archivoEvidencia);
        console.log('[finalizar] enviando con archivos:', {
          java: archivoJava.name + ' (' + archivoJava.size + 'B)',
          evidencia: archivoEvidencia.name + ' (' + archivoEvidencia.size + 'B)',
        });
      } else {
        console.log('[finalizar] enviando SIN archivos');
      }

      const res = await fetch('/api/examen/finalizar', {
        method: 'POST',
        body: formData,
      });

      const texto = await res.text();
      console.log('[finalizar] status:', res.status, 'body:', texto.slice(0, 300));

      let data;
      try { data = JSON.parse(texto); } catch {
        setError('Respuesta no válida del servidor: ' + texto.slice(0, 150));
        setSubiendo(false);
        return;
      }

      if (!res.ok) {
        const detalle = data.detalle ? ' — ' + data.detalle : '';
        setError((data.error ?? 'Error al finalizar') + detalle);
        setSubiendo(false);
        return;
      }

      sessionStorage.removeItem('respuestas_p1');
      if (data.calificacion_final != null) {
        sessionStorage.setItem('calificacion_final', String(data.calificacion_final));
      }
      router.push('/resultados');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError('Error de conexión: ' + msg);
      setSubiendo(false);
    }
  };

  const handleFinalizar = () => enviarFinalizacion(false);
  const handleFinalizarSinArchivos = () => enviarFinalizacion(true);

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
          ? <><span className="animate-spin text-xl">&#10227;</span> Procesando y enviando resultados...</>
          : <><span className="text-xl">&#127937;</span> Finalizar Examen con archivos</>
        }
      </button>

      <p className="text-center text-slate-600 text-xs mt-3">
        Al finalizar recibir&aacute;s un correo con tus resultados y las respuestas correctas.
      </p>

      {/* Separador */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-slate-700" />
        <span className="text-slate-600 text-xs font-mono">o bien</span>
        <div className="flex-1 h-px bg-slate-700" />
      </div>

      {/* Botón finalizar SIN archivos */}
      {!confirmarSinArchivos ? (
        <button
          onClick={() => setConfirmarSinArchivos(true)}
          disabled={subiendo}
          className="w-full py-3 rounded-lg border border-slate-600 bg-slate-800/50 text-slate-400 hover:border-yellow-600 hover:text-yellow-400 transition-all text-sm font-mono disabled:opacity-30"
        >
          No pude completar la Parte II &mdash; Finalizar sin archivos
        </button>
      ) : (
        <div className="rounded-xl border-2 border-yellow-600/50 bg-yellow-900/10 p-5">
          <p className="text-yellow-300 font-semibold text-sm mb-2">&#9888;&#65039; Atenci&oacute;n</p>
          <p className="text-slate-400 text-sm mb-4">
            Si finalizas sin subir archivos, tu <strong className="text-white">calificaci&oacute;n de la Parte II ser&aacute; 0.0</strong>.
            Solo se conservar&aacute; tu calificaci&oacute;n de la Parte I (opci&oacute;n m&uacute;ltiple).
            <br /><br />
            <span className="text-yellow-400/80">Esta acci&oacute;n no se puede deshacer.</span>
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleFinalizarSinArchivos}
              disabled={subiendo}
              className="flex-1 py-3 rounded-lg bg-yellow-600/20 border border-yellow-600 text-yellow-400 hover:bg-yellow-600/30 transition-all text-sm font-semibold disabled:opacity-30"
            >
              {subiendo ? '&#10227; Finalizando...' : 'S\u00ed, finalizar sin archivos'}
            </button>
            <button
              onClick={() => setConfirmarSinArchivos(false)}
              disabled={subiendo}
              className="flex-1 py-3 rounded-lg border border-slate-600 text-slate-400 hover:border-slate-500 transition-all text-sm"
            >
              &#8592; Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
