/**
 * MUDANZA DE LA BASE DEL NAVEGADOR AL SERVIDOR
 *
 * Antes, el Playground libre guardaba una base PostgreSQL entera en IndexedDB.
 * Ahora vive en el servidor. Sin esto, el alumno que ya venía trabajando abre la
 * consola y encuentra su base vacía, con su trabajo atrapado en un IndexedDB que
 * nadie vuelve a leer.
 *
 * El script sí sobrevive —está en localStorage y se sigue leyendo— pero desde
 * que la base dejó de vaciarse en cada corrida, lo que el alumno insertó a mano
 * puede no estar en el script. Por eso no alcanza con re-ejecutarlo: hay que
 * leer la base vieja de verdad.
 *
 * EL COSTO, y por qué se paga: leer esa base obliga a cargar PGlite, que son
 * 3,65 MB. Va con `import()` dinámico, así que lo descarga ÚNICAMENTE quien
 * tiene una base vieja que mudar. Quien entra por primera vez no paga nada.
 */

const BASE_VIEJA = 'bi-course-playground'
const YA_MUDADA = 'bi-course-playground-mudada'

/**
 * ¿Hay algo que mudar? Se responde SIN cargar PGlite: solo se mira la lista de
 * almacenes de IndexedDB. Es lo que hace que esto sea gratis para la mayoría.
 */
export async function hayBaseVieja() {
  if (window.localStorage.getItem(YA_MUDADA)) return false
  if (!indexedDB.databases) return false

  try {
    const almacenes = await indexedDB.databases()

    return almacenes.some(a => a.name?.endsWith(BASE_VIEJA))
  } catch {
    return false
  }
}

/** Se llama cuando la mudanza terminó bien, o cuando el alumno la descarta. */
export async function olvidarBaseVieja({ borrar = true } = {}) {
  window.localStorage.setItem(YA_MUDADA, new Date().toISOString())

  if (!borrar) return

  try {
    const almacenes = await indexedDB.databases()
    const objetivo = almacenes.map(a => a.name).find(n => n?.endsWith(BASE_VIEJA))
    if (!objetivo) return

    await new Promise(listo => {
      const pedido = indexedDB.deleteDatabase(objetivo)
      pedido.onsuccess = pedido.onerror = pedido.onblocked = listo
    })
  } catch {
    // Que no se pueda borrar no invalida la mudanza: ya está marcada como hecha
    // y no se va a volver a ofrecer.
  }
}

/**
 * Abre la base vieja y devuelve un script SQL que la reconstruye.
 *
 * El orden importa y está pensado para no pelearse con las claves foráneas:
 * primero TODAS las tablas sin foráneas, después los datos, y al final las
 * foráneas con ALTER TABLE. Así no hace falta ordenar las tablas por
 * dependencia ni preocuparse por ciclos.
 *
 * @returns {Promise<{sql: string, tablas: number, filas: number}>}
 */
export async function volcarBaseVieja(baseYaAbierta = null) {
  let db = baseYaAbierta

  if (!db) {
    const { PGlite } = await import('@electric-sql/pglite')
    db = new PGlite(`idb://${BASE_VIEJA}`)
    await db.waitReady
  }

  try {
    const { rows: columnas } = await db.query(`
      SELECT table_name, column_name, data_type, character_maximum_length,
             numeric_precision, numeric_scale, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position`)

    if (columnas.length === 0) return { sql: '', tablas: 0, filas: 0 }

    const { rows: primarias } = await db.query(`
      SELECT tc.table_name, kcu.column_name, kcu.ordinal_position
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY kcu.ordinal_position`)

    const { rows: foraneas } = await db.query(`
      SELECT tc.constraint_name, tc.table_name, kcu.column_name,
             ccu.table_name AS destino, ccu.column_name AS destino_columna
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'`)

    const tablas = [...new Set(columnas.map(c => c.table_name))]
    const partes = ['-- Tu base, tal como estaba guardada en este navegador.']
    let totalFilas = 0

    for (const tabla of tablas) {
      const cols = columnas.filter(c => c.table_name === tabla)
      const pk = primarias.filter(p => p.table_name === tabla).map(p => id(p.column_name))

      const definicion = cols.map(c => {
        const trozos = [id(c.column_name), tipoDe(c)]
        if (c.is_nullable === 'NO') trozos.push('NOT NULL')
        // Los DEFAULT de secuencia (nextval) no se copian: la secuencia no
        // existe del otro lado y el valor real ya viaja en los INSERT.
        if (c.column_default && !/nextval\(/i.test(c.column_default)) trozos.push(`DEFAULT ${c.column_default}`)

        return '  ' + trozos.join(' ')
      })

      if (pk.length) definicion.push(`  PRIMARY KEY (${pk.join(', ')})`)

      partes.push(`\nCREATE TABLE ${id(tabla)} (\n${definicion.join(',\n')}\n);`)
    }

    for (const tabla of tablas) {
      const cols = columnas.filter(c => c.table_name === tabla).map(c => c.column_name)
      const { rows } = await db.query(`SELECT * FROM ${id(tabla)}`)
      if (rows.length === 0) continue

      totalFilas += rows.length
      // De a mil por sentencia: un INSERT gigantesco con miles de filas es
      // difícil de leer si algo falla, y el servidor tiene un tope de tamaño.
      for (let i = 0; i < rows.length; i += 1000) {
        const tanda = rows.slice(i, i + 1000)
        const valores = tanda.map(f => `  (${cols.map(c => literal(f[c])).join(', ')})`).join(',\n')
        partes.push(`\nINSERT INTO ${id(tabla)} (${cols.map(id).join(', ')}) VALUES\n${valores};`)
      }
    }

    // Las foráneas al final: así el orden de creación y de carga deja de
    // importar, y los ciclos entre tablas tampoco molestan.
    const porNombre = new Map()
    for (const f of foraneas) {
      if (!porNombre.has(f.constraint_name)) porNombre.set(f.constraint_name, { ...f, columnas: [], destinos: [] })
      porNombre.get(f.constraint_name).columnas.push(f.column_name)
      porNombre.get(f.constraint_name).destinos.push(f.destino_columna)
    }

    for (const f of porNombre.values()) {
      partes.push(
        `\nALTER TABLE ${id(f.table_name)} ADD FOREIGN KEY (${f.columnas.map(id).join(', ')}) ` +
          `REFERENCES ${id(f.destino)} (${[...new Set(f.destinos)].map(id).join(', ')});`,
      )
    }

    return { sql: partes.join('\n'), tablas: tablas.length, filas: totalFilas }
  } finally {
    // Solo se cierra la que abrió esta función; si la trajo quien llama, es
    // suya y no le corresponde cerrarla (lo usa la prueba con una base en
    // memoria).
    if (!baseYaAbierta) await db.close?.().catch(() => {})
  }
}

/** Identificador entre comillas dobles, con las internas escapadas. */
const id = nombre => `"${String(nombre).replaceAll('"', '""')}"`

/** Literal SQL. Todo lo que no sea número o booleano va como cadena citada. */
function literal(valor) {
  if (valor === null || valor === undefined) return 'NULL'
  if (typeof valor === 'number') return Number.isFinite(valor) ? String(valor) : 'NULL'
  if (typeof valor === 'boolean') return valor ? 'TRUE' : 'FALSE'
  if (valor instanceof Date) return `'${valor.toISOString()}'`
  if (typeof valor === 'object') return `'${JSON.stringify(valor).replaceAll("'", "''")}'::jsonb`

  return `'${String(valor).replaceAll("'", "''")}'`
}

/** Reconstruye el tipo con su precisión, que information_schema devuelve aparte. */
function tipoDe(columna) {
  const tipo = columna.data_type

  if (tipo === 'character varying' || tipo === 'character') {
    return columna.character_maximum_length ? `${tipo}(${columna.character_maximum_length})` : tipo
  }
  if (tipo === 'numeric' && columna.numeric_precision) {
    return `numeric(${columna.numeric_precision}, ${columna.numeric_scale ?? 0})`
  }

  return tipo
}
