/**
 * CONTRATO DE UN DATASET DEL PLAYGROUND
 *
 * Cada base de datos del playground vive en su propio archivo y exporta un
 * objeto con esta forma. Agregar una base nueva es escribir un archivo y
 * registrarlo en `index.js`: no se toca ni la página ni el diagrama.
 *
 * {
 *   id:        'ketal',                       // único, va en la URL y en las entregas
 *   nombre:    'Ketal',                       // negocio real de La Paz
 *   subtitulo: 'Supermercados · La Paz',
 *   dominio:   'Retail',
 *   tipo:      'estrella' | 'oltp',           // decide cómo se dibuja el modelo
 *   concepto:  'Qué enseña esta base y ninguna otra.',
 *   nota:      'Aclaración sobre los datos.',
 *
 *   seedSql:   'CREATE TABLE ...; INSERT ...',
 *
 *   tablas: [
 *     {
 *       nombre: 'hecho_venta',
 *       rol: 'hecho' | 'dimension' | 'tabla',  // color y forma en el diagrama
 *       x: 430, y: 300,                        // posición en el lienzo del diagrama
 *       columnas: [
 *         { nombre: 'id_venta', tipo: 'INTEGER', pk: true },
 *         { nombre: 'id_producto', tipo: 'INTEGER', fk: 'dim_producto' },
 *         { nombre: 'cantidad', tipo: 'INTEGER', metrica: true },
 *       ],
 *     },
 *   ],
 *
 *   retos: [
 *     {
 *       id: 'k1',
 *       bloque: 'navegar',                     // ver BLOQUES abajo
 *       concept: 'JOIN + GROUP BY',
 *       title: 'Ventas por categoría',
 *       prompt: 'Consigna para el alumno.',
 *       hint: 'Pista concreta, no la respuesta.',
 *       starter: 'SELECT ...\nFROM ...;',      // NUNCA debe resolver el ejercicio solo
 *       expectedSql: 'SELECT ...;',
 *       orderMatters: false,
 *       trampa: 'Opcional: por qué la respuesta intuitiva da mal.',
 *     },
 *   ],
 * }
 *
 * REGLA DE DATOS: los nombres de negocio son reales porque el alumno los
 * reconoce y eso hace la clase concreta. Las cifras son didácticas: no
 * representan la operación real de ninguna empresa.
 */

/** Los bloques ordenan los retos por operación de BI, no por sintaxis SQL. */
export const BLOQUES = [
  { id: 'navegar', nombre: 'Navegar la estrella', descripcion: 'Del hecho a sus dimensiones.' },
  { id: 'slice', nombre: 'Slice y dice', descripcion: 'Filtrar por atributo contra filtrar por métrica.' },
  { id: 'granularidad', nombre: 'Roll-up y drill-down', descripcion: 'La misma pregunta a distintos niveles.' },
  { id: 'aditividad', nombre: 'Aditividad', descripcion: 'Qué se puede sumar y qué no.' },
  { id: 'tiempo', nombre: 'Análisis temporal', descripcion: 'Acumulados, período anterior, año contra año.' },
  { id: 'ventanas', nombre: 'Funciones de ventana', descripcion: 'Ranking, participación y media móvil.' },
  { id: 'drill-across', nombre: 'Drill-across', descripcion: 'Responder con dos hechos a la vez.' },
  { id: 'trampas', nombre: 'Trampas del modelo', descripcion: 'Consultas que devuelven un número creíble y equivocado.' },
  { id: 'comparacion', nombre: 'OLTP contra estrella', descripcion: 'La misma pregunta en los dos modelos.' },
]

export const BLOQUES_POR_ID = Object.fromEntries(BLOQUES.map(bloque => [bloque.id, bloque]))

/** Ancho fijo de caja en el diagrama; el alto sale de la cantidad de columnas. */
export const CAJA_ANCHO = 190
export const CAJA_CABECERA = 26
export const CAJA_FILA = 18
