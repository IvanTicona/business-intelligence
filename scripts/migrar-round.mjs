/*
 * Castea a ::numeric el primer argumento de cada ROUND de dos argumentos.
 *
 *   node scripts/migrar-round.mjs [--aplicar]
 *
 * Postgres solo tiene ROUND(numeric, int): sobre REAL o DOUBLE PRECISION falla
 * con "function round(real, integer) does not exist". Son ~110 consultas y
 * editarlas a mano es donde se cuelan los errores.
 *
 * Sin --aplicar solo muestra qué cambiaría.
 */
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const APLICAR = process.argv.includes('--aplicar')

const ARCHIVOS = [
  'scripts/datasets/ketal.mjs',
  'scripts/datasets/teleferico.mjs',
  'scripts/datasets/bancosol.mjs',
  'scripts/datasets/arcoiris.mjs',
  'scripts/datasets/yaigo.mjs',
  'scripts/datasets/entel.mjs',
  'scripts/datasets/upb.mjs',
  'scripts/datasets/cinemateca.mjs',
  'front/src/practices/data/expocruz.js',
  'front/src/practices/data/spaziogym.js',
  'front/src/taller/caso-sagarnaga.js',
]

/**
 * Recorre el texto buscando ROUND( y castea su primer argumento.
 *
 * Cuenta paréntesis para encontrar la coma que separa DE VERDAD los dos
 * argumentos: adentro casi siempre hay funciones anidadas con sus propias
 * comas, y un split(',') las partiría mal.
 */
function castear(texto) {
  let salida = ''
  let i = 0
  let cambios = 0

  while (i < texto.length) {
    const relativo = texto.slice(i).search(/\bROUND\s*\(/i)
    if (relativo === -1) { salida += texto.slice(i); break }

    const inicio = i + relativo
    salida += texto.slice(i, inicio)

    const abre = texto.indexOf('(', inicio)
    let nivel = 0
    let coma = -1
    let cierra = -1

    for (let k = abre; k < texto.length; k++) {
      if (texto[k] === '(') nivel++
      else if (texto[k] === ')') { nivel--; if (nivel === 0) { cierra = k; break } }
      else if (texto[k] === ',' && nivel === 1 && coma === -1) coma = k
    }

    // ROUND de un solo argumento, o paréntesis sin cerrar: se deja como está.
    if (cierra === -1 || coma === -1) {
      salida += texto.slice(inicio, abre + 1)
      i = abre + 1
      continue
    }

    const primero = texto.slice(abre + 1, coma).trim()

    // Ya casteado: no se toca.
    if (/::\s*numeric\s*$/i.test(primero)) {
      salida += texto.slice(inicio, cierra + 1)
      i = cierra + 1
      continue
    }

    salida += `ROUND((${primero})::numeric${texto.slice(coma, cierra + 1)}`
    i = cierra + 1
    cambios++
  }

  return { salida, cambios }
}

let total = 0

for (const relativo of ARCHIVOS) {
  const ruta = join(RAIZ, relativo)
  const original = readFileSync(ruta, 'utf8')
  const { salida, cambios } = castear(original)

  total += cambios
  console.log(`  ${String(cambios).padStart(3)} · ${relativo}`)

  if (APLICAR && cambios > 0) writeFileSync(ruta, salida)
}

console.log(`\n${total} ROUND casteados${APLICAR ? ' y guardados' : ' (simulacro: usa --aplicar)'}`)
