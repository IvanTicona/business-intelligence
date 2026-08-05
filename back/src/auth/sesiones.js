/**
 * SESIONES · un testigo opaco guardado en la base, no un JWT
 *
 * upb-sql usa JWT de 15 minutos más un refresh de 7 días. Acá se eligió otra
 * cosa a conciencia, por una razón concreta del curso: el docente puede
 * DESACTIVAR una cuenta. Con JWT, una cuenta desactivada sigue funcionando
 * hasta que expire el token; con un testigo que se valida contra la base en
 * cada pedido, deja de funcionar en el siguiente clic.
 *
 * Lo que cuesta es una consulta por pedido. Con un curso de treinta alumnos y
 * la base en el mismo compose, eso no se nota. Lo que se gana es que no hay
 * secreto que rotar, no hay dos tipos de token que sincronizar, y revocar es un
 * DELETE.
 *
 * El testigo viaja en una cookie httpOnly: el JavaScript de la página no puede
 * leerlo, así que un XSS no se lleva la sesión. En la base se guarda solo su
 * SHA-256, así que un volcado robado tampoco.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { exigirAdmin } from '../db/pools.js'

export const COOKIE = 'bi_sesion'
const DIAS = 7
const VIDA_MS = DIAS * 24 * 60 * 60 * 1000
// Se renueva sola si le queda menos de esto, así el alumno que entra seguido no
// se cae en medio de una clase.
const RENOVAR_BAJO_MS = 5 * 24 * 60 * 60 * 1000

const huella = testigo => createHash('sha256').update(testigo).digest('hex')

export async function abrirSesion(usuarioId) {
  const pool = exigirAdmin()
  const testigo = randomBytes(32).toString('base64url')

  // Barrer las vencidas acá sale gratis y evita el cron que upb-sql nunca puso:
  // su tabla de refresh tokens crece para siempre.
  await pool.query('DELETE FROM sesiones WHERE expira_en < NOW()')
  await pool.query(
    `INSERT INTO sesiones (usuario_id, token_hash, expira_en)
     VALUES ($1, $2, NOW() + ($3 || ' days')::interval)`,
    [usuarioId, huella(testigo), String(DIAS)],
  )

  return testigo
}

/**
 * Devuelve el usuario dueño del testigo, o null.
 *
 * La misma consulta trae al usuario y comprueba que siga activo: si el docente
 * lo desactivó hace un segundo, acá ya no entra.
 */
export async function usuarioDeSesion(testigo) {
  if (!testigo) return null

  const { rows } = await exigirAdmin().query(
    `SELECT u.id, u.correo, u.nombre, u.rol, s.id AS sesion_id, s.expira_en
     FROM sesiones s
     JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token_hash = $1 AND s.expira_en > NOW() AND u.activo`,
    [huella(testigo)],
  )

  if (rows.length === 0) return null

  const fila = rows[0]
  const restante = new Date(fila.expira_en).getTime() - Date.now()

  if (restante < RENOVAR_BAJO_MS) {
    await exigirAdmin().query(
      `UPDATE sesiones SET expira_en = NOW() + ($2 || ' days')::interval WHERE id = $1`,
      [fila.sesion_id, String(DIAS)],
    )
  }

  return { id: fila.id, correo: fila.correo, nombre: fila.nombre, rol: fila.rol, renovada: restante < RENOVAR_BAJO_MS }
}

export async function cerrarSesion(testigo) {
  if (!testigo) return
  await exigirAdmin().query('DELETE FROM sesiones WHERE token_hash = $1', [huella(testigo)])
}

/** Todas las sesiones del usuario. Se usa al cambiar la contraseña. */
export async function cerrarTodas(usuarioId) {
  await exigirAdmin().query('DELETE FROM sesiones WHERE usuario_id = $1', [usuarioId])
}

/**
 * `secure` sale de la conexión real, no de NODE_ENV.
 *
 * Atarlo a una variable de entorno es un pie de plomo: si alguien despliega sin
 * ponerla, la sesión viaja sin `Secure` y nadie se entera. Con `trust proxy`
 * puesto, `req.secure` sale del X-Forwarded-Proto que agrega nginx, así que en
 * el VPS da https y en local da http sin que haya que declarar nada.
 *
 * `sameSite: lax` es lo que nos cubre de CSRF: el navegador no manda la cookie
 * en un POST que venga de otro sitio.
 */
export function opcionesCookie(req) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(req?.secure),
    maxAge: VIDA_MS,
    path: '/',
  }
}

/**
 * Lee la cookie a mano en vez de sumar `cookie-parser`.
 *
 * Son cinco líneas y evita una dependencia más en el despliegue; para una sola
 * cookie con nombre conocido no hace falta más.
 */
export function testigoDe(req) {
  const crudo = req.headers.cookie
  if (!crudo) return null

  for (const parte of crudo.split(';')) {
    const corte = parte.indexOf('=')
    if (corte === -1) continue
    if (parte.slice(0, corte).trim() === COOKIE) return decodeURIComponent(parte.slice(corte + 1).trim())
  }

  return null
}

/** Comparación en tiempo constante para el token del docente. */
export function igualSeguro(a, b) {
  const x = Buffer.from(String(a ?? ''))
  const y = Buffer.from(String(b ?? ''))

  return x.length === y.length && timingSafeEqual(x, y)
}
