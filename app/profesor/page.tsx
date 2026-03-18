'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfesorLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/profesor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Contraseña incorrecta.'); return; }
      sessionStorage.setItem('profesor_auth', 'true');
      router.push('/profesor/panel');
    } catch {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl mb-4 block">🔐</span>
          <h1 className="text-2xl font-bold font-mono text-white">Panel del Profesor</h1>
          <p className="text-slate-500 text-sm mt-1">SWEP-J — Acceso restringido</p>
        </div>
        <div className="card">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5 font-mono">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••••••"
                required
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm bg-red-900/20 border border-red-700 rounded p-2">
                ⚠️ {error}
              </p>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? '⟳ Verificando...' : '🔓 Entrar al panel'}
            </button>
          </form>
        </div>
        <div className="text-center mt-4">
          <a href="/" className="text-slate-600 hover:text-slate-400 text-xs font-mono">
            ← Volver al examen
          </a>
        </div>
      </div>
    </div>
  );
}
