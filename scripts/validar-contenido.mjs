/*
 * VALIDADOR DE CONTENIDO DEL PLAYGROUND
 *
 *   node scripts/validar-contenido.mjs
 *
 * Corre cada seed y cada reto contra PostgreSQL de verdad (PGlite, el mismo
 * motor que usan las consolas) y falla si encuentra cualquiera de estos
 * problemas, que son los que realmente aparecen al escribir contenido a mano:
 *
 *   1. El seed no ejecuta.
 *   2. La solución no ejecuta.
 *   3. La solución devuelve 0 filas (el reto no se puede resolver).
 *   4. El starter YA resuelve el ejercicio solo (le regala la respuesta).
 *   5. La solución devuelve una sola fila con un solo valor NULL.
 *   6. Dos retos comparten id.
 *   7. El reto declara un bloque que no existe en el contrato.
 *
 * Cubre tanto las bases del playground como los retos de las prácticas 3 y 4 y
 * el caso del taller, que ya estaban en producción.
 */
import { PGlite } from '@electric-sql/pglite'
import { fileURLToPath, pathToFileURL } from 'url'
import { dirname, join } from 'path'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const problemas = []
const avisos = []

/** Devuelve { columns, rows } con las filas como arreglos, igual que la app. */
async function ejecutar(db, sql) {
  const salidas = await db.exec(sql, { rowMode: 'array' })
  for (let i = salidas.length - 1; i >= 0; i--) {
    if (salidas[i].fields?.length) {
      return { columns: salidas[i].fields.map(f => f.name), rows: salidas[i].rows }
    }
  }
  return { columns: [], rows: [] }
}

/**
 * Normaliza para comparar. Postgres devuelve los NUMERIC como cadena para no
 * perder precisión, así que lo que parece texto puede ser número.
 */
const normalizar = grid =>
  grid
    .map(fila =>
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
    .sort()
    .join('\n')

/** Compara como lo hace la app: sin ORDER BY el orden de filas no se evalúa. */
function mismoResultado(a, b) {
  if (a.rows.length !== b.rows.length) return false
  if (a.columns.length !== b.columns.length) return false
  return normalizar(a.rows) === normalizar(b.rows)
}

async function validarLote(etiqueta, seedSql, retos, bloquesValidos) {
  const db = new PGlite()

  try {
    await db.exec(seedSql)
  } catch (err) {
    problemas.push(`[${etiqueta}] el SEED no ejecuta: ${err.message.split('\n')[0]}`)
    await db.close()
    return { retos: 0, filas: 0 }
  }

  const tablas = await ejecutar(
    db,
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
  )

  let filasTotales = 0
  for (const [tabla] of tablas.rows) {
    const { rows } = await ejecutar(db, `SELECT COUNT(*)::int FROM "${tabla}"`)
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
      esperado = await ejecutar(db, reto.expectedSql)
    } catch (err) {
      problemas.push(`[${id}] la SOLUCIÓN no ejecuta: ${err.message.split('\n')[0]}`)
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
    // solución, el alumno pulsa Ejecutar y ya está aprobado.
    if (reto.starter) {
      try {
        const delStarter = await ejecutar(db, reto.starter)
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

  await db.close()
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

  const { retos, filas } = await validarLote(ds.id, ds.seedSql, ds.retos ?? [], bloquesValidos)
  totalRetos += retos
  const kb = ds.seedSql.length / 1024
  totalKb += kb
  console.log(`  ${ds.nombre.padEnd(22)} ${String(ds.tablas?.length ?? 0).padStart(2)} tablas · ${String(filas).padStart(6)} filas · ${String(retos).padStart(2)} retos · seed ${kb.toFixed(0).padStart(4)} KB`)
}

// --- Retos que ya estaban en las prácticas --------------------------------

console.log('\n=== Prácticas existentes ===')
const expocruz = await import(pathToFileURL(join(RAIZ, 'front/src/practices/data/expocruz.js')))
const spaziogym = await import(pathToFileURL(join(RAIZ, 'front/src/practices/data/spaziogym.js')))

const p3 = await validarLote('practica-3', expocruz.expocruzSeedSql, expocruz.sqlChallenges, null)
console.log(`  Práctica 3 (ExpoCruz)   ${String(p3.filas).padStart(5)} filas · ${p3.retos} retos`)

const p4 = await validarLote('practica-4', spaziogym.spazioGymSeedSql, spaziogym.kpiChallenges, null)
console.log(`  Práctica 4 (SpazioGym)  ${String(p4.filas).padStart(5)} filas · ${p4.retos} retos`)

totalRetos += p3.retos + p4.retos

// --- El caso del taller ----------------------------------------------------

console.log('\n=== Taller OLTP ===')
const { caso } = await import(pathToFileURL(join(RAIZ, 'front/src/taller/caso-sagarnaga.js')))

// El taller no trae seed: el alumno escribe el DDL. Se arma desde la
// especificación para poder validar las consultas de los últimos pasos.
const ddlDelCaso = caso.modelo
  .map(m => {
    const columnas = m.columnas.map(c => {
      if (c.pk) return `  ${c.nombre} ${c.tipo} PRIMARY KEY`
      if (c.fk) {
        const destino = caso.modelo.find(x => x.tabla === c.fk)
        return `  ${c.nombre} ${c.tipo} REFERENCES ${c.fk}(${destino.columnas[0].nombre})`
      }
      return `  ${c.nombre} ${c.tipo}`
    })
    return `CREATE TABLE ${m.tabla} (\n${columnas.join(',\n')}\n);`
  })
  .join('\n\n')

const retosDelTaller = caso.pasos
  .filter(p => p.verificar.tipo === 'consulta')
  .map(p => ({ id: p.id, expectedSql: p.verificar.sql, hint: p.pista, orderMatters: p.verificar.ordenImporta }))

const taller = await validarLote(
  'taller',
  `${ddlDelCaso}\n\n${caso.datosDeEjemplo}`,
  retosDelTaller,
  null,
)
console.log(`  Hotel Sagarnaga         ${String(taller.filas).padStart(5)} filas · ${taller.retos} consultas`)
totalRetos += taller.retos

// --- Resultado ------------------------------------------------------------

console.log(`\nTotal: ${registro.catalogo.length + 3} bases · ${totalRetos} consultas validadas · ${totalKb.toFixed(0)} KB de seeds (se cargan por separado)`)

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
