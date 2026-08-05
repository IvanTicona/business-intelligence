/**
 * MIGRACIONES · archivos .sql numerados, aplicados una sola vez
 *
 * Hasta hoy el esquema se creaba con un `CREATE TABLE IF NOT EXISTS` disparado
 * en caliente dentro de cada handler. Alcanzaba con una tabla. Con usuarios,
 * sesiones y schemas por alumno no alcanza: hace falta saber qué versión del
 * esquema tiene una base, y poder agregar un cambio sin adivinar si ya se
 * aplicó.
 *
 * Sin ORM a propósito. Son archivos .sql que se leen tal cual, en orden, y una
 * tabla que anota cuáles ya corrieron.
 */
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { exigirAdmin } from './pools.js'

/*
 * `new URL(..., import.meta.url)` y no `__dirname` ni `process.cwd()`: la ruta
 * queda atada a ESTE archivo, así que sobrevive a que lo llamen desde otro
 * directorio de trabajo. La bitácora de producción de upb-sql documenta
 * exactamente este problema — su carpeta de seeds dejó de encontrarse al
 * empaquetar, y el fallo era silencioso.
 */
const CARPETA = new URL('./migraciones/', import.meta.url)

// Dos instancias arrancando a la vez migrarían en paralelo sobre la misma base.
// El cerrojo las serializa; la segunda encuentra todo aplicado y sigue.
const CERROJO = 8412_7734

export async function migrar({ silencioso = false } = {}) {
  const pool = exigirAdmin()
  const cliente = await pool.connect()
  const aplicadas = []

  try {
    await cliente.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        nombre TEXT PRIMARY KEY,
        huella TEXT NOT NULL,
        aplicada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    await cliente.query('SELECT pg_advisory_lock($1)', [CERROJO])

    const { rows: yaEstan } = await cliente.query('SELECT nombre, huella FROM schema_migrations')
    const huellaDe = new Map(yaEstan.map(f => [f.nombre, f.huella]))

    for (const nombre of await archivos()) {
      const sql = await readFile(new URL(nombre, CARPETA), 'utf8')
      const huella = createHash('sha256').update(sql).digest('hex').slice(0, 16)
      const previa = huellaDe.get(nombre)

      if (previa) {
        // Editar una migración ya aplicada deja las bases desalineadas sin que
        // nadie se entere: la nuestra tendría el cambio y la del VPS no.
        if (previa !== huella) {
          throw new Error(
            `La migración ${nombre} ya se aplicó pero su contenido cambió. ` +
              'Creá una migración nueva en vez de editar una aplicada.',
          )
        }
        continue
      }

      // Cada migración en su transacción: si falla a la mitad no deja el
      // esquema por la mitad, y no se anota como aplicada.
      await cliente.query('BEGIN')
      try {
        await cliente.query(sql)
        await cliente.query('INSERT INTO schema_migrations (nombre, huella) VALUES ($1, $2)', [nombre, huella])
        await cliente.query('COMMIT')
      } catch (err) {
        await cliente.query('ROLLBACK')
        throw new Error(`Falló la migración ${nombre}: ${err.message}`, { cause: err })
      }

      aplicadas.push(nombre)
      if (!silencioso) console.log(`[migración] aplicada ${nombre}`)
    }

    if (!silencioso && aplicadas.length === 0) console.log('[migración] esquema al día')

    return aplicadas
  } finally {
    await cliente.query('SELECT pg_advisory_unlock($1)', [CERROJO]).catch(() => {})
    cliente.release()
  }
}

async function archivos() {
  const nombres = await readdir(CARPETA)

  return nombres.filter(n => n.endsWith('.sql')).sort()
}
