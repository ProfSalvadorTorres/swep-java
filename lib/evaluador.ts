// ─── Evaluador automático de la Parte II ─────────────────────────────────────
// Analiza el texto del archivo .java y genera un checklist de cumplimiento.

export type ChecklistPartII = {
  tiene_arreglo_objetos: boolean;
  tiene_scanner: boolean;
  tiene_for: boolean;
  tiene_switch: boolean;
  tiene_constructor_minimo: boolean;
  tiene_constructor_maximo: boolean;
  tiene_constructor_intermedio: boolean;
  tiene_atributo_final: boolean;
  tiene_atributo_static: boolean;
  tiene_getter: boolean;
  tiene_setter: boolean;
  tiene_toString: boolean;
  tiene_pedirDatos: boolean;
  tiene_mostrarDatos: boolean;
  tiene_menu: boolean;
  num_atributos: number;
  puntaje_auto: number; // 0-100
};

export function evaluarCodigoJava(codigoFuente: string): ChecklistPartII {
  const c = codigoFuente;

  const tiene = (patron: RegExp | string): boolean => {
    if (typeof patron === 'string') return c.includes(patron);
    return patron.test(c);
  };

  // Detectar constructores: al menos 3 con diferente número de parámetros
  const constructores = c.match(/public\s+\w+\s*\([^)]*\)\s*\{/g) || [];
  const numConstructores = constructores.filter(ct =>
    !ct.includes('void') && !ct.includes('static')
  ).length;

  // Contar atributos (private tipo nombre)
  const atributos = c.match(/private\s+(int|float|double|char|boolean|String|long|byte|short)\s+\w+/g) || [];

  // Puntaje automático (15 criterios, cada uno ~6.67 puntos)
  const criterios = {
    tiene_arreglo_objetos: /\w+\[\s*\]\s+\w+\s*=\s*new\s+\w+\s*\[/.test(c),
    tiene_scanner:         tiene('Scanner'),
    tiene_for:             tiene(/\bfor\s*\(/.source.replace(/\//g,'')),
    tiene_switch:          tiene('switch'),
    tiene_constructor_minimo:    numConstructores >= 1,
    tiene_constructor_maximo:    numConstructores >= 2,
    tiene_constructor_intermedio:numConstructores >= 3,
    tiene_atributo_final:  tiene('final '),
    tiene_atributo_static: tiene('static '),
    tiene_getter:          /public\s+\w+\s+get\w+\s*\(\s*\)/.test(c),
    tiene_setter:          /public\s+void\s+set\w+\s*\(/.test(c),
    tiene_toString:        tiene('toString'),
    tiene_pedirDatos:      tiene('pedirDatos'),
    tiene_mostrarDatos:    tiene('mostrarDatos'),
    tiene_menu:            tiene('menu') || tiene('menú'),
  };

  const totalCriterios = Object.keys(criterios).length;
  const cumplidos = Object.values(criterios).filter(Boolean).length;
  const puntaje_auto = Math.round((cumplidos / totalCriterios) * 100);

  return {
    ...criterios,
    num_atributos: atributos.length,
    puntaje_auto,
  };
}

// Convierte el checklist a calificación sobre 5.0
export function checklistACalificacion(checklist: ChecklistPartII): number {
  return parseFloat(((checklist.puntaje_auto / 100) * 5).toFixed(2));
}

// Temas aleatorios para la Parte II
export const TEMAS_PARTE2 = [
  'Casa',       'Mesa',          'Automóvil',   'Avión',
  'Calculadora','Teléfono',      'Laptop',      'Bicicleta',
  'Robot',      'Videojuego',    'Mascota',     'Libro',
  'Película',   'Restaurante',   'Hospital',    'Banco',
  'Satélite',   'Drone',         'Cámara',      'Reloj',
];

export function seleccionarTemaAleatorio(): string {
  return TEMAS_PARTE2[Math.floor(Math.random() * TEMAS_PARTE2.length)];
}

// Genera el texto del problema de Parte II
export function generarProblemaPartII(tema: string): string {
  return `
Usando el tema: "${tema.toUpperCase()}"

Diseña e implementa en lenguaje Java un programa que cumpla TODOS los siguientes requisitos:

CLASE DE DISEÑO (${tema}):
  • Mínimo 5 atributos con tipos de dato diferentes (int, float, double, char, boolean, String, etc.)
  • Mínimo 1 atributo constante (final) con su representación en UML
  • Mínimo 1 atributo de clase (static) con su representación en UML
  • 3 constructores: mínimo (sin parámetros), intermedio y máximo (todos los parámetros)
  • Métodos getter y setter para cada atributo
  • Método toString() correctamente implementado con @Override
  • Método pedirDatos() — usa Scanner para leer todos los atributos del teclado
  • Método mostrarDatos() — imprime el valor de todos los atributos

CLASE PRUEBA (main):
  • Crear un arreglo de objetos de la clase ${tema}
  • Llenar el arreglo en tiempo de ejecución con pedirDatos()
  • Implementar una función menú() con opciones de interacción
  • Usar estructura for para recorrer el arreglo
  • Usar estructura switch-case dentro del menú
  • Crear al menos 1 par de objetos con cada versión de constructor
  • Demostrar el uso de setters, getters y toString()

EVIDENCIAS A SUBIR:
  1. Archivo fuente (.java) con el código completo
  2. Captura de pantalla / PDF de la ejecución del programa
`.trim();
}
