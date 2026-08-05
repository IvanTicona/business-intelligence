import { Card, Popconfirm, Tag, Typography } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'
import SqlEditor from '../practices/SqlEditor.jsx'
import ModelDiagram from '../playground/ModelDiagram.jsx'
import SchemaPanel from '../playground/SchemaPanel.jsx'
import { abrirBasePersistente, pedirDescarte } from '../lib/sqlEngine.js'
import { ejecutarScript } from '../taller/ejecutarScript.js'
import { leerEsquema } from '../taller/esquemaVivo.js'
import { RegistroSentencias, ResultadoConsola } from './piezas.jsx'
import '../playground/playground.css'
import '../taller/taller.css'
import './consola.css'

const { Paragraph } = Typography

const CLAVE_GUARDADO = 'bi-course-consola-libre'
const NOMBRE_BASE = 'bi-course-playground'
const MAX_FILAS = 500

const SCRIPT_INICIAL = `-- Playground · PostgreSQL 18
--
-- Esto es una base vacia y tuya. No hay consigna ni correccion: crea lo que
-- quieras, cargalo, consultalo y rompelo.
--
-- Funciona como una sesion de verdad: las sentencias se APLICAN sobre la base
-- que ya existe y quedan guardadas en este navegador. Si cierras la pestania y
-- vuelves maniana, tus tablas y tus datos siguen ahi.

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

/** Por qué esta base no es la de siempre. Callarlo sería peor que decirlo. */
const AVISOS = {
  'otra-pestana':
    'Ya tienes el Playground abierto en otra pestaña. Para no dañar la base guardada, esta ' +
    'pestaña trabaja sobre una copia temporal que se pierde al cerrarla.',
  almacenamiento:
    'No se pudo abrir tu base guardada; pasa en modo incógnito, cuando el almacenamiento está ' +
    'lleno o si quedó a medio escribir. Puedes trabajar igual, pero lo que hagas se pierde al ' +
    'cerrar la pestaña.',
  descartada:
    'Se descartó la base anterior, así que esta empieza vacía. Lo que hagas a partir de ahora ' +
    'se guarda normalmente.',
}

/**
 * Playground: una base PostgreSQL propia, sin consigna.
 *
 * El taller enseña a construir un modelo siguiendo una especificación y el
 * laboratorio enseña a consultar modelos ya hechos. Acá no hay nada que
 * cumplir: es el lugar para probar una idea, reproducir un ejemplo de clase o
 * equivocarse sin que nadie corrija.
 *
 * A diferencia del taller, la base NO se vacía en cada ejecución y vive en
 * IndexedDB. Es la única forma de que el trabajo se acumule entre sesiones, que
 * es como funciona cualquier base de verdad: hoy creas las tablas, mañana las
 * cargas y pasado las consultas.
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

    abrirBasePersistente(NOMBRE_BASE).then(async abierta => {
      if (!viva) return
      // Se dibuja lo que YA hay guardado, sin ejecutar nada: volver a correr el
      // script duplicaría los INSERT de la sesión anterior.
      const guardadas = await leerEsquema(abierta.db)
      if (!viva) return

      sello.current += 1
      setTablas(guardadas)
      setMotor(abierta)
    })

    return () => { viva = false }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(CLAVE_GUARDADO, script)
  }, [script])

  const correr = useCallback(async (reiniciar = false) => {
    if (!motor || corriendo) return
    setCorriendo(true)

    try {
      const salida = await ejecutarScript(motor.db, script, { reiniciar })

      sello.current += 1
      setTablas(await leerEsquema(motor.db))
      setEjecucion({
        registro: salida.registro,
        error: salida.error,
        resultado: salida.resultado
          ? {
              ...salida.resultado,
              rows: salida.resultado.rows.slice(0, MAX_FILAS),
              totalFilas: salida.resultado.rows.length,
              recortado: salida.resultado.rows.length > MAX_FILAS,
            }
          : null,
      })
    } finally {
      setCorriendo(false)
    }
  }, [motor, script, corriendo])

  // El borrado corre en el arranque siguiente, con la base todavía sin abrir:
  // es el único momento en que IndexedDB lo deja hacer sin quedarse esperando.
  function descartarYRecargar() {
    pedirDescarte(NOMBRE_BASE)
    window.location.reload()
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

            {motor?.motivo && (
              <p className="libre-aviso-temporal">
                {AVISOS[motor.motivo]}
                {motor.motivo === 'almacenamiento' && (
                  <button type="button" className="libre-descartar" onClick={descartarYRecargar}>
                    Descartar la base guardada e intentar de nuevo
                  </button>
                )}
              </p>
            )}

            {motor && (
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
                        title="Empezar de cero"
                        description="Se borran todas tus tablas y sus datos, y se corre el script sobre la base vacía."
                        okText="Borrar y correr"
                        cancelText="Cancelar"
                        onConfirm={() => correr(true)}
                      >
                        <button type="button" className="pg-boton pg-boton-fantasma" disabled={corriendo}>
                          Empezar de cero
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
                  ? `${tablas.length} tabla${tablas.length === 1 ? '' : 's'}${motor?.persistente ? ' · guardada' : ''}`
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
