import { motion } from 'framer-motion'
import { useMemo } from 'react'
import {
  dimensionOptions,
  grainOptions,
  metricOptions,
  starDimensionColumns,
  starLayout,
} from './data/spaziogym.js'

const VIEW_W = 1060
const VIEW_H = 1000
const MARGEN = 30
const FACT_W = 250
const DIM_W = 205
const HEADER_H = 28
const ROW_H = 19

const entrada = { initial: { opacity: 0, scale: 0.85 }, animate: { opacity: 1, scale: 1 } }
const transicion = { duration: 0.4, ease: [0.22, 1, 0.36, 1] }

const altoCaja = filas => HEADER_H + filas * ROW_H

/**
 * Estrella que se arma con las decisiones del alumno.
 * El hecho aparece al elegir el grain, sus métricas al marcarlas, y cada
 * dimensión al seleccionarla. Una elección incorrecta se dibuja igual, en
 * rojo punteado: el error se ve en la forma del modelo, no en un cartel.
 */
export default function StarCanvas({ grain, metrics, dimensions }) {
  const grainElegido = useMemo(() => grainOptions.find(o => o.id === grain), [grain])

  const metricas = useMemo(
    () => metricOptions.filter(o => metrics[o.id]).map(o => ({ ...o, nombre: o.label.replace(/\s*\(.*\)/, '') })),
    [metrics],
  )

  const dims = useMemo(
    () => dimensionOptions
      .filter(o => dimensions[o.id])
      .map(o => ({ ...o, pos: starLayout.dimensiones[o.id], columnas: starDimensionColumns[o.id] ?? [] }))
      .filter(o => o.pos),
    [dimensions],
  )

  const vacio = !grainElegido && dims.length === 0
  const hecho = starLayout.hecho

  // Filas del hecho: la PK, una FK por dimensión conectada y las métricas.
  const filasHecho = [
    { texto: 'id_hecho', clase: 'star-row-pk' },
    ...dims.map(d => ({ texto: d.label.replace('dim_', 'id_'), clase: 'star-row-fk', mal: !d.correct })),
    ...metricas.map(m => ({ texto: m.nombre, clase: 'star-row-metric', mal: !m.correct })),
  ]

  const hechoAlto = altoCaja(filasHecho.length)
  const hechoTop = hecho.y - hechoAlto / 2

  return (
    <div className="star-canvas">
      <div className="star-canvas-head">
        <span className="practice-panel-label">Tu estrella</span>
        <span className="star-canvas-counter">
          {metricas.length} métrica{metricas.length === 1 ? '' : 's'} · {dims.length} dimensión{dims.length === 1 ? '' : 'es'}
        </span>
      </div>

      <div className="star-canvas-stage">
        {vacio && (
          <p className="star-canvas-empty">
            Elige el grain y marca métricas y dimensiones: la estrella se dibuja sola con tus decisiones.
          </p>
        )}

        <svg
          viewBox={`${-MARGEN} ${-MARGEN} ${VIEW_W + MARGEN * 2} ${VIEW_H + MARGEN * 2}`}
          className="star-canvas-svg"
          role="img"
          aria-label="Diagrama de estrella en construcción"
        >
          {/* Radios del hecho a cada dimensión */}
          {grainElegido && dims.map(d => (
            <motion.line
              key={`radio-${d.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={transicion}
              x1={hecho.x}
              y1={hecho.y}
              x2={d.pos.x}
              y2={d.pos.y}
              className={`star-spoke ${d.correct ? '' : 'star-wrong'}`}
            />
          ))}

          {/* Dimensiones */}
          {dims.map(d => {
            const filas = d.columnas.length + 1
            const alto = altoCaja(filas)
            const top = d.pos.y - alto / 2
            const izq = d.pos.x - DIM_W / 2

            return (
              <motion.g key={d.id} initial={entrada.initial} animate={entrada.animate} transition={transicion}>
                <rect x={izq} y={top} width={DIM_W} height={alto} rx={9} className={`star-dim ${d.correct ? '' : 'star-wrong'}`} />
                <path
                  d={`M ${izq} ${top + HEADER_H} L ${izq} ${top + 9} Q ${izq} ${top} ${izq + 9} ${top} L ${izq + DIM_W - 9} ${top} Q ${izq + DIM_W} ${top} ${izq + DIM_W} ${top + 9} L ${izq + DIM_W} ${top + HEADER_H} Z`}
                  className={`star-dim-header ${d.correct ? '' : 'star-wrong-fill'}`}
                />
                <text x={izq + 12} y={top + 19} className="star-dim-name">{d.label}</text>

                <text x={izq + 12} y={top + HEADER_H + 14} className="star-col star-col-pk">
                  {d.label.replace('dim_', 'id_')}
                </text>
                {d.columnas.map((col, i) => (
                  <text key={col} x={izq + 12} y={top + HEADER_H + 14 + (i + 1) * ROW_H} className="star-col">{col}</text>
                ))}
              </motion.g>
            )
          })}

          {/* Hecho al centro */}
          {grainElegido && (
            <motion.g initial={entrada.initial} animate={entrada.animate} transition={transicion}>
              <rect
                x={hecho.x - FACT_W / 2}
                y={hechoTop}
                width={FACT_W}
                height={hechoAlto}
                rx={10}
                className={`star-fact ${grainElegido.correct ? '' : 'star-wrong'}`}
              />
              <path
                d={`M ${hecho.x - FACT_W / 2} ${hechoTop + HEADER_H} L ${hecho.x - FACT_W / 2} ${hechoTop + 10} Q ${hecho.x - FACT_W / 2} ${hechoTop} ${hecho.x - FACT_W / 2 + 10} ${hechoTop} L ${hecho.x + FACT_W / 2 - 10} ${hechoTop} Q ${hecho.x + FACT_W / 2} ${hechoTop} ${hecho.x + FACT_W / 2} ${hechoTop + 10} L ${hecho.x + FACT_W / 2} ${hechoTop + HEADER_H} Z`}
                className={`star-fact-header ${grainElegido.correct ? '' : 'star-wrong-fill'}`}
              />
              <text x={hecho.x - FACT_W / 2 + 12} y={hechoTop + 19} className="star-fact-name">hecho_reserva</text>

              {filasHecho.map((fila, i) => (
                <text
                  key={fila.texto + i}
                  x={hecho.x - FACT_W / 2 + 12}
                  y={hechoTop + HEADER_H + 14 + i * ROW_H}
                  className={`star-col ${fila.clase} ${fila.mal ? 'star-wrong-text' : ''}`}
                >
                  {fila.texto}
                </text>
              ))}
            </motion.g>
          )}

          {/* El grain se rotula debajo del hecho: es lo que define una fila */}
          {grainElegido && (
            <text
              x={hecho.x}
              y={hechoTop + hechoAlto + 26}
              className={`star-grain ${grainElegido.correct ? '' : 'star-wrong-text'}`}
            >
              {grainElegido.label}
            </text>
          )}
        </svg>
      </div>

      <p className="star-canvas-legend">
        <span className="star-legend-item"><i className="star-chip star-chip-fact" /> hecho</span>
        <span className="star-legend-item"><i className="star-chip star-chip-dim" /> dimensión</span>
        <span className="star-legend-item"><i className="star-chip star-chip-error" /> revisa esta decisión</span>
      </p>
    </div>
  )
}
