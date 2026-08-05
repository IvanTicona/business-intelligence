import { Button } from 'antd'
import { useState } from 'react'
import PracticeIcon from './PracticeIcon.jsx'
import SqlEditor from './SqlEditor.jsx'
import { compareResults } from '../lib/comparar.js'
import { ejecutarConsulta } from '../lib/api.js'

/**
 * Editor + ejecución real contra el PostgreSQL del servidor.
 * Si `expectedSql` viene definido, además compara el resultado del alumno
 * contra el de la consulta de referencia, ejecutando ambas sobre la misma base.
 */
export default function SqlWorkbench({
  base,
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

    const salida = await ejecutarConsulta({ base, sql: value }).catch(err => ({ error: err.message }))

    if (salida.error) {
      setResult(null)
      // El servidor ya traduce el error de Postgres con su posición y su pista.
      setError(salida.error)
      return
    }

    const actual = { columns: salida.columns, rows: salida.rows }
    setResult(actual)

    if (!expectedSql) return

    const esperada = await ejecutarConsulta({ base, sql: expectedSql }).catch(err => ({ error: err.message }))
    if (esperada.error) {
      setError(`No se pudo calcular la respuesta esperada: ${esperada.error}`)
      return
    }

    const comparison = compareResults(actual, { columns: esperada.columns, rows: esperada.rows }, orderMatters)
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
