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

const consultaSchema = z.object({
  // El identificador de la base, no el nombre del schema: el cliente pide
  // "ketal" y acá se traduce. Así el front nunca conoce ni nombra un schema.
  base: z.string().trim().min(1).max(40),
  sql: z.string().min(1).max(20000),
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

  return router
}
