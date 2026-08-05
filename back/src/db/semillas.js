/**
 * BASES DEL CURSO · un schema por dataset, compartido y de solo lectura
 *
 * upb-sql copia sus semillas DENTRO del schema de cada alumno. Acá no, y la
 * razón es que se verificó: los 96 retos del laboratorio y las consultas de las
 * prácticas 3 y 4 son TODOS `SELECT`/`WITH`, sin una sola escritura. Si nadie
 * escribe, no hay motivo para darle a cada quien su copia. Con treinta alumnos
 * serían 300 schemas con los mismos datos en vez de 10.
 *
 * Cada dataset va en su propio schema y no todos juntos, porque comparten
 * nombres de tabla: `dim_tiempo` existe en las ocho bases.
 *
 * El rol del alumno recibe USAGE sobre el schema y SELECT sobre sus tablas.
 * Nada más: no puede insertar, borrar ni alterar la base del curso.
 */
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { exigirAdmin } from './pools.js'
import { ROL_ALUMNO, rolListo } from './rolAlumno.js'

const CARPETA = new URL('./semillas/', import.meta.url)

/** Schemas disponibles, por si alguien pide uno que no existe. */
export const schemasDisponibles = new Set()

export async function sembrarBases() {
  const pool = exigirAdmin()

  await pool.query(`
    CREATE TABLE IF NOT EXISTS semillas_aplicadas (
      schema_nombre TEXT PRIMARY KEY,
      huella TEXT NOT NULL,
      sembrada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const archivos = (await readdir(CARPETA)).filter(n => n.endsWith('.sql')).sort()
  const { rows } = await pool.query('SELECT schema_nombre, huella FROM semillas_aplicadas')
  const huellas = new Map(rows.map(f => [f.schema_nombre, f.huella]))

  let sembradas = 0

  for (const archivo of archivos) {
    const schema = archivo.replace(/\.sql$/, '')

    // El nombre viene de un archivo del repositorio, no de nadie de afuera,
    // pero igual se acota: termina interpolado en un CREATE SCHEMA.
    if (!/^[a-z][a-z0-9_]{2,40}$/.test(schema)) {
      console.error(`[semilla] nombre inválido, se omite: ${archivo}`)
      continue
    }

    schemasDisponibles.add(schema)

    const sql = await readFile(new URL(archivo, CARPETA), 'utf8')
    const huella = createHash('sha256').update(sql).digest('hex').slice(0, 16)

    if (huellas.get(schema) === huella) continue

    /*
     * Cambió la semilla: se rehace el schema entero. Es seguro porque acá no
     * vive trabajo de nadie —son datos del curso, iguales para todos— y es lo
     * que permite corregir un dato malo de una base con solo desplegar.
     */
    const cliente = await pool.connect()
    try {
      await cliente.query('BEGIN')
      await cliente.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
      await cliente.query(`CREATE SCHEMA ${schema}`)
      // Las semillas crean tablas sin calificar, así que caen acá adentro.
      await cliente.query(`SET LOCAL search_path TO ${schema}`)
      await cliente.query(sql)
      await cliente.query('RESET search_path')

      if (rolListo) {
        await cliente.query(`GRANT USAGE ON SCHEMA ${schema} TO ${ROL_ALUMNO}`)
        await cliente.query(`GRANT SELECT ON ALL TABLES IN SCHEMA ${schema} TO ${ROL_ALUMNO}`)
      }

      await cliente.query(
        `INSERT INTO semillas_aplicadas (schema_nombre, huella) VALUES ($1, $2)
         ON CONFLICT (schema_nombre) DO UPDATE SET huella = EXCLUDED.huella, sembrada_en = NOW()`,
        [schema, huella],
      )
      await cliente.query('COMMIT')

      sembradas += 1
      console.log(`[semilla] ${schema} sembrada`)
    } catch (err) {
      await cliente.query('ROLLBACK').catch(() => {})
      console.error(`[semilla] falló ${schema}: ${err.message}`)
    } finally {
      cliente.release()
    }
  }

  /*
   * Los GRANT se rehacen siempre, no solo al sembrar. Si el rol se creó DESPUÉS
   * de las semillas —o alguien lo recreó— sin esto quedaría sin permisos sobre
   * bases ya sembradas, y el alumno vería "permission denied" sin explicación.
   */
  if (rolListo) {
    for (const schema of schemasDisponibles) {
      await pool.query(`GRANT USAGE ON SCHEMA ${schema} TO ${ROL_ALUMNO}`).catch(() => {})
      await pool.query(`GRANT SELECT ON ALL TABLES IN SCHEMA ${schema} TO ${ROL_ALUMNO}`).catch(() => {})
    }
  }

  console.log(
    sembradas > 0
      ? `[semilla] ${sembradas} base(s) sembradas, ${schemasDisponibles.size} disponibles`
      : `[semilla] ${schemasDisponibles.size} bases al día`,
  )
}
