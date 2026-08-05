/*
 * Escribe las semillas del curso como archivos .sql para que las use el backend.
 *
 * Las bases viven como módulos JS en el front porque ahí también se usan sus
 * `tablas` y sus `retos`. El backend no puede importarlos: su imagen Docker solo
 * copia `back/src`. Así que la MISMA fuente se exporta a .sql y esos archivos se
 * commitean.
 *
 * Es duplicación, y por eso se genera en vez de copiarse a mano: correr este
 * script después de tocar un generador deja las dos formas alineadas. La huella
 * de cada archivo la usa el backend para re-sembrar cuando cambia.
 */
import { mkdir, writeFile } from 'node:fs/promises'

const DESTINO = new URL('../back/src/db/semillas/', import.meta.url)

const bases = [
  ['ds_ketal', '../front/src/playground/datasets/ketal.js', m => m.ketal.seedSql],
  ['ds_teleferico', '../front/src/playground/datasets/teleferico.js', m => m.teleferico.seedSql],
  ['ds_bancosol', '../front/src/playground/datasets/bancosol.js', m => m.bancosol.seedSql],
  ['ds_arcoiris', '../front/src/playground/datasets/arcoiris.js', m => m.arcoiris.seedSql],
  ['ds_yaigo', '../front/src/playground/datasets/yaigo.js', m => m.yaigo.seedSql],
  ['ds_entel', '../front/src/playground/datasets/entel.js', m => m.entel.seedSql],
  ['ds_upb', '../front/src/playground/datasets/upb.js', m => m.upb.seedSql],
  ['ds_cinemateca', '../front/src/playground/datasets/cinemateca.js', m => m.cinemateca.seedSql],
  ['pr_expocruz', '../front/src/practices/data/expocruz.js', m => m.expocruzSeedSql],
  ['pr_spaziogym', '../front/src/practices/data/spaziogym.js', m => m.spazioGymSeedSql],
]

await mkdir(DESTINO, { recursive: true })

for (const [schema, ruta, sacar] of bases) {
  const modulo = await import(new URL(ruta, import.meta.url))
  const sql = sacar(modulo)

  if (typeof sql !== 'string' || sql.trim().length === 0) {
    console.error(`  MAL  ${schema}: el módulo no expuso su SQL`)
    process.exit(1)
  }

  const cabecera = `-- GENERADO por scripts/exportar-semillas.mjs — no editar a mano.\n-- Fuente: ${ruta.replace('../', '')}\n\n`
  await writeFile(new URL(`${schema}.sql`, DESTINO), cabecera + sql.trim() + '\n', 'utf8')
  console.log(`  ok   ${schema}.sql  ${(sql.length / 1024).toFixed(0)} KB`)
}

console.log(`\n${bases.length} semillas exportadas a back/src/db/semillas/`)
