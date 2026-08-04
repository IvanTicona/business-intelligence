import { Segmented } from 'antd'
import ResultChart, { sePuedeGraficar } from '../playground/ResultChart.jsx'

/**
 * Piezas comunes a las consolas donde el alumno ESCRIBE la base: el taller
 * guiado y el playground libre. Viven acá para no tener dos copias que se
 * desincronicen a la primera corrección.
 */

/** Qué pasó con cada sentencia. Se abre solo cuando algo falló. */
export function RegistroSentencias({ registro, error, abierto, onAlternar }) {
  return (
    <div className="taller-registro">
      {error ? (
        <div className="taller-error">
          <strong>La sentencia {error.numero} falló</strong>
          <code>{error.resumen}</code>
          <span>{error.mensaje}</span>
        </div>
      ) : (
        <button type="button" className="taller-registro-ok" onClick={onAlternar}>
          {registro.length} sentencia(s) ejecutadas sin errores
          <em>{abierto ? 'ocultar detalle' : 'ver detalle'}</em>
        </button>
      )}

      {(abierto || error) && (
        <ol className="taller-registro-lista">
          {registro.map(linea => (
            <li key={linea.numero} className={linea.ok ? '' : 'taller-linea-mal'}>
              <span className="taller-linea-tipo">{linea.tipo}</span>
              <code>{linea.resumen}</code>
              <em>{linea.detalle}</em>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/** Resultado de la última consulta, como tabla o como gráfico. */
export function ResultadoConsola({
  resultado,
  vista,
  setVista,
  tipoGrafico,
  setTipoGrafico,
  maxFilas,
  vacio = 'Cuando tu script termine en una consulta, el resultado aparece acá.',
}) {
  if (!resultado) return <p className="pg-resultado-vacio">{vacio}</p>

  const graficable = sePuedeGraficar(resultado)

  return (
    <div className="pg-resultado">
      <div className="pg-resultado-barra">
        <span className="pg-resultado-conteo">
          {resultado.totalFilas} fila(s)
          {resultado.recortado && <em> · se muestran las primeras {maxFilas}</em>}
        </span>

        <Segmented
          size="small"
          value={vista}
          onChange={setVista}
          options={[
            { label: 'Tabla', value: 'tabla' },
            { label: 'Gráfico', value: 'grafico', disabled: !graficable },
          ]}
        />

        {vista === 'grafico' && (
          <Segmented
            size="small"
            value={tipoGrafico}
            onChange={setTipoGrafico}
            options={[
              { label: 'Barras', value: 'barras' },
              { label: 'Líneas', value: 'lineas' },
              { label: 'Torta', value: 'torta' },
            ]}
          />
        )}
      </div>

      {vista === 'tabla' ? (
        <div className="pg-tabla-scroll">
          <table className="pg-tabla">
            <thead>
              <tr>{resultado.columns.map((col, i) => <th key={`${col}-${i}`}>{col}</th>)}</tr>
            </thead>
            <tbody>
              {resultado.rows.map((fila, i) => (
                <tr key={i}>
                  {fila.map((celda, j) => (
                    <td key={j} className={typeof celda === 'number' ? 'pg-celda-num' : ''}>
                      {celda === null ? <span className="pg-nulo">NULL</span> : String(celda)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ResultChart resultado={resultado} tipo={tipoGrafico} />
      )}
    </div>
  )
}
