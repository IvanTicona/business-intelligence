import { Button } from 'antd'
import { useState } from 'react'
import PracticeIcon from './PracticeIcon.jsx'
import SqlEditor from './SqlEditor.jsx'
import { ejecutarConsulta, verificarReto } from '../lib/api.js'

/**
 * Editor + ejecución real contra el PostgreSQL del servidor.
 *
 * Con `reto`, el veredicto lo da el servidor: se le manda qué reto y qué
 * escribió el alumno, y él corre la consulta de referencia y compara. Antes la
 * comparación estaba acá, con la respuesta al lado, y alcanzaba con pisar esa
 * función desde la consola del navegador para darse por aprobado.
 */
export default function SqlWorkbench({
  base,
  value,
  onChange,
  reto,
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

    // Sin reto, solo se ejecuta. Con reto, el servidor ejecuta Y corrige.
    const salida = await (reto ? verificarReto({ reto, sql: value }) : ejecutarConsulta({ base, sql: value })).catch(
      err => ({ error: err.message }),
    )

    if (salida.error) {
      setResult(null)
      // El servidor ya traduce el error de Postgres con su posición y su pista.
      setError(salida.error)
      return
    }

    setResult({ columns: salida.columns, rows: salida.rows })

    if (!reto) return

    setVerdict({ ok: salida.ok, reason: salida.razon })
    if (salida.ok) onSolved?.()
  }

  return (
    <div className="sql-workbench">
      <SqlEditor value={value} onChange={onChange} disabled={disabled} rows={rows} />

      <div className="sql-actions">
        <Button type="primary" onClick={execute} disabled={disabled}>
          <PracticeIcon name="play" />
          {reto ? 'Ejecutar y verificar' : 'Ejecutar'}
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
