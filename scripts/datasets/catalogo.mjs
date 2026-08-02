/*
 * Genera front/src/playground/datasets/catalogo.js
 *
 * El catálogo es la ficha de cada base (nombre, dominio, qué enseña) y pesa
 * unos pocos KB. Los seeds pesan cientos. Separarlos es lo que permite que la
 * página liste diez bases sin descargar ninguna: el dataset completo baja
 * recién cuando el alumno elige con cuál trabajar.
 *
 * Se regenera solo a partir de los datasets, así que la ficha nunca queda
 * desincronizada del contenido real.
 */
import { writeFileSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { dirname, join } from 'path'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..')
const DIR = join(RAIZ, 'front/src/playground/datasets')

// Orden pedagógico: de la estrella más simple a los modelos con más vueltas.
export const ORDEN = [
  'ketal',
  'teleferico',
  'bancosol',
  'arcoiris',
  'yaigo',
  'entel',
  'upb',
  'cinemateca',
]

if (new Set(ORDEN).size !== ORDEN.length) {
  throw new Error('ORDEN tiene ids repetidos: el catálogo saldría con bases duplicadas.')
}

const fichas = []

for (const id of ORDEN) {
  let mod
  try {
    mod = await import(pathToFileURL(join(DIR, `${id}.js`)))
  } catch {
    continue // todavía no generada
  }

  const ds = mod[id]
  const hechos = ds.tablas.filter(t => t.rol === 'hecho')
  const bloques = [...new Set(ds.retos.map(r => r.bloque))]

  fichas.push({
    id: ds.id,
    nombre: ds.nombre,
    subtitulo: ds.subtitulo,
    dominio: ds.dominio,
    tipo: ds.tipo,
    concepto: ds.concepto,
    nota: ds.nota,
    tablas: ds.tablas.length,
    hechos: hechos.length,
    retos: ds.retos.length,
    bloques,
  })
}

const archivo = `/*
 * Fichas de las bases del playground.
 *
 * ARCHIVO GENERADO. No lo edites a mano: se regenera con
 *   node scripts/datasets/catalogo.mjs
 *
 * Acá NO va el seedSql: ese es el punto. Esta lista se importa siempre y pesa
 * poco; los datos de cada base bajan por separado al elegirla.
 */

export const catalogo = ${JSON.stringify(fichas, null, 2).replace(/"([a-zA-Z_][a-zA-Z0-9_]*)":/g, '$1:')}

export const fichasPorId = Object.fromEntries(catalogo.map(ficha => [ficha.id, ficha]))
`

writeFileSync(join(DIR, 'catalogo.js'), archivo)
console.log(`catalogo.js escrito · ${fichas.length} base(s) · ${(archivo.length / 1024).toFixed(1)} KB`)
