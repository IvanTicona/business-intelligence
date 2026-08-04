import { Card, Segmented, Tag, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SqlEditor from '../practices/SqlEditor.jsx'
import ModelDiagram from '../playground/ModelDiagram.jsx'
import ResultChart, { sePuedeGraficar } from '../playground/ResultChart.jsx'
import { cargarMotor } from '../lib/sqlEngine.js'
import { caso } from './caso-sagarnaga.js'
import { ejecutarScript } from './ejecutarScript.js'
import { leerEsquema } from './esquemaVivo.js'
import { verificarPaso } from './verificarPaso.js'
// El taller reutiliza la distribución y el diagrama del laboratorio, así que
// necesita su hoja de estilos: sin esto las clases pg-* quedan sin definir y
// el diagrama se dibuja en negro sobre una página sin columnas.
import '../playground/playground.css'
import './taller.css'

const { Paragraph } = Typography

const CLAVE_GUARDADO = 'bi-course-taller-oltp'
const CLAVE_LOGRADOS = 'bi-course-taller-oltp-pasos'
const MAX_FILAS = 300

function leerLogrados() {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(CLAVE_LOGRADOS) ?? '[]'))
  } catch {
    return new Set()
  }
}

/**
 * Taller OLTP: acá el alumno no consulta una base, la CONSTRUYE.
 *
 * Escribe el DDL, la puebla y recién después la consulta. El diagrama de la
 * derecha no viene declarado en ningún lado: se lee de la base que el alumno
 * acaba de crear, así que cada CREATE TABLE aparece dibujado al instante.
 */
export default function TallerOltpPage() {
  const [motor, setMotor] = useState(null)
  const [script, setScript] = useState(() => window.localStorage.getItem(CLAVE_GUARDADO) ?? caso.scriptInicial)
  const [ejecucion, setEjecucion] = useState(null)
  const [vista, setVista] = useState('tabla')
  const [tipoGrafico, setTipoGrafico] = useState('barras')
  const [pasoAbierto, setPasoAbierto] = useState(caso.pasos[0].id)
  const [mostrarRegistro, setMostrarRegistro] = useState(false)

  /*
   * Los pasos logrados se recuerdan.
   *
   * Solo se puede verificar contra el script actual, y el script termina en UNA
   * consulta. Sin memoria, resolver el paso 8 desmarcaría el 7 y el alumno
   * nunca vería los doce completos: el avance es un registro de lo que ya
   * demostró, no una afirmación sobre el estado de este instante.
   */
  const [logrados, setLogrados] = useState(leerLogrados)

  const dbRef = useRef(null)

  useEffect(() => {
    cargarMotor().then(setMotor)
  }, [])

  // El script del alumno es su trabajo: no se pierde al recargar.
  useEffect(() => {
    window.localStorage.setItem(CLAVE_GUARDADO, script)
  }, [script])

  const correr = useCallback(() => {
    if (!motor) return

    // La base anterior se cierra: cada ejecución arranca de cero.
    dbRef.current?.close()

    const salida = ejecutarScript(motor, script)
    dbRef.current = salida.db

    const resultado = salida.resultado
      ? {
          ...salida.resultado,
          rows: salida.resultado.rows.slice(0, MAX_FILAS),
          totalFilas: salida.resultado.rows.length,
          recortado: salida.resultado.rows.length > MAX_FILAS,
        }
      : null

    setEjecucion({
      registro: salida.registro,
      error: salida.error,
      resultado,
      tablas: leerEsquema(salida.db),
      sello: Date.now(),
    })
  }, [motor, script])

  // Primera corrida apenas el motor está listo, para que el diagrama no
  // arranque vacío si el alumno ya tenía trabajo guardado.
  useEffect(() => {
    if (motor && !ejecucion) correr()
  }, [motor, ejecucion, correr])

  const tablas = ejecucion?.tablas ?? []

  const estadoDePasos = useMemo(() => {
    if (!ejecucion) return new Map()

    return new Map(
      caso.pasos.map(paso => [
        paso.id,
        verificarPaso(
          { ...paso, resultadoDelAlumno: ejecucion.resultado },
          { db: dbRef.current, tablas, modelo: caso.modelo },
        ),
      ]),
    )
  }, [ejecucion, tablas])

  // Lo que se acaba de resolver se suma a lo ya logrado.
  useEffect(() => {
    const nuevos = [...estadoDePasos.entries()].filter(([id, e]) => e.ok && !logrados.has(id)).map(([id]) => id)
    if (!nuevos.length) return

    const union = new Set([...logrados, ...nuevos])
    setLogrados(union)
    window.localStorage.setItem(CLAVE_LOGRADOS, JSON.stringify([...union]))
  }, [estadoDePasos, logrados])

  const resueltos = logrados.size

  function pegarDatos() {
    setScript(previo => `${previo.trimEnd()}\n\n${caso.datosDeEjemplo}\n`)
  }

  function empezarDeNuevo() {
    setScript(caso.scriptInicial)
    setEjecucion(null)
    setLogrados(new Set())
    window.localStorage.removeItem(CLAVE_LOGRADOS)
  }

  return (
    <div className="taller-page">
      <section className="pg-grid">
        <div className="pg-columna-izq">
          <Card className="practice-card pg-card">
            <header className="pg-head">
              <div className="pg-head-titulos">
                <Tag color="blue">Taller OLTP</Tag>
                <h2 className="pg-title">{caso.nombre}</h2>
              </div>
              <span className="taller-avance">
                {resueltos} de {caso.pasos.length} pasos
              </span>
            </header>

            <div className="pg-ficha">
              <p className="pg-ficha-concepto">{caso.resumen}</p>
              <p className="pg-ficha-nota">{caso.nota}</p>
            </div>

            {!motor && <Paragraph className="pg-aviso">Iniciando el motor SQL…</Paragraph>}

            {motor && (
              <>
                <div className="pg-editor-bloque">
                  <div className="pg-editor-barra">
                    <span className="practice-panel-label">Tu script</span>
                    <div className="pg-editor-acciones">
                      <button type="button" className="pg-boton pg-boton-fantasma" onClick={empezarDeNuevo}>
                        Empezar de nuevo
                      </button>
                      <button type="button" className="pg-boton pg-boton-fantasma" onClick={pegarDatos}>
                        Pegar datos de ejemplo
                      </button>
                      <button type="button" className="pg-boton pg-boton-primario" onClick={correr}>
                        Ejecutar
                      </button>
                    </div>
                  </div>

                  <SqlEditor
                    value={script}
                    onChange={setScript}
                    rows={16}
                    placeholder="-- Escribe aquí el SQL que crea tu base."
                    onSubmit={correr}
                  />

                  <p className="taller-nota-editor">
                    Cada ejecución arranca de una base vacía y corre todo el script de arriba abajo.
                  </p>
                </div>

                {ejecucion && (
                  <Registro
                    ejecucion={ejecucion}
                    abierto={mostrarRegistro}
                    onAlternar={() => setMostrarRegistro(v => !v)}
                  />
                )}

                <Resultado
                  resultado={ejecucion?.resultado}
                  vista={vista}
                  setVista={setVista}
                  tipoGrafico={tipoGrafico}
                  setTipoGrafico={setTipoGrafico}
                />

                <Pasos
                  estados={estadoDePasos}
                  logrados={logrados}
                  abierto={pasoAbierto}
                  onAbrir={id => setPasoAbierto(id === pasoAbierto ? null : id)}
                />
              </>
            )}
          </Card>
        </div>

        <aside className="pg-columna-der">
          <div className="pg-panel-modelo taller-panel">
            <div className="pg-panel-head">
              <span className="practice-panel-label">Tu base</span>
              <span className="pg-panel-pista">
                {tablas.length
                  ? `${tablas.length} tabla${tablas.length === 1 ? '' : 's'} creada${tablas.length === 1 ? '' : 's'}`
                  : 'Todavía no hay tablas'}
              </span>
            </div>

            <div className="pg-panel-lienzo">
              {tablas.length ? (
                <ModelDiagram key={ejecucion?.sello} tablas={tablas} />
              ) : (
                <p className="taller-lienzo-vacio">
                  Escribe un <code>CREATE TABLE</code> y ejecuta: la tabla aparece acá.
                </p>
              )}
            </div>

            <p className="pg-leyenda">
              <span><i className="pg-chip pg-chip-tabla" /> sin dependencias</span>
              <span><i className="pg-chip pg-chip-dimension" /> con una foránea</span>
              <span><i className="pg-chip pg-chip-hecho" /> con varias</span>
            </p>

            <Especificacion modelo={caso.modelo} tablas={tablas} />
          </div>
        </aside>
      </section>
    </div>
  )
}

/** Qué pasó con cada sentencia. Se abre solo cuando algo falló. */
function Registro({ ejecucion, abierto, onAlternar }) {
  const { registro, error } = ejecucion

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

function Resultado({ resultado, vista, setVista, tipoGrafico, setTipoGrafico }) {
  if (!resultado) {
    return <p className="pg-resultado-vacio">Cuando tu script termine en una consulta, el resultado aparece acá.</p>
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

function Pasos({ estados, logrados, abierto, onAbrir }) {
  const etapas = []
  for (const paso of caso.pasos) {
    if (!etapas.length || etapas[etapas.length - 1].nombre !== paso.etapa) {
      etapas.push({ nombre: paso.etapa, pasos: [] })
    }
    etapas[etapas.length - 1].pasos.push(paso)
  }

  return (
    <div className="pg-retos">
      <span className="practice-panel-label">Pasos del taller</span>

      {etapas.map(etapa => (
        <div key={etapa.nombre} className="pg-bloque">
          <h4 className="pg-bloque-nombre">{etapa.nombre}</h4>

          <ul className="pg-bloque-lista">
            {etapa.pasos.map(paso => {
              const estado = estados.get(paso.id) ?? { ok: false, problemas: [] }
              const logrado = logrados.has(paso.id)
              const desplegado = abierto === paso.id

              return (
                <li key={paso.id} className={desplegado ? 'pg-reto-abierto' : ''}>
                  <button type="button" className="pg-reto-cabecera" onClick={() => onAbrir(paso.id)}>
                    <span className={`taller-marca ${logrado ? 'taller-marca-ok' : ''}`}>
                      {logrado ? '✓' : ''}
                    </span>
                    <span className="pg-reto-titulo">{paso.titulo}</span>
                  </button>

                  {desplegado && (
                    <div className="pg-reto-cuerpo">
                      <p className="pg-reto-consigna">{paso.consigna}</p>
                      <p className="pg-reto-pista"><strong>Pista</strong> {paso.pista}</p>
                      {paso.porQue && <p className="pg-reto-trampa"><strong>Por qué</strong> {paso.porQue}</p>}

                      {estado.ok ? (
                        <p className="taller-estado-ok">Resuelto.</p>
                      ) : logrado ? (
                        <p className="taller-estado-hecho">
                          Ya lo resolviste. Tu script ahora está en otro paso, por eso no se comprueba en este momento.
                        </p>
                      ) : (
                        estado.problemas.length > 0 && (
                          <ul className="taller-problemas">
                            {estado.problemas.map(p => <li key={p}>{p}</li>)}
                          </ul>
                        )
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

/**
 * La especificación del modelo, de a una tabla por vez.
 *
 * En lista, las cinco tablas entraban solo achicando la letra hasta hacerla
 * ilegible. Mostrando una sola se puede usar todo el alto que sobra y leerla
 * de verdad, que es para lo que está: es la consigna que el alumno tiene que
 * cumplir mientras escribe el DDL.
 */
function Especificacion({ modelo, tablas }) {
  const [indice, setIndice] = useState(0)
  const pedido = modelo[indice]
  const existe = tablas.some(t => t.nombre.toLowerCase() === pedido.tabla.toLowerCase())

  const mover = paso => setIndice(previo => (previo + paso + modelo.length) % modelo.length)

  // Al crear una tabla se avanza sola a la siguiente pendiente: el alumno no
  // tiene que acordarse de mover la ficha para saber qué sigue.
  useEffect(() => {
    const hechas = new Set(tablas.map(t => t.nombre.toLowerCase()))
    const siguiente = modelo.findIndex(m => !hechas.has(m.tabla.toLowerCase()))
    if (siguiente !== -1) setIndice(siguiente)
  }, [tablas, modelo])

  return (
    <div className="taller-spec">
      <div className="taller-spec-barra">
        <button type="button" onClick={() => mover(-1)} aria-label="Tabla anterior">‹</button>

        <div className="taller-spec-titulo">
          <span className="practice-panel-label">Lo que hay que construir</span>
          <span className="taller-spec-cuenta">{indice + 1} de {modelo.length}</span>
        </div>

        <button type="button" onClick={() => mover(1)} aria-label="Tabla siguiente">›</button>
      </div>

      <article className={`taller-spec-ficha ${existe ? 'taller-spec-hecha' : ''}`}>
        <header>
          <span className={`taller-marca ${existe ? 'taller-marca-ok' : ''}`}>{existe ? '✓' : ''}</span>
          <code>{pedido.tabla}</code>
        </header>

        <p className="taller-spec-para">{pedido.para}</p>

        <ul className="taller-spec-columnas">
          {pedido.columnas.map(columna => (
            <li key={columna.nombre}>
              <code className={columna.pk ? 'pg-col-pk' : columna.fk ? 'pg-col-fk' : ''}>{columna.nombre}</code>
              <span>{columna.tipo}</span>
              {columna.pk && <em className="taller-spec-marca">clave primaria</em>}
              {columna.fk && <em className="taller-spec-marca">→ {columna.fk}</em>}
            </li>
          ))}
        </ul>
      </article>

      <div className="taller-spec-puntos">
        {modelo.map((m, i) => (
          <button
            key={m.tabla}
            type="button"
            className={[
              i === indice ? 'activo' : '',
              tablas.some(t => t.nombre.toLowerCase() === m.tabla.toLowerCase()) ? 'hecho' : '',
            ].join(' ').trim()}
            onClick={() => setIndice(i)}
            aria-label={m.tabla}
            title={m.tabla}
          />
        ))}
      </div>
    </div>
  )
}
