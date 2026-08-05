import { Card, Tag, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SqlEditor from '../practices/SqlEditor.jsx'
import ModelDiagram from '../playground/ModelDiagram.jsx'
import { RegistroSentencias, ResultadoConsola } from '../consola/piezas.jsx'
import { ejecutarEspacio, leerTrabajo } from '../lib/api.js'
import { elegir, guardar, leerLocal } from '../lib/trabajoLocal.js'
import { caso } from './caso-sagarnaga.js'
import { prepararEsquema } from './esquemaVivo.js'
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

function aConjunto(texto) {
  try {
    return new Set(JSON.parse(texto || '[]'))
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
  const [base, setBase] = useState(null)
  const [script, setScript] = useState(() => leerLocal(CLAVE_GUARDADO, caso.scriptInicial))
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
  const [logrados, setLogrados] = useState(() => aConjunto(leerLocal(CLAVE_LOGRADOS)))

  /*
   * Lo que trae de OTRA computadora gana sobre lo que haya en esta. Solo la
   * primera vez: después manda lo que el alumno esté escribiendo acá.
   */
  const [sincronizado, setSincronizado] = useState(false)

  useEffect(() => {
    let vivo = true

    leerTrabajo().then(t => {
      if (!vivo) return
      const suyo = elegir(t['taller-script'], CLAVE_GUARDADO, caso.scriptInicial)
      if (suyo !== script) {
        setScript(suyo)
        setEjecucion(null)
      }
      setLogrados(aConjunto(elegir(t['taller-pasos'], CLAVE_LOGRADOS, '[]')))
      setSincronizado(true)
    })

    return () => { vivo = false }
    // Solo al montar: después el servidor no vuelve a pisar lo que se escribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // El script del alumno es su trabajo: al instante en este navegador, y al
  // servidor un momento después para que lo encuentre en cualquier otro.
  useEffect(() => {
    if (sincronizado) guardar(CLAVE_GUARDADO, 'taller-script', script)
  }, [script, sincronizado])

  /*
   * Cada corrida vacía la base y ejecuta el script entero. Acá eso es lo
   * correcto: el entregable del taller es el SCRIPT, y con la base recreada lo
   * que está escrito es exactamente lo que existe. En el playground libre, en
   * cambio, la base es el entregable y no se vacía.
   */
  const correr = useCallback(async () => {
    /*
     * Todo el cuerpo va protegido y `setBase(true)` en el finally.
     *
     * Antes, si el pedido fallaba, la excepción cortaba antes de marcar la
     * consola como lista y la página quedaba para siempre en "Iniciando
     * PostgreSQL…", sin editor y sin decir qué pasó. Un fallo tiene que
     * mostrarse EN la consola, no en lugar de ella.
     */
    try {
      const salida = await ejecutarEspacio({ espacio: 'taller', sql: script, reiniciar: true })
      const falla = salida.registro?.find(l => !l.ok)

      setEjecucion({
        registro: salida.registro ?? [],
        error: salida.error ? { mensaje: salida.error, numero: falla?.numero ?? 1, resumen: falla?.resumen ?? '' } : null,
        resultado: salida.columns?.length
          ? { columns: salida.columns, rows: salida.rows, totalFilas: salida.filas, recortado: salida.recortado }
          : null,
        tablas: prepararEsquema(salida.tablas),
        sello: Date.now(),
      })
    } catch (err) {
      setEjecucion({
        registro: [],
        error: { mensaje: err.message, numero: 1, resumen: '' },
        resultado: null,
        tablas: [],
        sello: Date.now(),
      })
    } finally {
      setBase(true)
    }
  }, [script])

  // Primera corrida al abrir, para que el diagrama no arranque vacío si el
  // alumno ya tenía trabajo guardado.
  useEffect(() => {
    if (!ejecucion) correr()
  }, [ejecucion, correr])

  const tablas = ejecucion?.tablas ?? []

  // La verificación consulta la base, así que es asíncrona: se guarda en estado
  // en vez de calcularse en el render.
  const [estadoDePasos, setEstadoDePasos] = useState(new Map())

  useEffect(() => {
    if (!ejecucion) return
    let viva = true

    // Con qué correr la consulta esperada de los pasos que comparan resultados.
    // No reinicia: tiene que verse la base tal como el alumno la dejó.
    const correrEnMiBase = sql => ejecutarEspacio({ espacio: 'taller', sql })

    Promise.all(
      caso.pasos.map(async paso => [
        paso.id,
        await verificarPaso(
          { ...paso, resultadoDelAlumno: ejecucion.resultado },
          { tablas, modelo: caso.modelo, correr: correrEnMiBase },
        ),
      ]),
    ).then(pares => { if (viva) setEstadoDePasos(new Map(pares)) })

    return () => { viva = false }
  }, [ejecucion, tablas])

  // Lo que se acaba de resolver se suma a lo ya logrado.
  useEffect(() => {
    const nuevos = [...estadoDePasos.entries()].filter(([id, e]) => e.ok && !logrados.has(id)).map(([id]) => id)
    if (!nuevos.length) return

    const union = new Set([...logrados, ...nuevos])
    setLogrados(union)
    guardar(CLAVE_LOGRADOS, 'taller-pasos', JSON.stringify([...union]))
  }, [estadoDePasos, logrados])

  const resueltos = logrados.size

  function pegarDatos() {
    setScript(previo => `${previo.trimEnd()}\n\n${caso.datosDeEjemplo}\n`)
  }

  function empezarDeNuevo() {
    setScript(caso.scriptInicial)
    setEjecucion(null)
    setLogrados(new Set())
    guardar(CLAVE_LOGRADOS, 'taller-pasos', '[]')
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

            {!base && <Paragraph className="pg-aviso">Iniciando PostgreSQL…</Paragraph>}

            {base && (
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
                  <RegistroSentencias
                    registro={ejecucion.registro}
                    error={ejecucion.error}
                    abierto={mostrarRegistro}
                    onAlternar={() => setMostrarRegistro(v => !v)}
                  />
                )}

                <ResultadoConsola
                  resultado={ejecucion?.resultado}
                  vista={vista}
                  setVista={setVista}
                  tipoGrafico={tipoGrafico}
                  setTipoGrafico={setTipoGrafico}
                  maxFilas={MAX_FILAS}
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
