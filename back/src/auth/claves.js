/**
 * HASH DE CONTRASEÑAS · scrypt, el que ya trae Node
 *
 * Sin bcrypt ni argon2 a propósito. Los dos son módulos NATIVOS: para
 * instalarlos en la imagen `node:22-alpine` habría que agregar python3, make y
 * g++ al Dockerfile, que hoy es de una sola etapa y `npm ci --omit=dev`. Meter
 * un compilador de C en el despliegue de un curso, para algo que Node ya trae
 * resuelto, es cambiar riesgo operativo por nada.
 *
 * scrypt es memory-hard, que es justamente lo que hace cara una tabla de
 * contraseñas robada: una GPU puede paralelizar hashes baratos en memoria, no
 * estos.
 *
 * El formato guarda los parámetros junto al hash. Si mañana subimos el costo,
 * las contraseñas viejas se siguen verificando con los suyos y se re-hashean
 * cuando su dueño entra.
 */
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const derivar = promisify(scrypt)

// 128 * N * r = 16 MB por hash. Queda por debajo del `maxmem` que Node usa por
// defecto (32 MB), así que no hace falta tocarlo.
const N = 16384
const R = 8
const P = 1
const LARGO = 32

export async function hashearClave(clave) {
  const sal = randomBytes(16)
  const hash = await derivar(clave, sal, LARGO, { N, r: R, p: P })

  return ['scrypt', N, R, P, sal.toString('base64'), hash.toString('base64')].join('$')
}

/**
 * Compara en tiempo constante. Una comparación normal corta en el primer byte
 * distinto, y esa diferencia de microsegundos alcanza para adivinar un hash a
 * fuerza de intentos.
 */
export async function claveCoincide(clave, guardado) {
  try {
    const [algoritmo, n, r, p, sal, hash] = String(guardado).split('$')
    if (algoritmo !== 'scrypt') return false

    const esperado = Buffer.from(hash, 'base64')
    const calculado = await derivar(clave, Buffer.from(sal, 'base64'), esperado.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    })

    return timingSafeEqual(esperado, calculado)
  } catch {
    return false
  }
}
