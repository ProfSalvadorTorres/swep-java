'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Parte2Page() {
  const router = useRouter();
  const [tema, setTema]         = useState('');
  const [calif, setCalif]       = useState<string | null>(null);
  const [correctas, setCorrectas] = useState<string | null>(null);

  useEffect(() => {
    const alumnoId = sessionStorage.getItem('alumno_id');
    if (!alumnoId) { router.push('/'); return; }
    const t  = sessionStorage.getItem('tema_parte2') ?? '';
    const c  = sessionStorage.getItem('parte1_calif');
    const co = sessionStorage.getItem('parte1_correctas');
    setTema(t);
    setCalif(c);
    setCorrectas(co);
  }, [router]);

  const restricciones = [
    { cat: 'Clase de diseño',  items: [
      'Mínimo 5 atributos con tipos de dato DIFERENTES (int, float, double, char, boolean, String…)',
      'Mínimo 1 atributo constante (final) — representarlo en UML',
      'Mínimo 1 atributo de clase (static) — representarlo en UML',
      '3 constructores: mínimo (sin params), intermedio y máximo (todos los params)',
      'Métodos getter y setter para cada atributo',
      'Método toString() con @Override',
      'Método pedirDatos() — usa Scanner para leer atributos del teclado',
      'Método mostrarDatos() — imprime el valor de todos los atributos',
    ]},
    { cat: 'Clase Prueba (main)', items: [
      'Arreglo de objetos de la clase diseñada',
      'Función menú() con opciones de interacción',
      'Llenar el arreglo en tiempo de ejecución con pedirDatos()',
      'Ciclo for para recorrer el arreglo',
      'Estructura switch-case dentro del menú',
      'Al menos 1 par de objetos por cada versión de constructor',
      'Uso demostrable de setters, getters y toString()',
    ]},
    { cat: 'Evidencias a subir', items: [
      'Archivo fuente (.java) con el código completo',
      'Captura de pantalla / PDF de la ejecución del programa',
    ]},
  ];

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-16">
      {/* Resultado Parte I */}
      {calif && (
        <div className="card border-blue-500/30 bg-blue-900/10 mb-6 flex items-center gap-4">
          <span className="text-3xl">📝</span>
          <div>
            <p className="text-slate-400 text-sm font-mono">PARTE I completada</p>
            <p className="text-blue-400 font-bold text-lg">
              {correctas}/40 correctas · <span className="text-white">{parseFloat(calif).toFixed(2)}/5.0</span>
            </p>
          </div>
        </div>
      )}

      {/* Header Parte II */}
      <div className="text-center mb-8">
        <span className="badge bg-green-500/10 text-green-400 border border-green-500/30 text-sm mb-3">
          💻 PARTE II — Programación en Java
        </span>
        <h1 className="text-2xl font-bold text-white mb-2">
          Tu tema: <span className="text-green-400 font-mono">"{tema}"</span>
        </h1>
        <p className="text-slate-400 text-sm">
          Codifica en Java el programa que se describe a continuación.
        </p>
      </div>

      {/* Descripción del problema */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <span className="text-green-400 font-mono">📋</span> Descripción del problema
        </h2>
        <div className="code-block text-sm">
{`Diseña e implementa en lenguaje Java un programa completo
que modele un objeto del mundo real: "${tema}"

Tu solución debe estar dividida en DOS archivos:
  1. ${tema}.java  →  Clase de diseño
  2. Prueba${tema}.java  →  Clase de prueba (contiene main)

Aplica TODAS las restricciones listadas en esta página.`}
        </div>
      </div>

      {/* Restricciones */}
      <div className="space-y-4 mb-8">
        {restricciones.map((bloque) => (
          <div key={bloque.cat} className="card">
            <h3 className="font-semibold font-mono text-green-400 mb-3">
              ▶ {bloque.cat}
            </h3>
            <ul className="space-y-2">
              {bloque.items.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Herramienta de código (textarea recordatorio) */}
      <div className="card border-slate-600 mb-6">
        <h3 className="font-mono text-slate-400 text-sm mb-2">📌 Recuerda</h3>
        <p className="text-slate-400 text-sm leading-relaxed">
          Escribe tu código en tu IDE (NetBeans, Eclipse, IntelliJ, VS Code…).
          Cuando termines, sube el archivo <code className="text-green-400">.java</code> y
          una evidencia de la ejecución en la siguiente pantalla.
        </p>
      </div>

      {/* Botón continuar a subir archivos */}
      <button
        onClick={() => router.push('/examen/finalizar')}
        className="btn-primary w-full justify-center py-4 text-lg"
      >
        📤 Subir evidencias del examen →
      </button>
    </div>
  );
}
