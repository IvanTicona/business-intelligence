/*
 * Genera front/src/playground/datasets/yaigo.js
 *
 * Yaigo enseña DRILL-ACROSS con DIMENSIONES CONFORMADAS.
 *
 * Dos hechos de distinto grain que comparten dimensiones:
 *   hecho_pedido → un pedido (lo que se compró)
 *   hecho_envio  → un envío  (cómo llegó)
 *
 * No todo pedido termina en envío (los cancelados no se despachan), y por eso
 * unirlos con un JOIN directo pierde filas o multiplica. La forma correcta es
 * resumir cada hecho por su cuenta y recién después cruzarlos por la dimensión
 * que comparten. Eso es drill-across.
 */
import { writeFileSync } from 'fs'
import { rng, entre, decimal, pesado, insert, dimTiempo, idTiempo, fechas, encabezado } from './lib.mjs'

const SALIDA = new URL('../../front/src/playground/datasets/yaigo.js', import.meta.url)
const r = rng(20190823)

// Zonas de La Paz y El Alto donde opera el delivery.
const zonas = [
  [1, 'San Miguel', 'Zona Sur', 3.2],
  [2, 'Calacoto', 'Zona Sur', 4.0],
  [3, 'Sopocachi', 'Centro', 2.6],
  [4, 'Miraflores', 'Centro', 3.1],
  [5, 'Achumani', 'Zona Sur', 5.4],
  [6, 'San Pedro', 'Centro', 2.2],
  [7, 'Villa Fatima', 'Norte', 4.8],
  [8, 'Ceja El Alto', 'El Alto', 8.5],
]

const categorias = ['Restaurante', 'Farmacia', 'Supermercado', 'Mascotas', 'Bebidas', 'Panaderia']

const comercios = []
const nombresComercio = [
  'Pollos Copacabana', 'Salteñas Potosi', 'Cafe del Mundo', 'Paceña Express', 'Farmacia Chavez',
  'Minimarket Central', 'Pizzeria Napoli', 'Sushi Sur', 'Pet Shop Andino', 'Panaderia Victoria',
  'Jugueria Illimani', 'Burger Alteño', 'Farmacia Bolivia', 'Market Achumani', 'Heladeria Splendid',
  'Comida China Wong', 'Almuerzos Doña Rosa', 'Licoreria La Paz',
]
for (let i = 1; i <= nombresComercio.length; i++) {
  comercios.push([
    i,
    nombresComercio[i - 1],
    categorias[(i * 3) % categorias.length],
    entre(r, 1, zonas.length),
    decimal(r, 3.4, 4.9, 1),
  ])
}

const repartidores = []
for (let i = 1; i <= 20; i++) {
  repartidores.push([
    i,
    `Repartidor ${String(i).padStart(2, '0')}`,
    pesado(r, [['Moto', 6], ['Bicicleta', 3], ['A pie', 1]]),
    entre(r, 2019, 2025),
  ])
}

// --- Hecho 1: pedidos ------------------------------------------------------

const dias = fechas('2025-01-01', '2025-12-31')
const pedidos = []
const envios = []
let idPedido = 0
let idEnvio = 0

for (const fecha of dias) {
  const d = new Date(fecha + 'T00:00:00Z')
  const finDeSemana = d.getUTCDay() === 0 || d.getUTCDay() === 6

  for (let i = 0, n = finDeSemana ? entre(r, 5, 9) : entre(r, 3, 6); i < n; i++) {
    idPedido++
    const comercio = comercios[entre(r, 0, comercios.length - 1)]
    const zonaEntrega = entre(r, 1, zonas.length)
    const items = entre(r, 1, 6)
    const subtotal = decimal(r, 25, 260, 2)
    const estado = pesado(r, [['Entregado', 88], ['Cancelado', 12]])

    pedidos.push([idPedido, idTiempo(fecha), comercio[0], zonaEntrega, items, subtotal, estado])

    // Solo los pedidos entregados generan un envío: por eso los dos hechos NO
    // tienen la misma cantidad de filas, y ese es el punto del ejercicio.
    if (estado === 'Entregado') {
      idEnvio++
      const distancia = decimal(r, zonas[zonaEntrega - 1][3] * 0.5, zonas[zonaEntrega - 1][3] * 1.6, 2)
      envios.push([
        idEnvio,
        idPedido,
        idTiempo(fecha),
        entre(r, 1, repartidores.length),
        zonaEntrega,
        distancia,
        entre(r, 12, 62),
        decimal(r, 6, 22, 2),
        decimal(r, 0, 15, 2),
      ])
    }
  }
}

const seed = `
-- ==========================================================================
-- YAIGO  ·  Delivery boliviano ("You Ask I Go")
--
-- DOS HECHOS CON DIMENSIONES CONFORMADAS:
--   hecho_pedido → un pedido. Incluye los cancelados.
--   hecho_envio  → un envio. SOLO existe para los pedidos entregados.
--
-- Comparten dim_tiempo y dim_zona. Como el grain y la cantidad de filas son
-- distintos, unirlos con un JOIN directo da mal: hay que resumir cada uno por
-- separado y cruzar los resumenes. Eso es drill-across.
-- ==========================================================================

${dimTiempo('2025-01-01', '2025-12-31')}

CREATE TABLE dim_zona (
  id_zona INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  macrozona TEXT NOT NULL,
  distancia_centro_km REAL NOT NULL
);

CREATE TABLE dim_comercio (
  id_comercio INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  id_zona INTEGER NOT NULL REFERENCES dim_zona(id_zona),
  calificacion REAL NOT NULL
);

CREATE TABLE dim_repartidor (
  id_repartidor INTEGER PRIMARY KEY,
  alias TEXT NOT NULL,
  vehiculo TEXT NOT NULL,
  anio_ingreso INTEGER NOT NULL
);

-- Grain: un pedido.
CREATE TABLE hecho_pedido (
  id_pedido INTEGER PRIMARY KEY,
  id_tiempo INTEGER NOT NULL REFERENCES dim_tiempo(id_tiempo),
  id_comercio INTEGER NOT NULL REFERENCES dim_comercio(id_comercio),
  id_zona_entrega INTEGER NOT NULL REFERENCES dim_zona(id_zona),
  items INTEGER NOT NULL,
  subtotal REAL NOT NULL,
  estado TEXT NOT NULL
);

-- Grain: un envio. Solo para pedidos entregados.
CREATE TABLE hecho_envio (
  id_envio INTEGER PRIMARY KEY,
  id_pedido INTEGER NOT NULL REFERENCES hecho_pedido(id_pedido),
  id_tiempo INTEGER NOT NULL REFERENCES dim_tiempo(id_tiempo),
  id_repartidor INTEGER NOT NULL REFERENCES dim_repartidor(id_repartidor),
  id_zona INTEGER NOT NULL REFERENCES dim_zona(id_zona),
  distancia_km REAL NOT NULL,
  minutos_entrega INTEGER NOT NULL,
  costo_envio REAL NOT NULL,
  propina REAL NOT NULL
);

${insert('dim_zona', ['id_zona', 'nombre', 'macrozona', 'distancia_centro_km'], zonas)}

${insert('dim_comercio', ['id_comercio', 'nombre', 'categoria', 'id_zona', 'calificacion'], comercios)}

${insert('dim_repartidor', ['id_repartidor', 'alias', 'vehiculo', 'anio_ingreso'], repartidores)}

${insert('hecho_pedido',
  ['id_pedido', 'id_tiempo', 'id_comercio', 'id_zona_entrega', 'items', 'subtotal', 'estado'],
  pedidos, 40)}

${insert('hecho_envio',
  ['id_envio', 'id_pedido', 'id_tiempo', 'id_repartidor', 'id_zona', 'distancia_km', 'minutos_entrega', 'costo_envio', 'propina'],
  envios, 40)}
`.trim()

const tablas = [
  { nombre: 'hecho_pedido', rol: 'hecho', x: 290, y: 430, columnas: [
    { nombre: 'id_pedido', tipo: 'INTEGER', pk: true },
    { nombre: 'id_tiempo', tipo: 'INTEGER', fk: 'dim_tiempo' },
    { nombre: 'id_comercio', tipo: 'INTEGER', fk: 'dim_comercio' },
    { nombre: 'id_zona_entrega', tipo: 'INTEGER', fk: 'dim_zona' },
    { nombre: 'items', tipo: 'INTEGER', metrica: true },
    { nombre: 'subtotal', tipo: 'REAL', metrica: true },
    { nombre: 'estado', tipo: 'TEXT' },
  ] },
  { nombre: 'hecho_envio', rol: 'hecho', x: 760, y: 430, columnas: [
    { nombre: 'id_envio', tipo: 'INTEGER', pk: true },
    { nombre: 'id_pedido', tipo: 'INTEGER', fk: 'hecho_pedido' },
    { nombre: 'id_tiempo', tipo: 'INTEGER' },
    { nombre: 'id_repartidor', tipo: 'INTEGER', fk: 'dim_repartidor' },
    { nombre: 'id_zona', tipo: 'INTEGER' },
    { nombre: 'distancia_km', tipo: 'REAL', metrica: true },
    { nombre: 'minutos_entrega', tipo: 'INTEGER', metrica: true },
    { nombre: 'costo_envio', tipo: 'REAL', metrica: true },
    { nombre: 'propina', tipo: 'REAL', metrica: true },
  ] },
  { nombre: 'dim_tiempo', rol: 'dimension', x: 520, y: 110, columnas: [
    { nombre: 'id_tiempo', tipo: 'INTEGER', pk: true },
    { nombre: 'fecha', tipo: 'TEXT' },
    { nombre: 'anio', tipo: 'INTEGER' },
    { nombre: 'mes', tipo: 'INTEGER' },
    { nombre: 'nombre_mes', tipo: 'TEXT' },
    { nombre: 'trimestre', tipo: 'INTEGER' },
    { nombre: 'dia_semana', tipo: 'TEXT' },
    { nombre: 'es_fin_semana', tipo: 'INTEGER' },
  ] },
  { nombre: 'dim_comercio', rol: 'dimension', x: 120, y: 730, columnas: [
    { nombre: 'id_comercio', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'categoria', tipo: 'TEXT' },
    { nombre: 'id_zona', tipo: 'INTEGER', fk: 'dim_zona' },
    { nombre: 'calificacion', tipo: 'REAL' },
  ] },
  { nombre: 'dim_zona', rol: 'dimension', x: 520, y: 740, columnas: [
    { nombre: 'id_zona', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'macrozona', tipo: 'TEXT' },
    { nombre: 'distancia_centro_km', tipo: 'REAL' },
  ] },
  { nombre: 'dim_repartidor', rol: 'dimension', x: 920, y: 740, columnas: [
    { nombre: 'id_repartidor', tipo: 'INTEGER', pk: true },
    { nombre: 'alias', tipo: 'TEXT' },
    { nombre: 'vehiculo', tipo: 'TEXT' },
    { nombre: 'anio_ingreso', tipo: 'INTEGER' },
  ] },
]

const retos = [
  {
    id: 'ygo-01', bloque: 'navegar', concept: 'JOIN + agregación',
    title: 'Pedidos por categoría de comercio',
    prompt: 'Cantidad de pedidos y subtotal por categoría de comercio. Columnas: categoria, pedidos, subtotal. De mayor a menor subtotal.',
    hint: 'La categoría está en dim_comercio.',
    starter: 'SELECT c.categoria, COUNT(*) AS pedidos, ...\nFROM hecho_pedido p\nJOIN dim_comercio c ON ...;',
    expectedSql: `SELECT c.categoria, COUNT(*) AS pedidos, ROUND((SUM(p.subtotal))::numeric, 2) AS subtotal
FROM hecho_pedido p JOIN dim_comercio c ON p.id_comercio = c.id_comercio
GROUP BY c.categoria ORDER BY subtotal DESC;`,
    orderMatters: true,
  },
  {
    id: 'ygo-02', bloque: 'navegar', concept: 'Dimensión compartida',
    title: 'Envíos por zona',
    prompt: 'Cantidad de envíos y minutos promedio de entrega por zona, redondeado a 1. Columnas: zona, envios, minutos. Del más lento al más rápido.',
    hint: 'dim_zona la comparten los dos hechos: acá se usa desde hecho_envio.',
    starter: 'SELECT z.nombre, COUNT(*) AS envios, ROUND((AVG(e.minutos_entrega))::numeric, 1) AS minutos\nFROM hecho_envio e\nJOIN dim_zona z ON ...;',
    expectedSql: `SELECT z.nombre AS zona, COUNT(*) AS envios, ROUND((AVG(e.minutos_entrega))::numeric, 1) AS minutos
FROM hecho_envio e JOIN dim_zona z ON e.id_zona = z.id_zona
GROUP BY z.nombre ORDER BY minutos DESC;`,
    orderMatters: true,
  },
  {
    id: 'ygo-03', bloque: 'slice', concept: 'Filtro por estado',
    title: 'Solo lo que se canceló',
    prompt: 'Pedidos cancelados por categoría de comercio. Columnas: categoria, cancelados. De mayor a menor.',
    hint: 'El estado vive en el hecho, no en una dimensión: se filtra directo.',
    starter: "SELECT c.categoria, COUNT(*) AS cancelados\nFROM hecho_pedido p\nJOIN dim_comercio c ON ...\nWHERE p.estado = ...;",
    expectedSql: `SELECT c.categoria, COUNT(*) AS cancelados
FROM hecho_pedido p JOIN dim_comercio c ON p.id_comercio = c.id_comercio
WHERE p.estado = 'Cancelado'
GROUP BY c.categoria ORDER BY cancelados DESC, c.categoria;`,
    orderMatters: true,
  },
  {
    id: 'ygo-04', bloque: 'drill-across', concept: 'Dos hechos por zona',
    title: 'Pedidos y envíos en una sola tabla',
    prompt: 'Por zona: cantidad de pedidos (todos) y cantidad de envíos. Columnas: zona, pedidos, envios. Ordena por zona.',
    hint: 'Resume cada hecho por separado en una subconsulta y únelos por id_zona desde dim_zona. NO unas los dos hechos directamente.',
    starter: 'SELECT z.nombre AS zona,\n  COALESCE(ped.pedidos, 0) AS pedidos,\n  COALESCE(env.envios, 0) AS envios\nFROM dim_zona z\nLEFT JOIN ( ... ) ped ON ...\nLEFT JOIN ( ... ) env ON ...;',
    expectedSql: `SELECT z.nombre AS zona,
  COALESCE(ped.pedidos, 0) AS pedidos,
  COALESCE(env.envios, 0) AS envios
FROM dim_zona z
LEFT JOIN (SELECT id_zona_entrega AS id_zona, COUNT(*) AS pedidos FROM hecho_pedido GROUP BY id_zona_entrega) ped
  ON ped.id_zona = z.id_zona
LEFT JOIN (SELECT id_zona, COUNT(*) AS envios FROM hecho_envio GROUP BY id_zona) env
  ON env.id_zona = z.id_zona
ORDER BY z.nombre;`,
    orderMatters: true,
    trampa: 'Un JOIN directo entre hecho_pedido y hecho_envio parece funcionar porque el envio referencia al pedido, pero deja afuera todos los pedidos cancelados y responde otra pregunta.',
  },
  {
    id: 'ygo-05', bloque: 'drill-across', concept: 'Ratio entre hechos',
    title: 'Tasa de concreción por zona',
    prompt: 'Por zona: pedidos, envíos y el porcentaje de pedidos que terminaron en envío, redondeado a 2. Columnas: zona, pedidos, envios, tasa. De mayor a menor tasa.',
    hint: 'Es el reto anterior, dividiendo una columna por la otra. Cuida la división entera: multiplica por 100.0.',
    starter: 'SELECT zona, pedidos, envios,\n  ROUND((envios * 100.0 / pedidos)::numeric, 2) AS tasa\nFROM ( ... );',
    expectedSql: `SELECT zona, pedidos, envios, ROUND((envios * 100.0 / pedidos)::numeric, 2) AS tasa FROM (
  SELECT z.nombre AS zona,
    COALESCE(ped.pedidos, 0) AS pedidos,
    COALESCE(env.envios, 0) AS envios
  FROM dim_zona z
  LEFT JOIN (SELECT id_zona_entrega AS id_zona, COUNT(*) AS pedidos FROM hecho_pedido GROUP BY id_zona_entrega) ped
    ON ped.id_zona = z.id_zona
  LEFT JOIN (SELECT id_zona, COUNT(*) AS envios FROM hecho_envio GROUP BY id_zona) env
    ON env.id_zona = z.id_zona
) ORDER BY tasa DESC, zona;`,
    orderMatters: true,
  },
  {
    id: 'ygo-06', bloque: 'drill-across', concept: 'Métricas de dos hechos',
    title: 'Ticket y costo logístico',
    prompt: 'Por macrozona: subtotal de los pedidos entregados y costo de envío total. Columnas: macrozona, subtotal, costo_envio. Ordena por macrozona.',
    hint: 'Las dos métricas viven en hechos distintos. Resume cada una por macrozona y después únelas.',
    starter: 'SELECT z.macrozona, ...\nFROM dim_zona z\nLEFT JOIN ( ... ) ON ...\nGROUP BY z.macrozona;',
    expectedSql: `SELECT z.macrozona,
  ROUND((SUM(COALESCE(ped.subtotal, 0)))::numeric, 2) AS subtotal,
  ROUND((SUM(COALESCE(env.costo, 0)))::numeric, 2) AS costo_envio
FROM dim_zona z
LEFT JOIN (
  SELECT id_zona_entrega AS id_zona, SUM(subtotal) AS subtotal
  FROM hecho_pedido WHERE estado = 'Entregado' GROUP BY id_zona_entrega
) ped ON ped.id_zona = z.id_zona
LEFT JOIN (
  SELECT id_zona, SUM(costo_envio) AS costo FROM hecho_envio GROUP BY id_zona
) env ON env.id_zona = z.id_zona
GROUP BY z.macrozona ORDER BY z.macrozona;`,
    orderMatters: true,
  },
  {
    id: 'ygo-07', bloque: 'aditividad', concept: 'No aditivo',
    title: 'Minutos: promedio, nunca suma',
    prompt: 'Minutos promedio de entrega por tipo de vehículo, redondeado a 1. Columnas: vehiculo, minutos, envios. Del más lento al más rápido.',
    hint: 'Sumar los minutos de entregas distintas no es ninguna magnitud real.',
    starter: 'SELECT rp.vehiculo, ROUND((AVG(e.minutos_entrega))::numeric, 1) AS minutos, COUNT(*) AS envios\nFROM hecho_envio e\nJOIN dim_repartidor rp ON ...;',
    expectedSql: `SELECT rp.vehiculo, ROUND((AVG(e.minutos_entrega))::numeric, 1) AS minutos, COUNT(*) AS envios
FROM hecho_envio e JOIN dim_repartidor rp ON e.id_repartidor = rp.id_repartidor
GROUP BY rp.vehiculo ORDER BY minutos DESC;`,
    orderMatters: true,
  },
  {
    id: 'ygo-08', bloque: 'tiempo', concept: 'Fin de semana',
    title: 'El delivery vive del fin de semana',
    prompt: 'Pedidos por día de la semana. Columnas: dia_semana, pedidos. De mayor a menor.',
    hint: 'dim_tiempo ya trae dia_semana.',
    starter: 'SELECT t.dia_semana, COUNT(*) AS pedidos\nFROM hecho_pedido p\nJOIN dim_tiempo t ON ...;',
    expectedSql: `SELECT t.dia_semana, COUNT(*) AS pedidos
FROM hecho_pedido p JOIN dim_tiempo t ON p.id_tiempo = t.id_tiempo
GROUP BY t.dia_semana ORDER BY pedidos DESC;`,
    orderMatters: true,
  },
  {
    id: 'ygo-09', bloque: 'tiempo', concept: 'Serie mensual',
    title: 'Cómo creció el año',
    prompt: 'Pedidos y subtotal por mes. Columnas: mes, pedidos, subtotal. En orden de mes.',
    hint: 'Agrupa por t.mes y ordena por el mismo campo.',
    starter: 'SELECT t.mes, COUNT(*) AS pedidos, ...\nFROM hecho_pedido p\nJOIN dim_tiempo t ON ...;',
    expectedSql: `SELECT t.mes, COUNT(*) AS pedidos, ROUND((SUM(p.subtotal))::numeric, 2) AS subtotal
FROM hecho_pedido p JOIN dim_tiempo t ON p.id_tiempo = t.id_tiempo
GROUP BY t.mes ORDER BY t.mes;`,
    orderMatters: true,
  },
  {
    id: 'ygo-10', bloque: 'ventanas', concept: 'Ranking',
    title: 'Top 5 comercios',
    prompt: 'Los 5 comercios con más subtotal facturado, con su puesto. Columnas: puesto, nombre, subtotal.',
    hint: 'RANK() OVER (ORDER BY ... DESC) numera; después se recorta con LIMIT.',
    starter: 'SELECT RANK() OVER (ORDER BY ... DESC) AS puesto, nombre, subtotal\nFROM ( ... )\nLIMIT 5;',
    expectedSql: `SELECT RANK() OVER (ORDER BY subtotal DESC) AS puesto, nombre, subtotal FROM (
  SELECT c.nombre AS nombre, ROUND((SUM(p.subtotal))::numeric, 2) AS subtotal
  FROM hecho_pedido p JOIN dim_comercio c ON p.id_comercio = c.id_comercio
  GROUP BY c.nombre
) ORDER BY subtotal DESC LIMIT 5;`,
    orderMatters: true,
  },
  {
    id: 'ygo-11', bloque: 'trampas', concept: 'Fan trap',
    title: 'La trampa del abanico',
    prompt: 'Subtotal por zona contando SOLO los pedidos entregados, sin pasar por hecho_envio. Columnas: zona, subtotal. De mayor a menor.',
    hint: 'El subtotal está en hecho_pedido: no hace falta tocar hecho_envio para nada.',
    starter: "SELECT z.nombre AS zona, ROUND((SUM(p.subtotal))::numeric, 2) AS subtotal\nFROM hecho_pedido p\nJOIN dim_zona z ON ...\nWHERE p.estado = 'Entregado'\n...;",
    expectedSql: `SELECT z.nombre AS zona, ROUND((SUM(p.subtotal))::numeric, 2) AS subtotal
FROM hecho_pedido p JOIN dim_zona z ON p.id_zona_entrega = z.id_zona
WHERE p.estado = 'Entregado'
GROUP BY z.nombre ORDER BY subtotal DESC;`,
    orderMatters: true,
    trampa: 'Si sumas subtotal despues de unir con hecho_envio, cada pedido con mas de un envio contaria su subtotal varias veces. La regla: nunca sumes una metrica despues de un JOIN que multiplica filas.',
  },
  {
    id: 'ygo-12', bloque: 'comparacion', concept: 'Elegir el hecho correcto',
    title: 'Qué hecho responde qué',
    prompt: 'Por repartidor: envíos hechos, kilómetros recorridos y propina total. Columnas: alias, envios, km, propina. Los 8 primeros por kilómetros.',
    hint: 'Esta pregunta es solo de hecho_envio: los pedidos no saben quién repartió.',
    starter: 'SELECT rp.alias, COUNT(*) AS envios, ROUND((SUM(e.distancia_km))::numeric, 2) AS km, ...\nFROM hecho_envio e\nJOIN dim_repartidor rp ON ...;',
    expectedSql: `SELECT rp.alias, COUNT(*) AS envios, ROUND((SUM(e.distancia_km))::numeric, 2) AS km, ROUND((SUM(e.propina))::numeric, 2) AS propina
FROM hecho_envio e JOIN dim_repartidor rp ON e.id_repartidor = rp.id_repartidor
GROUP BY rp.alias ORDER BY km DESC, rp.alias LIMIT 8;`,
    orderMatters: true,
  },
]

const dataset = {
  id: 'yaigo',
  nombre: 'Yaigo',
  subtitulo: 'Delivery · La Paz y El Alto',
  dominio: 'Logística',
  tipo: 'estrella',
  concepto: 'Drill-across con dimensiones conformadas. Dos hechos de distinto grain (pedidos y envíos) que comparten tiempo y zona, pero no tienen la misma cantidad de filas porque los pedidos cancelados nunca se despachan. Unirlos con un JOIN directo da mal: hay que resumir cada uno y cruzar los resúmenes.',
  nota: 'Yaigo es una empresa boliviana de delivery ("You Ask I Go"), fundada por un equipo local. Las zonas de reparto son reales. Los comercios, pedidos y repartidores son una muestra didáctica.',
  tablas,
  retos,
}

const archivo = `${encabezado('Yaigo · Delivery en La Paz y El Alto', 'yaigo.mjs')}

export const yaigo = ${JSON.stringify(dataset, null, 2).replace(/"([a-zA-Z_][a-zA-Z0-9_]*)":/g, '$1:')}

yaigo.seedSql = String.raw\`
${seed.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}
\`
`

writeFileSync(SALIDA, archivo)
console.log(`yaigo.js escrito · ${pedidos.length} pedidos · ${envios.length} envios · ${(archivo.length / 1024).toFixed(0)} KB`)
