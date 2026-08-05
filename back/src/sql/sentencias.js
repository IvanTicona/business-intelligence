/**
 * Parte un script SQL en sentencias.
 *
 * No es cosmético: el ejecutor mete la consulta del alumno dentro de un
 * `DECLARE ... CURSOR FOR <consulta>`, y un punto y coma suelto CIERRA ese
 * DECLARE y hace que lo que venga después se ejecute como sentencia aparte.
 * Verificado: `SELECT 1; CLOSE bi_cursor; SELECT 999` llegaba a correr. Partir
 * acá garantiza que lo que se embebe es UNA sentencia sin punto y coma libre.
 *
 * No alcanza con `split(';')`. Hay que respetar:
 *   - cadenas          'texto; con punto y coma'
 *   - comillas dobles  "columna; rara"
 *   - comentarios      -- hasta el fin de línea   y   /* de bloque *\/
 *   - cuerpos $$...$$  el caso que rompe a los partidores ingenuos, porque un
 *                      bloque PL/pgSQL está lleno de puntos y coma
 */
export function partirSentencias(script) {
  const sentencias = []
  let actual = ''
  let i = 0

  while (i < script.length) {
    const c = script[i]
    const par = script.slice(i, i + 2)

    if (par === '--') {
      const fin = script.indexOf('\n', i)
      const hasta = fin === -1 ? script.length : fin
      actual += script.slice(i, hasta)
      i = hasta
      continue
    }

    if (par === '/*') {
      const fin = script.indexOf('*/', i + 2)
      const hasta = fin === -1 ? script.length : fin + 2
      actual += script.slice(i, hasta)
      i = hasta
      continue
    }

    if (c === "'" || c === '"') {
      const hasta = finDeCadena(script, i, c)
      actual += script.slice(i, hasta)
      i = hasta
      continue
    }

    // Etiqueta de dólar: $$ o $etiqueta$. Todo lo de adentro es literal.
    const etiqueta = etiquetaDolar(script, i)
    if (etiqueta) {
      const cierre = script.indexOf(etiqueta, i + etiqueta.length)
      const hasta = cierre === -1 ? script.length : cierre + etiqueta.length
      actual += script.slice(i, hasta)
      i = hasta
      continue
    }

    if (c === ';') {
      if (actual.trim()) sentencias.push(actual.trim())
      actual = ''
      i += 1
      continue
    }

    actual += c
    i += 1
  }

  if (actual.trim()) sentencias.push(actual.trim())

  return sentencias
}

/** Índice justo después de la comilla que cierra. '' escapa dentro de cadenas. */
function finDeCadena(texto, inicio, comilla) {
  let i = inicio + 1

  while (i < texto.length) {
    if (texto[i] === comilla) {
      if (texto[i + 1] === comilla) { i += 2; continue }

      return i + 1
    }
    i += 1
  }

  return texto.length
}

/** Devuelve `$$` o `$nombre$` si en esa posición empieza una etiqueta. */
function etiquetaDolar(texto, i) {
  if (texto[i] !== '$') return null

  const m = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(texto.slice(i))

  return m ? m[0] : null
}

/**
 * Con qué palabra empieza de verdad la sentencia, ignorando comentarios.
 * `-- nota\nSELECT ...` empieza con SELECT, no con un guion.
 */
export function palabraInicial(sentencia) {
  const limpia = sentencia
    .replace(/^\s*(?:--[^\n]*\n|\/\*[\s\S]*?\*\/|\s)+/, '')
    .trim()

  return (/^[A-Za-z]+/.exec(limpia)?.[0] ?? '').toUpperCase()
}
