/**
 * Lee la consulta que el alumno está escribiendo y devuelve qué partes del
 * modelo está tocando: tablas, campos y relaciones.
 *
 * No es un parser de SQL ni pretende serlo. Corre en cada tecla, sobre texto
 * a medio escribir, y su única obligación es no equivocarse de forma visible:
 * ante la duda, no ilumina. Un resaltado de más confunde más que uno de menos.
 *
 * Lo que sí hace bien es resolver ALIAS, que es lo que separa un resaltado útil
 * de uno inútil: en `FROM hecho_venta h JOIN dim_producto p ON ...`, saber que
 * `p.categoria` es una columna de dim_producto y no de otra tabla.
 */

/** Palabras que nunca son un campo del modelo, aunque aparezcan sueltas. */
const RESERVADAS = new Set([
  'select', 'from', 'where', 'group', 'order', 'by', 'having', 'limit', 'offset',
  'join', 'inner', 'left', 'right', 'full', 'outer', 'cross', 'on', 'as', 'and',
  'or', 'not', 'in', 'between', 'like', 'is', 'null', 'distinct', 'union', 'all',
  'case', 'when', 'then', 'else', 'end', 'asc', 'desc', 'with', 'over', 'partition',
  'rows', 'range', 'preceding', 'following', 'current', 'row', 'unbounded',
  'sum', 'count', 'avg', 'min', 'max', 'round', 'coalesce', 'cast', 'exists',
  'insert', 'into', 'values', 'update', 'set', 'delete', 'create', 'table',
])

/**
 * Saca comentarios y literales de texto.
 * Sin esto, un `WHERE ciudad = 'La Paz'` haría que "paz" cuente como campo, y
 * un comentario con el nombre de una tabla la encendería sin que se use.
 */
function limpiar(sql) {
  return sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:[^']|'')*'/g, " '' ")
}

/**
 * Mapa alias -> tabla real, leyendo las cláusulas FROM y JOIN.
 * Una tabla sin alias se mapea a sí misma.
 */
/** Palabras que cierran la lista de tablas de un FROM o un JOIN. */
const FIN_DE_REGION = /\b(?:where|group|order|having|limit|offset|union|intersect|except|join|inner|left|right|full|cross|on|using)\b|[();]/i

function resolverAlias(sql, nombresTabla) {
  const alias = new Map()
  const tablas = new Set()

  /*
   * Cada FROM o JOIN abre una región que se lee hasta la siguiente cláusula.
   * Un único regex con el alias como grupo opcional NO sirve: en
   * `FROM hecho_venta JOIN dim_tiempo`, el grupo del alias se come el JOIN y
   * todas las tablas siguientes quedan sin detectar.
   */
  const inicio = /\b(?:from|join)\s+/gi

  for (let m = inicio.exec(sql); m !== null; m = inicio.exec(sql)) {
    const resto = sql.slice(m.index + m[0].length)
    const corte = resto.search(FIN_DE_REGION)
    const region = corte === -1 ? resto : resto.slice(0, corte)

    // La región puede traer varias tablas separadas por coma: `FROM a, b`.
    for (const referencia of region.split(',')) {
      const partes = referencia.trim().split(/\s+/).filter(Boolean)
      if (!partes.length) continue

      const tabla = partes[0].toLowerCase()
      if (!nombresTabla.has(tabla)) continue

      tablas.add(tabla)
      alias.set(tabla, tabla)

      const posible = (partes[1]?.toLowerCase() === 'as' ? partes[2] : partes[1])?.toLowerCase()
      if (posible && !RESERVADAS.has(posible)) alias.set(posible, tabla)
    }
  }

  return { alias, tablas }
}

/**
 * @param {string} sql   consulta tal como la está escribiendo el alumno
 * @param {Array}  tablas definición del modelo (del dataset)
 * @returns {{tablas: string[], columnas: Set<string>, relaciones: Set<string>}}
 *          columnas y relaciones vienen como "tabla.columna"
 */
export function analizarConsulta(sql, tablas) {
  const vacio = { tablas: [], columnas: new Set(), relaciones: new Set() }
  if (!sql || !sql.trim()) return vacio

  const limpio = limpiar(sql)
  const nombresTabla = new Set(tablas.map(t => t.nombre.toLowerCase()))
  const porNombre = new Map(tablas.map(t => [t.nombre.toLowerCase(), t]))

  /*
   * Una tabla se considera tocada solo si aparece en un FROM o un JOIN.
   *
   * La tentación es encender cualquier tabla cuyo nombre aparezca en el texto,
   * pero eso rompe apenas un nombre se repite: en Ketal, `categoria` es una
   * tabla del OLTP Y una columna de dim_producto, así que `SELECT categoria
   * FROM dim_producto` encendía la tabla equivocada.
   */
  const { alias, tablas: referenciadas } = resolverAlias(limpio, nombresTabla)

  const columnas = new Set()

  // Se guardan siempre con el nombre REAL de la tabla y la columna, no con la
  // forma en minúscula que se usó para buscar: el diagrama compara contra la
  // definición del dataset.
  const marcar = (tabla, columna) => {
    const definicion = porNombre.get(tabla)
    const encontrada = definicion?.columnas.find(c => c.nombre.toLowerCase() === columna)
    if (!encontrada) return false

    columnas.add(`${definicion.nombre}.${encontrada.nombre}`)
    return true
  }

  // 1. Referencias calificadas: alias.columna
  const calificada = /\b([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)\b/gi
  for (let m = calificada.exec(limpio); m !== null; m = calificada.exec(limpio)) {
    const tabla = alias.get(m[1].toLowerCase())
    if (tabla) marcar(tabla, m[2].toLowerCase())
  }

  /*
   * 2. Referencias sueltas: se atribuyen a las tablas referenciadas que tengan
   *    ese campo. Si el nombre existe en varias, se encienden todas: la consulta
   *    es genuinamente ambigua y disimularlo sería peor.
   *
   *    Un nombre que además es de tabla (`categoria`) SÍ se evalúa como campo:
   *    lo que decide si la tabla se enciende es el FROM, no esta pasada.
   */
  const suelta = /(^|[^a-z0-9_.])([a-z_][a-z0-9_]*)\b/gi
  for (let m = suelta.exec(limpio); m !== null; m = suelta.exec(limpio)) {
    const palabra = m[2].toLowerCase()
    if (RESERVADAS.has(palabra) || alias.has(palabra)) continue
    for (const tabla of referenciadas) marcar(tabla, palabra)
  }

  /*
   * 3. Relaciones: se encienden por la IGUALDAD del JOIN, no por tener las dos
   *    tablas presentes. Mencionar hecho_venta y dim_producto no significa que
   *    se estén uniendo; `ON h.id_producto = p.id_producto` sí.
   */
  const relaciones = new Set()
  const igualdad = /\b([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)\s*=\s*([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)/gi

  for (let m = igualdad.exec(limpio); m !== null; m = igualdad.exec(limpio)) {
    const izq = { tabla: alias.get(m[1].toLowerCase()), columna: m[2].toLowerCase() }
    const der = { tabla: alias.get(m[3].toLowerCase()), columna: m[4].toLowerCase() }
    if (!izq.tabla || !der.tabla) continue

    // La arista vive del lado que declara la FK; puede ser cualquiera de los dos.
    for (const [origen, destino] of [[izq, der], [der, izq]]) {
      const definicion = porNombre.get(origen.tabla)
      const columna = definicion?.columnas.find(c => c.nombre.toLowerCase() === origen.columna)
      if (columna?.fk && columna.fk.toLowerCase() === destino.tabla) {
        relaciones.add(`${definicion.nombre}.${columna.nombre}`)
      }
    }
  }

  return {
    tablas: [...referenciadas].map(n => porNombre.get(n).nombre),
    columnas,
    relaciones,
  }
}
