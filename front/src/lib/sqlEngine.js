import initSqlJs from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

let enginePromise = null

// sql.js carga el .wasm por separado; Vite lo emite como asset y nos da la URL final.
function loadEngine() {
  if (!enginePromise) {
    enginePromise = initSqlJs({ locateFile: () => wasmUrl })
  }

  return enginePromise
}

/**
 * Crea una base SQLite en memoria y la puebla con el DDL + INSERTs del seed.
 * Cada práctica trae su propio seed, así los alumnos consultan datos reales.
 */
export async function createDatabase(seedSql) {
  const SQL = await loadEngine()
  const db = new SQL.Database()
  db.run(seedSql)

  return db
}

/**
 * Ejecuta la consulta del alumno. Devuelve siempre la misma forma
 * ({ columns, rows }) para que la UI no tenga que ramificar.
 */
export function runQuery(db, sql) {
  const results = db.exec(sql)
  if (results.length === 0) return { columns: [], rows: [] }

  const last = results[results.length - 1]
  return { columns: last.columns, rows: last.values }
}

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

  const normalize = grid => grid.map(row => row.map(normalizeCell).join(''))
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
        ? `La fila ${mismatch + 1} no coincide. Revisá el ORDER BY y los valores.`
        : 'Los valores no coinciden. Revisá filtros, joins y agregaciones.',
    }
  }

  return { ok: true, reason: '' }
}

// Los números salen de SQLite con precisión flotante: redondeamos para que
// 1533.3333333 y 1533.33 no se consideren respuestas distintas.
function normalizeCell(value) {
  if (value === null || value === undefined) return '∅'
  if (typeof value === 'number') return Number(value.toFixed(2)).toString()
  return String(value).trim()
}
