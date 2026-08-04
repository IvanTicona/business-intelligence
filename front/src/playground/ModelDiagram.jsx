import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CAJA_ANCHO, CAJA_CABECERA, CAJA_FILA } from './datasets/contrato.js'
import { marcasDeCardinalidad, ruta } from './rutaAristas.js'

const ZOOM_MIN = 1
const ZOOM_MAX = 6
const ZOOM_PASO = 1.35

/**
 * Diagrama del modelo, dibujado a partir de la lista de tablas del dataset.
 *
 * No sabe nada de ninguna base en particular: cada tabla trae su posición y sus
 * columnas, y las relaciones salen de las FK declaradas. Por eso agregar una
 * base nueva no toca este archivo.
 *
 * Las tablas que participan en la consulta que se acaba de ejecutar se resaltan,
 * que es la forma más directa de mostrarle al alumno por dónde viajó su query.
 */
export default function ModelDiagram({
  tablas,
  resaltadas = [],
  columnasActivas,
  relacionesActivas,
  mostrarOltp = true,
}) {
  const visibles = useMemo(
    () => tablas.filter(tabla => (mostrarOltp ? true : !tabla.oltp)),
    [tablas, mostrarOltp],
  )

  const cajas = useMemo(() => {
    const mapa = new Map()
    for (const tabla of visibles) {
      const alto = CAJA_CABECERA + tabla.columnas.length * CAJA_FILA
      mapa.set(tabla.nombre, {
        ...tabla,
        alto,
        izq: tabla.x - CAJA_ANCHO / 2,
        der: tabla.x + CAJA_ANCHO / 2,
        arriba: tabla.y - alto / 2,
        abajo: tabla.y + alto / 2,
      })
    }
    return mapa
  }, [visibles])

  // Una arista por FK cuyo destino esté visible.
  const aristas = useMemo(() => {
    const salida = []
    for (const caja of cajas.values()) {
      for (const columna of caja.columnas) {
        if (!columna.fk) continue
        const destino = cajas.get(columna.fk)
        if (!destino) continue
        const id = `${caja.nombre}.${columna.nombre}`
        salida.push({
          id,
          desde: caja,
          hasta: destino,
          // La relación se enciende cuando la consulta hace el JOIN de verdad,
          // no por el solo hecho de nombrar las dos tablas.
          activa: relacionesActivas?.has(id) ?? false,
        })
      }
    }
    return salida
  }, [cajas, relacionesActivas])

  /*
   * Encuadre del dibujo.
   *
   * Se ajusta al contenido, pero con un mínimo: sin él, una base de una sola
   * tabla llenaba el lienzo entero y el nombre salía del tamaño de un titular.
   * Con el mínimo, un modelo chico se ve chico, que es lo correcto.
   */
  const marco = useMemo(() => {
    if (cajas.size === 0) return { x: 0, y: 0, ancho: 100, alto: 100 }

    const lista = [...cajas.values()]
    const margen = 40
    const x = Math.min(...lista.map(c => c.izq)) - margen
    const y = Math.min(...lista.map(c => c.arriba)) - margen
    const ancho = Math.max(...lista.map(c => c.der)) + margen - x
    const alto = Math.max(...lista.map(c => c.abajo)) + margen - y

    const MINIMO_ANCHO = 780
    const MINIMO_ALTO = 560
    const anchoFinal = Math.max(ancho, MINIMO_ANCHO)
    const altoFinal = Math.max(alto, MINIMO_ALTO)

    // Al agrandar el marco, el contenido se mantiene centrado.
    return {
      x: x - (anchoFinal - ancho) / 2,
      y: y - (altoFinal - alto) / 2,
      ancho: anchoFinal,
      alto: altoFinal,
    }
  }, [cajas])

  // --- Zoom y desplazamiento ---------------------------------------------
  // El viewBox es lo que se achica al acercar: así el zoom no pixela nada,
  // porque el SVG se vuelve a dibujar a la escala nueva.
  const svgRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [centro, setCentro] = useState(null)
  const arrastre = useRef(null)

  // Al cambiar de base, o al mostrar u ocultar el OLTP, el modelo es otro:
  // conservar el encuadre anterior dejaría al alumno mirando un vacío.
  useEffect(() => {
    setZoom(1)
    setCentro(null)
  }, [tablas, mostrarOltp])

  const foco = centro ?? { x: marco.x + marco.ancho / 2, y: marco.y + marco.alto / 2 }
  const vista = {
    ancho: marco.ancho / zoom,
    alto: marco.alto / zoom,
  }
  vista.x = foco.x - vista.ancho / 2
  vista.y = foco.y - vista.alto / 2

  /** Lleva un punto de la pantalla a coordenadas del diagrama. */
  const aCoordenadas = useCallback(
    (clientX, clientY) => {
      const caja = svgRef.current?.getBoundingClientRect()
      if (!caja) return null
      // preserveAspectRatio="meet": la escala real es la menor de las dos.
      const escala = Math.min(caja.width / vista.ancho, caja.height / vista.alto)
      const sobranteX = (caja.width - vista.ancho * escala) / 2
      const sobranteY = (caja.height - vista.alto * escala) / 2
      return {
        x: vista.x + (clientX - caja.left - sobranteX) / escala,
        y: vista.y + (clientY - caja.top - sobranteY) / escala,
        escala,
      }
    },
    [vista.x, vista.y, vista.ancho, vista.alto],
  )

  const limitar = valor => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, valor))

  /** Acerca o aleja manteniendo fijo el punto señalado. */
  function acercar(factor, hacia) {
    setZoom(previo => {
      const nuevo = limitar(previo * factor)
      if (nuevo === previo) return previo

      if (hacia) {
        // El punto bajo el cursor se queda donde está: se mueve el centro.
        const proporcion = previo / nuevo
        setCentro(centroPrevio => {
          const actual = centroPrevio ?? { x: marco.x + marco.ancho / 2, y: marco.y + marco.alto / 2 }
          return {
            x: hacia.x + (actual.x - hacia.x) * proporcion,
            y: hacia.y + (actual.y - hacia.y) * proporcion,
          }
        })
      }

      if (nuevo === 1) setCentro(null)
      return nuevo
    })
  }

  function alRodar(evento) {
    evento.preventDefault()
    const punto = aCoordenadas(evento.clientX, evento.clientY)
    acercar(evento.deltaY < 0 ? ZOOM_PASO : 1 / ZOOM_PASO, punto)
  }

  /*
   * La rueda va por addEventListener y no por onWheel: React registra los
   * listeners de wheel como PASIVOS, y ahí preventDefault() no hace nada. Con
   * onWheel el zoom funcionaba igual, pero la página scrolleaba por debajo.
   * El ref guarda siempre el handler recién creado, así el listener se ata una
   * sola vez y no se re-registra en cada render.
   */
  const rodarRef = useRef(null)
  rodarRef.current = alRodar

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return undefined

    const manejar = evento => rodarRef.current?.(evento)
    svg.addEventListener('wheel', manejar, { passive: false })
    return () => svg.removeEventListener('wheel', manejar)
  }, [])

  function alPresionar(evento) {
    if (zoom === 1) return // sin zoom no hay a dónde desplazarse
    const punto = aCoordenadas(evento.clientX, evento.clientY)
    if (!punto) return
    arrastre.current = { desdeX: evento.clientX, desdeY: evento.clientY, centro: foco, escala: punto.escala }
    evento.currentTarget.setPointerCapture(evento.pointerId)
  }

  function alMover(evento) {
    if (!arrastre.current) return
    const { desdeX, desdeY, centro: inicial, escala } = arrastre.current
    setCentro({
      x: inicial.x - (evento.clientX - desdeX) / escala,
      y: inicial.y - (evento.clientY - desdeY) / escala,
    })
  }

  function alSoltar(evento) {
    if (!arrastre.current) return
    arrastre.current = null
    evento.currentTarget.releasePointerCapture?.(evento.pointerId)
  }

  return (
    <div className="pg-diagrama-marco">
      <svg
      ref={svgRef}
      className={`pg-diagrama ${zoom > 1 ? 'pg-diagrama-movible' : ''}`}
      viewBox={`${vista.x} ${vista.y} ${vista.ancho} ${vista.alto}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Diagrama del modelo de datos"
      onPointerDown={alPresionar}
      onPointerMove={alMover}
      onPointerUp={alSoltar}
      onPointerCancel={alSoltar}
    >
      {aristas.map(arista => {
        const lista = [...cajas.values()]
        const marcas = marcasDeCardinalidad(arista.desde, arista.hasta, lista)
        const clase = arista.activa ? 'pg-arista-activa' : ''

        return (
          <g key={arista.id}>
            <path d={ruta(arista.desde, arista.hasta, lista)} className={`pg-arista ${clase}`} />

            {/* Pata de gallo del lado que declara la foránea: el "muchos". */}
            <g transform={`translate(${marcas.muchos.x} ${marcas.muchos.y}) rotate(${marcas.muchos.angulo})`}>
              <path d="M 11 0 L 0 -4.5 M 11 0 L 0 0 M 11 0 L 0 4.5" className={`pg-marca ${clase}`} />
            </g>

            {/* Barra del lado de la clave primaria: el "uno". */}
            <g transform={`translate(${marcas.uno.x} ${marcas.uno.y}) rotate(${marcas.uno.angulo})`}>
              <path d="M 8 -4.5 L 8 4.5" className={`pg-marca ${clase}`} />
            </g>
          </g>
        )
      })}

      {[...cajas.values()].map(caja => {
        const activa = resaltadas.includes(caja.nombre)
        return (
          <g key={caja.nombre} className={`pg-caja pg-caja-${caja.rol} ${activa ? 'pg-caja-activa' : ''}`}>
            <rect x={caja.izq} y={caja.arriba} width={CAJA_ANCHO} height={caja.alto} rx={8} className="pg-caja-cuerpo" />
            <path
              d={cabecera(caja.izq, caja.arriba, CAJA_ANCHO, CAJA_CABECERA)}
              className="pg-caja-cabecera"
            />
            <text x={caja.izq + 11} y={caja.arriba + 18} className="pg-caja-nombre">{caja.nombre}</text>

            {caja.columnas.map((columna, i) => {
              const usada = columnasActivas?.has(`${caja.nombre}.${columna.nombre}`)
              const y = caja.arriba + CAJA_CABECERA + 13 + i * CAJA_FILA

              return (
                <g key={columna.nombre}>
                  {/* Franja detrás del campo: el color del texto ya está tomado
                      por PK, FK y métrica, así que el "está en uso" se marca
                      con el fondo para no competir con esa información. */}
                  {usada && (
                    <rect
                      x={caja.izq + 5}
                      y={y - CAJA_FILA + 5}
                      width={CAJA_ANCHO - 10}
                      height={CAJA_FILA}
                      rx={4}
                      className="pg-columna-uso"
                    />
                  )}
                  <text
                    x={caja.izq + 11}
                    y={y}
                    className={[
                      'pg-columna',
                      columna.pk ? 'pg-columna-pk' : '',
                      columna.fk ? 'pg-columna-fk' : '',
                      columna.metrica ? 'pg-columna-metrica' : '',
                      usada ? 'pg-columna-usada' : '',
                    ].join(' ').trim()}
                  >
                    {columna.nombre}
                  </text>
                </g>
              )
            })}
          </g>
        )
      })}
      </svg>

      <div className="pg-zoom">
        <button
          type="button"
          onClick={() => acercar(1 / ZOOM_PASO)}
          disabled={zoom <= ZOOM_MIN}
          aria-label="Alejar"
          title="Alejar"
        >
          −
        </button>

        <span className="pg-zoom-nivel" title="Nivel de acercamiento">{Math.round(zoom * 100)}%</span>

        <button
          type="button"
          onClick={() => acercar(ZOOM_PASO)}
          disabled={zoom >= ZOOM_MAX}
          aria-label="Acercar"
          title="Acercar"
        >
          +
        </button>

        <button
          type="button"
          className="pg-zoom-ajustar"
          onClick={() => { setZoom(1); setCentro(null) }}
          disabled={zoom === 1 && !centro}
          title="Volver a encuadrar todo el modelo"
        >
          Ajustar
        </button>
      </div>

      {zoom > 1 && <span className="pg-zoom-pista">Arrastra para moverte</span>}
    </div>
  )
}

/** Cabecera redondeada arriba y recta abajo, para que apoye sobre el cuerpo. */
function cabecera(x, y, ancho, alto, radio = 8) {
  return `M ${x} ${y + alto} L ${x} ${y + radio} Q ${x} ${y} ${x + radio} ${y} L ${x + ancho - radio} ${y} Q ${x + ancho} ${y} ${x + ancho} ${y + radio} L ${x + ancho} ${y + alto} Z`
}
