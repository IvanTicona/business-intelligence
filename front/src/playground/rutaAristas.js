import { CAJA_ANCHO } from './datasets/contrato.js'

/**
 * Cómo se dibuja la línea de una relación.
 *
 * Vive aparte del componente para poder probarse sin navegador: que una línea
 * no pase por detrás de una tabla ajena es una propiedad del dibujo que se
 * puede verificar, y conviene hacerlo.
 */

const MARGEN_CARRIL = 34

/** ¿El segmento entre dos tablas atraviesa la caja de una tercera? */
export function cruza(a, b, caja) {
  const PASOS = 60
  for (let i = 1; i < PASOS; i++) {
    const x = a.x + ((b.x - a.x) * i) / PASOS
    const y = a.y + ((b.y - a.y) * i) / PASOS
    if (x > caja.izq && x < caja.der && y > caja.arriba && y < caja.abajo) return true
  }
  return false
}

/**
 * Puntos por los que pasa la relación.
 *
 * Lo normal son dos: una recta de borde a borde. Pero si esa recta pasaría por
 * detrás de otra tabla, se devuelve un codo que la rodea: una línea escondida
 * detrás de una caja intermedia PARECE conectarse con ella, y en un diagrama
 * que se usa para enseñar eso no es un detalle estético, es un dato falso.
 */
/** ¿Algún tramo del camino atraviesa una caja que no es su origen ni su destino? */
function limpio(puntos, desde, hasta, todas) {
  const ajenas = todas.filter(c => c.nombre !== desde.nombre && c.nombre !== hasta.nombre)

  for (let i = 0; i < puntos.length - 1; i++) {
    const a = puntos[i]
    const b = puntos[i + 1]
    for (const caja of ajenas) {
      const PASOS = 80
      for (let k = 1; k < PASOS; k++) {
        const x = a.x + ((b.x - a.x) * k) / PASOS
        const y = a.y + ((b.y - a.y) * k) / PASOS
        if (x > caja.izq && x < caja.der && y > caja.arriba && y < caja.abajo) return false
      }
    }
  }

  return true
}

/**
 * Se prueban varios caminos y se devuelve el primero que no cruce nada: la
 * recta, un rodeo por izquierda o derecha, y un rodeo por arriba o por abajo.
 *
 * Un solo rodeo no alcanza: en los modelos con dimensiones encadenadas, el
 * carril lateral resolvía el cruce del medio pero los tramos horizontales
 * seguían pasando por detrás de otra tabla.
 */
export function puntosDeRuta(desde, hasta, todas) {
  const [x1, y1, x2, y2] = recortar(desde, hasta)
  const recta = [{ x: x1, y: y1 }, { x: x2, y: y2 }]
  if (limpio(recta, desde, hasta, todas)) return recta

  const izquierda = Math.min(...todas.map(c => c.izq)) - MARGEN_CARRIL
  const derecha = Math.max(...todas.map(c => c.der)) + MARGEN_CARRIL
  const arriba = Math.min(...todas.map(c => c.arriba)) - MARGEN_CARRIL
  const abajo = Math.max(...todas.map(c => c.abajo)) + MARGEN_CARRIL

  const porElLado = carril => [
    { x: carril < desde.x ? desde.izq : desde.der, y: desde.y },
    { x: carril, y: desde.y },
    { x: carril, y: hasta.y },
    { x: carril < hasta.x ? hasta.izq : hasta.der, y: hasta.y },
  ]

  const porElBorde = carril => [
    { x: desde.x, y: carril < desde.y ? desde.arriba : desde.abajo },
    { x: desde.x, y: carril },
    { x: hasta.x, y: carril },
    { x: hasta.x, y: carril < hasta.y ? hasta.arriba : hasta.abajo },
  ]

  // Se prueba primero el lado más cercano, para que el rodeo sea el más corto.
  const centroX = (desde.x + hasta.x) / 2
  const centroY = (desde.y + hasta.y) / 2
  const lados = centroX - izquierda <= derecha - centroX ? [izquierda, derecha] : [derecha, izquierda]
  const bordes = centroY - arriba <= abajo - centroY ? [arriba, abajo] : [abajo, arriba]

  const candidatos = [...lados.map(porElLado), ...bordes.map(porElBorde)]

  for (const candidato of candidatos) {
    if (limpio(candidato, desde, hasta, todas)) return candidato
  }

  // Ninguno sirve: se deja la recta, que al menos es la lectura más directa.
  return recta
}

export function ruta(desde, hasta, todas) {
  const puntos = puntosDeRuta(desde, hasta, todas)
  return puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

/**
 * Marcas de cardinalidad en los extremos de la relación.
 *
 * La línea sola dice que dos tablas se relacionan, pero no CÓMO. La foránea
 * siempre está del lado "muchos": ahí va la pata de gallo, y del lado de la
 * clave primaria, la barra del "uno". Es la notación de toda la vida y le
 * ahorra al alumno tener que deducir la dirección leyendo las columnas.
 */
export function marcasDeCardinalidad(desde, hasta, todas) {
  const puntos = puntosDeRuta(desde, hasta, todas)
  const primero = puntos[0]
  const segundo = puntos[1]
  const ultimo = puntos[puntos.length - 1]
  const penultimo = puntos[puntos.length - 2]

  return {
    // `desde` es quien declara la foránea: el lado "muchos".
    muchos: { x: primero.x, y: primero.y, angulo: anguloHacia(primero, segundo) },
    uno: { x: ultimo.x, y: ultimo.y, angulo: anguloHacia(ultimo, penultimo) },
  }
}

/** Ángulo en grados desde `a` hacia `b`, para orientar la marca. */
function anguloHacia(a, b) {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
}

/**
 * Recorta el segmento centro-a-centro en el borde de cada caja: si se dibujara
 * completo, la línea entraría por debajo de las tablas y se vería salir de la
 * mitad del texto.
 */
export function recortar(a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const [ax, ay] = borde(a, dx, dy)
  const [bx, by] = borde(b, -dx, -dy)
  return [ax, ay, bx, by]
}

function borde(caja, dx, dy) {
  if (dx === 0 && dy === 0) return [caja.x, caja.y]

  const mitadX = CAJA_ANCHO / 2
  const mitadY = caja.alto / 2
  // Escala para llegar justo al lado que corresponda según la pendiente.
  const escalaX = dx === 0 ? Infinity : mitadX / Math.abs(dx)
  const escalaY = dy === 0 ? Infinity : mitadY / Math.abs(dy)
  const escala = Math.min(escalaX, escalaY)

  return [caja.x + dx * escala, caja.y + dy * escala]
}
