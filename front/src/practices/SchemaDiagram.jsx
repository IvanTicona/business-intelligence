import { useMemo } from 'react'
import { schemaTables } from './data/expocruz.js'

// Tres columnas ordenadas por capa de dependencia (destinos a la izquierda,
// quienes los referencian a la derecha). Con ese orden NINGUNA relacion cruza
// mas de un pasillo, que era lo que ensuciaba el diagrama.
const BOX_W = 200
const HEADER_H = 26
const ROW_H = 19
const VIEW_W = 860    // 660 (ultima columna) + 200 de ancho de caja
const VIEW_H = 1060
const MARGEN = 60     // margenes exteriores: por ahi viajan las relaciones
                      // internas de la primera y la ultima columna
const CARRIL = 18     // separacion entre lineas paralelas dentro de un corredor

const VB_X = -MARGEN
const VB_W = VIEW_W + MARGEN * 2
const VB_Y = -20
const VB_H = VIEW_H + 40

const alto = tabla => HEADER_H + tabla.columns.length * ROW_H

/**
 * Detecta qué tablas menciona la consulta. Word boundary y sin distinguir
 * mayúsculas: alcanza para iluminar el recorrido y no necesita un parser.
 * Se ordenan de más largo a más corto para que `dia_feria` no se confunda
 * dentro de otra palabra.
 */
export function tablasEnConsulta(sql) {
  if (!sql) return new Set()
  const nombres = schemaTables.map(t => t.table).sort((a, b) => b.length - a.length)
  const encontradas = new Set()

  for (const nombre of nombres) {
    if (new RegExp(`(^|[^a-z0-9_])${nombre}([^a-z0-9_]|$)`, 'i').test(sql)) {
      encontradas.add(nombre)
    }
  }

  return encontradas
}

/**
 * Esquema relacional de ExpoCruz. `activas` ilumina las tablas que la consulta
 * del alumno está tocando, y las FK que las vinculan entre sí.
 */
/**
 * Camino en ángulo recto con esquinas redondeadas:
 * sale horizontal, sube o baja por el carril, y entra horizontal al destino.
 */
function trazo(x1, y1, carril, x2, y2) {
  const r = 8
  const dirEntrada = Math.sign(carril - x1) || 1
  const dirSalida = Math.sign(x2 - carril) || 1
  const dirVertical = Math.sign(y2 - y1) || 1
  const radio = Math.min(r, Math.abs(y2 - y1) / 2, Math.abs(carril - x1), Math.abs(x2 - carril) || r)

  if (Math.abs(y2 - y1) < 1) return `M ${x1} ${y1} L ${x2} ${y2}`

  return [
    `M ${x1} ${y1}`,
    `L ${carril - dirEntrada * radio} ${y1}`,
    `Q ${carril} ${y1} ${carril} ${y1 + dirVertical * radio}`,
    `L ${carril} ${y2 - dirVertical * radio}`,
    `Q ${carril} ${y2} ${carril + dirSalida * radio} ${y2}`,
    `L ${x2} ${y2}`,
  ].join(' ')
}

/** Pata de gallo: marca el lado "muchos" de la relación (la FK). */
function pataDeGallo(x, y, dir) {
  const L = 11
  const A = 6
  return [
    `M ${x} ${y} L ${x + dir * L} ${y - A}`,
    `M ${x} ${y} L ${x + dir * L} ${y}`,
    `M ${x} ${y} L ${x + dir * L} ${y + A}`,
  ].join(' ')
}

/** Barra simple: marca el lado "uno" de la relación (la PK). */
function barraUno(x, y, dir) {
  return `M ${x + dir * 8} ${y - 6} L ${x + dir * 8} ${y + 6}`
}

export default function SchemaDiagram({ activas = new Set() }) {
  const porNombre = useMemo(() => new Map(schemaTables.map(t => [t.table, t])), [])

  /**
   * Ruteo ortogonal con tres garantías, que son las que evitan el enredo:
   *
   * 1. Toda línea viaja por un CORREDOR vertical sin tablas: los pasillos
   *    entre columnas o los márgenes exteriores. Nunca cruza una caja.
   * 2. Dentro de un corredor cada línea tiene su propio CARRIL, así dos
   *    paralelas jamás se pisan.
   * 3. Cuando varias FK apuntan a la MISMA tabla, sus llegadas se reparten a
   *    lo alto del borde. Antes entraban todas al mismo punto (la fila de la
   *    PK) y los últimos tramos quedaban superpuestos.
   */
  const aristas = useMemo(() => {
    const columnas = [...new Set(schemaTables.map(t => t.x))].sort((a, b) => a - b)
    const ultima = columnas.length - 1

    const crudas = []

    for (const tabla of schemaTables) {
      tabla.columns.forEach((col, indice) => {
        const destino = col.ref ? porNombre.get(col.ref) : null
        if (!destino) return

        const iOrigen = columnas.indexOf(tabla.x)
        const iDestino = columnas.indexOf(destino.x)
        const mismaColumna = iOrigen === iDestino

        // Corredor: entre columnas si cruza; si es interno, el margen exterior
        // cuando la columna lo tiene, y si no el pasillo de la derecha.
        let corredor
        if (!mismaColumna) {
          corredor = Math.min(iOrigen, iDestino) + 1   // pasillo entre ambas
        } else if (iOrigen === 0) {
          corredor = 0                                  // margen izquierdo
        } else if (iOrigen === ultima) {
          corredor = ultima + 1                         // margen derecho
        } else {
          corredor = iOrigen + 1                        // pasillo derecho
        }

        const haciaIzquierda = corredor <= iOrigen
        const origenX = haciaIzquierda ? tabla.x : tabla.x + BOX_W
        const origenY = tabla.y + HEADER_H + indice * ROW_H + ROW_H / 2
        const ladoDestino = corredor <= iDestino ? 'izq' : 'der'

        crudas.push({
          id: `${tabla.table}.${col.name}`,
          destinoTabla: destino,
          corredor, origenX, origenY, ladoDestino,
          largo: Math.abs(destino.y - tabla.y),
          viva: activas.has(tabla.table) && activas.has(destino.table),
        })
      })
    }

    // Carriles: dentro de cada corredor, ordenados por recorrido vertical.
    // Las de trayecto corto quedan pegadas a las cajas y las largas por fuera.
    const limites = i => {
      if (i === 0) return [-MARGEN + 10, columnas[0]]
      if (i === ultima + 1) return [columnas[ultima] + BOX_W, VIEW_W + MARGEN - 10]
      return [columnas[i - 1] + BOX_W, columnas[i]]
    }

    const porCorredor = new Map()
    for (const a of crudas) {
      if (!porCorredor.has(a.corredor)) porCorredor.set(a.corredor, [])
      porCorredor.get(a.corredor).push(a)
    }

    for (const [i, grupo] of porCorredor) {
      const [izq, der] = limites(i)
      grupo.sort((a, b) => a.largo - b.largo)
      const paso = Math.min(CARRIL, (der - izq - 24) / Math.max(1, grupo.length - 1 || 1))
      const base = (izq + der) / 2 - ((grupo.length - 1) * paso) / 2
      grupo.forEach((a, k) => { a.carril = base + k * paso })
    }

    // Llegadas repartidas a lo alto del borde de cada tabla destino.
    const porDestino = new Map()
    for (const a of crudas) {
      const clave = `${a.destinoTabla.table}|${a.ladoDestino}`
      if (!porDestino.has(clave)) porDestino.set(clave, [])
      porDestino.get(clave).push(a)
    }

    for (const grupo of porDestino) {
      const lista = grupo[1]
      const t = lista[0].destinoTabla
      const arriba = t.y + HEADER_H + ROW_H / 2
      const abajo = t.y + alto(t) - ROW_H / 2
      // Se ordenan por el carril para que las líneas no se crucen entre sí
      // justo antes de entrar.
      lista.sort((a, b) => a.carril - b.carril)
      const paso = lista.length > 1 ? Math.min(ROW_H, (abajo - arriba) / (lista.length - 1)) : 0
      const inicio = (arriba + abajo) / 2 - (paso * (lista.length - 1)) / 2

      lista.forEach((a, k) => {
        a.destinoY = lista.length === 1 ? arriba : inicio + k * paso
        a.destinoX = a.ladoDestino === 'izq' ? t.x : t.x + BOX_W
      })
    }

    // Último ajuste: si una LLEGADA cae a la misma altura que una SALIDA del
    // mismo corredor, sus tramos horizontales se superponen. Se corre la
    // llegada unos píxeles hasta despejarla.
    for (const [i, grupo] of porCorredor) {
      const salidas = grupo.map(a => a.origenY)

      for (const a of grupo) {
        const t = a.destinoTabla
        const arriba = t.y + HEADER_H + ROW_H / 2
        const abajo = t.y + alto(t) - ROW_H / 2
        let intentos = 0

        while (salidas.some(y => Math.abs(y - a.destinoY) < 4) && intentos < 6) {
          const propuesto = a.destinoY + (intentos % 2 === 0 ? 7 : -7) * (Math.floor(intentos / 2) + 1)
          a.destinoY = Math.min(abajo, Math.max(arriba, propuesto))
          intentos++
        }
      }
    }

    return crudas.map(a => ({
      id: a.id,
      d: trazo(a.origenX, a.origenY, a.carril, a.destinoX, a.destinoY),
      origenX: a.origenX,
      origenY: a.origenY,
      haciaIzquierda: a.carril < a.origenX,
      destinoX: a.destinoX,
      destinoY: a.destinoY,
      entraPorIzquierda: a.ladoDestino === 'izq',
      viva: a.viva,
    }))
  }, [porNombre, activas])

  return (
    <div className="schema-diagram">
      <div className="schema-diagram-head">
        <span className="practice-panel-label">Modelo relacional</span>
        <span className="schema-diagram-hint">
          {activas.size > 0
            ? `${activas.size} tabla${activas.size === 1 ? '' : 's'} en tu consulta`
            : 'Escribe una consulta y se iluminarán las tablas que uses'}
        </span>
      </div>

      <div className="schema-diagram-stage">
        <svg viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`} className="schema-diagram-svg" role="img" aria-label="Modelo relacional de ExpoCruz">
          {aristas.map(a => (
            <g key={a.id} className={a.viva ? 'schema-edge-group is-live' : 'schema-edge-group'}>
              <path d={a.d} className={`schema-edge ${a.viva ? 'schema-edge-live' : ''}`} />
              {/* Pata de gallo del lado FK (muchos) y barra del lado PK (uno) */}
              <path d={pataDeGallo(a.origenX, a.origenY, a.haciaIzquierda ? -1 : 1)} className={`schema-foot ${a.viva ? 'schema-edge-live' : ''}`} />
              <path d={barraUno(a.destinoX, a.destinoY, a.entraPorIzquierda ? -1 : 1)} className={`schema-foot ${a.viva ? 'schema-edge-live' : ''}`} />
            </g>
          ))}

          {schemaTables.map(tabla => {
            const viva = activas.has(tabla.table)
            const apagada = activas.size > 0 && !viva

            return (
              <g key={tabla.table} className={`schema-table-node ${viva ? 'is-live' : ''} ${apagada ? 'is-dim' : ''}`}>
                <rect
                  x={tabla.x}
                  y={tabla.y}
                  width={BOX_W}
                  height={alto(tabla)}
                  rx={9}
                  className="schema-box"
                />
                <path
                  d={`M ${tabla.x} ${tabla.y + HEADER_H} L ${tabla.x} ${tabla.y + 9} Q ${tabla.x} ${tabla.y} ${tabla.x + 9} ${tabla.y} L ${tabla.x + BOX_W - 9} ${tabla.y} Q ${tabla.x + BOX_W} ${tabla.y} ${tabla.x + BOX_W} ${tabla.y + 9} L ${tabla.x + BOX_W} ${tabla.y + HEADER_H} Z`}
                  className="schema-box-header"
                />
                <text x={tabla.x + 12} y={tabla.y + 20} className="schema-table-name">{tabla.table}</text>

                {tabla.columns.map((col, indice) => {
                  const y = tabla.y + HEADER_H + indice * ROW_H + 15

                  return (
                    <g key={col.name}>
                      {col.key && (
                        <text x={tabla.x + 12} y={y} className={`schema-key schema-key-${col.key}`}>
                          {col.key === 'pk' ? 'PK' : col.key === 'fk' ? 'FK' : 'UQ'}
                        </text>
                      )}
                      <text
                        x={tabla.x + 42}
                        y={y}
                        className={`schema-col ${col.key === 'pk' ? 'schema-col-pk' : ''}`}
                      >
                        {col.name}
                      </text>
                    </g>
                  )
                })}
              </g>
            )
          })}
        </svg>
      </div>

      <div className="schema-legend">
        <span className="schema-legend-item">
          <svg viewBox="0 0 34 14" aria-hidden="true"><path d="M2 7 H32 M32 7 L22 2 M32 7 L22 12 M6 1 V13" /></svg>
          muchos a uno (N:1)
        </span>
        <span className="schema-legend-item"><i className="schema-legend-key schema-key-pk">PK</i> clave primaria</span>
        <span className="schema-legend-item"><i className="schema-legend-key schema-key-fk">FK</i> clave foránea</span>
        <span className="schema-legend-item"><i className="schema-legend-key schema-key-uq">UQ</i> valor único</span>
        <span className="schema-legend-item"><i className="schema-legend-chip" /> tablas de tu consulta</span>
      </div>
    </div>
  )
}
