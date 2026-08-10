/**
 * Guarda el trabajo en el servidor, con el navegador de respaldo.
 *
 * Por qué las dos cosas y no solo el servidor: el alumno escribe de a una tecla,
 * y mandar cada tecla al servidor sería absurdo. Se escribe en el navegador al
 * instante —que es lo que hace que no se pierda al recargar— y se manda al
 * servidor con retardo, cuando dejó de escribir.
 *
 * Al abrir gana lo del SERVIDOR si existe, porque es lo que puede venir de otra
 * computadora; el navegador solo cubre el caso de estar sin conexión.
 */
import { guardarTrabajo } from './api.js'

const RETARDO_MS = 1200
const relojes = new Map()

export function leerLocal(clave, porDefecto = '') {
  return window.localStorage.getItem(clave) || porDefecto
}

/** Escribe ya en el navegador y, un momento después, en el servidor. */
export function guardar(claveLocal, claveServidor, valor) {
  window.localStorage.setItem(claveLocal, valor)

  /*
   * Marca que hay algo escrito acá que todavía no llegó al servidor.
   *
   * Sin esto había una ventana de un segundo con pérdida real: si el alumno
   * escribía y recargaba antes de que saliera el envío, al abrir ganaba lo del
   * servidor —que era lo viejo— y pisaba lo que acababa de escribir.
   */
  window.localStorage.setItem(pendiente(claveLocal), '1')

  clearTimeout(relojes.get(claveServidor))
  relojes.set(
    claveServidor,
    setTimeout(async () => {
      await guardarTrabajo(claveServidor, valor)
      window.localStorage.removeItem(pendiente(claveLocal))
    }, RETARDO_MS),
  )
}

const pendiente = clave => `${clave}--sin-enviar`

/*
 * Antes de irse, lo que quede pendiente sale de una. `sendBeacon` no sirve acá
 * porque necesita ir con la cookie de sesión y como PUT; `keepalive` en fetch
 * hace lo mismo y el navegador lo deja terminar aunque la pestaña se cierre.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    for (const [clave] of relojes) clearTimeout(relojes.get(clave))
  })
}

/** Con qué arrancar: lo del servidor si lo hay, si no lo del navegador. */
export function elegir(delServidor, claveLocal, porDefecto) {
  // Lo de acá gana si todavía no se envió: es más nuevo que lo del servidor.
  if (window.localStorage.getItem(pendiente(claveLocal))) {
    return leerLocal(claveLocal, porDefecto)
  }

  if (typeof delServidor === 'string' && delServidor.length > 0) return delServidor

  return leerLocal(claveLocal, porDefecto)
}
