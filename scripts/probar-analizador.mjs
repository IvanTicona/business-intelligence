/*
 * Prueba del analizador de consultas del laboratorio.
 *
 *   node scripts/probar-analizador.mjs
 *
 * Corre casos elegidos a mano contra el modelo de Ketal, incluyendo consultas a
 * medio escribir, que es el estado normal mientras el alumno tipea.
 */
import { fileURLToPath, pathToFileURL } from 'url'
import { dirname, join } from 'path'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const { analizarConsulta } = await import(pathToFileURL(join(RAIZ, 'front/src/playground/analizarConsulta.js')))
const { ketal } = await import(pathToFileURL(join(RAIZ, 'front/src/playground/datasets/ketal.js')))

const T = ketal.tablas
const fallos = []

function caso(titulo, sql, esperado) {
  const r = analizarConsulta(sql, T)
  const real = {
    tablas: [...r.tablas].sort(),
    columnas: [...r.columnas].sort(),
    relaciones: [...r.relaciones].sort(),
  }

  const problemas = []
  for (const clave of Object.keys(esperado)) {
    const quiero = [...esperado[clave]].sort()
    if (clave.startsWith('sin')) continue
    const falta = quiero.filter(v => !real[clave.replace('incluye_', '')].includes(v))
    if (falta.length) problemas.push(`${clave} no incluye ${falta.join(', ')}`)
  }
  for (const clave of Object.keys(esperado)) {
    if (!clave.startsWith('sin_')) continue
    const prohibido = esperado[clave]
    const campo = clave.replace('sin_', '')
    const sobra = prohibido.filter(v => real[campo].includes(v))
    if (sobra.length) problemas.push(`${campo} NO debería incluir ${sobra.join(', ')}`)
  }

  console.log(`${problemas.length ? 'MAL ' : 'ok  '} ${titulo}`)
  if (problemas.length) {
    for (const p of problemas) console.log('       ' + p)
    console.log('       real:', JSON.stringify(real))
    fallos.push(titulo)
  }
}

console.log('=== Analizador de consultas · modelo Ketal ===\n')

caso('tabla suelta', 'SELECT * FROM hecho_venta;', {
  incluye_tablas: ['hecho_venta'],
})

caso('resuelve alias en columnas calificadas',
  'SELECT p.categoria, SUM(h.importe) FROM hecho_venta h JOIN dim_producto p ON h.id_producto = p.id_producto GROUP BY p.categoria;',
  {
    incluye_tablas: ['hecho_venta', 'dim_producto'],
    incluye_columnas: ['dim_producto.categoria', 'hecho_venta.importe', 'hecho_venta.id_producto', 'dim_producto.id_producto'],
    incluye_relaciones: ['hecho_venta.id_producto'],
  })

caso('la relación NO se enciende solo por nombrar las dos tablas',
  'SELECT * FROM hecho_venta, dim_producto;',
  {
    incluye_tablas: ['hecho_venta', 'dim_producto'],
    sin_relaciones: ['hecho_venta.id_producto'],
  })

caso('columna suelta sin calificar',
  'SELECT categoria FROM dim_producto;',
  { incluye_columnas: ['dim_producto.categoria'] })

caso('no confunde literales de texto con campos',
  "SELECT * FROM dim_sucursal WHERE zona = 'Sopocachi';",
  {
    incluye_columnas: ['dim_sucursal.zona'],
    sin_columnas: ['dim_sucursal.nombre'],
  })

caso('ignora comentarios',
  '-- dim_promocion es la que no se usa\nSELECT * FROM dim_cliente;',
  {
    incluye_tablas: ['dim_cliente'],
    sin_tablas: ['dim_promocion'],
  })

caso('no toma la cláusula ON como alias',
  'SELECT * FROM hecho_venta JOIN dim_tiempo ON hecho_venta.id_tiempo = dim_tiempo.id_tiempo;',
  {
    incluye_tablas: ['hecho_venta', 'dim_tiempo'],
    incluye_relaciones: ['hecho_venta.id_tiempo'],
  })

caso('métricas del hecho',
  'SELECT SUM(h.importe), SUM(h.costo) FROM hecho_venta h;',
  { incluye_columnas: ['hecho_venta.importe', 'hecho_venta.costo'] })

caso('consulta a medio escribir no rompe',
  'SELECT p.categ FROM hecho_venta h JOIN dim_pro',
  { incluye_tablas: ['hecho_venta'] })

caso('consulta vacía', '', { incluye_tablas: [] })

caso('tres tablas y dos relaciones',
  `SELECT s.macrozona, t.anio, SUM(h.importe)
   FROM hecho_venta h
   JOIN dim_sucursal s ON h.id_sucursal = s.id_sucursal
   JOIN dim_tiempo t ON h.id_tiempo = t.id_tiempo
   GROUP BY s.macrozona, t.anio;`,
  {
    incluye_tablas: ['hecho_venta', 'dim_sucursal', 'dim_tiempo'],
    incluye_relaciones: ['hecho_venta.id_sucursal', 'hecho_venta.id_tiempo'],
    incluye_columnas: ['dim_sucursal.macrozona', 'dim_tiempo.anio', 'hecho_venta.importe'],
  })

caso('el OLTP también',
  `SELECT c.nombre FROM detalle_venta d
   JOIN producto p ON d.id_producto = p.id_producto
   JOIN categoria c ON p.id_categoria = c.id_categoria;`,
  {
    incluye_tablas: ['detalle_venta', 'producto', 'categoria'],
    incluye_relaciones: ['detalle_venta.id_producto', 'producto.id_categoria'],
  })

console.log(fallos.length ? `\n✗ ${fallos.length} caso(s) fallaron` : '\n✓ Todos los casos pasan')
process.exit(fallos.length ? 1 : 0)
