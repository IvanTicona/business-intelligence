/**
 * MOTOR SQL DEL CURSO · PostgreSQL
 *
 * Las consolas corren PGlite: PostgreSQL compilado a WebAssembly. Igual que
 * antes no hay servidor —la base vive en la pestaña del alumno— pero el
 * dialecto ahora es el mismo que se dicta en clase.
 *
 * PGlite es asíncrono, a diferencia de sql.js, así que todo lo que toca la base
 * devuelve promesas. La forma del resultado se mantiene en `{ columns, rows }`
 * con las filas como arreglos, que es lo que ya consume toda la aplicación.
 */

let motorPrometido = null

/**
 * Carga PGlite una sola vez.
 *
 * Va con `import()` dinámico a propósito: el motor pesa ~3,6 MB comprimido y no
 * tiene por qué descargarlo quien solo viene a ver los capítulos. Baja recién
 * cuando se abre una consola.
 */
export function cargarMotor() {
  if (!motorPrometido) {
    motorPrometido = import('@electric-sql/pglite').then(m => m.PGlite)
  }

  return motorPrometido
}

/**
 * Base vacía, lista para que el alumno escriba su propio DDL.
 *
 * `reiniciar()` vacía el esquema en vez de crear otra base: levantar una
 * instancia nueva cuesta más de un segundo, y el taller reinicia en cada
 * ejecución.
 */
export async function crearBaseVacia() {
  const PGlite = await cargarMotor()
  const db = new PGlite()

  db.reiniciar = async () => {
    await db.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
  }

  return db
}

/**
 * Crea una base y la puebla con el DDL + INSERTs del seed.
 * Cada práctica y cada base del laboratorio traen el suyo.
 */
export async function createDatabase(seedSql) {
  const db = await crearBaseVacia()
  await db.exec(seedSql)

  return db
}

/**
 * Ejecuta la consulta del alumno. Devuelve siempre la misma forma
 * ({ columns, rows }) para que la UI no tenga que ramificar.
 *
 * Un script con varias sentencias devuelve el resultado de la última que haya
 * traído filas, que es lo que el alumno espera ver.
 */
export async function runQuery(db, sql) {
  const salidas = await db.exec(sql, { rowMode: 'array' })
  if (!salidas.length) return { columns: [], rows: [] }

  for (let i = salidas.length - 1; i >= 0; i--) {
    if (salidas[i].fields?.length) {
      return {
        columns: salidas[i].fields.map(f => f.name),
        rows: salidas[i].rows,
      }
    }
  }

  return { columns: [], rows: [] }
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
