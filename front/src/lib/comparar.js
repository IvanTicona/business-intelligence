/**
 * COMPARACIÓN DE RESULTADOS
 *
 * Vivía junto al motor SQL del navegador. Ahora que el SQL corre en el
 * servidor, esto es lo único que quedó del lado del cliente: una función pura,
 * sin motor detrás.
 *
 * (La comparación se mueve al servidor en la fase 4. Mientras siga acá, un
 * alumno decidido puede alterarla desde la consola del navegador.)
 */

/**
 * Compara el resultado del alumno contra el esperado.
 * `orderMatters: false` ordena ambos lados antes de comparar, porque sin
 * ORDER BY el orden de filas no está garantizado y no es lo que evaluamos.
 */
export function compareResults(actual, expected, orderMatters = false) {
  if (actual.rows.length !== expected.rows.length) {
    return { ok: false, reason: `Esperaba ${expected.rows.length} fila(s) y obtuve ${actual.rows.length}.` }
  }

  if (actual.columns.length !== expected.columns.length) {
    return { ok: false, reason: `Esperaba ${expected.columns.length} columna(s) y obtuve ${actual.columns.length}.` }
  }

  const normalize = grid => grid.map(row => row.map(normalizeCell).join('␟'))
  const actualRows = normalize(actual.rows)
  const expectedRows = normalize(expected.rows)

  if (!orderMatters) {
    actualRows.sort()
    expectedRows.sort()
  }

  const mismatch = actualRows.findIndex((row, index) => row !== expectedRows[index])
  if (mismatch !== -1) {
    return {
      ok: false,
      reason: orderMatters
        ? `La fila ${mismatch + 1} no coincide. Revisa el ORDER BY y los valores.`
        : 'Los valores no coinciden. Revisa filtros, joins y agregaciones.',
    }
  }

  return { ok: true, reason: '' }
}

/**
 * Normaliza una celda para comparar.
 *
 * Postgres devuelve los NUMERIC como cadena para no perder precisión, así que
 * lo que parece texto puede ser un número: se intenta convertir antes de
 * comparar, o "1533.33" y 1533.33 se considerarían distintos.
 */
function normalizeCell(value) {
  if (value === null || value === undefined) return '∅'
  if (typeof value === 'number') return Number(value.toFixed(2)).toString()
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  const texto = String(value).trim()
  if (texto !== '' && !Number.isNaN(Number(texto))) {
    return Number(Number(texto).toFixed(2)).toString()
  }

  return texto
}
