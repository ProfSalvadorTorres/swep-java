import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SWEP-J — Sistema de Evaluación de Programación en Java',
  description: 'Evaluación automatizada para el curso introductorio de Java con UML',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-950 antialiased">
        {/* Header global */}
        <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
            <span className="font-mono text-green-400 font-bold text-lg tracking-tight">⚡ SWEP-J</span>
            <span className="text-slate-500 text-sm hidden sm:block">
              Sistema de Evaluación de Programación en Java
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8">
          {children}
        </main>

        <footer className="border-t border-slate-800 mt-16 py-6 text-center text-slate-600 text-sm font-mono">
          SWEP-J © {new Date().getFullYear()} — Curso Introductorio de Java · ISIA
        </footer>
      </body>
    </html>
  );
}
