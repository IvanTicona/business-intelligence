/*
 * Consola rápida contra una base del playground, para calibrar umbrales de los
 * retos sin adivinar:
 *   node scripts/consultar.mjs ketal "SELECT ..."
 */
import { PGlite } from '@electric-sql/pglite'
import { fileURLToPath, pathToFileURL } from 'url'
import { dirname, join } from 'path'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const [idBase, ...consulta] = process.argv.slice(2)

const { datasetsPorId } = await import(pathToFileURL(join(RAIZ, 'front/src/playground/datasets/index.js')))
const ds = datasetsPorId[idBase]
if (!ds) {
  console.error(`base desconocida: ${idBase}. Disponibles: ${Object.keys(datasetsPorId).join(', ')}`)
  process.exit(1)
}

const db = new PGlite()
await db.exec(ds.seedSql)

const sql = consulta.join(' ')

try {
  const res = await db.query(sql, [], { rowMode: 'array' })

  if (!res.fields?.length) {
    console.log(`(sin resultados · ${res.affectedRows ?? 0} fila(s) afectada(s))`)
  } else {
    const columnas = res.fields.map(f => f.name)
    console.log(columnas.join(' | '))
    console.log('-'.repeat(columnas.join(' | ').length))
    for (const fila of res.rows.slice(0, 40)) console.log(fila.join(' | '))
    if (res.rows.length > 40) console.log(`... ${res.rows.length - 40} fila(s) más`)
  }
} catch (error) {
  console.error('✗', error.message.split('\n')[0])
  if (error.position) console.error('   posición', error.position)
  if (error.hint) console.error('   pista:', error.hint)
}

await db.close()
