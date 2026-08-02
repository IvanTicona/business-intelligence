/*
 * Consola rápida contra una base del playground, para calibrar umbrales de los
 * retos sin adivinar:
 *   node scripts/consultar.mjs ketal "SELECT ..."
 */
import initSqlJs from 'sql.js'
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

const SQL = await initSqlJs({ locateFile: () => join(RAIZ, 'node_modules/sql.js/dist/sql-wasm.wasm') })
const db = new SQL.Database()
db.run(ds.seedSql)

const sql = consulta.join(' ')
const res = db.exec(sql)
if (!res.length) {
  console.log('(sin resultados)')
} else {
  const { columns, values } = res[res.length - 1]
  console.log(columns.join(' | '))
  console.log('-'.repeat(columns.join(' | ').length))
  for (const fila of values.slice(0, 40)) console.log(fila.join(' | '))
  if (values.length > 40) console.log(`... ${values.length - 40} fila(s) más`)
}
db.close()
