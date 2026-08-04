/**
 * Ejecuta el script del alumno sentencia por sentencia.
 *
 * Dos decisiones que valen la pena explicar:
 *
 * 1. Cada ejecución arranca de una base VACÍA. Correr dos veces un CREATE TABLE
 *    fallaría con "table already exists", y obligar al alumno a acordarse de
 *    borrar la base antes de cada intento sería una molestia sin valor
 *    didáctico. Con la base recreada, el script ES el estado: lo que está
 *    escrito es exactamente lo que existe.
 *
 * 2. Se corre sentencia por sentencia y no todo junto, para poder decir CUÁL
 *    falló. Un "syntax error" sobre un script de cuarenta líneas no le enseña
 *    nada a nadie.
 */

/**
 * Parte el script en sentencias.
 *
 * No alcanza con `split(';')`: un punto y coma dentro de una cadena o de un
 * comentario partiría la sentencia por la mitad.
 */
export function partirSentencias(script) {
  const sentencias = []
  let actual = ''
  let enCadena = false
  let enComentarioLinea = false
  let enComentarioBloque = false

  for (let i = 0; i < script.length; i++) {
    const c = script[i]
    const siguiente = script[i + 1]

    if (enComentarioLinea) {
      actual += c
      if (c === '\n') enComentarioLinea = false
      continue
    }

    if (enComentarioBloque) {
      actual += c
      if (c === '*' && siguiente === '/') {
        actual += siguiente
        i++
        enComentarioBloque = false
      }
      continue
    }

    if (enCadena) {
      actual += c
      // '' escapa una comilla dentro de la cadena.
      if (c === "'" && siguiente === "'") {
        actual += siguiente
        i++
      } else if (c === "'") {
        enCadena = false
      }
      continue
    }

    if (c === '-' && siguiente === '-') { enComentarioLinea = true; actual += c; continue }
    if (c === '/' && siguiente === '*') { enComentarioBloque = true; actual += c; continue }
    if (c === "'") { enCadena = true; actual += c; continue }

    if (c === ';') {
      if (actual.trim()) sentencias.push(actual.trim())
      actual = ''
      continue
    }

    actual += c
  }

  if (actual.trim()) sentencias.push(actual.trim())
  return sentencias
}

/** Primera palabra útil de la sentencia, para etiquetarla en el registro. */
function tipoDe(sentencia) {
  const limpia = sentencia
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .trim()

  const palabra = limpia.split(/\s+/)[0]?.toUpperCase() ?? ''
  if (palabra === 'CREATE' || palabra === 'DROP' || palabra === 'ALTER') {
    const segunda = limpia.split(/\s+/)[1]?.toUpperCase() ?? ''
    return `${palabra} ${segunda}`.trim()
  }
  return palabra
}

/** Resumen corto de la sentencia para mostrar en el registro. */
function resumir(sentencia) {
  return sentencia.replace(/\s+/g, ' ').trim().slice(0, 70)
}

/**
 * @param {object} db      base de PGlite, ya creada y vacía
 * @param {string} script
 * @returns {Promise<{registro: Array, resultado: object|null, error: object|null}>}
 *          La base queda poblada: de ahí lee el diagrama.
 */
export async function ejecutarScript(db, script) {
  await db.reiniciar()

  const sentencias = partirSentencias(script)
  const registro = []
  let resultado = null
  let error = null

  for (let i = 0; i < sentencias.length; i++) {
    const sentencia = sentencias[i]
    const tipo = tipoDe(sentencia)

    try {
      const salida = await db.query(sentencia, [], { rowMode: 'array' })
      const devuelveFilas = salida.fields?.length > 0

      // El último SELECT con columnas es lo que se muestra en la tabla.
      if (devuelveFilas) {
        resultado = { columns: salida.fields.map(f => f.name), rows: salida.rows }
      }

      registro.push({
        numero: i + 1,
        tipo,
        resumen: resumir(sentencia),
        ok: true,
        detalle: devuelveFilas
          ? `${salida.rows.length} fila(s)`
          : salida.affectedRows > 0
            ? `${salida.affectedRows} fila(s) afectada(s)`
            : 'ok',
      })
    } catch (err) {
      error = {
        numero: i + 1,
        tipo,
        resumen: resumir(sentencia),
        mensaje: mensajeDeError(err),
      }
      registro.push({ numero: i + 1, tipo, resumen: resumir(sentencia), ok: false, detalle: mensajeDeError(err) })
      // Se corta acá: seguir después de un CREATE TABLE fallido solo genera
      // errores en cascada que esconden el problema real.
      break
    }
  }

  return { registro, resultado, error }
}

/**
 * Postgres da bastante más que el mensaje: posición del carácter, pista y
 * detalle. Se aprovechan, porque para el alumno la diferencia entre "syntax
 * error" y "syntax error en la posición 42, quizás quisiste..." es enorme.
 */
function mensajeDeError(err) {
  const partes = [err.message.split('\n')[0]]
  if (err.position) partes.push(`(posición ${err.position})`)
  if (err.hint) partes.push(`— ${err.hint}`)
  else if (err.detail) partes.push(`— ${err.detail}`)

  return partes.join(' ')
}
