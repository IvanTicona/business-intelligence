import { CAJA_ANCHO, CAJA_CABECERA, CAJA_FILA } from '../playground/datasets/contrato.js'

/**
 * Lee el esquema de la base que el alumno acaba de crear y lo devuelve con la
 * misma forma que usan las bases del laboratorio, para que `ModelDiagram` lo
 * dibuje sin enterarse de la diferencia.
 *
 * La diferencia de fondo con el laboratorio: allá el modelo viene DECLARADO en
 * el dataset; acá hay que DESCUBRIRLO de la base real. Se lee con los PRAGMA de
 * SQLite en vez de parsear el CREATE TABLE del alumno, porque lo que importa es
 * lo que la base tiene de verdad, no lo que el texto parecía decir.
 */

const ESPACIO_X = 250
const ESPACIO_Y = 60

function filas(db, sql) {
  const salida = db.exec(sql)
  if (!salida.length) return []
  const { columns, values } = salida[0]
  return values.map(fila => Object.fromEntries(columns.map((c, i) => [c, fila[i]])))
}

/**
 * @returns {Array} tablas con { nombre, rol, x, y, columnas: [{nombre, tipo, pk, fk}] }
 */
export function leerEsquema(db) {
  if (!db) return []

  const tablas = filas(
    db,
    `SELECT name FROM sqlite_master
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
     ORDER BY name`,
  ).map(f => f.name)

  const leidas = tablas.map(nombre => {
    const columnas = filas(db, `PRAGMA table_info('${nombre}')`)
    const foraneas = filas(db, `PRAGMA foreign_key_list('${nombre}')`)
    const fkPorColumna = new Map(foraneas.map(f => [f.from, f.table]))

    return {
      nombre,
      columnas: columnas.map(c => ({
        nombre: c.name,
        tipo: (c.type || 'TEXT').toUpperCase(),
        pk: c.pk > 0,
        fk: fkPorColumna.get(c.name),
        obligatoria: c.notnull === 1,
      })),
      referencias: [...new Set(foraneas.map(f => f.table))].filter(t => t !== nombre),
    }
  })

  return acomodar(leidas)
}

/**
 * Acomoda las tablas por NIVELES de dependencia: las que no referencian a nadie
 * arriba, y debajo las que dependen de ellas. En un OLTP eso deja los catálogos
 * en la primera fila y las tablas de movimiento abajo, que es como se lee un
 * modelo relacional.
 *
 * No sirve la disposición radial del laboratorio: ahí hay UN hecho al centro,
 * acá hay cadenas de dependencia de profundidad variable.
 */
function acomodar(tablas) {
  const porNombre = new Map(tablas.map(t => [t.nombre, t]))
  const nivel = new Map()

  const calcular = (nombre, visitando = new Set()) => {
    if (nivel.has(nombre)) return nivel.get(nombre)
    // Una referencia circular no puede colgar el cálculo.
    if (visitando.has(nombre)) return 0

    visitando.add(nombre)
    const tabla = porNombre.get(nombre)
    const padres = (tabla?.referencias ?? []).filter(r => porNombre.has(r))
    const propio = padres.length
      ? Math.max(...padres.map(p => calcular(p, visitando))) + 1
      : 0
    visitando.delete(nombre)

    nivel.set(nombre, propio)
    return propio
  }

  for (const tabla of tablas) calcular(tabla.nombre)

  // Agrupar por nivel, conservando el orden alfabético dentro de cada uno.
  const niveles = new Map()
  for (const tabla of tablas) {
    const n = nivel.get(tabla.nombre) ?? 0
    if (!niveles.has(n)) niveles.set(n, [])
    niveles.get(n).push(tabla)
  }

  const ordenados = [...niveles.entries()].sort((a, b) => a[0] - b[0])
  const anchoMaximo = Math.max(1, ...ordenados.map(([, lista]) => lista.length))
  const salida = []
  const posicionX = new Map()
  let y = 0

  for (const [, lista] of ordenados) {
    /*
     * Dentro de cada nivel, las tablas se ordenan por el promedio de la
     * posición de sus padres (heurística del baricentro). Así cada hija cae
     * debajo de quien la referencia y las líneas se cruzan mucho menos: sin
     * esto, una relación que salta dos niveles pasa por detrás de una tabla
     * intermedia y parece conectarse con ella, que es peor que fea, es falsa.
     */
    lista.sort((a, b) => {
      const centro = tabla => {
        const padres = tabla.referencias.map(r => posicionX.get(r)).filter(x => x !== undefined)
        return padres.length ? padres.reduce((s, x) => s + x, 0) / padres.length : Number.MAX_SAFE_INTEGER
      }
      const ca = centro(a)
      const cb = centro(b)
      return ca === cb ? a.nombre.localeCompare(b.nombre) : ca - cb
    })

    const altoDelNivel = Math.max(
      ...lista.map(t => CAJA_CABECERA + t.columnas.length * CAJA_FILA),
    )
    // Cada nivel se centra respecto del más ancho, para que el dibujo no quede
    // pegado a la izquierda cuando un nivel tiene una sola tabla.
    const desplazamiento = ((anchoMaximo - lista.length) * ESPACIO_X) / 2

    lista.forEach((tabla, i) => {
      const x = desplazamiento + i * ESPACIO_X + CAJA_ANCHO / 2
      posicionX.set(tabla.nombre, x)

      salida.push({
        ...tabla,
        // El rol solo pinta: la tabla con más FK es la de movimiento.
        rol: tabla.referencias.length >= 2 ? 'hecho' : tabla.referencias.length ? 'dimension' : 'tabla',
        x,
        y: y + altoDelNivel / 2,
      })
    })

    y += altoDelNivel + ESPACIO_Y
  }

  return salida
}

/**
 * Compara el esquema real contra lo que pide un paso del caso.
 * Devuelve los problemas en lenguaje llano: son para el alumno, no para un log.
 */
export function verificarEsquema(tablas, pedido) {
  const problemas = []
  const tabla = tablas.find(t => t.nombre.toLowerCase() === pedido.tabla.toLowerCase())

  if (!tabla) {
    return [`Todavía no existe la tabla ${pedido.tabla}.`]
  }

  for (const columna of pedido.columnas ?? []) {
    const real = tabla.columnas.find(c => c.nombre.toLowerCase() === columna.nombre.toLowerCase())

    if (!real) {
      problemas.push(`A ${pedido.tabla} le falta la columna ${columna.nombre}.`)
      continue
    }

    if (columna.pk && !real.pk) {
      problemas.push(`${columna.nombre} tiene que ser la clave primaria de ${pedido.tabla}.`)
    }

    if (columna.fk) {
      if (!real.fk) {
        problemas.push(`${pedido.tabla}.${columna.nombre} tiene que ser clave foránea hacia ${columna.fk}.`)
      } else if (real.fk.toLowerCase() !== columna.fk.toLowerCase()) {
        problemas.push(`${pedido.tabla}.${columna.nombre} apunta a ${real.fk} y debería apuntar a ${columna.fk}.`)
      }
    }
  }

  return problemas
}

/** Cuenta filas de una tabla; 0 si todavía no existe. */
export function contarFilas(db, tabla) {
  try {
    const salida = db.exec(`SELECT COUNT(*) FROM "${tabla}"`)
    return salida.length ? salida[0].values[0][0] : 0
  } catch {
    return 0
  }
}
