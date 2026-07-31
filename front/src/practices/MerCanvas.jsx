import { motion } from 'framer-motion'
import { useMemo } from 'react'
import {
  cardinalityQuestions,
  conceptCards,
  diagramNodes,
  diagramRelations,
  primaryKeyQuestions,
  primaryKeyTargets,
} from './data/expocruz.js'

const VIEW_W = 1300
const VIEW_H = 1300   // lienzo alto: la columna del diagrama ocupa toda la pantalla
const RECT_W = 196
const RECT_H = 58
const ELLIPSE_RX = 84
const ELLIPSE_RY = 26
const DIAMOND_R = 62

/**
 * Los rótulos del caso van de "NIT / RUC" a "Nivel de patrocinio": con un
 * tamaño fijo los largos se salen de su forma. Achicamos según el largo real.
 */
function fuente(texto, base, anchoUtil) {
  const estimado = texto.length * base * 0.52
  if (estimado <= anchoUtil) return base
  return Math.max(11, Math.floor(base * (anchoUtil / estimado)))
}

/** En el lienzo alcanza con "id_expositor"; el "(surrogate)" ya se explicó en la etapa. */
function claveCorta(label) {
  return label.replace(/\s*\(surrogate\)\s*/i, '')
}

const entrada = { initial: { opacity: 0, scale: 0.82 }, animate: { opacity: 1, scale: 1 } }
const transicion = { duration: 0.42, ease: [0.22, 1, 0.36, 1] }

/**
 * Diagrama que se arma solo a medida que el alumno responde.
 * No es una solución dibujada de antemano: la forma de cada nodo sale de su
 * respuesta, así que un error de clasificación se ve como un error de forma.
 */
export default function MerCanvas({ classifications, pkAnswers, cardAnswers }) {
  const conceptos = useMemo(() => new Map(conceptCards.map(c => [c.id, c])), [])

  // Nodos que el alumno ya colocó, con la forma que él eligió
  const colocados = useMemo(() => {
    return Object.entries(classifications)
      .map(([id, eleccion]) => {
        const pos = diagramNodes[id]
        const concepto = conceptos.get(id)
        if (!pos || !concepto) return null
        return {
          id,
          pos,
          label: concepto.label,
          forma: eleccion === 'entidad' ? 'rect' : 'ellipse',
          correcto: eleccion === concepto.answer,
        }
      })
      .filter(Boolean)
  }, [classifications, conceptos])

  const porId = useMemo(() => new Map(colocados.map(n => [n.id, n])), [colocados])

  // Claves primarias elegidas, indexadas por el nodo o rombo donde se muestran
  const claves = useMemo(() => {
    const salida = new Map()
    for (const pregunta of primaryKeyQuestions) {
      const elegida = pregunta.options.find(o => o.id === pkAnswers[pregunta.id])
      const destino = primaryKeyTargets[pregunta.id]
      if (!elegida || !destino) continue
      salida.set(`${destino.kind}:${destino.id}`, { label: elegida.label, correcto: elegida.correct })
    }
    return salida
  }, [pkAnswers])

  // Relaciones ya definidas
  const relaciones = useMemo(() => {
    return cardinalityQuestions
      .map(pregunta => {
        const elegida = cardAnswers[pregunta.id]
        const geo = diagramRelations[pregunta.id]
        if (!elegida || !geo) return null
        const [ladoA, ladoB] = elegida.split(':')
        return {
          id: pregunta.id,
          geo,
          cardinalidad: elegida,
          ladoA,
          ladoB,
          correcto: elegida === pregunta.answer,
          pk: claves.get(`relation:${pregunta.id}`),
        }
      })
      .filter(Boolean)
  }, [cardAnswers, claves])

  const vacio = colocados.length === 0

  return (
    <div className="mer-canvas">
      <div className="mer-canvas-head">
        <span className="practice-panel-label">Tu diagrama</span>
        <span className="mer-canvas-counter">
          {colocados.length}/{conceptCards.length} conceptos · {relaciones.length}/{cardinalityQuestions.length} relaciones
        </span>
      </div>

      <div className="mer-canvas-stage">
        {vacio && (
          <p className="mer-canvas-empty">
            El lienzo está en blanco. Cada decisión que tomes abajo lo va a ir dibujando.
          </p>
        )}

        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="mer-canvas-svg" role="img" aria-label="Diagrama entidad-relación en construcción">
          {/* Conectores atributo → entidad, debajo de todo */}
          {colocados.map(nodo => {
            const padre = nodo.pos.parent ? porId.get(nodo.pos.parent) : null
            if (!padre) return null

            return (
              <motion.line
                key={`link-${nodo.id}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={transicion}
                x1={nodo.pos.x}
                y1={nodo.pos.y}
                x2={padre.pos.x}
                y2={padre.pos.y}
                className="mer-link"
              />
            )
          })}

          {/* Líneas de relación */}
          {relaciones.map(rel => {
            const desde = porId.get(rel.geo.from)
            const hasta = porId.get(rel.geo.to)

            return (
              <g key={`rel-lines-${rel.id}`}>
                {desde && (
                  <motion.line
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={transicion}
                    x1={desde.pos.x} y1={desde.pos.y} x2={rel.geo.x} y2={rel.geo.y}
                    className={`mer-rel-line ${rel.correcto ? '' : 'mer-wrong'}`}
                  />
                )}
                {hasta && (
                  <motion.line
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={transicion}
                    x1={rel.geo.x} y1={rel.geo.y} x2={hasta.pos.x} y2={hasta.pos.y}
                    className={`mer-rel-line ${rel.correcto ? '' : 'mer-wrong'}`}
                  />
                )}
              </g>
            )
          })}

          {/* Rombos de relación */}
          {relaciones.map(rel => (
            <motion.g key={`rel-${rel.id}`} initial={entrada.initial} animate={entrada.animate} transition={transicion}>
              <polygon
                points={rombo(rel.geo.x, rel.geo.y)}
                className={`mer-diamond ${rel.correcto ? '' : 'mer-wrong'}`}
              />
              <text
                x={rel.geo.x}
                y={rel.geo.y + 5}
                className="mer-diamond-text"
                fontSize={fuente(rel.geo.label, 17, DIAMOND_R * 1.5)}
              >
                {rel.geo.label}
              </text>

              {/* Cardinalidad en el punto medio de cada tramo, corrida al costado
                  de la línea. Colocarlas pegadas al rombo las metía dentro de
                  las cajas: los huecos entre filas son de apenas 33px. */}
              <text {...posCardinalidad(rel, 'A', porId)} className="mer-card-label">{rel.ladoA}</text>
              <text {...posCardinalidad(rel, 'B', porId)} className="mer-card-label">{rel.ladoB}</text>

              {rel.pk && (
                <text
                  x={rel.geo.x + DIAMOND_R + 18}
                  y={rel.geo.y + 6}
                  className={`mer-pk mer-pk-left ${rel.pk.correcto ? '' : 'mer-wrong-text'}`}
                  fontSize={fuente(claveCorta(rel.pk.label), 15, 280)}
                >
                  {claveCorta(rel.pk.label)}
                </text>
              )}
            </motion.g>
          ))}

          {/* Nodos */}
          {colocados.map(nodo => {
            const pk = claves.get(`node:${nodo.id}`)

            return (
              <motion.g key={nodo.id} initial={entrada.initial} animate={entrada.animate} transition={transicion}>
                {nodo.forma === 'rect' ? (
                  <rect
                    x={nodo.pos.x - RECT_W / 2}
                    y={nodo.pos.y - RECT_H / 2}
                    width={RECT_W}
                    height={RECT_H}
                    rx={8}
                    className={`mer-entity ${nodo.correcto ? '' : 'mer-wrong'}`}
                  />
                ) : (
                  <ellipse
                    cx={nodo.pos.x}
                    cy={nodo.pos.y}
                    rx={ELLIPSE_RX}
                    ry={ELLIPSE_RY}
                    className={`mer-attribute ${nodo.correcto ? '' : 'mer-wrong'}`}
                  />
                )}

                <text
                  x={nodo.pos.x}
                  y={nodo.pos.y + (pk ? -3 : 6)}
                  className={nodo.forma === 'rect' ? 'mer-entity-text' : 'mer-attribute-text'}
                  fontSize={
                    nodo.forma === 'rect'
                      ? fuente(nodo.label, 20, RECT_W - 22)
                      : fuente(nodo.label, 17, ELLIPSE_RX * 2 - 20)
                  }
                >
                  {nodo.label}
                </text>

                {pk && (
                  <text
                    x={nodo.pos.x}
                    y={nodo.pos.y + 18}
                    className={`mer-pk ${pk.correcto ? '' : 'mer-wrong-text'}`}
                    fontSize={fuente(claveCorta(pk.label), 15, RECT_W - 14)}
                  >
                    {claveCorta(pk.label)}
                  </text>
                )}
              </motion.g>
            )
          })}
        </svg>
      </div>

      <p className="mer-canvas-legend">
        <span className="mer-legend-item"><i className="mer-chip mer-chip-entity" /> entidad</span>
        <span className="mer-legend-item"><i className="mer-chip mer-chip-attribute" /> atributo</span>
        <span className="mer-legend-item"><i className="mer-chip mer-chip-relation" /> relación, con su cardinalidad</span>
        <span className="mer-legend-item"><u className="mer-legend-pk">texto</u> clave primaria que elegiste</span>
        <span className="mer-legend-item"><i className="mer-chip mer-chip-error" /> revisa esta decisión</span>
      </p>
    </div>
  )
}

/**
 * Ubica la cardinalidad a mitad de camino entre la forma y el rombo,
 * corrida al costado para no taparse con la línea.
 */
function posCardinalidad(rel, lado, porId) {
  const extremo = porId.get(lado === 'A' ? rel.geo.from : rel.geo.to)
  const horizontal = rel.geo.orient === 'h'

  if (!extremo) {
    // Sin la entidad todavía colocada, la dejamos pegada al rombo.
    return horizontal
      ? { x: rel.geo.x + (lado === 'A' ? -DIAMOND_R - 16 : DIAMOND_R + 16), y: rel.geo.y - 12 }
      : { x: rel.geo.x + 22, y: rel.geo.y + (lado === 'A' ? -DIAMOND_R * 0.62 - 10 : DIAMOND_R * 0.62 + 22) }
  }

  // Punto medio entre los BORDES, no entre los centros: con los centros la
  // etiqueta caía sobre la caja (196px de ancho) y quedaba medio tapada.
  const mitadAncho = extremo.forma === 'rect' ? RECT_W / 2 : ELLIPSE_RX
  const mitadAlto = extremo.forma === 'rect' ? RECT_H / 2 : ELLIPSE_RY

  if (horizontal) {
    const aLaDerecha = extremo.pos.x > rel.geo.x
    const bordeCaja = extremo.pos.x + (aLaDerecha ? -mitadAncho : mitadAncho)
    const bordeRombo = rel.geo.x + (aLaDerecha ? DIAMOND_R : -DIAMOND_R)
    return { x: (bordeCaja + bordeRombo) / 2, y: rel.geo.y - 14 }
  }

  const abajo = extremo.pos.y > rel.geo.y
  const bordeCaja = extremo.pos.y + (abajo ? -mitadAlto : mitadAlto)
  const bordeRombo = rel.geo.y + (abajo ? DIAMOND_R * 0.62 : -DIAMOND_R * 0.62)
  return { x: rel.geo.x + 20, y: (bordeCaja + bordeRombo) / 2 + 6 }
}

function rombo(x, y) {
  return [
    `${x},${y - DIAMOND_R * 0.62}`,
    `${x + DIAMOND_R},${y}`,
    `${x},${y + DIAMOND_R * 0.62}`,
    `${x - DIAMOND_R},${y}`,
  ].join(' ')
}
