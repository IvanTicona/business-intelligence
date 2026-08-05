/**
 * Panel del docente.
 *
 * Lo nuevo respecto del token compartido: como el alta de cuentas es abierta,
 * el docente necesita poder VER quién se registró y DESACTIVAR lo que no
 * corresponda. Sin eso, una cuenta basura le ensucia el panorama y no hay forma
 * de sacarla sin entrar a la base a mano.
 *
 * Desactivar y no borrar: las entregas de esa cuenta son trabajo evaluado y
 * tienen que sobrevivir. Y la desactivación corta la sesión en el siguiente
 * pedido, porque el testigo se valida contra la base cada vez.
 */
import { Router } from 'express'
import { z } from 'zod'
import { exigirAdmin } from '../db/pools.js'
import { ESPACIOS, nombreSchema } from '../sql/alumnoDb.js'

export function rutasDocente(soloDocente) {
  const router = Router()

  router.use(soloDocente)

  /** Quiénes se registraron, qué entregaron y cuánto ocupa su base. */
  router.get('/cuentas', async (_req, res) => {
    try {
      const { rows } = await exigirAdmin().query(`
        SELECT u.id, u.correo, u.nombre, u.rol, u.activo, u.creado_en, u.ultimo_acceso,
               COUNT(e.id)::int AS entregas
        FROM usuarios u
        LEFT JOIN practice_submissions e ON e.usuario_id = u.id
        GROUP BY u.id
        ORDER BY u.creado_en DESC
      `)

      /*
       * El tamaño de la base de cada alumno sale de una sola consulta para
       * todos. Una por alumno serían treinta viajes cada vez que el docente
       * abre el panel.
       */
      const { rows: tamanos } = await exigirAdmin().query(`
        SELECT n.nspname AS schema,
               COALESCE(SUM(pg_total_relation_size(c.oid)), 0)::bigint AS bytes,
               COUNT(c.oid) FILTER (WHERE c.relkind = 'r')::int AS tablas
        FROM pg_namespace n
        LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relkind = 'r'
        WHERE n.nspname LIKE 'alumno\\_%'
        GROUP BY n.nspname
      `)
      const porSchema = new Map(tamanos.map(t => [t.schema, t]))

      return res.json({
        cuentas: rows.map(u => {
          const espacios = Object.values(ESPACIOS).map(e => porSchema.get(nombreSchema(u.id, e)))

          return {
            ...u,
            baseBytes: espacios.reduce((suma, e) => suma + Number(e?.bytes ?? 0), 0),
            baseTablas: espacios.reduce((suma, e) => suma + Number(e?.tablas ?? 0), 0),
          }
        }),
      })
    } catch (error) {
      console.error('[docente] cuentas:', error)

      return res.status(500).json({ message: 'No se pudieron listar las cuentas' })
    }
  })

  router.post('/cuentas/:id/activo', async (req, res) => {
    const leido = z.object({ activo: z.boolean() }).safeParse(req.body)
    const id = Number(req.params.id)
    if (!leido.success || !Number.isInteger(id)) return res.status(400).json({ message: 'Pedido inválido' })

    // Un docente no puede desactivarse a sí mismo: se quedaría afuera del panel
    // sin nadie que pueda volver a activarlo salvo entrando a la base.
    if (req.usuario?.id === id && !leido.data.activo) {
      return res.status(400).json({ message: 'No puedes desactivar tu propia cuenta' })
    }

    try {
      const { rowCount } = await exigirAdmin().query('UPDATE usuarios SET activo = $2 WHERE id = $1', [id, leido.data.activo])
      if (rowCount === 0) return res.status(404).json({ message: 'Esa cuenta no existe' })

      // Al desactivar, se le cierran las sesiones abiertas de una vez.
      if (!leido.data.activo) await exigirAdmin().query('DELETE FROM sesiones WHERE usuario_id = $1', [id])

      return res.json({ id, activo: leido.data.activo })
    } catch (error) {
      console.error('[docente] activo:', error)

      return res.status(500).json({ message: 'No se pudo cambiar la cuenta' })
    }
  })

  /** Qué construyó un alumno en su base. Para acompañarlo cuando se traba. */
  router.get('/cuentas/:id/base', async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Pedido inválido' })

    try {
      const { rows } = await exigirAdmin().query(
        `SELECT table_schema, table_name, COUNT(*)::int AS columnas
         FROM information_schema.columns
         WHERE table_schema = ANY($1)
         GROUP BY table_schema, table_name
         ORDER BY table_schema, table_name`,
        [Object.values(ESPACIOS).map(e => nombreSchema(id, e))],
      )

      return res.json({
        espacios: Object.values(ESPACIOS).map(espacio => ({
          espacio,
          tablas: rows
            .filter(r => r.table_schema === nombreSchema(id, espacio))
            .map(r => ({ nombre: r.table_name, columnas: r.columnas })),
        })),
      })
    } catch (error) {
      console.error('[docente] base:', error)

      return res.status(500).json({ message: 'No se pudo leer la base del alumno' })
    }
  })

  return router
}
