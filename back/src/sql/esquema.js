/**
 * Lee el esquema de un schema para dibujar el diagrama.
 *
 * Solo la LECTURA vive acá; el acomodo de las cajas en el lienzo sigue en el
 * front, que es donde corresponde: es presentación, no datos.
 *
 * Tres consultas para todo el modelo, no una por tabla. Con quince tablas la
 * diferencia entre tres viajes y cuarenta y cinco se nota en cada tecla.
 */
const COLUMNAS = `
  SELECT table_name, column_name, data_type, is_nullable, ordinal_position
  FROM information_schema.columns
  WHERE table_schema = $1
  ORDER BY table_name, ordinal_position`

const PRIMARIAS = `
  SELECT tc.table_name, kcu.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = $1 AND tc.constraint_type = 'PRIMARY KEY'`

const FORANEAS = `
  SELECT tc.table_name, kcu.column_name, ccu.table_name AS destino
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
  WHERE tc.table_schema = $1 AND tc.constraint_type = 'FOREIGN KEY'`

/**
 * @param {object} pool    pool con el que leer (el del alumno)
 * @param {string} schema  nombre del schema
 * @returns {Promise<Array>} tablas sin acomodar, listas para el diagrama
 */
export async function leerEsquema(pool, schema) {
  const cliente = await pool.connect()

  try {
    const { rows: columnas } = await cliente.query(COLUMNAS, [schema])
    if (columnas.length === 0) return []

    const { rows: primarias } = await cliente.query(PRIMARIAS, [schema])
    const { rows: foraneas } = await cliente.query(FORANEAS, [schema])

    const esPk = new Set(primarias.map(p => `${p.table_name}.${p.column_name}`))
    const destinoFk = new Map(foraneas.map(f => [`${f.table_name}.${f.column_name}`, f.destino]))

    const porTabla = new Map()
    for (const c of columnas) {
      if (!porTabla.has(c.table_name)) porTabla.set(c.table_name, [])
      porTabla.get(c.table_name).push({
        nombre: c.column_name,
        tipo: c.data_type,
        pk: esPk.has(`${c.table_name}.${c.column_name}`),
        fk: destinoFk.get(`${c.table_name}.${c.column_name}`),
        obligatoria: c.is_nullable === 'NO',
      })
    }

    const filasDe = await contarTodas(cliente, schema, [...porTabla.keys()])

    return [...porTabla.entries()].map(([nombre, cols]) => ({
      nombre,
      columnas: cols,
      filas: filasDe.get(nombre) ?? 0,
      referencias: [...new Set(foraneas.filter(f => f.table_name === nombre).map(f => f.destino))].filter(
        t => t !== nombre,
      ),
    }))
  } finally {
    cliente.release()
  }
}

/**
 * Cuenta las filas de todas las tablas en UNA consulta.
 *
 * Tiene que ser el conteo exacto y no la estimación de `reltuples`, porque el
 * taller lo usa para verificar pasos del tipo "reserva necesita 8 filas": una
 * estimación vale cero hasta que Postgres analiza la tabla, y le diría al
 * alumno que no cargó nada cuando sí lo hizo.
 *
 * Un UNION ALL en vez de una consulta por tabla: son las tablas del alumno,
 * unas pocas y chicas, pero un viaje por tabla en cada ejecución se nota.
 */
async function contarTodas(cliente, schema, tablas) {
  if (tablas.length === 0) return new Map()

  const partes = tablas.map(
    t => `SELECT ${cliente.escapeLiteral(t)} AS tabla, COUNT(*)::int AS filas
          FROM ${cliente.escapeIdentifier(schema)}.${cliente.escapeIdentifier(t)}`,
  )

  try {
    const { rows } = await cliente.query(partes.join(' UNION ALL '))

    return new Map(rows.map(r => [r.tabla, r.filas]))
  } catch {
    // Una vista sin permisos o una tabla recién borrada no debe tumbar el
    // diagrama entero: se dibuja sin conteos.
    return new Map()
  }
}
