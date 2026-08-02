/*
 * VALIDADOR DE CONTENIDO DEL PLAYGROUND
 *
 *   node scripts/validar-contenido.mjs
 *
 * Corre cada seed y cada reto contra SQLite de verdad y falla si encuentra
 * cualquiera de estos problemas, que son los que realmente aparecen al
 * escribir contenido a mano:
 *
 *   1. El seed no ejecuta.
 *   2. La solución no ejecuta.
 *   3. La solución devuelve 0 filas (el reto no se puede resolver).
 *   4. El starter YA resuelve el ejercicio solo (le regala la respuesta).
 *   5. La solución devuelve una sola fila con un solo valor NULL.
 *   6. Dos retos comparten id.
 *   7. El reto declara un bloque que no existe en el contrato.
 *
 * Cubre tanto las bases del playground como los retos de las prácticas 3 y 4,
 * que ya estaban en producción.
 */
import initSqlJs from 'sql.js'
import { readFile } from 'fs/promises'
import { fileURLToPath, pathToFileURL } from 'url'
import { dirname, join } from 'path'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const problemas = []
const avisos = []

const SQL = await initSqlJs({
  locateFile: () => join(RAIZ, 'node_modules/sql.js/dist/sql-wasm.wasm'),
})

function ejecutar(db, sql) {
  const res = db.exec(sql)
  if (res.length === 0) return { columns: [], rows: [] }
  const ultimo = res[res.length - 1]
  return { columns: ultimo.columns, rows: ultimo.values }
}

const normalizar = grid =>
  grid
    .map(fila => fila.map(v => (v === null ? '∅' : typeof v === 'number' ? Number(v.toFixed(2)) : String(v).trim())).join('|'))
    .sort()
    .join('\n')

/** Compara como lo hace la app: sin ORDER BY el orden de filas no se evalúa. */
function mismoResultado(a, b) {
  if (a.rows.length !== b.rows.length) return false
  if (a.columns.length !== b.columns.length) return false
  return normalizar(a.rows) === normalizar(b.rows)
}

function validarLote(etiqueta, seedSql, retos, bloquesValidos) {
  let db
  try {
    db = new SQL.Database()
    db.run(seedSql)
  } catch (err) {
    problemas.push(`[${etiqueta}] el SEED no ejecuta: ${err.message}`)
    return { retos: 0, filas: 0 }
  }

  const tablas = ejecutar(db, "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;")
  let filasTotales = 0
  for (const [tabla] of tablas.rows) {
    const { rows } = ejecutar(db, `SELECT COUNT(*) FROM "${tabla}";`)
    filasTotales += rows[0][0]
  }

  const vistos = new Set()
  for (const reto of retos) {
    const id = `${etiqueta}/${reto.id}`

    if (vistos.has(reto.id)) problemas.push(`[${id}] id repetido`)
    vistos.add(reto.id)

    if (bloquesValidos && reto.bloque && !bloquesValidos.has(reto.bloque)) {
      problemas.push(`[${id}] bloque desconocido: "${reto.bloque}"`)
    }

    let esperado
    try {
      esperado = ejecutar(db, reto.expectedSql)
    } catch (err) {
      problemas.push(`[${id}] la SOLUCIÓN no ejecuta: ${err.message}`)
      continue
    }

    if (esperado.rows.length === 0) {
      problemas.push(`[${id}] la solución devuelve 0 filas: el reto no se puede resolver`)
      continue
    }

    if (esperado.rows.length === 1 && esperado.rows[0].length === 1 && esperado.rows[0][0] === null) {
      problemas.push(`[${id}] la solución devuelve un único NULL`)
      continue
    }

    // El starter no debe resolver el ejercicio: si corre y da lo mismo que la
    // solución, el alumno aprieta Ejecutar y ya está aprobado.
    if (reto.starter) {
      try {
        const delStarter = ejecutar(db, reto.starter)
        if (mismoResultado(delStarter, esperado)) {
          problemas.push(`[${id}] el STARTER ya resuelve el ejercicio`)
        }
      } catch {
        // Lo normal: el starter tiene huecos y no ejecuta. Es lo que se espera.
      }
    }

    if (!reto.hint) avisos.push(`[${id}] sin pista`)
    if (reto.orderMatters === undefined) avisos.push(`[${id}] no declara orderMatters`)
  }

  db.close()
  return { retos: retos.length, filas: filasTotales }
}

// --- Bases del playground -------------------------------------------------

const contrato = await import(pathToFileURL(join(RAIZ, 'front/src/playground/datasets/contrato.js')))
const bloquesValidos = new Set(contrato.BLOQUES.map(b => b.id))

const registro = await import(pathToFileURL(join(RAIZ, 'front/src/playground/datasets/index.js')))

console.log('=== Bases del playground ===')
let totalRetos = 0
let totalKb = 0

for (const ficha of registro.catalogo) {
  if (!registro.idsDisponibles.includes(ficha.id)) {
    problemas.push(`[${ficha.id}] está en el catálogo pero no tiene cargador en index.js`)
    continue
  }

  const ds = await registro.cargarDataset(ficha.id)

  // La ficha se genera desde el dataset: si difieren, alguien editó a mano.
  if (ds.tablas.length !== ficha.tablas || ds.retos.length !== ficha.retos) {
    problemas.push(`[${ficha.id}] el catálogo no coincide con el dataset — regenera con scripts/datasets/catalogo.mjs`)
  }

  const { retos, filas } = validarLote(ds.id, ds.seedSql, ds.retos ?? [], bloquesValidos)
  totalRetos += retos
  const kb = ds.seedSql.length / 1024
  totalKb += kb
  console.log(`  ${ds.nombre.padEnd(22)} ${String(ds.tablas?.length ?? 0).padStart(2)} tablas · ${String(filas).padStart(6)} filas · ${String(retos).padStart(2)} retos · seed ${kb.toFixed(0).padStart(4)} KB`)
}

// --- Retos que ya estaban en las prácticas --------------------------------

console.log('\n=== Prácticas existentes ===')
const expocruz = await import(pathToFileURL(join(RAIZ, 'front/src/practices/data/expocruz.js')))
const spaziogym = await import(pathToFileURL(join(RAIZ, 'front/src/practices/data/spaziogym.js')))

const p3 = validarLote('practica-3', expocruz.expocruzSeedSql, expocruz.sqlChallenges, null)
console.log(`  Práctica 3 (ExpoCruz)   ${String(p3.filas).padStart(5)} filas · ${p3.retos} retos`)

// La práctica 4 guarda la consulta esperada en expectedSql igual que las demás.
const p4 = validarLote('practica-4', spaziogym.spazioGymSeedSql, spaziogym.kpiChallenges, null)
console.log(`  Práctica 4 (SpazioGym)  ${String(p4.filas).padStart(5)} filas · ${p4.retos} retos`)

totalRetos += p3.retos + p4.retos

// --- Resultado ------------------------------------------------------------

console.log(`\nTotal: ${registro.catalogo.length + 2} bases · ${totalRetos} consultas validadas · ${totalKb.toFixed(0)} KB de seeds (se cargan por separado)`)

if (avisos.length) {
  console.log(`\n${avisos.length} aviso(s):`)
  for (const a of avisos.slice(0, 12)) console.log('  · ' + a)
}

if (problemas.length) {
  console.log(`\n✗ ${problemas.length} problema(s):`)
  for (const p of problemas) console.log('  ✗ ' + p)
  process.exit(1)
}

console.log('\n✓ Todo el contenido valida')
