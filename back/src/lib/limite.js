/**
 * LÍMITE DE INTENTOS · ventana fija en memoria
 *
 * Hace falta porque el alta de cuentas es abierta y la aplicación está
 * publicada: sin esto, cualquiera puede crear mil cuentas en un minuto o
 * probar contraseñas a fuerza bruta contra el login.
 *
 * En memoria, no en Redis. Se reinicia cuando se reinicia el proceso y no
 * serviría con varias réplicas — y las dos cosas están bien acá, porque hay una
 * sola instancia y el ataque que nos importa dura segundos, no días. Sumar
 * Redis a un compose de tres servicios para esto sería pagar operación por una
 * garantía que no necesitamos.
 */
const ventanas = new Map()

// Sin esto, el Map crece con cada IP que pase alguna vez por acá.
const LIMPIAR_CADA = 5 * 60 * 1000
let ultimaLimpieza = Date.now()

/**
 * @param {string} nombre     etiqueta del límite, para no mezclar login con registro
 * @param {number} maximo     intentos permitidos por ventana
 * @param {number} ventanaMs  duración de la ventana
 */
export function limitar(nombre, maximo, ventanaMs) {
  return (req, res, next) => {
    const ahora = Date.now()

    if (ahora - ultimaLimpieza > LIMPIAR_CADA) {
      for (const [clave, dato] of ventanas) if (dato.hasta < ahora) ventanas.delete(clave)
      ultimaLimpieza = ahora
    }

    /*
     * Detrás de nginx y Cloudflare, `req.ip` sería siempre la IP del proxy.
     * Se usa el primer valor de X-Forwarded-For, que es el que agrega nginx con
     * la IP real. Es falsificable por quien llegue directo al backend, pero el
     * backend no publica puerto: solo se llega por nginx.
     */
    const ip = (req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.socket.remoteAddress || 'desconocida'
    const clave = `${nombre}:${ip}`
    const dato = ventanas.get(clave)

    if (!dato || dato.hasta < ahora) {
      ventanas.set(clave, { intentos: 1, hasta: ahora + ventanaMs })
      return next()
    }

    dato.intentos += 1

    if (dato.intentos > maximo) {
      const faltan = Math.ceil((dato.hasta - ahora) / 1000)
      res.setHeader('Retry-After', String(faltan))

      return res.status(429).json({ message: `Demasiados intentos. Probá de nuevo en ${faltan} segundo(s).` })
    }

    next()
  }
}
