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

  clearTimeout(relojes.get(claveServidor))
  relojes.set(claveServidor, setTimeout(() => guardarTrabajo(claveServidor, valor), RETARDO_MS))
}

/** Con qué arrancar: lo del servidor si lo hay, si no lo del navegador. */
export function elegir(delServidor, claveLocal, porDefecto) {
  if (typeof delServidor === 'string' && delServidor.length > 0) return delServidor

  return leerLocal(claveLocal, porDefecto)
}
