/**
 * API de consultas.
 *
 * Pide sesión: un endpoint que ejecuta SQL contra el Postgres del curso no
 * puede estar abierto a internet, y menos con el alta de cuentas abierta.
 */
import { Router } from 'express'
import { z } from 'zod'
import { schemasDisponibles } from '../db/semillas.js'
import { rolListo, motivoRol } from '../db/rolAlumno.js'
import { exigirSesion } from '../auth/middleware.js'
import { MAX_FILAS, ejecutarSql } from './ejecutor.js'
import { nombreSchema, poolDeAlumno, prepararAlumno, vaciarEspacio } from './alumnoDb.js'
import { leerEsquema } from './esquema.js'
import { solucionDe, verificarReto } from './verificar.js'

/*
 * El SQL puede venir VACÍO y eso NO es un pedido inválido: es el alumno que
 * borró el editor y pulsó Ejecutar. Con `min(1)` esto devolvía 400, el cliente
 * lo trataba como una caída y el taller se quedaba colgado en "Iniciando
 * PostgreSQL…" para siempre. El ejecutor ya responde "Escribe una consulta.",
 * que es lo que el alumno necesita leer.
 */
const consultaSchema = z.object({
  // El identificador de la base, no el nombre del schema: el cliente pide
  // "ketal" y acá se traduce. Así el front nunca conoce ni nombra un schema.
  base: z.string().trim().min(1).max(40),
  sql: z.string().max(20000),
})

/** De "ketal" a "ds_ketal". Solo pasa lo que existe de verdad. */
function schemaDe(base) {
  for (const prefijo of ['ds_', 'pr_']) {
    const candidato = `${prefijo}${base.replace(/[^a-z0-9_]/gi, '').toLowerCase()}`
    if (schemasDisponibles.has(candidato)) return candidato
  }

  return null
}

export function rutasSql() {
  const router = Router()

  router.use(exigirSesion)

  /** Qué bases hay para consultar. */
  router.get('/bases', (_req, res) => {
    res.json({
      bases: [...schemasDisponibles].map(s => ({ schema: s, base: s.replace(/^(ds|pr)_/, '') })).sort((a, b) => a.base.localeCompare(b.base)),
      maxFilas: MAX_FILAS,
    })
  })

  router.post('/consulta', async (req, res) => {
    if (!rolListo) {
      // Sin el rol pobre no se ejecuta nada. Antes que degradar al pool admin
      // —que sería ejecutar SQL de alumno como dueño de la base— se corta.
      return res.status(503).json({ error: `El motor de consultas no está disponible (${motivoRol}). Avisa al docente.` })
    }

    const leido = consultaSchema.safeParse(req.body)
    if (!leido.success) return res.status(400).json({ error: 'Pedido inválido' })

    const schema = schemaDe(leido.data.base)
    if (!schema) return res.status(404).json({ error: `No existe la base "${leido.data.base}".` })

    try {
      const salida = await ejecutarSql(leido.data.sql, schema)

      // Un error de SQL del alumno NO es un error del servidor: viaja con 200 y
      // el front lo muestra en su panel. Un 500 haría que el navegador lo trate
      // como una caída y ensuciaría la consola con cada error de sintaxis.
      return res.json(salida)
    } catch (error) {
      console.error('[sql] fallo inesperado:', error)

      return res.status(500).json({ error: 'No se pudo ejecutar la consulta' })
    }
  })

  /**
   * Corrige un reto. El cliente manda QUÉ reto y QUÉ escribió; la respuesta
   * correcta y la comparación viven acá, así que el veredicto no se fabrica
   * desde la consola del navegador.
   */
  router.post('/verificar', async (req, res) => {
    const leido = z.object({ reto: z.string().trim().min(1).max(60), sql: z.string().max(20000) }).safeParse(req.body)
    if (!leido.success) return res.status(400).json({ error: 'Pedido inválido' })

    try {
      return res.json(await verificarReto(leido.data.reto, leido.data.sql))
    } catch (error) {
      console.error('[sql] verificar:', error)

      return res.status(500).json({ error: 'No se pudo verificar' })
    }
  })

  /** La respuesta correcta, cuando el alumno decide verla. */
  router.get('/solucion/:reto', async (req, res) => {
    const sql = await solucionDe(req.params.reto)

    return sql ? res.json({ sql }) : res.status(404).json({ error: 'Ese reto no existe' })
  })

  // --- El espacio propio del alumno ---------------------------------------

  const espacioSchema = z.object({
    espacio: z.enum(['taller', 'libre']),
    sql: z.string().max(50000),
    // El taller vacía en cada corrida —ahí el entregable es el script, y con la
    // base recreada lo escrito ES lo que existe— y el playground libre no.
    reiniciar: z.boolean().optional().default(false),
  })

  /**
   * Ejecuta contra la base del propio alumno.
   *
   * El id SIEMPRE sale de la sesión, nunca del cuerpo del pedido: es lo que
   * hace imposible operar sobre la base de un compañero. Y el pool con el que
   * se ejecuta es el de SU rol de Postgres, así que aunque alguien lograra
   * nombrar el schema de otro, la base se lo niega.
   */
  router.post('/espacio', async (req, res) => {
    if (!rolListo) {
      return res.status(503).json({ error: `El motor de consultas no está disponible (${motivoRol}). Avisa al docente.` })
    }

    const leido = espacioSchema.safeParse(req.body)
    if (!leido.success) return res.status(400).json({ error: 'Pedido inválido' })

    const { id } = req.usuario
    const schema = nombreSchema(id, leido.data.espacio)

    try {
      await prepararAlumno(id)
      if (leido.data.reiniciar) await vaciarEspacio(id, leido.data.espacio)

      const pool = poolDeAlumno(id)
      const salida = await ejecutarSql(leido.data.sql, schema, { pool, propio: true })

      // El diagrama se dibuja con lo que quedó DESPUÉS de ejecutar, en el mismo
      // viaje: pedirlo aparte mostraría el modelo anterior por un instante.
      const tablas = await leerEsquema(pool, schema)

      return res.json({ ...salida, tablas })
    } catch (error) {
      console.error('[sql] espacio:', error)

      return res.status(500).json({ error: 'No se pudo ejecutar' })
    }
  })

  /** El modelo actual, sin ejecutar nada. Se pide al abrir la consola. */
  router.get('/espacio/:espacio', async (req, res) => {
    const espacio = req.params.espacio
    if (!['taller', 'libre'].includes(espacio)) return res.status(400).json({ error: 'Espacio inválido' })

    try {
      await prepararAlumno(req.usuario.id)
      const pool = poolDeAlumno(req.usuario.id)

      return res.json({ tablas: await leerEsquema(pool, nombreSchema(req.usuario.id, espacio)) })
    } catch (error) {
      console.error('[sql] esquema:', error)

      return res.status(500).json({ error: 'No se pudo leer tu base' })
    }
  })

  /** Vacía el espacio. Es lo que hay detrás de "Empezar de cero". */
  router.delete('/espacio/:espacio', async (req, res) => {
    const espacio = req.params.espacio
    if (!['taller', 'libre'].includes(espacio)) return res.status(400).json({ error: 'Espacio inválido' })

    try {
      await prepararAlumno(req.usuario.id)
      await vaciarEspacio(req.usuario.id, espacio)

      return res.json({ tablas: [] })
    } catch (error) {
      console.error('[sql] vaciar:', error)

      return res.status(500).json({ error: 'No se pudo vaciar tu base' })
    }
  })

  return router
}
