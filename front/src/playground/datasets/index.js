/**
 * REGISTRO DE BASES DEL PLAYGROUND
 *
 * Agregar una base es: escribir su generador en scripts/datasets/, correrlo, y
 * sumar UNA línea al mapa de cargadores de acá abajo. Ni la página ni el
 * diagrama ni el validador se tocan.
 *
 * Los seeds pesan cientos de KB cada uno, así que se cargan con `import()`
 * dinámico: Vite los parte en chunks propios y el alumno descarga sólo la base
 * que eligió. El catálogo, en cambio, se importa siempre porque pesa poco.
 */
import { catalogo, fichasPorId } from './catalogo.js'

export { catalogo, fichasPorId }
export { BLOQUES, BLOQUES_POR_ID } from './contrato.js'

/** Un chunk por base. La clave debe existir en el catálogo. */
const cargadores = {
  ketal: () => import('./ketal.js').then(m => m.ketal),
  teleferico: () => import('./teleferico.js').then(m => m.teleferico),
  bancosol: () => import('./bancosol.js').then(m => m.bancosol),
  arcoiris: () => import('./arcoiris.js').then(m => m.arcoiris),
  yaigo: () => import('./yaigo.js').then(m => m.yaigo),
  entel: () => import('./entel.js').then(m => m.entel),
  upb: () => import('./upb.js').then(m => m.upb),
  cinemateca: () => import('./cinemateca.js').then(m => m.cinemateca),
}

const cache = new Map()

/**
 * Trae el dataset completo (seedSql + tablas + retos) de una base.
 * Se memoriza: volver a elegir la misma base no vuelve a descargar nada.
 */
export function cargarDataset(id) {
  if (!cargadores[id]) {
    return Promise.reject(new Error(`No existe la base "${id}" en el registro del playground.`))
  }

  if (!cache.has(id)) {
    cache.set(
      id,
      cargadores[id]().catch(error => {
        // Si falla la descarga, se limpia para poder reintentar.
        cache.delete(id)
        throw error
      }),
    )
  }

  return cache.get(id)
}

/** Ids con dataset disponible, en el orden del catálogo. */
export const idsDisponibles = catalogo.map(ficha => ficha.id).filter(id => cargadores[id])
