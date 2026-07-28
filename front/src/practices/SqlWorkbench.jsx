import { Button } from 'antd'
import { useState } from 'react'
import PracticeIcon from './PracticeIcon.jsx'
import { compareResults, runQuery } from '../lib/sqlEngine.js'

/**
 * Editor + ejecución real contra SQLite en el navegador.
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

  function execute() {
    setError('')
    setVerdict(null)

    if (!value.trim()) {
      setError('Escribí una consulta antes de ejecutar.')
      setResult(null)
      return
    }

    let actual
    try {
      actual = runQuery(db, value)
    } catch (sqlError) {
      setResult(null)
      setError(traducirError(sqlError.message))
      return
    }

    setResult(actual)

    if (!expectedSql) return

    const expected = runQuery(db, expectedSql)
    const comparison = compareResults(actual, expected, orderMatters)
    setVerdict(comparison)
    if (comparison.ok) onSolved?.()
  }

  return (
    <div className="sql-workbench">
      <textarea
        className="sql-editor"
        spellCheck={false}
        rows={rows}
        disabled={disabled}
        value={value}
        onChange={event => onChange(event.target.value)}
      />

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
        {result.rows.length} fila(s){result.rows.length > visibleRows.length ? ` — mostrando las primeras ${visibleRows.length}` : ''}
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

// SQLite responde en inglés y con jerga; traducimos los errores más frecuentes
// para que el alumno sepa qué corregir en vez de googlear el mensaje.
function traducirError(message) {
  if (/no such column/i.test(message)) {
    return `${message} — esa columna no existe. Revisá el nombre en el esquema de la derecha, o el alias de la tabla.`
  }
  if (/no such table/i.test(message)) {
    return `${message} — esa tabla no existe. Fijate en el esquema los nombres exactos.`
  }
  if (/syntax error/i.test(message)) {
    return `${message} — error de sintaxis. Suele ser una coma de más, un paréntesis sin cerrar o una palabra clave mal escrita.`
  }
  if (/ambiguous column name/i.test(message)) {
    return `${message} — la columna existe en más de una tabla del JOIN. Prefijala con el alias, por ejemplo e.id_sector.`
  }
  if (/misuse of aggregate/i.test(message)) {
    return `${message} — no podés usar una función de agregación ahí. Para filtrar por un agregado se usa HAVING, no WHERE.`
  }
  return message
}
