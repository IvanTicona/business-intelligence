/** Utilidades compartidas por los generadores de datasets. */

/** PRNG con semilla: los datos deben ser IDÉNTICOS en cada corrida. */
export function rng(semilla) {
  let s = semilla >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export const elegir = (r, lista) => lista[Math.floor(r() * lista.length)]
export const entre = (r, min, max) => min + Math.floor(r() * (max - min + 1))
export const decimal = (r, min, max, dec = 2) => Number((min + r() * (max - min)).toFixed(dec))

/** Reparte con pesos: [['a',3],['b',1]] devuelve 'a' tres veces más seguido. */
export function pesado(r, pares) {
  const total = pares.reduce((acc, [, peso]) => acc + peso, 0)
  let n = r() * total
  for (const [valor, peso] of pares) {
    n -= peso
    if (n <= 0) return valor
  }
  return pares[pares.length - 1][0]
}

export const comillas = texto => String(texto).replace(/'/g, "''")

/** Arma un INSERT multi-fila legible, cortando en bloques para no hacer una línea infinita. */
export function insert(tabla, columnas, filas, porBloque = 1) {
  // Un NaN se escribiría sin comillas y SQLite lo leería como nombre de
  // columna, fallando con un "no such column: NaN" que no dice nada. Mejor
  // reventar acá, señalando la fila y la columna exactas.
  filas.forEach((fila, i) => {
    fila.forEach((valor, j) => {
      if (typeof valor === 'number' && !Number.isFinite(valor)) {
        throw new Error(`${tabla}: valor no finito (${valor}) en la fila ${i + 1}, columna "${columnas[j]}"`)
      }
      if (valor === undefined) {
        throw new Error(`${tabla}: undefined en la fila ${i + 1}, columna "${columnas[j]}"`)
      }
    })
  })

  const partes = []
  for (let i = 0; i < filas.length; i += porBloque) {
    const bloque = filas.slice(i, i + porBloque)
    const valores = bloque
      .map(fila => '(' + fila.map(v => (v === null ? 'NULL' : typeof v === 'number' ? v : `'${comillas(v)}'`)).join(', ') + ')')
      .join(',\n  ')
    partes.push(`INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES\n  ${valores};`)
  }
  return partes.join('\n')
}

/**
 * Dimensión tiempo por CTE recursivo en vez de 731 INSERT a mano.
 * SQLite lo soporta y el archivo baja de ~45 KB a diez líneas.
 */
export function dimTiempo(desde, hasta) {
  return `
CREATE TABLE dim_tiempo (
  id_tiempo INTEGER PRIMARY KEY,
  fecha TEXT NOT NULL,
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  nombre_mes TEXT NOT NULL,
  trimestre INTEGER NOT NULL,
  dia_semana TEXT NOT NULL,
  es_fin_semana INTEGER NOT NULL
);

INSERT INTO dim_tiempo (id_tiempo, fecha, anio, mes, nombre_mes, trimestre, dia_semana, es_fin_semana)
WITH RECURSIVE dias(d) AS (
  SELECT date('${desde}')
  UNION ALL
  SELECT date(d, '+1 day') FROM dias WHERE d < '${hasta}'
)
SELECT
  CAST(strftime('%Y%m%d', d) AS INTEGER),
  d,
  CAST(strftime('%Y', d) AS INTEGER),
  CAST(strftime('%m', d) AS INTEGER),
  CASE CAST(strftime('%m', d) AS INTEGER)
    WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo' WHEN 4 THEN 'Abril'
    WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio' WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto'
    WHEN 9 THEN 'Septiembre' WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' ELSE 'Diciembre'
  END,
  (CAST(strftime('%m', d) AS INTEGER) + 2) / 3,
  CASE CAST(strftime('%w', d) AS INTEGER)
    WHEN 0 THEN 'Domingo' WHEN 1 THEN 'Lunes' WHEN 2 THEN 'Martes' WHEN 3 THEN 'Miercoles'
    WHEN 4 THEN 'Jueves' WHEN 5 THEN 'Viernes' ELSE 'Sabado'
  END,
  CASE WHEN CAST(strftime('%w', d) AS INTEGER) IN (0, 6) THEN 1 ELSE 0 END
FROM dias;`.trim()
}

/** id_tiempo es AAAAMMDD, así el hecho referencia la fecha sin buscar la PK. */
export const idTiempo = fecha => Number(fecha.replaceAll('-', ''))

/** Devuelve todas las fechas entre dos límites, en formato AAAA-MM-DD. */
export function fechas(desde, hasta) {
  const salida = []
  const fin = new Date(hasta + 'T00:00:00Z')
  for (let d = new Date(desde + 'T00:00:00Z'); d <= fin; d.setUTCDate(d.getUTCDate() + 1)) {
    salida.push(d.toISOString().slice(0, 10))
  }
  return salida
}

/** Encabezado común: deja constancia de que el archivo es generado. */
export function encabezado(nombre, generador) {
  return `/*
 * ${nombre}
 *
 * ARCHIVO GENERADO. No lo edites a mano: se regenera con
 *   node scripts/datasets/${generador}
 *
 * Los nombres de negocio son reales para que el alumno reconozca el caso.
 * Las cifras son didácticas y no representan la operación real de la empresa.
 */`
}
