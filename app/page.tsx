'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const GRUPOS = ['2MM1','2MM2','2MM3','2MM4','2MM5','2MM6','2MM7','2MM8'];

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nombre: '', grupo: '', email: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones frontend
    if (!form.nombre.trim() || !form.grupo || !form.email.trim()) {
      setError('Por favor completa todos los campos.'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('El correo electrónico no es válido.'); return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al registrarse.'); return; }

      // Guardar alumno_id en sessionStorage para el flujo
      sessionStorage.setItem('alumno_id',   data.alumno_id);
      sessionStorage.setItem('alumno_nombre', form.nombre);
      sessionStorage.setItem('alumno_email',  form.email);
      sessionStorage.setItem('alumno_grupo',  form.grupo);

      router.push('/instrucciones');
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in flex flex-col items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md">

        {/* Logo / título */}
        <div className="text-center mb-8">
          <div className="inline-block bg-green-500/10 border border-green-500/30 rounded-2xl p-4 mb-4">
            <span className="text-5xl">💻</span>
          </div>
          <h1 className="text-3xl font-bold font-mono text-white mb-2">
            Examen <span className="text-green-400">Java</span>
          </h1>
          <p className="text-slate-400 text-sm">
            Programación Orientada a Objetos · Diagramas UML
          </p>
        </div>

        {/* Formulario */}
        <div className="card animate-fade-in">
          <h2 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2">
            <span className="text-green-400 font-mono">01</span>
            Registro del alumno
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Grupo */}
            <div>
              <label className="block text-sm text-slate-400 mb-1.5 font-mono">Grupo</label>
              <select
                name="grupo"
                value={form.grupo}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="">— Selecciona tu grupo —</option>
                {GRUPOS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-sm text-slate-400 mb-1.5 font-mono">
                Nombre completo
              </label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Apellidos Nombre"
                className="input-field"
                autoComplete="name"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm text-slate-400 mb-1.5 font-mono">
                Correo electrónico institucional
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="alumno@isia.com.mx"
                className="input-field"
                autoComplete="email"
                required
              />
              <p className="text-xs text-slate-600 mt-1">
                Los resultados se enviarán a este correo al finalizar.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-400 text-sm flex items-start gap-2">
                <span className="mt-0.5">⚠️</span> {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? <><span className="animate-spin">⟳</span> Verificando...</>
                : <><span>▶</span> Iniciar Examen</>
              }
            </button>
          </form>
        </div>

        {/* Nota anti-IA */}
        <div className="mt-4 border border-yellow-700/40 bg-yellow-900/10 rounded-lg p-3 flex items-start gap-2">
          <span className="text-yellow-500 text-lg mt-0.5">🚫</span>
          <p className="text-yellow-400/80 text-xs leading-relaxed">
            <strong className="text-yellow-300">Prohibido:</strong> el uso de cualquier IA
            (ChatGPT, Claude, Copilot, etc.) durante el examen. Su detección invalida el examen automáticamente.
          </p>
        </div>

        {/* Link al panel del profesor */}
        <div className="text-center mt-6">
          <a href="/profesor" className="text-slate-600 hover:text-slate-400 text-xs font-mono transition-colors">
            Panel del profesor →
          </a>
        </div>
      </div>
    </div>
  );
}
