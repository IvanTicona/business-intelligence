/**
 * EJECUTOR DE SQL DE ALUMNO
 *
 * Todo lo que un alumno escribe pasa por acá y por ningún otro lado. Las reglas
 * que lo hacen seguro, en orden de importancia:
 *
 * 1. Corre SIEMPRE con `poolAlumno`, el rol pobre. No hay ningún caso, modo ni
 *    excepción que lo mande al pool admin. upb-sql sí tiene esa excepción —si
 *    detecta un GRANT y cree estar "en modo ejercicio", ejecuta como
 *    superusuario, y el modo lo decide el cliente en el cuerpo del pedido.
 *
 * 2. El schema NUNCA sale del pedido: se elige de una lista blanca contra los
 *    schemas realmente sembrados. Nada que escriba el alumno se interpola.
 *
 * 3. Todo va dentro de una transacción con `SET LOCAL`. Al terminarla, los
 *    ajustes se deshacen solos aunque la consulta falle: una conexión del pool
 *    nunca se le presta al siguiente con el search_path del anterior.
 *
 * 4. Las filas se traen con un CURSOR. El tope no se aplica cortando en Node
 *    después de recibirlo todo —que es lo que hace upb-sql, y por eso un SELECT
 *    sin WHERE sobre una tabla enorme le llena la memoria del proceso antes de
 *    truncar— sino pidiendo solo las primeras N por la red.
 */
import { exigirAlumno } from '../db/pools.js'
import { schemasDisponibles } from '../db/semillas.js'
import { palabraInicial, partirSentencias } from './sentencias.js'

export const MAX_FILAS = 1000
const TIEMPO_MAXIMO = '5s'

/** Palabras con las que empieza una sentencia que devuelve filas. */
const DEVUELVE_FILAS = new Set(['SELECT', 'WITH', 'VALUES', 'TABLE', 'SHOW', 'EXPLAIN'])

/**
 * @param {string} sql        lo que escribió el alumno
 * @param {string} schema     schema donde correr; debe estar en la lista blanca
 * @param {object} [opciones]
 * @param {string[]} [opciones.extra]  schemas adicionales para el search_path
 * @returns {Promise<{columns, rows, filas, recortado, ms, error}>}
 */
export async function ejecutarSql(sql, schema, { extra = [], pool = null, propio = false } = {}) {
  const consulta = String(sql ?? '').trim()
  if (!consulta) return fallo('Escribe una consulta.')

  const caminos = [schema, ...extra].filter(Boolean)
  for (const s of caminos) {
    if (!schemasDisponibles.has(s) && !/^alumno_\d+_[a-z]{1,20}$/.test(s)) {
      return fallo(`La base "${s}" no existe.`)
    }
  }

  /*
   * Se parte en sentencias ANTES de tocar la base. Sin esto, un punto y coma en
   * la consulta cierra el `DECLARE ... CURSOR FOR` de más abajo y lo que sigue
   * se ejecuta suelto — comprobado con `SELECT 1; CLOSE bi_cursor; SELECT 999`.
   * Partiendo acá, lo que se embebe es siempre UNA sentencia.
   */
  const sentencias = partirSentencias(consulta)
  if (sentencias.length === 0) return fallo('Escribe una consulta.')

  /*
   * Sin `pool`, el rol compartido de solo lectura: sirve para las bases del
   * curso, que son iguales para todos. Con `pool`, el del propio alumno, que en
   * Postgres es una identidad distinta y solo tiene permisos sobre lo suyo. Ese
   * es el aislamiento: no lo pone este código, lo pone la base.
   */
  const cliente = await (pool ?? exigirAlumno()).connect()
  const arranque = performance.now()
  const registro = []

  try {
    await cliente.query('BEGIN')
    // SET LOCAL: se deshace solo al cerrar la transacción.
    await cliente.query(`SET LOCAL search_path TO ${caminos.join(', ')}`)
    await cliente.query(`SET LOCAL statement_timeout TO '${TIEMPO_MAXIMO}'`)

    // Se corren todas en orden y se muestra el resultado de la ÚLTIMA que haya
    // devuelto filas, que es lo que el alumno espera ver.
    let salida = { columns: [], rows: [], filas: 0, recortado: false }
    let numero = 0

    for (const sentencia of sentencias) {
      numero += 1
      try {
        const parcial = DEVUELVE_FILAS.has(palabraInicial(sentencia))
          ? await conCursor(cliente, sentencia)
          : await directo(cliente, sentencia)

        if (parcial.columns.length > 0 || sentencias.length === 1) salida = parcial

        registro.push({
          numero,
          tipo: etiqueta(sentencia),
          resumen: resumir(sentencia),
          ok: true,
          detalle: parcial.columns.length ? `${parcial.filas} fila(s)` : `${parcial.filas} fila(s) afectada(s)`,
        })
      } catch (err) {
        // Con varias sentencias, decir CUÁL falló. Un "syntax error" sobre un
        // script de cuarenta líneas no le enseña nada a nadie.
        err.sentencia = sentencias.length > 1 ? numero : null
        registro.push({
          numero,
          tipo: etiqueta(sentencia),
          resumen: resumir(sentencia),
          ok: false,
          detalle: mensajeDeError(err, propio),
        })
        err.registro = registro
        throw err
      }
    }

    await cliente.query('COMMIT')

    return { ...salida, registro, sentencias: sentencias.length, ms: Math.round(performance.now() - arranque), error: null }
  } catch (err) {
    await cliente.query('ROLLBACK').catch(() => {})

    return {
      ...fallo(mensajeDeError(err, propio), Math.round(performance.now() - arranque)),
      registro: err.registro ?? registro,
      sentencias: sentencias.length,
    }
  } finally {
    cliente.release()
  }
}

/** Primeras palabras útiles, para etiquetar la sentencia en el registro. */
function etiqueta(sentencia) {
  const inicial = palabraInicial(sentencia)
  if (!['CREATE', 'DROP', 'ALTER'].includes(inicial)) return inicial

  const limpia = sentencia.replace(/^\s*(?:--[^\n]*\n|\/\*[\s\S]*?\*\/|\s)+/, '')
  const segunda = limpia.split(/\s+/)[1] ?? ''

  return `${inicial} ${segunda.toUpperCase()}`.trim()
}

const resumir = sentencia => sentencia.replace(/\s+/g, ' ').trim().slice(0, 70)

/*
 * Se piden MAX_FILAS + 1 para saber si había más sin tener que contarlas: si
 * vuelve una de más, se descarta y se avisa que el resultado está recortado.
 */
async function conCursor(cliente, consulta) {
  // Ya viene de `partirSentencias`, así que no trae punto y coma libre.
  await cliente.query(`DECLARE bi_cursor NO SCROLL CURSOR FOR ${consulta}`)
  const salida = await cliente.query(`FETCH FORWARD ${MAX_FILAS + 1} FROM bi_cursor`)
  await cliente.query('CLOSE bi_cursor')

  const columnas = salida.fields?.map(f => f.name) ?? []
  const recortado = salida.rows.length > MAX_FILAS
  const filas = recortado ? salida.rows.slice(0, MAX_FILAS) : salida.rows

  return {
    columns: columnas,
    rows: filas.map(fila => columnas.map(c => fila[c])),
    filas: filas.length,
    recortado,
  }
}

async function directo(cliente, consulta) {
  const salida = await cliente.query(consulta)
  const columnas = salida.fields?.map(f => f.name) ?? []

  return {
    columns: columnas,
    rows: (salida.rows ?? []).slice(0, MAX_FILAS).map(fila => columnas.map(c => fila[c])),
    filas: salida.rowCount ?? 0,
    recortado: false,
  }
}

function fallo(mensaje, ms = 0) {
  return { columns: [], rows: [], filas: 0, recortado: false, ms, error: mensaje }
}

/**
 * Postgres da bastante más que el mensaje: posición del carácter, pista y
 * detalle. Se aprovechan, porque para el alumno la diferencia entre "syntax
 * error" y "syntax error en la posición 42, quizás quisiste..." es enorme.
 */
function mensajeDeError(err, propio = false) {
  // 57014 es la consulta cancelada por statement_timeout. El mensaje que da
  // Postgres ("canceling statement due to statement timeout") no le dice al
  // alumno qué hacer.
  if (err.code === '57014') {
    return `Tu consulta tardó más de ${TIEMPO_MAXIMO} y se detuvo. Suele pasar por un JOIN sin condición: revisa que cada tabla que sumas tenga su ON.`
  }
  /*
   * El mismo código de Postgres significa cosas distintas según dónde esté
   * parado el alumno, y decirle la equivocada lo manda a buscar el problema al
   * lugar equivocado. En su propia base tiene permiso para todo, así que un
   * "permiso denegado" ahí solo puede ser que apuntó afuera.
   */
  if (err.code === '42501') {
    return propio
      ? 'No tienes permiso para eso. En tu base puedes hacer lo que quieras, pero fuera de ella no: las bases del curso son de solo lectura y las de tus compañeros no se tocan.'
      : 'No tienes permiso para eso. Las bases del laboratorio son de solo lectura: puedes consultarlas, no modificarlas.'
  }

  const partes = [String(err.message ?? 'Error al ejecutar').split('\n')[0]]
  if (err.sentencia) partes.unshift(`Falló la sentencia ${err.sentencia}:`)
  if (err.position) partes.push(`(posición ${err.position})`)
  if (err.hint) partes.push(`— ${err.hint}`)
  else if (err.detail) partes.push(`— ${err.detail}`)

  return partes.join(' ')
}
