import { useMemo } from 'react'

/**
 * Gráfico del resultado de la consulta.
 *
 * BI sin visualización es media materia: el alumno tiene que ver que un
 * GROUP BY con dos columnas ES un gráfico de barras. Va en SVG a mano, sin
 * dependencias nuevas, igual que el resto de los diagramas del curso.
 *
 * Regla de lectura del resultado: la primera columna de texto es la categoría
 * y la primera numérica es el valor. Si no hay esa combinación, no hay gráfico.
 */
const PALETA = ['#1677ff', '#e8b22b', '#22c55e', '#a855f7', '#f97316', '#0ea5e9', '#ec4899', '#14b8a6']

export function sePuedeGraficar(resultado) {
  return Boolean(elegirEjes(resultado))
}

function elegirEjes(resultado) {
  if (!resultado || !resultado.columns?.length || !resultado.rows?.length) return null
  if (resultado.rows.length > 60) return null

  const esNumero = i => resultado.rows.every(fila => fila[i] === null || typeof fila[i] === 'number')

  let categoria = -1
  for (let i = 0; i < resultado.columns.length; i++) {
    if (!esNumero(i)) { categoria = i; break }
  }

  const valores = []
  for (let i = 0; i < resultado.columns.length; i++) {
    if (i !== categoria && esNumero(i)) valores.push(i)
  }

  if (!valores.length) return null
  // Sin columna de texto, el eje X es el número de fila (sirve para series).
  return { categoria, valores: valores.slice(0, 3) }
}

export default function ResultChart({ resultado, tipo = 'barras' }) {
  const ejes = useMemo(() => elegirEjes(resultado), [resultado])

  if (!ejes) {
    return (
      <p className="pg-chart-vacio">
        Para graficar hace falta una columna de texto y al menos una numérica, con 60 filas o menos.
        Prueba agrupando: <code>GROUP BY</code> es lo que convierte una tabla en un gráfico.
      </p>
    )
  }

  const etiquetas = resultado.rows.map((fila, i) =>
    ejes.categoria === -1 ? String(i + 1) : String(fila[ejes.categoria] ?? '∅'),
  )
  const series = ejes.valores.map((indice, orden) => ({
    nombre: resultado.columns[indice],
    color: PALETA[orden % PALETA.length],
    datos: resultado.rows.map(fila => Number(fila[indice] ?? 0)),
  }))

  if (tipo === 'torta') return <Torta etiquetas={etiquetas} serie={series[0]} />
  if (tipo === 'lineas') return <Lineas etiquetas={etiquetas} series={series} />
  return <Barras etiquetas={etiquetas} series={series} />
}

// --- Geometría común ------------------------------------------------------

const ANCHO = 900
const ALTO = 380
const PAD = { arriba: 26, derecha: 20, abajo: 74, izquierda: 78 }
const AREA_ANCHO = ANCHO - PAD.izquierda - PAD.derecha
const AREA_ALTO = ALTO - PAD.arriba - PAD.abajo

function escalaY(series) {
  const todos = series.flatMap(s => s.datos)
  const max = Math.max(0, ...todos)
  const min = Math.min(0, ...todos)
  const rango = max - min || 1
  return {
    max, min,
    y: valor => PAD.arriba + AREA_ALTO - ((valor - min) / rango) * AREA_ALTO,
  }
}

function Ejes({ escala, etiquetas, paso }) {
  const marcas = 4
  return (
    <>
      {Array.from({ length: marcas + 1 }, (_, i) => {
        const valor = escala.min + ((escala.max - escala.min) * i) / marcas
        const y = escala.y(valor)
        return (
          <g key={i}>
            <line x1={PAD.izquierda} y1={y} x2={ANCHO - PAD.derecha} y2={y} className="pg-chart-guia" />
            <text x={PAD.izquierda - 10} y={y + 4} className="pg-chart-tick">{formatear(valor)}</text>
          </g>
        )
      })}
      {etiquetas.map((etiqueta, i) => (
        <text
          key={etiqueta + i}
          x={PAD.izquierda + paso * (i + 0.5)}
          y={PAD.arriba + AREA_ALTO + 18}
          className="pg-chart-etiqueta"
          transform={etiquetas.length > 8 ? `rotate(-35 ${PAD.izquierda + paso * (i + 0.5)} ${PAD.arriba + AREA_ALTO + 18})` : undefined}
        >
          {recortarTexto(etiqueta, etiquetas.length > 8 ? 16 : 20)}
        </text>
      ))}
    </>
  )
}

function Leyenda({ series }) {
  if (series.length < 2) return null
  return (
    <div className="pg-chart-leyenda">
      {series.map(serie => (
        <span key={serie.nombre}>
          <i style={{ background: serie.color }} />
          {serie.nombre}
        </span>
      ))}
    </div>
  )
}

function Marco({ children, series }) {
  return (
    <div className="pg-chart">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="xMidYMid meet" role="img">
        {children}
      </svg>
      <Leyenda series={series} />
    </div>
  )
}

// --- Tipos ----------------------------------------------------------------

function Barras({ etiquetas, series }) {
  const escala = escalaY(series)
  const paso = AREA_ANCHO / etiquetas.length
  const anchoBarra = Math.max(4, (paso * 0.68) / series.length)
  const base = escala.y(Math.max(0, escala.min))

  return (
    <Marco series={series}>
      <Ejes escala={escala} etiquetas={etiquetas} paso={paso} />
      {series.map((serie, s) =>
        serie.datos.map((valor, i) => {
          const y = escala.y(valor)
          const x = PAD.izquierda + paso * (i + 0.5) - (anchoBarra * series.length) / 2 + anchoBarra * s
          return (
            <rect
              key={`${s}-${i}`}
              x={x}
              y={Math.min(y, base)}
              width={anchoBarra}
              height={Math.max(1, Math.abs(base - y))}
              fill={serie.color}
              className="pg-chart-barra"
            >
              <title>{`${etiquetas[i]} · ${serie.nombre}: ${formatear(valor)}`}</title>
            </rect>
          )
        }),
      )}
    </Marco>
  )
}

function Lineas({ etiquetas, series }) {
  const escala = escalaY(series)
  const paso = AREA_ANCHO / etiquetas.length

  return (
    <Marco series={series}>
      <Ejes escala={escala} etiquetas={etiquetas} paso={paso} />
      {series.map(serie => (
        <g key={serie.nombre}>
          <polyline
            className="pg-chart-linea"
            stroke={serie.color}
            points={serie.datos.map((v, i) => `${PAD.izquierda + paso * (i + 0.5)},${escala.y(v)}`).join(' ')}
          />
          {serie.datos.map((v, i) => (
            <circle
              key={i}
              cx={PAD.izquierda + paso * (i + 0.5)}
              cy={escala.y(v)}
              r={3.5}
              fill={serie.color}
            >
              <title>{`${etiquetas[i]} · ${serie.nombre}: ${formatear(v)}`}</title>
            </circle>
          ))}
        </g>
      ))}
    </Marco>
  )
}

function Torta({ etiquetas, serie }) {
  const total = serie.datos.reduce((acc, v) => acc + Math.max(0, v), 0)
  if (total <= 0) return <p className="pg-chart-vacio">La torta necesita valores positivos.</p>

  const cx = ANCHO / 2
  const cy = ALTO / 2
  const radio = Math.min(AREA_ALTO, ALTO) / 2 - 12
  let acumulado = 0

  const porciones = serie.datos.map((valor, i) => {
    const fraccion = Math.max(0, valor) / total
    const desde = acumulado * Math.PI * 2 - Math.PI / 2
    acumulado += fraccion
    const hasta = acumulado * Math.PI * 2 - Math.PI / 2
    const grande = fraccion > 0.5 ? 1 : 0
    const d = [
      `M ${cx} ${cy}`,
      `L ${cx + radio * Math.cos(desde)} ${cy + radio * Math.sin(desde)}`,
      `A ${radio} ${radio} 0 ${grande} 1 ${cx + radio * Math.cos(hasta)} ${cy + radio * Math.sin(hasta)}`,
      'Z',
    ].join(' ')
    return { d, color: PALETA[i % PALETA.length], etiqueta: etiquetas[i], valor, fraccion }
  })

  return (
    <div className="pg-chart">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="xMidYMid meet" role="img">
        {porciones.map(p => (
          <path key={p.etiqueta} d={p.d} fill={p.color} className="pg-chart-porcion">
            <title>{`${p.etiqueta}: ${formatear(p.valor)} (${(p.fraccion * 100).toFixed(1)}%)`}</title>
          </path>
        ))}
      </svg>
      <div className="pg-chart-leyenda">
        {porciones.map(p => (
          <span key={p.etiqueta}>
            <i style={{ background: p.color }} />
            {recortarTexto(p.etiqueta, 22)} · {(p.fraccion * 100).toFixed(1)}%
          </span>
        ))}
      </div>
    </div>
  )
}

// --- Formato --------------------------------------------------------------

function formatear(valor) {
  const n = Number(valor)
  if (!Number.isFinite(n)) return '0'
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'k'
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

const recortarTexto = (texto, largo) => (texto.length > largo ? texto.slice(0, largo - 1) + '…' : texto)
