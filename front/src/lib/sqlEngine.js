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
 * Base que SOBREVIVE al cierre de la pestaña.
 *
 * PGlite guarda su directorio de datos en IndexedDB cuando se le pasa una ruta
 * `idb://`, y vuelca a disco después de cada consulta. Es el único de sus
 * sistemas de archivos persistentes que corre en el hilo principal: el de OPFS
 * necesita un Web Worker, y encima Safari lo rompe porque una instalación de
 * Postgres abre más manejadores de archivo de los que permite.
 *
 * Dos pestañas escribiendo el MISMO directorio de IndexedDB corromperían la
 * base, así que la primera se queda con un cerrojo y la segunda recibe
 * `persistente: false` y trabaja en memoria. Es una limitación real y hay que
 * decírsela al alumno, no esconderla.
 *
 * @returns {Promise<{db: object, persistente: boolean, motivo: string|null}>}
 */
export async function abrirBasePersistente(nombre) {
  const PGlite = await cargarMotor()

  if (!(await tomarCerrojo(`bi-course-base-${nombre}`))) {
    return { db: conReinicio(new PGlite()), persistente: false, motivo: 'otra-pestana' }
  }

  /*
   * El descarte se pide en una carga y se ejecuta en la SIGUIENTE, y esa es la
   * parte importante.
   *
   * Borrar IndexedDB con la base todavía abierta no falla: se queda esperando a
   * que se cierre la conexión, y una instancia de PGlite que abortó a medio
   * abrir nunca la suelta. Medido, eso deja al alumno colgado en "Abriendo tu
   * base…" para siempre. Acá, en cambio, todavía no hay ninguna conexión: es el
   * único momento en que el borrado es seguro.
   */
  const pedido = window.localStorage.getItem(descarte(nombre))
  if (pedido) {
    window.localStorage.removeItem(descarte(nombre))
    try {
      await descartarGuardada(nombre)
    } catch (err) {
      console.warn('No se pudo descartar la base guardada:', err)
    }
  }

  try {
    return {
      db: conReinicio(await abrirGuardada(PGlite, nombre)),
      persistente: true,
      motivo: pedido ? 'descartada' : null,
    }
  } catch (err) {
    // Navegación privada, cuota agotada, o un volcado que quedó ilegible. No se
    // intenta arreglarlo sobre la marcha: se avisa y se ofrece descartar, que
    // es lo único que se puede hacer sin riesgo de colgar la página.
    console.warn('No se pudo abrir la base guardada:', err)

    return { db: conReinicio(new PGlite()), persistente: false, motivo: 'almacenamiento' }
  }
}

/**
 * Deja pedido que la base guardada se descarte en la próxima carga.
 * Devuelve nada: quien la llama recarga la página.
 */
export function pedirDescarte(nombre) {
  window.localStorage.setItem(descarte(nombre), '1')
}

const descarte = nombre => `bi-course-descartar-${nombre}`

/*
 * Todo lo que toca IndexedDB va con plazo, porque su forma de fallar no siempre
 * es un error: a veces simplemente se queda esperando. Sin plazo, el alumno
 * mira "Abriendo tu base…" para siempre y sin nada que le explique qué pasó.
 *
 * Medido, abrir tarda entre uno y cuatro segundos, así que quince no cortan
 * ninguna carga buena. Cerrar es inmediato cuando funciona, y sobre una
 * instancia a medio abrir no termina nunca: ahí dos segundos sobran.
 */
const PLAZO_APERTURA = 15000
const PLAZO_CIERRE = 2000

function conPlazo(promesa, ms, queja) {
  let reloj

  return Promise.race([
    Promise.resolve(promesa),
    new Promise((_, falla) => { reloj = setTimeout(() => falla(new Error(queja)), ms) }),
  ]).finally(() => clearTimeout(reloj))
}

async function abrirGuardada(PGlite, nombre) {
  const db = new PGlite(`idb://${nombre}`)

  try {
    await conPlazo(db.waitReady, PLAZO_APERTURA, 'IndexedDB no respondió a tiempo')

    return db
  } catch (err) {
    // Soltar la conexión antes de propagar el error. Una instancia a medio
    // abrir sigue contando como conexión abierta, y con eso el borrado que
    // viene después queda bloqueado: la recuperación no llegaría a intentarse.
    await conPlazo(db.close?.(), PLAZO_CIERRE, 'cierre colgado').catch(() => {})

    throw err
  }
}

/**
 * Borra el almacén de IndexedDB donde PGlite guarda su directorio de datos.
 *
 * Se busca por sufijo en vez de rearmar el nombre: hoy es `/pglite/<nombre>`,
 * pero ese prefijo es un detalle interno de la librería y no algo que prometa
 * mantener entre versiones.
 */
async function descartarGuardada(nombre) {
  const almacenes = (await indexedDB.databases?.()) ?? []
  const objetivo = almacenes.map(a => a.name).find(n => n?.endsWith(nombre)) ?? `/pglite/${nombre}`

  // Cerrar la conexión es asíncrono del lado del navegador, así que el primer
  // borrado puede encontrarla todavía viva. Se reintenta un par de veces en vez
  // de darla por perdida al primer "blocked".
  for (let intento = 1; intento <= 3; intento++) {
    const resultado = await new Promise(listo => {
      const pedido = indexedDB.deleteDatabase(objetivo)
      pedido.onsuccess = () => listo('ok')
      pedido.onerror = () => listo('error')
      pedido.onblocked = () => listo('bloqueado')
    })

    if (resultado === 'ok') return
    if (resultado === 'error') throw new Error(`No se pudo borrar ${objetivo}`)

    await new Promise(sigue => setTimeout(sigue, 300))
  }

  throw new Error(`${objetivo} sigue bloqueado por otra conexión`)
}

function conReinicio(db) {
  db.reiniciar = async () => {
    await db.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
  }

  return db
}

/**
 * Toma un cerrojo con nombre y lo retiene mientras viva la pestaña.
 *
 * `ifAvailable` hace que no espere: si otra pestaña ya lo tiene, devuelve null
 * en el acto en vez de quedarse colgado. El cerrojo se conserva mientras la
 * promesa que devuelve el callback siga pendiente, y se suelta solo cuando la
 * pestaña se cierra.
 */
function tomarCerrojo(nombre) {
  if (!navigator.locks) return Promise.resolve(true)

  return new Promise(resolve => {
    navigator.locks
      .request(nombre, { ifAvailable: true }, cerrojo => {
        resolve(Boolean(cerrojo))

        return cerrojo ? new Promise(() => {}) : undefined
      })
      .catch(() => resolve(true))
  })
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
