/*
 * Comprueba que el diagrama que arma el taller no dibuje líneas por detrás de
 * una tabla con la que no tienen nada que ver.
 *
 *   node scripts/probar-layout.mjs
 *
 * Una línea escondida detrás de una caja intermedia parece conectarse con ella.
 * En material didáctico eso no es un detalle estético: es un dato falso.
 */
import { PGlite } from '@electric-sql/pglite'
import { fileURLToPath, pathToFileURL } from 'url'
import { dirname, join } from 'path'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const { leerEsquema } = await import(pathToFileURL(join(RAIZ, 'front/src/taller/esquemaVivo.js')))
const { CAJA_ANCHO, CAJA_CABECERA, CAJA_FILA } = await import(pathToFileURL(join(RAIZ, 'front/src/playground/datasets/contrato.js')))
const { puntosDeRuta } = await import(pathToFileURL(join(RAIZ, 'front/src/playground/rutaAristas.js')))
const { caso } = await import(pathToFileURL(join(RAIZ, 'front/src/taller/caso-sagarnaga.js')))
const { catalogo, cargarDataset } = await import(pathToFileURL(join(RAIZ, 'front/src/playground/datasets/index.js')))

/** DDL de referencia: lo que el caso le pide construir al alumno. */
const ddl = caso.modelo
  .map(m => {
    const columnas = m.columnas.map(c => {
      if (c.pk) return `  ${c.nombre} ${c.tipo} PRIMARY KEY`
      if (c.fk) {
        const destino = caso.modelo.find(x => x.tabla === c.fk)
        return `  ${c.nombre} ${c.tipo} REFERENCES ${c.fk}(${destino.columnas[0].nombre})`
      }
      return `  ${c.nombre} ${c.tipo}`
    })
    return `CREATE TABLE ${m.tabla} (\n${columnas.join(',\n')}\n);`
  })
  .join('\n\n')

const db = new PGlite()
await db.exec(ddl)
const tablas = await leerEsquema(db)

console.log('=== Disposición ===')
for (const t of tablas) {
  console.log(`  ${t.nombre.padEnd(18)} x=${String(Math.round(t.x)).padStart(4)}  y=${String(Math.round(t.y)).padStart(4)}  rol=${t.rol}`)
}

/** Le agrega a cada tabla los bordes de su caja, como hace el diagrama. */
function conCajas(lista) {
  return lista.map(t => {
    const alto = CAJA_CABECERA + t.columnas.length * CAJA_FILA
    return {
      ...t,
      alto,
      izq: t.x - CAJA_ANCHO / 2,
      der: t.x + CAJA_ANCHO / 2,
      arriba: t.y - alto / 2,
      abajo: t.y + alto / 2,
    }
  })
}

/** ¿Algún tramo del camino real atraviesa una caja que no es su origen ni su destino? */
function revisar(lista, etiqueta, problemas, rodeos) {
  const cajas = conCajas(lista)

  for (const origen of cajas) {
    for (const columna of origen.columnas) {
      if (!columna.fk) continue
      const destino = cajas.find(t => t.nombre === columna.fk)
      if (!destino || destino.nombre === origen.nombre) continue

      const puntos = puntosDeRuta(origen, destino, cajas)
      if (puntos.length > 2) rodeos.push(`${etiqueta}: ${origen.nombre} → ${destino.nombre} rodea`)

      for (let i = 0; i < puntos.length - 1; i++) {
        for (const intermedia of cajas) {
          if (intermedia.nombre === origen.nombre || intermedia.nombre === destino.nombre) continue
          // Se muestrea el tramo tal como se dibuja, no la recta ideal.
          const PASOS = 200
          for (let k = 1; k < PASOS; k++) {
            const x = puntos[i].x + ((puntos[i + 1].x - puntos[i].x) * k) / PASOS
            const y = puntos[i].y + ((puntos[i + 1].y - puntos[i].y) * k) / PASOS
            if (x > intermedia.izq && x < intermedia.der && y > intermedia.arriba && y < intermedia.abajo) {
              problemas.push(`${etiqueta}: ${origen.nombre} → ${destino.nombre} pasa por detrás de ${intermedia.nombre}`)
              k = PASOS
            }
          }
        }
      }
    }
  }
}

const problemas = []
const rodeos = []

console.log('\n=== Taller ===')
revisar(tablas, 'sagarnaga', problemas, rodeos)
await db.close()

console.log('\n=== Las ocho bases del laboratorio ===')
for (const ficha of catalogo) {
  const ds = await cargarDataset(ficha.id)
  const antes = problemas.length
  revisar(ds.tablas, ficha.id, problemas, rodeos)
  console.log(`  ${ficha.nombre.padEnd(22)} ${problemas.length === antes ? 'limpio' : 'CON PROBLEMAS'}`)
}

if (rodeos.length) {
  console.log(`\n${rodeos.length} relación(es) se dibujan en codo para no cruzar:`)
  for (const r of [...new Set(rodeos)]) console.log('  · ' + r)
}

if (problemas.length) {
  console.log('')
  for (const p of [...new Set(problemas)]) console.log('  ✗ ' + p)
}

console.log(problemas.length ? `\n✗ ${[...new Set(problemas)].length} línea(s) engañosa(s)` : '\n✓ Ninguna línea pasa por detrás de una tabla ajena')
process.exit(problemas.length ? 1 : 0)
