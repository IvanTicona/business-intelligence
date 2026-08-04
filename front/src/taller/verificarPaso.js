import { contarFilas, verificarEsquema } from './esquemaVivo.js'

/**
 * Decide si un paso del taller está resuelto, mirando la base que el alumno
 * acaba de construir.
 *
 * Devuelve siempre `{ ok, problemas[] }`. Los problemas están escritos para el
 * alumno: "a reserva le falta la columna estado", no un stack trace.
 */
export async function verificarPaso(paso, { db, tablas, modelo }) {
  if (!db) return { ok: false, problemas: ['Ejecuta el script para empezar.'] }

  const { verificar } = paso

  if (verificar.tipo === 'esquema') {
    const pedido = modelo.find(m => m.tabla === verificar.tabla)
    if (!pedido) return { ok: false, problemas: [`El caso no define la tabla ${verificar.tabla}.`] }

    const problemas = verificarEsquema(tablas, pedido)
    return { ok: problemas.length === 0, problemas }
  }

  if (verificar.tipo === 'filas') {
    const problemas = []
    for (const [tabla, minimo] of Object.entries(verificar.minimos)) {
      const reales = await contarFilas(db, tabla)
      if (reales < minimo) {
        problemas.push(`${tabla} tiene ${reales} fila(s) y necesita ${minimo}.`)
      }
    }
    return { ok: problemas.length === 0, problemas }
  }

  if (verificar.tipo === 'consulta') {
    return verificarConsulta(db, paso)
  }

  return { ok: false, problemas: ['Este paso no tiene forma de verificarse.'] }
}

/**
 * Compara el ÚLTIMO SELECT del script del alumno contra la consulta esperada.
 *
 * Ambas se corren sobre la misma base, así que si el alumno cargó los datos
 * pedidos, la comparación es sobre las mismas filas.
 */
async function verificarConsulta(db, paso) {
  const { resultadoDelAlumno } = paso
  if (!resultadoDelAlumno || !resultadoDelAlumno.columns?.length) {
    return { ok: false, problemas: ['Tu script todavía no termina en una consulta que devuelva filas.'] }
  }

  let esperado
  try {
    const salida = await db.query(paso.verificar.sql, [], { rowMode: 'array' })
    esperado = { columns: salida.fields.map(f => f.name), rows: salida.rows }
  } catch (error) {
    return { ok: false, problemas: [`No se pudo calcular la respuesta esperada: ${error.message}`] }
  }

  if (resultadoDelAlumno.columns.length !== esperado.columns.length) {
    return {
      ok: false,
      problemas: [`Tu consulta devuelve ${resultadoDelAlumno.columns.length} columna(s) y se esperaban ${esperado.columns.length}.`],
    }
  }

  if (resultadoDelAlumno.rows.length !== esperado.rows.length) {
    return {
      ok: false,
      problemas: [`Tu consulta devuelve ${resultadoDelAlumno.rows.length} fila(s) y se esperaban ${esperado.rows.length}. Revisa los filtros y los JOIN.`],
    }
  }

  // Postgres devuelve los NUMERIC como cadena para no perder precisión, así que
  // lo que parece texto puede ser un número: se intenta convertir antes.
  const normalizar = grid =>
    grid.map(fila =>
      fila
        .map(v => {
          if (v === null || v === undefined) return '∅'
          if (typeof v === 'number') return Number(v.toFixed(2))
          if (v instanceof Date) return v.toISOString().slice(0, 10)
          const t = String(v).trim()
          return t !== '' && !Number.isNaN(Number(t)) ? Number(Number(t).toFixed(2)) : t
        })
        .join('|'),
    )

  const mias = normalizar(resultadoDelAlumno.rows)
  const suyas = normalizar(esperado.rows)

  if (!paso.verificar.ordenImporta) {
    mias.sort()
    suyas.sort()
  }

  const fallo = mias.findIndex((fila, i) => fila !== suyas[i])
  if (fallo !== -1) {
    return {
      ok: false,
      problemas: [
        paso.verificar.ordenImporta
          ? `La fila ${fallo + 1} no coincide. Revisa el ORDER BY y los valores.`
          : 'Los valores no coinciden. Revisa filtros, JOIN y agregaciones.',
      ],
    }
  }

  return { ok: true, problemas: [] }
}
