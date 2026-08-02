/*
 * Genera front/src/playground/datasets/bancosol.js
 *
 * BancoSol enseña HECHOS SEMI-ADITIVOS, que es el concepto que más se resiste.
 * Trae dos hechos a propósito:
 *
 *   hecho_desembolso  → fact de transacción. El monto SE SUMA en todo: por mes,
 *                       por agencia, por producto. Es aditivo puro.
 *   hecho_saldo_mes   → snapshot periódico. El saldo NO se suma entre meses:
 *                       sumar enero + febrero da un número que no existe.
 *                       Se toma el último mes, o se promedia.
 *
 * Poner los dos juntos es lo que permite que el alumno vea la diferencia en la
 * misma base, con las mismas dimensiones.
 */
import { writeFileSync } from 'fs'
import { rng, entre, decimal, pesado, insert, dimTiempo, idTiempo, fechas, encabezado } from './lib.mjs'

const SALIDA = new URL('../../front/src/playground/datasets/bancosol.js', import.meta.url)
const r = rng(19920101)

// Agencias por zona de La Paz y El Alto.
const agencias = [
  [1, 'Agencia Miraflores', 'Miraflores', 'La Paz', 1994],
  [2, 'Agencia San Pedro', 'San Pedro', 'La Paz', 1996],
  [3, 'Agencia Max Paredes', 'Max Paredes', 'La Paz', 1999],
  [4, 'Agencia Villa Fatima', 'Villa Fatima', 'La Paz', 2003],
  [5, 'Agencia Ceja El Alto', 'Ceja', 'El Alto', 1998],
  [6, 'Agencia Rio Seco', 'Rio Seco', 'El Alto', 2007],
  [7, 'Agencia Sopocachi', 'Sopocachi', 'La Paz', 2011],
]

// Cartera típica de una entidad de microfinanzas.
const productos = [
  [1, 'Microcredito individual', 'Credito', 18.5, 2000, 35000],
  [2, 'Credito grupal solidario', 'Credito', 21.0, 800, 12000],
  [3, 'Credito PYME', 'Credito', 14.0, 20000, 180000],
  [4, 'Credito de vivienda social', 'Credito', 6.5, 90000, 420000],
  [5, 'Credito de consumo', 'Credito', 16.0, 3000, 45000],
  [6, 'Capital de operaciones', 'Credito', 15.5, 10000, 90000],
]

const rubros = ['Comercio', 'Manufactura', 'Servicios', 'Transporte', 'Agropecuario', 'Construccion']
const sexos = ['F', 'M']

const nombresPila = ['Rosa', 'Juan', 'Elena', 'Mario', 'Gladys', 'Freddy', 'Norma', 'Wilson', 'Justina',
  'Edgar', 'Sonia', 'Ramiro', 'Delia', 'Hugo', 'Martha', 'Nestor', 'Julia', 'Alvaro', 'Nieves', 'Ronald']
const apellidos = ['Mamani', 'Quispe', 'Condori', 'Apaza', 'Ticona', 'Colque', 'Choque', 'Huanca',
  'Callisaya', 'Poma', 'Yujra', 'Laura', 'Chura', 'Nina', 'Alanoca']

const clientes = []
for (let i = 1; i <= 60; i++) {
  clientes.push([
    i,
    `${nombresPila[(i * 7) % nombresPila.length]} ${apellidos[(i * 11) % apellidos.length]}`,
    sexos[i % 2],
    rubros[(i * 5) % rubros.length],
    pesado(r, [['Nuevo', 2], ['Recurrente', 5], ['Antiguo', 3]]),
    entre(r, 1, agencias.length),
  ])
}

// --- Hecho 1: desembolsos (aditivo) --------------------------------------

const dias = fechas('2025-01-01', '2025-12-31')
const desembolsos = []
let idDesembolso = 0

for (const fecha of dias) {
  const d = new Date(fecha + 'T00:00:00Z')
  if (d.getUTCDay() === 0) continue // el banco no desembolsa domingos

  for (let i = 0, n = entre(r, 1, 4); i < n; i++) {
    idDesembolso++
    const producto = productos[Number(pesado(r, [['1', 8], ['2', 4], ['3', 2], ['4', 1], ['5', 3], ['6', 2]])) - 1]
    const cliente = clientes[entre(r, 0, clientes.length - 1)]
    const monto = decimal(r, producto[4], producto[5], 0)
    const plazo = Number(pesado(r, [['12', 4], ['18', 3], ['24', 3], ['36', 2], ['60', 1]]))

    desembolsos.push([
      idDesembolso,
      idTiempo(fecha),
      cliente[0],
      cliente[5],
      producto[0],
      monto,
      plazo,
      producto[3],
    ])
  }
}

// --- Hecho 2: saldo de cartera al cierre de cada mes (semi-aditivo) ------

const saldos = []
let idSaldo = 0
const carteraPorCliente = new Map()

for (let mes = 1; mes <= 12; mes++) {
  const cierre = `2025-${String(mes).padStart(2, '0')}-01`

  for (const cliente of clientes) {
    // La cartera arranca en algo y se mueve mes a mes: si fuera constante, el
    // reto de evolucion del saldo no mostraria nada.
    const previo = carteraPorCliente.get(cliente[0]) ?? decimal(r, 3000, 60000, 0)
    const variacion = decimal(r, -0.12, 0.16, 3)
    const saldo = Math.max(0, Number((previo * (1 + variacion)).toFixed(2)))
    carteraPorCliente.set(cliente[0], saldo)

    if (saldo === 0) continue // cliente que ya cancelo: no hay fila ese mes

    idSaldo++
    const mora = pesado(r, [[0, 88], [1, 12]])
    saldos.push([
      idSaldo,
      idTiempo(cierre),
      cliente[0],
      cliente[5],
      saldo,
      mora ? Number((saldo * decimal(r, 0.05, 0.4, 3)).toFixed(2)) : 0,
      mora ? entre(r, 1, 90) : 0,
    ])
  }
}

const seed = `
-- ==========================================================================
-- BANCOSOL  ·  Microfinanzas, La Paz
-- Primer banco de microfinanzas de Bolivia (1992), con sede en La Paz.
--
-- DOS HECHOS A PROPOSITO:
--   hecho_desembolso → aditivo: el monto se suma en cualquier corte.
--   hecho_saldo_mes  → SEMI-ADITIVO: el saldo se suma entre clientes, pero
--                      NO entre meses. Sumar enero + febrero no da nada real.
-- ==========================================================================

${dimTiempo('2025-01-01', '2025-12-31')}

CREATE TABLE dim_agencia (
  id_agencia INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  zona TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  anio_apertura INTEGER NOT NULL
);

CREATE TABLE dim_producto (
  id_producto INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  familia TEXT NOT NULL,
  tasa_anual REAL NOT NULL,
  monto_minimo REAL NOT NULL,
  monto_maximo REAL NOT NULL
);

CREATE TABLE dim_cliente (
  id_cliente INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  sexo TEXT NOT NULL,
  rubro TEXT NOT NULL,
  antiguedad TEXT NOT NULL,
  id_agencia INTEGER NOT NULL REFERENCES dim_agencia(id_agencia)
);

-- Grain: un desembolso. Metrica ADITIVA.
CREATE TABLE hecho_desembolso (
  id_desembolso INTEGER PRIMARY KEY,
  id_tiempo INTEGER NOT NULL REFERENCES dim_tiempo(id_tiempo),
  id_cliente INTEGER NOT NULL REFERENCES dim_cliente(id_cliente),
  id_agencia INTEGER NOT NULL REFERENCES dim_agencia(id_agencia),
  id_producto INTEGER NOT NULL REFERENCES dim_producto(id_producto),
  monto REAL NOT NULL,
  plazo_meses INTEGER NOT NULL,
  tasa REAL NOT NULL
);

-- Grain: un cliente al cierre de cada mes. Metrica SEMI-ADITIVA.
CREATE TABLE hecho_saldo_mes (
  id_saldo INTEGER PRIMARY KEY,
  id_tiempo INTEGER NOT NULL REFERENCES dim_tiempo(id_tiempo),
  id_cliente INTEGER NOT NULL REFERENCES dim_cliente(id_cliente),
  id_agencia INTEGER NOT NULL REFERENCES dim_agencia(id_agencia),
  saldo_cartera REAL NOT NULL,
  saldo_mora REAL NOT NULL,
  dias_atraso INTEGER NOT NULL
);

${insert('dim_agencia', ['id_agencia', 'nombre', 'zona', 'ciudad', 'anio_apertura'], agencias)}

${insert('dim_producto', ['id_producto', 'nombre', 'familia', 'tasa_anual', 'monto_minimo', 'monto_maximo'], productos)}

${insert('dim_cliente', ['id_cliente', 'nombre', 'sexo', 'rubro', 'antiguedad', 'id_agencia'], clientes)}

${insert('hecho_desembolso',
  ['id_desembolso', 'id_tiempo', 'id_cliente', 'id_agencia', 'id_producto', 'monto', 'plazo_meses', 'tasa'],
  desembolsos, 40)}

${insert('hecho_saldo_mes',
  ['id_saldo', 'id_tiempo', 'id_cliente', 'id_agencia', 'saldo_cartera', 'saldo_mora', 'dias_atraso'],
  saldos, 40)}
`.trim()

const tablas = [
  { nombre: 'hecho_desembolso', rol: 'hecho', x: 300, y: 420, columnas: [
    { nombre: 'id_desembolso', tipo: 'INTEGER', pk: true },
    { nombre: 'id_tiempo', tipo: 'INTEGER', fk: 'dim_tiempo' },
    { nombre: 'id_cliente', tipo: 'INTEGER', fk: 'dim_cliente' },
    { nombre: 'id_agencia', tipo: 'INTEGER', fk: 'dim_agencia' },
    { nombre: 'id_producto', tipo: 'INTEGER', fk: 'dim_producto' },
    { nombre: 'monto', tipo: 'REAL', metrica: true },
    { nombre: 'plazo_meses', tipo: 'INTEGER' },
    { nombre: 'tasa', tipo: 'REAL' },
  ] },
  { nombre: 'hecho_saldo_mes', rol: 'hecho', x: 760, y: 420, columnas: [
    { nombre: 'id_saldo', tipo: 'INTEGER', pk: true },
    { nombre: 'id_tiempo', tipo: 'INTEGER', fk: 'dim_tiempo' },
    { nombre: 'id_cliente', tipo: 'INTEGER' },
    { nombre: 'id_agencia', tipo: 'INTEGER' },
    { nombre: 'saldo_cartera', tipo: 'REAL', metrica: true },
    { nombre: 'saldo_mora', tipo: 'REAL', metrica: true },
    { nombre: 'dias_atraso', tipo: 'INTEGER' },
  ] },
  { nombre: 'dim_tiempo', rol: 'dimension', x: 530, y: 110, columnas: [
    { nombre: 'id_tiempo', tipo: 'INTEGER', pk: true },
    { nombre: 'fecha', tipo: 'TEXT' },
    { nombre: 'anio', tipo: 'INTEGER' },
    { nombre: 'mes', tipo: 'INTEGER' },
    { nombre: 'nombre_mes', tipo: 'TEXT' },
    { nombre: 'trimestre', tipo: 'INTEGER' },
    { nombre: 'dia_semana', tipo: 'TEXT' },
    { nombre: 'es_fin_semana', tipo: 'INTEGER' },
  ] },
  { nombre: 'dim_cliente', rol: 'dimension', x: 130, y: 720, columnas: [
    { nombre: 'id_cliente', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'sexo', tipo: 'TEXT' },
    { nombre: 'rubro', tipo: 'TEXT' },
    { nombre: 'antiguedad', tipo: 'TEXT' },
    { nombre: 'id_agencia', tipo: 'INTEGER', fk: 'dim_agencia' },
  ] },
  { nombre: 'dim_agencia', rol: 'dimension', x: 530, y: 730, columnas: [
    { nombre: 'id_agencia', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'zona', tipo: 'TEXT' },
    { nombre: 'ciudad', tipo: 'TEXT' },
    { nombre: 'anio_apertura', tipo: 'INTEGER' },
  ] },
  { nombre: 'dim_producto', rol: 'dimension', x: 930, y: 730, columnas: [
    { nombre: 'id_producto', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'familia', tipo: 'TEXT' },
    { nombre: 'tasa_anual', tipo: 'REAL' },
    { nombre: 'monto_minimo', tipo: 'REAL' },
    { nombre: 'monto_maximo', tipo: 'REAL' },
  ] },
]

const retos = [
  {
    id: 'bso-01', bloque: 'navegar', concept: 'JOIN + SUM',
    title: 'Colocación por producto',
    prompt: 'Monto total desembolsado por producto en el año. Muestra nombre del producto y monto, de mayor a menor.',
    hint: 'El monto del desembolso es aditivo puro: se suma sin cuidados.',
    starter: 'SELECT p.nombre, ...\nFROM hecho_desembolso d\nJOIN dim_producto p ON ...;',
    expectedSql: `SELECT p.nombre, ROUND(SUM(d.monto), 2) AS monto
FROM hecho_desembolso d JOIN dim_producto p ON d.id_producto = p.id_producto
GROUP BY p.nombre ORDER BY monto DESC;`,
    orderMatters: true,
  },
  {
    id: 'bso-02', bloque: 'navegar', concept: 'Dimensión encadenada',
    title: 'Del cliente a su agencia',
    prompt: 'Cantidad de clientes por ciudad de la agencia a la que pertenecen. Columnas: ciudad, clientes.',
    hint: 'dim_cliente apunta a dim_agencia: la ciudad no está en el cliente, está a un salto.',
    starter: 'SELECT a.ciudad, COUNT(*) AS clientes\nFROM dim_cliente c\nJOIN dim_agencia a ON ...;',
    expectedSql: `SELECT a.ciudad, COUNT(*) AS clientes
FROM dim_cliente c JOIN dim_agencia a ON c.id_agencia = a.id_agencia
GROUP BY a.ciudad ORDER BY clientes DESC;`,
    orderMatters: true,
  },
  {
    id: 'bso-03', bloque: 'aditividad', concept: 'Métrica aditiva',
    title: 'Lo que sí se suma',
    prompt: 'Monto desembolsado por mes. Columnas: mes, monto. En orden de mes.',
    hint: 'Sumar desembolsos de meses distintos SÍ tiene sentido: es el total colocado en el período.',
    starter: 'SELECT t.mes, ROUND(SUM(d.monto), 2) AS monto\nFROM hecho_desembolso d\nJOIN dim_tiempo t ON ...;',
    expectedSql: `SELECT t.mes, ROUND(SUM(d.monto), 2) AS monto
FROM hecho_desembolso d JOIN dim_tiempo t ON d.id_tiempo = t.id_tiempo
GROUP BY t.mes ORDER BY t.mes;`,
    orderMatters: true,
  },
  {
    id: 'bso-04', bloque: 'aditividad', concept: 'Semi-aditivo entre clientes',
    title: 'El saldo sí se suma entre clientes',
    prompt: 'Saldo de cartera del cierre de diciembre (mes 12), sumado por agencia. Columnas: nombre de agencia y saldo, de mayor a menor.',
    hint: 'Dentro de UN mes el saldo se suma sin problema: son clientes distintos en el mismo instante.',
    starter: 'SELECT a.nombre, ROUND(SUM(s.saldo_cartera), 2) AS saldo\nFROM hecho_saldo_mes s\nJOIN ...\nWHERE t.mes = 12\n...;',
    expectedSql: `SELECT a.nombre, ROUND(SUM(s.saldo_cartera), 2) AS saldo
FROM hecho_saldo_mes s
JOIN dim_agencia a ON s.id_agencia = a.id_agencia
JOIN dim_tiempo t ON s.id_tiempo = t.id_tiempo
WHERE t.mes = 12
GROUP BY a.nombre ORDER BY saldo DESC;`,
    orderMatters: true,
  },
  {
    id: 'bso-05', bloque: 'aditividad', concept: 'Semi-aditivo en el tiempo',
    title: 'El saldo NO se suma entre meses',
    prompt: 'Saldo de cartera al cierre de CADA mes. Columnas: mes, saldo. En orden de mes. Fíjate que cada fila es una foto, no un acumulado.',
    hint: 'Agrupa por mes y suma dentro de cada mes. Lo que NO hay que hacer es sumar los doce meses entre sí.',
    starter: 'SELECT t.mes, ROUND(SUM(s.saldo_cartera), 2) AS saldo\nFROM hecho_saldo_mes s\nJOIN dim_tiempo t ON ...\nGROUP BY ...;',
    expectedSql: `SELECT t.mes, ROUND(SUM(s.saldo_cartera), 2) AS saldo
FROM hecho_saldo_mes s JOIN dim_tiempo t ON s.id_tiempo = t.id_tiempo
GROUP BY t.mes ORDER BY t.mes;`,
    orderMatters: true,
    trampa: 'SUM(saldo_cartera) SIN agrupar por mes suma las doce fotos y da una cifra gigante que no existe en ningun balance. Ese es el error clasico con metricas semi-aditivas.',
  },
  {
    id: 'bso-06', bloque: 'aditividad', concept: 'Cierre del período',
    title: 'La cartera del año es la del último mes',
    prompt: 'La cartera total del banco al cierre del año, en una sola fila con una sola columna llamada cartera_final.',
    hint: 'Para una métrica semi-aditiva, el total del año NO es la suma de los meses: es el valor del último mes.',
    starter: 'SELECT ROUND(SUM(s.saldo_cartera), 2) AS cartera_final\nFROM hecho_saldo_mes s\nJOIN dim_tiempo t ON ...\nWHERE t.mes = ( ... );',
    expectedSql: `SELECT ROUND(SUM(s.saldo_cartera), 2) AS cartera_final
FROM hecho_saldo_mes s JOIN dim_tiempo t ON s.id_tiempo = t.id_tiempo
WHERE t.mes = (SELECT MAX(t2.mes) FROM hecho_saldo_mes s2 JOIN dim_tiempo t2 ON s2.id_tiempo = t2.id_tiempo);`,
    orderMatters: false,
  },
  {
    id: 'bso-07', bloque: 'aditividad', concept: 'Promedio de saldos',
    title: 'Saldo promedio del año',
    prompt: 'Saldo promedio mensual de la cartera del banco, en una fila con una columna llamada saldo_promedio, redondeado a 2.',
    hint: 'Primero el saldo de cada mes, después el promedio de esos doce números. Es la otra forma válida de resumir un semi-aditivo.',
    starter: 'SELECT ROUND(AVG(saldo), 2) AS saldo_promedio\nFROM (\n  SELECT t.mes, SUM(...) AS saldo\n  FROM ... GROUP BY t.mes\n);',
    expectedSql: `SELECT ROUND(AVG(saldo), 2) AS saldo_promedio FROM (
  SELECT t.mes AS mes, SUM(s.saldo_cartera) AS saldo
  FROM hecho_saldo_mes s JOIN dim_tiempo t ON s.id_tiempo = t.id_tiempo
  GROUP BY t.mes
);`,
    orderMatters: false,
  },
  {
    id: 'bso-08', bloque: 'slice', concept: 'Filtro por atributo',
    title: 'Solo microcrédito',
    prompt: 'Cantidad y monto de desembolsos de "Microcredito individual", por rubro del cliente. Columnas: rubro, operaciones, monto. De mayor a menor monto.',
    hint: 'El nombre del producto está en dim_producto y el rubro en dim_cliente: dos JOIN desde el hecho.',
    starter: "SELECT c.rubro, COUNT(*) AS operaciones, ...\nFROM hecho_desembolso d\nJOIN ...\nWHERE p.nombre = 'Microcredito individual'\n...;",
    expectedSql: `SELECT c.rubro, COUNT(*) AS operaciones, ROUND(SUM(d.monto), 2) AS monto
FROM hecho_desembolso d
JOIN dim_cliente c ON d.id_cliente = c.id_cliente
JOIN dim_producto p ON d.id_producto = p.id_producto
WHERE p.nombre = 'Microcredito individual'
GROUP BY c.rubro ORDER BY monto DESC;`,
    orderMatters: true,
  },
  {
    id: 'bso-09', bloque: 'tiempo', concept: 'Variación mensual',
    title: 'Cómo se movió la cartera',
    prompt: 'Saldo de cartera por mes junto al saldo del mes anterior. Columnas: mes, saldo, saldo_anterior. El primer mes lleva NULL.',
    hint: 'LAG(saldo) OVER (ORDER BY mes) trae el valor de la fila anterior.',
    starter: 'SELECT mes, saldo, LAG(saldo) OVER (ORDER BY ...) AS saldo_anterior\nFROM ( ... );',
    expectedSql: `SELECT mes, saldo, LAG(saldo) OVER (ORDER BY mes) AS saldo_anterior FROM (
  SELECT t.mes AS mes, ROUND(SUM(s.saldo_cartera), 2) AS saldo
  FROM hecho_saldo_mes s JOIN dim_tiempo t ON s.id_tiempo = t.id_tiempo
  GROUP BY t.mes
) ORDER BY mes;`,
    orderMatters: true,
  },
  {
    id: 'bso-10', bloque: 'ventanas', concept: 'Participación',
    title: 'Peso de cada agencia en la cartera',
    prompt: 'Al cierre de diciembre: nombre de agencia, saldo y qué porcentaje del total representa, redondeado a 2. De mayor a menor.',
    hint: 'SUM(...) OVER () da el total contra el que dividir, sin repetir la consulta.',
    starter: 'SELECT nombre, saldo,\n  ROUND(saldo * 100.0 / SUM(saldo) OVER (), 2) AS participacion\nFROM ( ... );',
    expectedSql: `SELECT nombre, saldo, ROUND(saldo * 100.0 / SUM(saldo) OVER (), 2) AS participacion FROM (
  SELECT a.nombre AS nombre, ROUND(SUM(s.saldo_cartera), 2) AS saldo
  FROM hecho_saldo_mes s
  JOIN dim_agencia a ON s.id_agencia = a.id_agencia
  JOIN dim_tiempo t ON s.id_tiempo = t.id_tiempo
  WHERE t.mes = 12 GROUP BY a.nombre
) ORDER BY saldo DESC;`,
    orderMatters: true,
  },
  {
    id: 'bso-11', bloque: 'drill-across', concept: 'Dos hechos, una respuesta',
    title: 'Colocación contra cartera',
    prompt: 'Por agencia: monto desembolsado en todo el año y saldo de cartera al cierre de diciembre. Columnas: agencia, desembolsado, cartera. Ordena por agencia.',
    hint: 'Los dos hechos tienen grain distinto: NO se pueden unir con un JOIN directo. Resume cada uno por separado y recién después únelos por agencia.',
    starter: 'SELECT a.nombre AS agencia, ...\nFROM dim_agencia a\nLEFT JOIN ( ... ) col ON ...\nLEFT JOIN ( ... ) car ON ...;',
    expectedSql: `SELECT a.nombre AS agencia,
  ROUND(COALESCE(col.monto, 0), 2) AS desembolsado,
  ROUND(COALESCE(car.saldo, 0), 2) AS cartera
FROM dim_agencia a
LEFT JOIN (
  SELECT id_agencia, SUM(monto) AS monto FROM hecho_desembolso GROUP BY id_agencia
) col ON col.id_agencia = a.id_agencia
LEFT JOIN (
  SELECT s.id_agencia AS id_agencia, SUM(s.saldo_cartera) AS saldo
  FROM hecho_saldo_mes s JOIN dim_tiempo t ON s.id_tiempo = t.id_tiempo
  WHERE t.mes = 12 GROUP BY s.id_agencia
) car ON car.id_agencia = a.id_agencia
ORDER BY a.nombre;`,
    orderMatters: true,
    trampa: 'Unir los dos hechos con un JOIN directo multiplica las filas: cada desembolso se cruza con cada foto mensual del cliente. Es el "fan trap" y el total se infla varias veces.',
  },
  {
    id: 'bso-12', bloque: 'trampas', concept: 'Ratio sobre el corte correcto',
    title: 'La mora se mide contra su propio mes',
    prompt: 'Índice de mora por mes: saldo_mora sobre saldo_cartera por cien, redondeado a 2. Columnas: mes, indice_mora. En orden de mes.',
    hint: 'Suma numerador y denominador DENTRO de cada mes y recién ahí divide.',
    starter: 'SELECT t.mes,\n  ROUND(SUM(s.saldo_mora) * 100.0 / SUM(s.saldo_cartera), 2) AS indice_mora\nFROM ...;',
    expectedSql: `SELECT t.mes, ROUND(SUM(s.saldo_mora) * 100.0 / SUM(s.saldo_cartera), 2) AS indice_mora
FROM hecho_saldo_mes s JOIN dim_tiempo t ON s.id_tiempo = t.id_tiempo
GROUP BY t.mes ORDER BY t.mes;`,
    orderMatters: true,
    trampa: 'AVG(saldo_mora / saldo_cartera) promedia el ratio de cada cliente y le da el mismo peso a uno con Bs 500 que a uno con Bs 400.000. El indice real pondera por saldo.',
  },
]

const dataset = {
  id: 'bancosol',
  nombre: 'BancoSol',
  subtitulo: 'Microfinanzas · La Paz',
  dominio: 'Finanzas',
  tipo: 'estrella',
  concepto: 'Hechos semi-aditivos, el concepto que más se resiste. Trae dos hechos con las mismas dimensiones: los desembolsos se suman en cualquier corte, pero el saldo de cartera NO se suma entre meses. También es la base para practicar drill-across entre dos hechos de distinto grain.',
  nota: 'BancoSol es el primer banco de microfinanzas de Bolivia, fundado en 1992 y con sede en La Paz. Las zonas de las agencias y la familia de productos son reales. Los clientes, montos y saldos son una muestra didáctica: no corresponden a la cartera de la entidad.',
  tablas,
  retos,
}

const archivo = `${encabezado('BancoSol · Microfinanzas en La Paz', 'bancosol.mjs')}

export const bancosol = ${JSON.stringify(dataset, null, 2).replace(/"([a-zA-Z_][a-zA-Z0-9_]*)":/g, '$1:')}

bancosol.seedSql = String.raw\`
${seed.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}
\`
`

writeFileSync(SALIDA, archivo)
console.log(`bancosol.js escrito · ${desembolsos.length} desembolsos · ${saldos.length} saldos · ${(archivo.length / 1024).toFixed(0)} KB`)
