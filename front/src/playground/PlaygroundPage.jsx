import { Card, Segmented, Select, Tag, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import PracticeIcon from '../practices/PracticeIcon.jsx'
import SqlEditor from '../practices/SqlEditor.jsx'
import { createDatabase, runQuery } from '../lib/sqlEngine.js'
import { analizarConsulta } from './analizarConsulta.js'
import { BLOQUES_POR_ID, cargarDataset, catalogo } from './datasets/index.js'
import ModelDiagram from './ModelDiagram.jsx'
import ResultChart, { sePuedeGraficar } from './ResultChart.jsx'
import SchemaPanel from './SchemaPanel.jsx'
import './playground.css'

const { Paragraph } = Typography

const MAX_FILAS = 500
const BASE_INICIAL = catalogo[0]?.id

/**
 * Playground libre: el alumno elige una base, ve su modelo y consulta lo que
 * quiera. Los retos guiados están al costado, pero no obligan: acá el valor es
 * poder explorar sin que nadie corrija.
 */
export default function PlaygroundPage() {
  const [baseId, setBaseId] = useState(BASE_INICIAL)
  const [dataset, setDataset] = useState(null)
  const [db, setDb] = useState(null)
  const [estado, setEstado] = useState('cargando')
  const [error, setError] = useState('')

  const [consulta, setConsulta] = useState('')
  const [resultado, setResultado] = useState(null)
  const [vista, setVista] = useState('tabla')
  const [tipoGrafico, setTipoGrafico] = useState('barras')
  const [historial, setHistorial] = useState([])
  const [retoAbierto, setRetoAbierto] = useState(null)
  // Ketal trae el OLTP además de la estrella: mostrarlo siempre le come espacio
  // al modelo dimensional, que es lo que el alumno viene a mirar.
  const [mostrarOltp, setMostrarOltp] = useState(false)

  const ficha = useMemo(() => catalogo.find(c => c.id === baseId), [baseId])

  // Cargar la base elegida. El dataset baja en su propio chunk.
  useEffect(() => {
    let cancelado = false
    setEstado('cargando')
    setError('')
    setResultado(null)
    setRetoAbierto(null)

    cargarDataset(baseId)
      .then(async ds => {
        const base = await createDatabase(ds.seedSql)
        if (cancelado) return
        setDataset(ds)
        setDb(base)
        setConsulta(consultaInicial(ds))
        setEstado('listo')
      })
      .catch(err => {
        if (cancelado) return
        setError(err.message ?? 'No se pudo cargar la base.')
        setEstado('error')
      })

    return () => { cancelado = true }
  }, [baseId])

  const ejecutar = useCallback(() => {
    if (!db) return
    const sql = consulta.trim()
    if (!sql) return

    try {
      const salida = runQuery(db, sql)
      const recortado = salida.rows.length > MAX_FILAS
      setResultado({
        ...salida,
        rows: recortado ? salida.rows.slice(0, MAX_FILAS) : salida.rows,
        totalFilas: salida.rows.length,
        recortado,
        error: null,
      })
      setHistorial(previo => [{ sql, filas: salida.rows.length, ok: true }, ...previo.filter(h => h.sql !== sql)].slice(0, 25))
    } catch (err) {
      setResultado({ columns: [], rows: [], error: err.message })
      setHistorial(previo => [{ sql, filas: 0, ok: false }, ...previo.filter(h => h.sql !== sql)].slice(0, 25))
    }
  }, [db, consulta])

  /*
   * Se analiza en cada tecla, no al ejecutar: la gracia es que el alumno vea
   * el modelo encenderse mientras arma la consulta, y entienda qué está
   * tocando ANTES de correrla.
   */
  const analisis = useMemo(
    () => (dataset ? analizarConsulta(consulta, dataset.tablas) : { tablas: [], columnas: new Set(), relaciones: new Set() }),
    [consulta, dataset],
  )

  const tablasTocadas = analisis.tablas

  const tieneOltp = useMemo(() => Boolean(dataset?.tablas.some(t => t.oltp)), [dataset])

  // Si la consulta usa tablas del OLTP, se muestran solas: sería confuso
  // resaltar tablas que están escondidas.
  useEffect(() => {
    if (!dataset || !tieneOltp) return
    const usaOltp = dataset.tablas.some(t => t.oltp && tablasTocadas.includes(t.nombre))
    if (usaOltp) setMostrarOltp(true)
  }, [dataset, tieneOltp, tablasTocadas])

  const retosPorBloque = useMemo(() => {
    if (!dataset) return []
    const mapa = new Map()
    for (const reto of dataset.retos) {
      if (!mapa.has(reto.bloque)) mapa.set(reto.bloque, [])
      mapa.get(reto.bloque).push(reto)
    }
    return [...mapa.entries()]
  }, [dataset])

  function usarReto(reto) {
    setRetoAbierto(reto.id === retoAbierto ? null : reto.id)
    if (reto.id !== retoAbierto) {
      setConsulta(reto.starter ?? '')
      setResultado(null)
    }
  }

  return (
    <div className="pg-page">
      <section className="pg-grid">
        <div className="pg-columna-izq">
          <Card className="practice-card pg-card">
            <header className="pg-head">
              <div className="pg-head-titulos">
                <Tag color="blue">Playground</Tag>
                <h2 className="pg-title">Laboratorio de consultas</h2>
              </div>

              <Select
                className="pg-selector"
                value={baseId}
                onChange={setBaseId}
                options={catalogo.map(item => ({
                  value: item.id,
                  label: `${item.nombre} · ${item.dominio}`,
                }))}
                size="large"
              />
            </header>

            {ficha && (
              <div className="pg-ficha">
                <p className="pg-ficha-concepto">{ficha.concepto}</p>
                <p className="pg-ficha-nota">{ficha.nota}</p>
                <div className="pg-ficha-datos">
                  <span><strong>{ficha.tablas}</strong> tablas</span>
                  <span><strong>{ficha.retos}</strong> retos</span>
                  <span>modelo <strong>{ficha.tipo === 'estrella' ? 'en estrella' : 'relacional'}</strong></span>
                </div>
              </div>
            )}

            {estado === 'cargando' && <Paragraph className="pg-aviso">Cargando {ficha?.nombre}…</Paragraph>}
            {estado === 'error' && <Paragraph className="pg-aviso pg-aviso-error">{error}</Paragraph>}

            {estado === 'listo' && (
              <>
                <div className="pg-editor-bloque">
                  <div className="pg-editor-barra">
                    <span className="practice-panel-label">Consulta</span>
                    <div className="pg-editor-acciones">
                      <button type="button" className="pg-boton pg-boton-fantasma" onClick={() => { setConsulta(''); setResultado(null) }}>
                        Limpiar
                      </button>
                      <button type="button" className="pg-boton pg-boton-primario" onClick={ejecutar}>
                        Ejecutar
                      </button>
                    </div>
                  </div>

                  <SqlEditor
                    value={consulta}
                    onChange={setConsulta}
                    rows={10}
                    placeholder={`-- Escribe SQL contra ${ficha?.nombre ?? 'la base'} y aprieta Ejecutar.\n-- Ctrl + Enter también corre la consulta.`}
                    onSubmit={ejecutar}
                  />
                </div>

                <Resultado
                  resultado={resultado}
                  vista={vista}
                  setVista={setVista}
                  tipoGrafico={tipoGrafico}
                  setTipoGrafico={setTipoGrafico}
                />

                <Retos
                  bloques={retosPorBloque}
                  abierto={retoAbierto}
                  onUsar={usarReto}
                  onSolucion={reto => { setConsulta(reto.expectedSql); setResultado(null) }}
                />

                {historial.length > 0 && (
                  <Historial
                    historial={historial}
                    onElegir={sql => setConsulta(sql)}
                    onLimpiar={() => setHistorial([])}
                  />
                )}
              </>
            )}
          </Card>
        </div>

        <aside className="pg-columna-der">
          {estado === 'listo' && dataset && (
            <div className="pg-panel-modelo">
              <div className="pg-panel-head">
                <span className="practice-panel-label">Modelo</span>

                {tieneOltp ? (
                  <Segmented
                    size="small"
                    value={mostrarOltp ? 'todo' : 'estrella'}
                    onChange={valor => setMostrarOltp(valor === 'todo')}
                    options={[
                      { label: 'Solo la estrella', value: 'estrella' },
                      { label: 'Con el OLTP', value: 'todo' },
                    ]}
                  />
                ) : (
                  <span className="pg-panel-pista">{resumenUso(analisis)}</span>
                )}
              </div>

              {tieneOltp && <p className="pg-panel-uso">{resumenUso(analisis)}</p>}

              <div className="pg-panel-lienzo">
                <ModelDiagram
                  tablas={dataset.tablas}
                  resaltadas={tablasTocadas}
                  columnasActivas={analisis.columnas}
                  relacionesActivas={analisis.relaciones}
                  mostrarOltp={mostrarOltp}
                />
              </div>

              <p className="pg-leyenda">
                <span><i className="pg-chip pg-chip-hecho" /> hecho</span>
                <span><i className="pg-chip pg-chip-dimension" /> dimensión</span>
                <span><i className="pg-chip pg-chip-tabla" /> tabla OLTP</span>
                <span><i className="pg-chip pg-chip-uso" /> lo que usa tu consulta</span>
              </p>

              <SchemaPanel
                tablas={dataset.tablas}
                resaltadas={tablasTocadas}
                columnasActivas={analisis.columnas}
              />
            </div>
          )}
        </aside>
      </section>
    </div>
  )
}

function Resultado({ resultado, vista, setVista, tipoGrafico, setTipoGrafico }) {
  if (!resultado) {
    return <p className="pg-resultado-vacio">El resultado de tu consulta aparece acá.</p>
  }

  if (resultado.error) {
    return (
      <div className="pg-resultado">
        <p className="pg-error">{resultado.error}</p>
      </div>
    )
  }

  if (resultado.rows.length === 0) {
    return (
      <div className="pg-resultado">
        <p className="pg-resultado-vacio">La consulta corrió bien pero no devolvió filas.</p>
      </div>
    )
  }

  const graficable = sePuedeGraficar(resultado)

  return (
    <div className="pg-resultado">
      <div className="pg-resultado-barra">
        <span className="pg-resultado-conteo">
          {resultado.totalFilas} fila(s)
          {resultado.recortado && <em> · se muestran las primeras {MAX_FILAS}</em>}
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
              <tr>{resultado.columns.map(col => <th key={col}>{col}</th>)}</tr>
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

function Retos({ bloques, abierto, onUsar, onSolucion }) {
  if (!bloques.length) return null

  return (
    <div className="pg-retos">
      <span className="practice-panel-label">Retos de esta base</span>

      {bloques.map(([idBloque, retos]) => (
        <div key={idBloque} className="pg-bloque">
          <h4 className="pg-bloque-nombre">
            {BLOQUES_POR_ID[idBloque]?.nombre ?? idBloque}
            <em>{BLOQUES_POR_ID[idBloque]?.descripcion}</em>
          </h4>

          <ul className="pg-bloque-lista">
            {retos.map(reto => (
              <li key={reto.id} className={abierto === reto.id ? 'pg-reto-abierto' : ''}>
                <button type="button" className="pg-reto-cabecera" onClick={() => onUsar(reto)}>
                  <span className="pg-reto-titulo">{reto.title}</span>
                  <span className="pg-reto-concepto">{reto.concept}</span>
                </button>

                {abierto === reto.id && (
                  <div className="pg-reto-cuerpo">
                    <p className="pg-reto-consigna">{reto.prompt}</p>
                    <p className="pg-reto-pista"><strong>Pista</strong> {reto.hint}</p>
                    {reto.trampa && <p className="pg-reto-trampa"><strong>Ojo</strong> {reto.trampa}</p>}
                    <button type="button" className="pg-boton pg-boton-fantasma" onClick={() => onSolucion(reto)}>
                      Ver la solución
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function Historial({ historial, onElegir, onLimpiar }) {
  return (
    <div className="pg-historial">
      <div className="pg-historial-head">
        <span className="practice-panel-label">Historial</span>
        <button type="button" className="pg-boton pg-boton-fantasma" onClick={onLimpiar}>Vaciar</button>
      </div>
      <ul>
        {historial.map((item, i) => (
          <li key={i}>
            <button type="button" onClick={() => onElegir(item.sql)} title={item.sql}>
              <span className={`pg-historial-marca ${item.ok ? 'ok' : 'mal'}`} />
              <code>{item.sql.replace(/\s+/g, ' ').slice(0, 90)}</code>
              <em>{item.ok ? `${item.filas} fila(s)` : 'error'}</em>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Qué está tocando la consulta, en una línea. */
function resumenUso({ tablas, columnas, relaciones }) {
  if (!tablas.length) return 'Escribe una consulta y el modelo se va encendiendo'

  const partes = [`${tablas.length} tabla${tablas.length === 1 ? '' : 's'}`]
  if (columnas.size) partes.push(`${columnas.size} campo${columnas.size === 1 ? '' : 's'}`)
  // El plural de "relación" pierde la tilde: relaciones, no relaciónes.
  if (relaciones.size) partes.push(`${relaciones.size} ${relaciones.size === 1 ? 'relación' : 'relaciones'}`)

  return partes.join(' · ')
}

/** Primera consulta sugerida: la más simple que muestre datos de verdad. */
function consultaInicial(dataset) {
  const hecho = dataset.tablas.find(t => t.rol === 'hecho') ?? dataset.tablas[0]
  return `SELECT *\nFROM ${hecho.nombre}\nLIMIT 10;`
}

