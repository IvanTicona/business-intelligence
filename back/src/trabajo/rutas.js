/**
 * El trabajo del alumno que no es una base.
 *
 * El texto de sus scripts y su avance en el taller. Antes vivía en el navegador
 * y por eso no lo seguía entre computadoras, aunque su base sí: la promesa de
 * "seguí desde cualquier computadora" estaba cumplida a medias.
 *
 * Las claves se validan contra una lista. Sin ella, esto sería un almacén libre
 * para cualquiera con sesión.
 */
import { Router } from 'express'
import { z } from 'zod'
import { exigirAdmin } from '../db/pools.js'
import { exigirSesion } from '../auth/middleware.js'

const CLAVES = ['taller-script', 'taller-pasos', 'libre-script']

export function rutasTrabajo() {
  const router = Router()

  router.use(exigirSesion)

  /** Todo junto: son tres valores chicos y se piden a la vez al abrir. */
  router.get('/', async (req, res) => {
    try {
      const { rows } = await exigirAdmin().query('SELECT clave, valor FROM trabajo WHERE usuario_id = $1', [
        req.usuario.id,
      ])

      return res.json({ trabajo: Object.fromEntries(rows.map(r => [r.clave, r.valor])) })
    } catch (error) {
      console.error('[trabajo] leer:', error)

      return res.status(500).json({ message: 'No se pudo leer tu trabajo' })
    }
  })

  router.put('/:clave', async (req, res) => {
    if (!CLAVES.includes(req.params.clave)) return res.status(400).json({ message: 'Clave desconocida' })

    const leido = z.object({ valor: z.string().max(60000) }).safeParse(req.body)
    if (!leido.success) return res.status(400).json({ message: 'Valor inválido' })

    try {
      await exigirAdmin().query(
        `INSERT INTO trabajo (usuario_id, clave, valor) VALUES ($1, $2, $3)
         ON CONFLICT (usuario_id, clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = NOW()`,
        [req.usuario.id, req.params.clave, leido.data.valor],
      )

      return res.status(204).end()
    } catch (error) {
      console.error('[trabajo] guardar:', error)

      return res.status(500).json({ message: 'No se pudo guardar' })
    }
  })

  return router
}
