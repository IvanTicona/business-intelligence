import { Card, Tag, Typography } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import SqlEditor from '../practices/SqlEditor.jsx'
import ModelDiagram from '../playground/ModelDiagram.jsx'
import SchemaPanel from '../playground/SchemaPanel.jsx'
import { crearBaseVacia } from '../lib/sqlEngine.js'
import { ejecutarScript } from '../taller/ejecutarScript.js'
import { leerEsquema } from '../taller/esquemaVivo.js'
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
-- quieras, cargalo, consultalo y rompelo. El diagrama de la derecha se dibuja
-- solo con las tablas que existan.
--
-- Cada ejecucion arranca de una base vacia y corre todo el script de arriba
-- abajo, asi que lo que este escrito es exactamente lo que existe.

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
 * Playground: una base PostgreSQL vacía, sin consigna.
 *
 * El taller enseña a construir un modelo siguiendo una especificación y el
 * laboratorio enseña a consultar modelos ya hechos. Acá no hay nada que
 * cumplir: es el lugar para probar una idea, reproducir un ejemplo de clase o
 * equivocarse sin que nadie corrija.
 */
export default function ConsolaLibrePage() {
  const [base, setBase] = useState(null)
  const [script, setScript] = useState(() => window.localStorage.getItem(CLAVE_GUARDADO) ?? SCRIPT_INICIAL)
  const [ejecucion, setEjecucion] = useState(null)
  const [vista, setVista] = useState('tabla')
  const [tipoGrafico, setTipoGrafico] = useState('barras')
  const [mostrarRegistro, setMostrarRegistro] = useState(false)

  useEffect(() => {
    let viva = true
    crearBaseVacia().then(db => { if (viva) setBase(db) })
    return () => { viva = false }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(CLAVE_GUARDADO, script)
  }, [script])

  const correr = useCallback(async () => {
    if (!base) return

    const salida = await ejecutarScript(base, script)

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
      tablas: await leerEsquema(base),
      sello: Date.now(),
    })
  }, [base, script])

  useEffect(() => {
    if (base && !ejecucion) correr()
  }, [base, ejecucion, correr])

  const tablas = ejecucion?.tablas ?? []

  function empezarDeNuevo() {
    setScript(SCRIPT_INICIAL)
    setEjecucion(null)
  }

  function vaciar() {
    setScript('')
    setEjecucion(null)
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
                Una base vacía para probar lo que quieras: crear tablas, cargarlas, consultarlas y
                romperlas. Nada de esto se entrega ni se corrige.
              </p>
              <p className="pg-ficha-nota">
                Tu script se guarda en este navegador, así que no se pierde al recargar. Si quieres
                practicar sobre modelos ya armados, están en Laboratorio OLAP; si quieres construir
                uno siguiendo una consigna, en Taller OLTP.
              </p>
            </div>

            {!base && <Paragraph className="pg-aviso">Iniciando PostgreSQL…</Paragraph>}

            {base && (
              <>
                <div className="pg-editor-bloque">
                  <div className="pg-editor-barra">
                    <span className="practice-panel-label">Tu script</span>
                    <div className="pg-editor-acciones">
                      <button type="button" className="pg-boton pg-boton-fantasma" onClick={vaciar}>
                        Vaciar
                      </button>
                      <button type="button" className="pg-boton pg-boton-fantasma" onClick={empezarDeNuevo}>
                        Ejemplo inicial
                      </button>
                      <button type="button" className="pg-boton pg-boton-primario" onClick={correr}>
                        Ejecutar
                      </button>
                    </div>
                  </div>

                  <SqlEditor
                    value={script}
                    onChange={setScript}
                    rows={20}
                    placeholder="-- Escribe SQL. Ctrl + Enter también ejecuta."
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
                  ? `${tablas.length} tabla${tablas.length === 1 ? '' : 's'}`
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

            {tablas.length > 0 && <SchemaPanel tablas={tablas} />}
          </div>
        </aside>
      </section>
    </div>
  )
}
