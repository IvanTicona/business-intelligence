import { Card, Popconfirm, Tag, Typography } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'
import SqlEditor from '../practices/SqlEditor.jsx'
import ModelDiagram from '../playground/ModelDiagram.jsx'
import SchemaPanel from '../playground/SchemaPanel.jsx'
import { ejecutarEspacio, leerEspacio, vaciarEspacio } from '../lib/api.js'
import { prepararEsquema } from '../taller/esquemaVivo.js'
import { RegistroSentencias, ResultadoConsola } from './piezas.jsx'
import '../playground/playground.css'
import '../taller/taller.css'
import './consola.css'

const { Paragraph } = Typography

const CLAVE_GUARDADO = 'bi-course-consola-libre'

const MAX_FILAS = 500

const SCRIPT_INICIAL = `-- Playground · PostgreSQL 18
--
-- Esto es una base vacia y tuya. No hay consigna ni correccion: crea lo que
-- quieras, cargalo, consultalo y rompelo.
--
-- Funciona como una sesion de verdad: las sentencias se APLICAN sobre la base
-- que ya existe y quedan guardadas en el SERVIDOR. Si entras desde otra
-- computadora, tus tablas y tus datos siguen ahi.

CREATE TABLE ciudad (
  id_ciudad INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  altura_msnm INTEGER
);

INSERT INTO ciudad (id_ciudad, nombre, altura_msnm) VALUES
  (1, 'La Paz', 3640),
  (2, 'El Alto', 4150),
  (3, 'Cochabamba', 2558),
  (4, 'Santa Cruz', 416);

SELECT nombre, altura_msnm
FROM ciudad
ORDER BY altura_msnm DESC;
`

/**
 * Playground: una base PostgreSQL propia, sin consigna.
 *
 * El taller enseña a construir un modelo siguiendo una especificación y el
 * laboratorio enseña a consultar modelos ya hechos. Acá no hay nada que
 * cumplir: es el lugar para probar una idea, reproducir un ejemplo de clase o
 * equivocarse sin que nadie corrija.
 *
 * A diferencia del taller, la base NO se vacía en cada ejecución y vive en el
 * servidor, con su propio rol de Postgres. El trabajo se acumula entre sesiones,
 * como en cualquier base de verdad: hoy creas las tablas, mañana las cargas y
 * pasado las consultas.
 */
export default function ConsolaLibrePage() {
  const [motor, setMotor] = useState(null)
  const [script, setScript] = useState(() => window.localStorage.getItem(CLAVE_GUARDADO) ?? SCRIPT_INICIAL)
  const [tablas, setTablas] = useState([])
  const [ejecucion, setEjecucion] = useState(null)
  const [corriendo, setCorriendo] = useState(false)
  const [vista, setVista] = useState('tabla')
  const [tipoGrafico, setTipoGrafico] = useState('barras')
  const [mostrarRegistro, setMostrarRegistro] = useState(false)
  const sello = useRef(0)

  useEffect(() => {
    let viva = true

    // Se dibuja lo que YA hay en el servidor, sin ejecutar nada: volver a
    // correr el script duplicaría los INSERT de la sesión anterior.
    leerEspacio('libre')
      .then(({ tablas: guardadas }) => {
        if (!viva) return
        sello.current += 1
        setTablas(prepararEsquema(guardadas))
        setMotor({ listo: true, motivo: null })
      })
      .catch(err => {
        if (viva) setMotor({ listo: false, motivo: err.message })
      })

    return () => { viva = false }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(CLAVE_GUARDADO, script)
  }, [script])

  const correr = useCallback(async (reiniciar = false) => {
    if (!motor?.listo || corriendo) return
    setCorriendo(true)

    try {
      const salida = await ejecutarEspacio({ espacio: 'libre', sql: script, reiniciar })
      const falla = salida.registro?.find(l => !l.ok)

      sello.current += 1
      setTablas(prepararEsquema(salida.tablas))
      setEjecucion({
        registro: salida.registro ?? [],
        error: salida.error ? { mensaje: salida.error, numero: falla?.numero ?? 1, resumen: falla?.resumen ?? '' } : null,
        resultado: salida.columns?.length
          ? { columns: salida.columns, rows: salida.rows, totalFilas: salida.filas, recortado: salida.recortado }
          : null,
      })
    } catch (err) {
      setEjecucion({ registro: [], error: { mensaje: err.message, numero: 1, resumen: '' }, resultado: null })
    } finally {
      setCorriendo(false)
    }
  }, [motor, script, corriendo])

  /** Deja la base vacía sin ejecutar nada. Distinto de "Vaciar", que borra el editor. */
  async function vaciarLaBase() {
    if (corriendo) return
    setCorriendo(true)

    try {
      await vaciarEspacio('libre')
      sello.current += 1
      setTablas([])
      setEjecucion(null)
    } finally {
      setCorriendo(false)
    }
  }

  return (
    <div className="libre-page">
      <section className="pg-grid">
        <div className="pg-columna-izq">
          <Card className="practice-card pg-card">
            <header className="pg-head">
              <div className="pg-head-titulos">
                <Tag color="blue">Playground</Tag>
                <h2 className="pg-title">Tu base, sin consigna</h2>
              </div>
              <span className="libre-motor">PostgreSQL 18</span>
            </header>

            <div className="pg-ficha">
              <p className="pg-ficha-concepto">
                Una base propia para probar lo que quieras: crear tablas, cargarlas, consultarlas y
                romperlas. Nada de esto se entrega ni se corrige.
              </p>
              <p className="pg-ficha-nota">
                Funciona como una sesión de verdad: cada ejecución se aplica sobre lo que ya existe.
                Si quieres practicar sobre modelos ya armados, están en Laboratorio OLAP; si quieres
                construir uno siguiendo una consigna, en Taller OLTP.
              </p>
            </div>

            {!motor && <Paragraph className="pg-aviso">Abriendo tu base…</Paragraph>}

            {motor && !motor.listo && (
              <p className="libre-aviso-temporal">No se pudo abrir tu base: {motor.motivo}</p>
            )}

            {motor?.listo && (
              <>
                <div className="pg-editor-bloque">
                  <div className="pg-editor-barra">
                    <span className="practice-panel-label">Tu script</span>
                    <div className="pg-editor-acciones">
                      <button type="button" className="pg-boton pg-boton-fantasma" onClick={() => setScript('')}>
                        Vaciar
                      </button>
                      <button
                        type="button"
                        className="pg-boton pg-boton-fantasma"
                        onClick={() => setScript(SCRIPT_INICIAL)}
                      >
                        Ejemplo inicial
                      </button>

                      <Popconfirm
                        title="Vaciar tu base"
                        description="Se borran todas tus tablas y sus datos del servidor. El script del editor no se toca."
                        okText="Borrar todo"
                        cancelText="Cancelar"
                        onConfirm={vaciarLaBase}
                      >
                        <button type="button" className="pg-boton pg-boton-fantasma" disabled={corriendo}>
                          Vaciar mi base
                        </button>
                      </Popconfirm>

                      <button
                        type="button"
                        className="pg-boton pg-boton-primario"
                        onClick={() => correr(false)}
                        disabled={corriendo}
                      >
                        {corriendo ? 'Ejecutando…' : 'Ejecutar'}
                      </button>
                    </div>
                  </div>

                  <SqlEditor
                    value={script}
                    onChange={setScript}
                    rows={20}
                    placeholder="-- Escribe SQL. Ctrl + Enter también ejecuta."
                    onSubmit={() => correr(false)}
                  />

                  <p className="taller-nota-editor">
                    <strong>Ejecutar</strong> aplica el script sobre tu base, así que un{' '}
                    <code>CREATE TABLE</code> repetido falla igual que en Postgres.{' '}
                    <strong>Empezar de cero</strong> la vacía primero.
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
                  vacio="Termina tu script en un SELECT y el resultado aparece acá."
                />
              </>
            )}
          </Card>
        </div>

        <aside className="pg-columna-der">
          <div className="pg-panel-modelo">
            <div className="pg-panel-head">
              <span className="practice-panel-label">Tu base</span>
              <span className="pg-panel-pista">
                {tablas.length
                  ? `${tablas.length} tabla${tablas.length === 1 ? '' : 's'} · guardada en el servidor`
                  : 'Todavía no hay tablas'}
              </span>
            </div>

            <div className="pg-panel-lienzo">
              {tablas.length ? (
                <ModelDiagram key={sello.current} tablas={tablas} />
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

            {tablas.length > 0 && <SchemaPanel tablas={tablas} />}
          </div>
        </aside>
      </section>
    </div>
  )
}
