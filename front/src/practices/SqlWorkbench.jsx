import { Button } from 'antd'
import { useState } from 'react'
import PracticeIcon from './PracticeIcon.jsx'
import SqlEditor from './SqlEditor.jsx'
import { compareResults, runQuery } from '../lib/sqlEngine.js'

/**
 * Editor + ejecución real contra PostgreSQL en el navegador.
 * Si `expectedSql` viene definido, además compara el resultado del alumno
 * contra el de la consulta de referencia, ejecutando ambas sobre la misma base.
 */
export default function SqlWorkbench({
  db,
  value,
  onChange,
  expectedSql,
  orderMatters = false,
  onSolved,
  disabled,
  rows = 7,
}) {
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [verdict, setVerdict] = useState(null)

  async function execute() {
    setError('')
    setVerdict(null)

    if (!value.trim()) {
      setError('Escribe una consulta antes de ejecutar.')
      setResult(null)
      return
    }

    let actual
    try {
      actual = await runQuery(db, value)
    } catch (sqlError) {
      setResult(null)
      setError(traducirError(sqlError))
      return
    }

    setResult(actual)

    if (!expectedSql) return

    const expected = await runQuery(db, expectedSql)
    const comparison = compareResults(actual, expected, orderMatters)
    setVerdict(comparison)
    if (comparison.ok) onSolved?.()
  }

  return (
    <div className="sql-workbench">
      <SqlEditor value={value} onChange={onChange} disabled={disabled} rows={rows} />

      <div className="sql-actions">
        <Button type="primary" onClick={execute} disabled={disabled}>
          <PracticeIcon name="play" />
          {expectedSql ? 'Ejecutar y verificar' : 'Ejecutar'}
        </Button>
        {verdict && (
          <span className={`sql-verdict ${verdict.ok ? 'sql-verdict-ok' : 'sql-verdict-bad'}`}>
            {verdict.ok ? '✓ Resultado correcto' : `✗ ${verdict.reason}`}
          </span>
        )}
      </div>

      {error && <p className="sql-error">{error}</p>}
      {result && <ResultTable result={result} />}
    </div>
  )
}

export function ResultTable({ result }) {
  if (result.columns.length === 0) {
    return <p className="sql-empty">La consulta no devolvió columnas.</p>
  }

  const visibleRows = result.rows.slice(0, 50)

  return (
    <div className="sql-result">
      <div className="sql-result-scroll">
        <table>
          <thead>
            <tr>
              {result.columns.map((column, index) => (
                <th key={`${column}-${index}`}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell === null ? <em>NULL</em> : String(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span className="sql-result-count">
        {result.rows.length} fila(s){result.rows.length > visibleRows.length ? `, mostrando las primeras ${visibleRows.length}` : ''}
      </span>
    </div>
  )
}

export function SchemaExplorer({ tables, title = 'Esquema disponible' }) {
  return (
    <div className="schema-list">
      <span className="practice-panel-label">{title}</span>
      {tables.map(item => (
        <div className={`schema-table ${item.kind === 'fact' ? 'schema-table-fact' : ''}`} key={item.table}>
          <strong>{item.table}</strong>
          <span>{item.columns.join(', ')}</span>
        </div>
      ))}
    </div>
  )
}

// Postgres responde en inglés y con jerga; traducimos los errores más frecuentes
// para que el alumno sepa qué corregir en vez de googlear el mensaje.
/**
 * Traduce el error de Postgres a algo accionable.
 *
 * Postgres trae más que el mensaje: código, posición del carácter y a veces una
 * pista propia. Se aprovechan todos: la diferencia entre "syntax error" y
 * "syntax error en la posición 42" es enorme para quien está aprendiendo.
 *
 * Los códigos son estables (los define el estándar), así que se usan en lugar
 * de reconocer el texto del mensaje, que cambia entre versiones.
 */
function traducirError(error) {
  const mensaje = (typeof error === 'string' ? error : error?.message ?? '').split('\n')[0]
  const codigo = typeof error === 'object' ? error?.code : undefined
  const posicion = typeof error === 'object' && error?.position ? ` (posición ${error.position})` : ''

  const ayuda = {
    // undefined_column
    '42703': 'Esa columna no existe. Revisa el nombre en el esquema de la derecha, o el alias de la tabla.',
    // undefined_table
    '42P01': 'Esa tabla no existe. Fíjate en el esquema los nombres exactos.',
    // syntax_error
    '42601': 'Error de sintaxis: suele ser una coma de más, un paréntesis sin cerrar o una palabra clave mal escrita.',
    // ambiguous_column
    '42702': 'La columna existe en más de una tabla del JOIN. Prefíjala con el alias, por ejemplo e.id_sector.',
    // grouping_error
    '42803': 'Toda columna que no esté dentro de una función de agregación tiene que aparecer en el GROUP BY.',
    // undefined_function
    '42883': 'Esa función no existe con esos tipos. Si es ROUND con dos argumentos, el primero debe ser numeric: prueba con ::numeric.',
    // datatype_mismatch
    '42804': 'Los tipos no coinciden. Postgres no convierte solo entre texto y número: castea con :: si hace falta.',
    // division_by_zero
    '22012': 'División por cero. Protege el denominador con NULLIF(divisor, 0).',
  }[codigo]

  return ayuda ? `${mensaje}${posicion}. ${ayuda}` : `${mensaje}${posicion}`
}
