/**
 * Endpoints de identidad.
 *
 * El alta es ABIERTA por decisión del docente: cualquiera con la dirección de
 * la aplicación puede crearse una cuenta. Eso obliga a dos cosas que están acá:
 * un límite de intentos por IP, y que el docente pueda desactivar una cuenta
 * (la desactivación corta la sesión en el siguiente pedido, porque el testigo
 * se valida contra la base cada vez).
 */
import { Router } from 'express'
import { z } from 'zod'
import { exigirAdmin } from '../db/pools.js'
import { limitar } from '../lib/limite.js'
import { claveCoincide, hashearClave } from './claves.js'
import { COOKIE, abrirSesion, cerrarSesion, opcionesCookie, testigoDe } from './sesiones.js'
import { exigirSesion } from './middleware.js'

/*
 * Validación de correo con expresión regular en vez de la de zod: entre la
 * versión 3 y la 4 la forma de pedirla cambió, y no vale que el registro del
 * curso dependa de cuál quedó instalada. Acá solo se quiere descartar lo que
 * evidentemente no es un correo; quién lo tiene de verdad no se comprueba.
 */
const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/

const registroSchema = z.object({
  correo: z.string().trim().min(5).max(160).regex(CORREO, 'Correo inválido'),
  // Ocho, no seis como upb-sql: con alta abierta y la aplicación publicada, seis
  // es una contraseña que se adivina.
  clave: z.string().min(8).max(200),
  nombre: z.string().trim().min(2).max(120),
})

const ingresoSchema = z.object({
  correo: z.string().trim().min(5).max(160),
  clave: z.string().min(1).max(200),
})

const publico = u => ({ id: u.id, correo: u.correo, nombre: u.nombre, rol: u.rol })

export function rutasAuth() {
  const router = Router()

  router.post('/registro', limitar('registro', 10, 15 * 60 * 1000), async (req, res) => {
    const leido = registroSchema.safeParse(req.body)
    if (!leido.success) {
      return res.status(400).json({ message: 'Datos de registro inválidos', issues: leido.error.issues })
    }

    const correo = leido.data.correo.toLowerCase()

    try {
      const pool = exigirAdmin()
      const { rows } = await pool.query(
        `INSERT INTO usuarios (correo, clave_hash, nombre, rol)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (LOWER(correo)) DO NOTHING
         RETURNING id, correo, nombre, rol`,
        [correo, await hashearClave(leido.data.clave), leido.data.nombre, rolInicial(correo)],
      )

      if (rows.length === 0) {
        return res.status(409).json({ message: 'Ya existe una cuenta con ese correo' })
      }

      // Entra directo: pedirle que vuelva a escribir lo mismo en un formulario
      // de ingreso no protege de nada.
      res.cookie(COOKIE, await abrirSesion(rows[0].id), opcionesCookie(req))

      return res.status(201).json({ usuario: publico(rows[0]) })
    } catch (error) {
      console.error('[auth] registro:', error)

      return res.status(500).json({ message: 'No se pudo crear la cuenta' })
    }
  })

  router.post('/ingreso', limitar('ingreso', 20, 15 * 60 * 1000), async (req, res) => {
    const leido = ingresoSchema.safeParse(req.body)
    if (!leido.success) return res.status(400).json({ message: 'Correo o contraseña inválidos' })

    try {
      const pool = exigirAdmin()
      const { rows } = await pool.query(
        'SELECT id, correo, nombre, rol, clave_hash, activo FROM usuarios WHERE LOWER(correo) = LOWER($1)',
        [leido.data.correo],
      )

      const usuario = rows[0]
      const correcta = usuario ? await claveCoincide(leido.data.clave, usuario.clave_hash) : false

      /*
       * El mismo mensaje para "no existe" y "contraseña equivocada". Distinguir
       * los dos le confirma a cualquiera qué correos tienen cuenta en el curso.
       */
      if (!usuario || !correcta) {
        return res.status(401).json({ message: 'Correo o contraseña incorrectos' })
      }
      if (!usuario.activo) {
        return res.status(403).json({ message: 'Tu cuenta está desactivada. Hablá con el docente.' })
      }

      await pool.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1', [usuario.id])
      res.cookie(COOKIE, await abrirSesion(usuario.id), opcionesCookie(req))

      return res.json({ usuario: publico(usuario) })
    } catch (error) {
      console.error('[auth] ingreso:', error)

      return res.status(500).json({ message: 'No se pudo iniciar sesión' })
    }
  })

  router.post('/salida', async (req, res) => {
    try {
      await cerrarSesion(testigoDe(req))
    } catch (error) {
      console.error('[auth] salida:', error)
    }

    res.clearCookie(COOKIE, { ...opcionesCookie(req), maxAge: undefined })

    return res.status(204).end()
  })

  // La usa el front al cargar para saber si hay sesión, sin exponer un 401 como
  // error: devuelve 200 con `usuario: null`.
  router.get('/yo', (req, res) => {
    res.json({ usuario: req.usuario ? publico(req.usuario) : null })
  })

  router.post('/clave', exigirSesion, async (req, res) => {
    const leido = z.object({ actual: z.string().min(1), nueva: z.string().min(8).max(200) }).safeParse(req.body)
    if (!leido.success) return res.status(400).json({ message: 'La contraseña nueva debe tener 8 caracteres o más' })

    try {
      const pool = exigirAdmin()
      const { rows } = await pool.query('SELECT clave_hash FROM usuarios WHERE id = $1', [req.usuario.id])

      if (!(await claveCoincide(leido.data.actual, rows[0].clave_hash))) {
        return res.status(401).json({ message: 'La contraseña actual no coincide' })
      }

      await pool.query('UPDATE usuarios SET clave_hash = $2 WHERE id = $1', [
        req.usuario.id,
        await hashearClave(leido.data.nueva),
      ])

      /*
       * Cambiar la contraseña cierra TODAS las sesiones, incluida esta. Es el
       * motivo por el que la mayoría de la gente la cambia: cree que alguien
       * más entró. Dejar viva la sesión del intruso sería inútil.
       */
      await pool.query('DELETE FROM sesiones WHERE usuario_id = $1', [req.usuario.id])
      res.clearCookie(COOKIE, { ...opcionesCookie(req), maxAge: undefined })

      return res.status(204).end()
    } catch (error) {
      console.error('[auth] cambio de clave:', error)

      return res.status(500).json({ message: 'No se pudo cambiar la contraseña' })
    }
  })

  return router
}

/*
 * Promoción del docente por variable de entorno.
 *
 * En upb-sql no hay ningún camino para volver docente a un usuario: se hace con
 * un UPDATE a mano contra la base de producción, y eso es de las cosas que se
 * pierden y nadie documenta. Acá el correo del docente se declara en el .env y
 * la cuenta nace con el rol puesto, aunque se registre después.
 */
const correosDocentes = () =>
  (process.env.DOCENTE_CORREO ?? '')
    .split(',')
    .map(c => c.trim().toLowerCase())
    .filter(Boolean)

function rolInicial(correo) {
  return correosDocentes().includes(correo.toLowerCase()) ? 'docente' : 'alumno'
}

/** Se corre al arrancar, para las cuentas que ya existían antes de declararlas. */
export async function sincronizarDocentes() {
  const correos = correosDocentes()
  if (correos.length === 0) return

  const { rowCount } = await exigirAdmin().query(
    `UPDATE usuarios SET rol = 'docente' WHERE LOWER(correo) = ANY($1) AND rol <> 'docente'`,
    [correos],
  )

  if (rowCount > 0) console.log(`[auth] ${rowCount} cuenta(s) promovidas a docente`)
}
