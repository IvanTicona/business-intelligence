import { useRef } from 'react'

const CLAUSULAS =
  'SELECT|FROM|WHERE|GROUP\\s+BY|ORDER\\s+BY|HAVING|LIMIT|OFFSET|INNER\\s+JOIN|LEFT\\s+JOIN|RIGHT\\s+JOIN|FULL\\s+OUTER\\s+JOIN|CROSS\\s+JOIN|JOIN|ON|AS|AND|OR|NOT|IN|BETWEEN|LIKE|IS|NULL|DISTINCT|UNION\\s+ALL|UNION|CASE|WHEN|THEN|ELSE|END|ASC|DESC|WITH|INSERT\\s+INTO|VALUES|UPDATE|SET|DELETE|CREATE\\s+TABLE|PRIMARY\\s+KEY|FOREIGN\\s+KEY|REFERENCES|UNIQUE'

const FUNCIONES =
  'SUM|COUNT|AVG|MIN|MAX|ROUND|COALESCE|NULLIF|CAST|UPPER|LOWER|SUBSTR|LENGTH|ABS|STRFTIME|DATE'

// Un solo barrido: comentario, cadena, número, cláusula, función, símbolo.
const TOKEN = new RegExp(
  [
    '(--[^\\n]*)',
    "('(?:[^']|'')*')",
    '(\\b\\d+(?:\\.\\d+)?\\b)',
    `\\b(${CLAUSULAS})\\b`,
    `\\b(${FUNCIONES})\\b`,
    '([(),;.*=<>!+\\-/%|]+)',
  ].join('|'),
  'gi',
)

const CLASES = ['sql-tk-comment', 'sql-tk-string', 'sql-tk-number', 'sql-tk-keyword', 'sql-tk-function', 'sql-tk-punct']

function tokenizar(sql) {
  const piezas = []
  let ultimo = 0
  TOKEN.lastIndex = 0

  for (let m = TOKEN.exec(sql); m !== null; m = TOKEN.exec(sql)) {
    if (m.index > ultimo) piezas.push({ texto: sql.slice(ultimo, m.index) })

    const grupo = m.slice(1).findIndex(g => g !== undefined)
    piezas.push({ texto: m[0], clase: CLASES[grupo] })
    ultimo = m.index + m[0].length
  }

  if (ultimo < sql.length) piezas.push({ texto: sql.slice(ultimo) })
  return piezas
}

/**
 * Editor SQL con resaltado. Un <textarea> no admite color por token, así que
 * el texto coloreado va en una capa <pre> por detrás y el textarea queda
 * encima con el texto transparente y solo el cursor visible. Ambas capas
 * comparten fuente, padding y ajuste de línea, y el scroll se sincroniza.
 */
export default function SqlEditor({
  value,
  onChange,
  disabled,
  rows = 7,
  placeholder = 'Escribe aquí tu consulta SQL...',
  onSubmit,
  onSeleccion,
  estilo,
}) {
  const capaRef = useRef(null)
  const areaRef = useRef(null)

  // Ctrl+Enter ejecuta, que es lo que todo el mundo intenta en un editor SQL.
  function atajos(event) {
    if (onSubmit && event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      onSubmit()
    }
  }

  const piezas = tokenizar(value ?? '')
  const vacio = !value

  /*
   * Avisa qué hay seleccionado, para que quien use el editor pueda ejecutar
   * solo ese fragmento. Se escucha `select` y también teclado y ratón: en
   * Chrome, mover el cursor con las flechas sin seleccionar nada no dispara
   * `select`, y sin eso la selección anterior quedaría marcada como vigente
   * después de que el alumno ya la deshizo.
   */
  function avisarSeleccion() {
    if (!onSeleccion) return

    const area = areaRef.current
    if (!area) return

    const { selectionStart: desde, selectionEnd: hasta } = area
    onSeleccion(hasta > desde ? (value ?? '').slice(desde, hasta) : '')
  }

  function sincronizar(event) {
    if (!capaRef.current) return
    capaRef.current.scrollTop = event.target.scrollTop
    capaRef.current.scrollLeft = event.target.scrollLeft
  }

  return (
    <div className="sql-editor-shell" style={estilo}>
      <pre className="sql-editor-layer" ref={capaRef} aria-hidden="true">
        {vacio
          ? <span className="sql-editor-placeholder">{placeholder}</span>
          : piezas.map((p, i) => <span key={i} className={p.clase}>{p.texto}</span>)}
        {/* Salto final: sin esto la última línea vacía no se refleja en la capa */}
        {'\n'}
      </pre>

      <textarea
        ref={areaRef}
        className="sql-editor"
        spellCheck={false}
        rows={rows}
        disabled={disabled}
        value={value}
        onChange={event => {
          onChange(event.target.value)
          avisarSeleccion()
        }}
        onScroll={sincronizar}
        onKeyDown={atajos}
        onSelect={avisarSeleccion}
        onKeyUp={avisarSeleccion}
        onMouseUp={avisarSeleccion}
        onBlur={avisarSeleccion}
      />
    </div>
  )
}
