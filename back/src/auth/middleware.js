/**
 * Compuertas de la API.
 *
 * `exigirSesion` deja pasar a quien tenga una sesión viva; `exigirDocente`
 * además pide el rol. Los dos dejan el usuario en `req.usuario`, así que ningún
 * handler vuelve a leer la cookie ni confía en un id que venga del cliente:
 * el id del alumno SIEMPRE sale de la sesión, nunca del cuerpo del pedido.
 * Esa regla es la que evita que alguien opere sobre la base de un compañero.
 */
import { igualSeguro, testigoDe, usuarioDeSesion } from './sesiones.js'

export async function cargarUsuario(req, _res, next) {
  try {
    req.usuario = await usuarioDeSesion(testigoDe(req))
  } catch (err) {
    console.error('[auth] no se pudo leer la sesión:', err.message)
    req.usuario = null
  }

  next()
}

export function exigirSesion(req, res, next) {
  if (!req.usuario) return res.status(401).json({ message: 'Necesitás iniciar sesión' })

  next()
}

/**
 * Acceso docente.
 *
 * Acepta el ADMIN_TOKEN de siempre además del rol, porque el panel del docente
 * ya está en uso con ese token y romperlo en esta fase dejaría a Paul sin ver
 * las entregas. El token se retira en la fase 4, cuando el panel pase a
 * autenticarse con su cuenta.
 */
export function exigirDocente(adminToken) {
  return (req, res, next) => {
    if (req.usuario?.rol === 'docente') return next()

    const enviado = req.header('x-admin-token') ?? req.query.token
    if (enviado && igualSeguro(enviado, adminToken)) return next()

    return res.status(401).json({ message: 'Acceso docente no autorizado' })
  }
}
