/*
 * Genera front/src/playground/datasets/entel.js
 *
 * Entel enseña por qué existen las TABLAS AGREGADAS.
 *
 * La base trae el mismo dato dos veces:
 *   hecho_consumo_dia    → grain fino: una linea por SIM y por dia.
 *   agregado_consumo_mes → el mismo dato ya resumido por mes y plan.
 *
 * Las dos responden lo mismo, pero la agregada lee una fraccion de las filas.
 * El ejercicio es comprobar que dan IGUAL y entender cuando conviene cada una.
 */
import { writeFileSync } from 'fs'
import { rng, entre, decimal, pesado, insert, dimTiempo, idTiempo, fechas, encabezado } from './lib.mjs'

const SALIDA = new URL('../../front/src/playground/datasets/entel.js', import.meta.url)
const r = rng(19650101)

const planes = [
  [1, 'Prepago Basico', 'Prepago', 0, 0],
  [2, 'Prepago Datos', 'Prepago', 0, 2],
  [3, 'Postpago 60', 'Postpago', 60, 5],
  [4, 'Postpago 120', 'Postpago', 120, 12],
  [5, 'Postpago Ilimitado', 'Postpago', 300, 40],
  [6, 'Plan Corporativo', 'Corporativo', 250, 60],
]

// Departamentos donde la operadora estatal tiene presencia nacional.
const regiones = [
  [1, 'La Paz', 'Occidente', 4058],
  [2, 'El Alto', 'Occidente', 4150],
  [3, 'Cochabamba', 'Valles', 2558],
  [4, 'Santa Cruz', 'Oriente', 416],
  [5, 'Oruro', 'Occidente', 3735],
  [6, 'Potosi', 'Occidente', 4067],
  [7, 'Sucre', 'Valles', 2810],
  [8, 'Tarija', 'Valles', 1854],
]

const tecnologias = [
  [1, '2G', 2000],
  [2, '3G', 2008],
  [3, '4G LTE', 2014],
  [4, '5G', 2023],
]

// 120 líneas: suficiente para que el grain fino sea grande y el agregado se note.
const lineas = []
for (let i = 1; i <= 120; i++) {
  lineas.push([
    i,
    `7${String(1000000 + i * 7919).slice(0, 7)}`,
    Number(pesado(r, [['1', 6], ['2', 5], ['3', 4], ['4', 3], ['5', 2], ['6', 1]])),
    entre(r, 1, regiones.length),
    Number(pesado(r, [['2', 2], ['3', 6], ['4', 2]])),
    entre(r, 2018, 2025),
  ])
}

// --- Grain fino: una linea por SIM y por dia ------------------------------
// Solo un trimestre, porque a grain diario 120 lineas x 365 dias serian 43.800
// filas y el archivo se iria a varios MB.

const dias = fechas('2025-01-01', '2025-03-31')
const consumo = []
let idConsumo = 0

for (const fecha of dias) {
  const d = new Date(fecha + 'T00:00:00Z')
  const finDeSemana = d.getUTCDay() === 0 || d.getUTCDay() === 6

  for (const linea of lineas) {
    // No toda linea consume todos los dias.
    if (r() > 0.55) continue

    idConsumo++
    const plan = planes[linea[2] - 1]
    const factor = finDeSemana ? 1.35 : 1
    const datos = decimal(r, 0.05, 2.4 * (1 + plan[4] / 20) * factor, 3)
    const minutos = entre(r, 0, Math.round(18 * factor))
    const sms = entre(r, 0, 4)
    const recarga = plan[1] === 'Prepago' ? decimal(r, 0, 20, 2) : 0

    consumo.push([idConsumo, idTiempo(fecha), linea[0], linea[2], linea[3], linea[4], datos, minutos, sms, recarga])
  }
}

// --- Agregado: el MISMO dato resumido por mes, plan y region --------------

const clave = new Map()
for (const fila of consumo) {
  const [, idTiempoFila, , idPlan, idRegion, , datos, minutos, sms, recarga] = fila
  const mes = Math.floor((idTiempoFila % 10000) / 100)
  const k = `${mes}|${idPlan}|${idRegion}`
  const acc = clave.get(k) ?? { mes, idPlan, idRegion, lineas: new Set(), datos: 0, minutos: 0, sms: 0, recarga: 0, dias: 0 }
  acc.lineas.add(fila[2])
  acc.datos += datos
  acc.minutos += minutos
  acc.sms += sms
  acc.recarga += recarga
  acc.dias++
  clave.set(k, acc)
}

const agregado = [...clave.values()].map((acc, i) => [
  i + 1, acc.mes, acc.idPlan, acc.idRegion, acc.lineas.size, acc.dias,
  Number(acc.datos.toFixed(3)), acc.minutos, acc.sms, Number(acc.recarga.toFixed(2)),
])

const seed = `
-- ==========================================================================
-- ENTEL  ·  Telecomunicaciones, Bolivia
--
-- EL MISMO DATO, DOS VECES:
--   hecho_consumo_dia    → grain fino: una fila por SIM y por dia.
--   agregado_consumo_mes → ya resumido por mes, plan y region.
--
-- Las dos tablas responden las mismas preguntas de alto nivel y dan el MISMO
-- numero, pero la agregada lee una fraccion de las filas. Cuando la pregunta
-- baja al dia o a la linea individual, la agregada ya no sirve.
-- ==========================================================================

${dimTiempo('2025-01-01', '2025-03-31')}

CREATE TABLE dim_plan (
  id_plan INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  modalidad TEXT NOT NULL,
  cargo_fijo REAL NOT NULL,
  datos_incluidos_gb REAL NOT NULL
);

CREATE TABLE dim_region (
  id_region INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  macroregion TEXT NOT NULL,
  altura_msnm INTEGER NOT NULL
);

CREATE TABLE dim_tecnologia (
  id_tecnologia INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  anio_despliegue INTEGER NOT NULL
);

CREATE TABLE dim_linea (
  id_linea INTEGER PRIMARY KEY,
  numero TEXT NOT NULL,
  id_plan INTEGER NOT NULL REFERENCES dim_plan(id_plan),
  id_region INTEGER NOT NULL REFERENCES dim_region(id_region),
  id_tecnologia INTEGER NOT NULL REFERENCES dim_tecnologia(id_tecnologia),
  anio_alta INTEGER NOT NULL
);

-- Grain fino: una SIM en un dia.
CREATE TABLE hecho_consumo_dia (
  id_consumo INTEGER PRIMARY KEY,
  id_tiempo INTEGER NOT NULL REFERENCES dim_tiempo(id_tiempo),
  id_linea INTEGER NOT NULL REFERENCES dim_linea(id_linea),
  id_plan INTEGER NOT NULL REFERENCES dim_plan(id_plan),
  id_region INTEGER NOT NULL REFERENCES dim_region(id_region),
  id_tecnologia INTEGER NOT NULL REFERENCES dim_tecnologia(id_tecnologia),
  datos_gb REAL NOT NULL,
  minutos INTEGER NOT NULL,
  sms INTEGER NOT NULL,
  recarga REAL NOT NULL
);

-- Grain grueso: un mes, un plan y una region. Precalculado desde el anterior.
CREATE TABLE agregado_consumo_mes (
  id_agregado INTEGER PRIMARY KEY,
  mes INTEGER NOT NULL,
  id_plan INTEGER NOT NULL REFERENCES dim_plan(id_plan),
  id_region INTEGER NOT NULL REFERENCES dim_region(id_region),
  lineas_activas INTEGER NOT NULL,
  dias_con_consumo INTEGER NOT NULL,
  datos_gb REAL NOT NULL,
  minutos INTEGER NOT NULL,
  sms INTEGER NOT NULL,
  recarga REAL NOT NULL
);

${insert('dim_plan', ['id_plan', 'nombre', 'modalidad', 'cargo_fijo', 'datos_incluidos_gb'], planes)}

${insert('dim_region', ['id_region', 'nombre', 'macroregion', 'altura_msnm'], regiones)}

${insert('dim_tecnologia', ['id_tecnologia', 'nombre', 'anio_despliegue'], tecnologias)}

${insert('dim_linea', ['id_linea', 'numero', 'id_plan', 'id_region', 'id_tecnologia', 'anio_alta'], lineas, 20)}

${insert('hecho_consumo_dia',
  ['id_consumo', 'id_tiempo', 'id_linea', 'id_plan', 'id_region', 'id_tecnologia', 'datos_gb', 'minutos', 'sms', 'recarga'],
  consumo, 50)}

${insert('agregado_consumo_mes',
  ['id_agregado', 'mes', 'id_plan', 'id_region', 'lineas_activas', 'dias_con_consumo', 'datos_gb', 'minutos', 'sms', 'recarga'],
  agregado, 20)}
`.trim()

const tablas = [
  { nombre: 'hecho_consumo_dia', rol: 'hecho', x: 300, y: 430, columnas: [
    { nombre: 'id_consumo', tipo: 'INTEGER', pk: true },
    { nombre: 'id_tiempo', tipo: 'INTEGER', fk: 'dim_tiempo' },
    { nombre: 'id_linea', tipo: 'INTEGER', fk: 'dim_linea' },
    { nombre: 'id_plan', tipo: 'INTEGER', fk: 'dim_plan' },
    { nombre: 'id_region', tipo: 'INTEGER', fk: 'dim_region' },
    { nombre: 'id_tecnologia', tipo: 'INTEGER', fk: 'dim_tecnologia' },
    { nombre: 'datos_gb', tipo: 'REAL', metrica: true },
    { nombre: 'minutos', tipo: 'INTEGER', metrica: true },
    { nombre: 'sms', tipo: 'INTEGER', metrica: true },
    { nombre: 'recarga', tipo: 'REAL', metrica: true },
  ] },
  { nombre: 'agregado_consumo_mes', rol: 'hecho', x: 790, y: 430, columnas: [
    { nombre: 'id_agregado', tipo: 'INTEGER', pk: true },
    { nombre: 'mes', tipo: 'INTEGER' },
    { nombre: 'id_plan', tipo: 'INTEGER' },
    { nombre: 'id_region', tipo: 'INTEGER' },
    { nombre: 'lineas_activas', tipo: 'INTEGER', metrica: true },
    { nombre: 'dias_con_consumo', tipo: 'INTEGER', metrica: true },
    { nombre: 'datos_gb', tipo: 'REAL', metrica: true },
    { nombre: 'minutos', tipo: 'INTEGER', metrica: true },
    { nombre: 'sms', tipo: 'INTEGER', metrica: true },
    { nombre: 'recarga', tipo: 'REAL', metrica: true },
  ] },
  { nombre: 'dim_tiempo', rol: 'dimension', x: 545, y: 110, columnas: [
    { nombre: 'id_tiempo', tipo: 'INTEGER', pk: true },
    { nombre: 'fecha', tipo: 'TEXT' },
    { nombre: 'anio', tipo: 'INTEGER' },
    { nombre: 'mes', tipo: 'INTEGER' },
    { nombre: 'nombre_mes', tipo: 'TEXT' },
    { nombre: 'trimestre', tipo: 'INTEGER' },
    { nombre: 'dia_semana', tipo: 'TEXT' },
    { nombre: 'es_fin_semana', tipo: 'INTEGER' },
  ] },
  { nombre: 'dim_linea', rol: 'dimension', x: 120, y: 740, columnas: [
    { nombre: 'id_linea', tipo: 'INTEGER', pk: true },
    { nombre: 'numero', tipo: 'TEXT' },
    { nombre: 'id_plan', tipo: 'INTEGER', fk: 'dim_plan' },
    { nombre: 'id_region', tipo: 'INTEGER', fk: 'dim_region' },
    { nombre: 'id_tecnologia', tipo: 'INTEGER', fk: 'dim_tecnologia' },
    { nombre: 'anio_alta', tipo: 'INTEGER' },
  ] },
  { nombre: 'dim_plan', rol: 'dimension', x: 520, y: 750, columnas: [
    { nombre: 'id_plan', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'modalidad', tipo: 'TEXT' },
    { nombre: 'cargo_fijo', tipo: 'REAL' },
    { nombre: 'datos_incluidos_gb', tipo: 'REAL' },
  ] },
  { nombre: 'dim_region', rol: 'dimension', x: 900, y: 750, columnas: [
    { nombre: 'id_region', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'macroregion', tipo: 'TEXT' },
    { nombre: 'altura_msnm', tipo: 'INTEGER' },
  ] },
  { nombre: 'dim_tecnologia', rol: 'dimension', x: 900, y: 130, columnas: [
    { nombre: 'id_tecnologia', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'anio_despliegue', tipo: 'INTEGER' },
  ] },
]

const retos = [
  {
    id: 'ent-01', bloque: 'navegar', concept: 'Grain fino',
    title: 'Consumo por plan',
    prompt: 'Datos consumidos (GB) por plan, usando la tabla de grain fino. Columnas: plan, datos_gb redondeado a 2. De mayor a menor.',
    hint: 'hecho_consumo_dia tiene una fila por SIM y día: hay que sumar muchas.',
    starter: 'SELECT pl.nombre AS plan, ...\nFROM hecho_consumo_dia c\nJOIN dim_plan pl ON ...;',
    expectedSql: `SELECT pl.nombre AS plan, ROUND((SUM(c.datos_gb))::numeric, 2) AS datos_gb
FROM hecho_consumo_dia c JOIN dim_plan pl ON c.id_plan = pl.id_plan
GROUP BY pl.nombre ORDER BY datos_gb DESC;`,
    orderMatters: true,
  },
  {
    id: 'ent-02', bloque: 'granularidad', concept: 'Tabla agregada',
    title: 'La misma respuesta, desde el agregado',
    prompt: 'El mismo consumo por plan, pero leyendo agregado_consumo_mes. Columnas: plan, datos_gb redondeado a 2. De mayor a menor. Compara el resultado con el reto anterior.',
    hint: 'El agregado ya trae los GB sumados: solo hay que agrupar por plan.',
    starter: 'SELECT pl.nombre AS plan, ...\nFROM agregado_consumo_mes a\nJOIN dim_plan pl ON ...;',
    expectedSql: `SELECT pl.nombre AS plan, ROUND((SUM(a.datos_gb))::numeric, 2) AS datos_gb
FROM agregado_consumo_mes a JOIN dim_plan pl ON a.id_plan = pl.id_plan
GROUP BY pl.nombre ORDER BY datos_gb DESC;`,
    orderMatters: true,
    trampa: 'Los dos retos dan el MISMO numero. Esa es la idea de una tabla agregada: no cambia la respuesta, cambia cuanto hay que leer para obtenerla.',
  },
  {
    id: 'ent-03', bloque: 'granularidad', concept: 'Límite del agregado',
    title: 'Lo que el agregado ya no puede responder',
    prompt: 'Consumo de datos por día de la semana. Columnas: dia_semana, datos_gb redondeado a 2. De mayor a menor.',
    hint: 'El agregado está resumido por MES: perdió el día. Esta pregunta solo la puede responder el grain fino.',
    starter: 'SELECT t.dia_semana, ...\nFROM hecho_consumo_dia c\nJOIN dim_tiempo t ON ...;',
    expectedSql: `SELECT t.dia_semana, ROUND((SUM(c.datos_gb))::numeric, 2) AS datos_gb
FROM hecho_consumo_dia c JOIN dim_tiempo t ON c.id_tiempo = t.id_tiempo
GROUP BY t.dia_semana ORDER BY datos_gb DESC;`,
    orderMatters: true,
  },
  {
    id: 'ent-04', bloque: 'granularidad', concept: 'Costo de cada tabla',
    title: 'Cuántas filas lee cada una',
    prompt: 'Cantidad de filas de cada tabla, en dos columnas llamadas filas_detalle y filas_agregado.',
    hint: 'Dos subconsultas con COUNT(*) en el mismo SELECT.',
    starter: 'SELECT\n  (SELECT COUNT(*) FROM ...) AS filas_detalle,\n  (SELECT COUNT(*) FROM ...) AS filas_agregado;',
    expectedSql: `SELECT
  (SELECT COUNT(*) FROM hecho_consumo_dia) AS filas_detalle,
  (SELECT COUNT(*) FROM agregado_consumo_mes) AS filas_agregado;`,
    orderMatters: false,
  },
  {
    id: 'ent-05', bloque: 'slice', concept: 'Filtro por dimensión',
    title: 'Solo La Paz y El Alto',
    prompt: 'Consumo de datos por región de la macroregión Occidente. Columnas: region, datos_gb redondeado a 2. De mayor a menor.',
    hint: 'La macroregión es un atributo de dim_region.',
    starter: "SELECT rg.nombre AS region, ...\nFROM hecho_consumo_dia c\nJOIN dim_region rg ON ...\nWHERE rg.macroregion = ...;",
    expectedSql: `SELECT rg.nombre AS region, ROUND((SUM(c.datos_gb))::numeric, 2) AS datos_gb
FROM hecho_consumo_dia c JOIN dim_region rg ON c.id_region = rg.id_region
WHERE rg.macroregion = 'Occidente'
GROUP BY rg.nombre ORDER BY datos_gb DESC;`,
    orderMatters: true,
  },
  {
    id: 'ent-06', bloque: 'slice', concept: 'Cruce de dimensiones',
    title: 'Tecnología por modalidad',
    prompt: 'Cantidad de líneas por tecnología y modalidad de plan. Columnas: tecnologia, modalidad, lineas. Ordena por tecnología y modalidad.',
    hint: 'Esta sale solo de las dimensiones: dim_linea ya tiene las dos FK.',
    starter: 'SELECT te.nombre AS tecnologia, pl.modalidad, COUNT(*) AS lineas\nFROM dim_linea l\nJOIN ...;',
    expectedSql: `SELECT te.nombre AS tecnologia, pl.modalidad, COUNT(*) AS lineas
FROM dim_linea l
JOIN dim_tecnologia te ON l.id_tecnologia = te.id_tecnologia
JOIN dim_plan pl ON l.id_plan = pl.id_plan
GROUP BY te.nombre, pl.modalidad ORDER BY te.nombre, pl.modalidad;`,
    orderMatters: true,
  },
  {
    id: 'ent-07', bloque: 'aditividad', concept: 'Conteo distinto',
    title: 'Líneas activas, no filas',
    prompt: 'Cuántas líneas DISTINTAS tuvieron consumo en cada región. Columnas: region, lineas. De mayor a menor.',
    hint: 'Una misma línea aparece muchos días. COUNT(*) cuenta días de consumo, no líneas.',
    starter: 'SELECT rg.nombre AS region, COUNT(...) AS lineas\nFROM hecho_consumo_dia c\nJOIN dim_region rg ON ...;',
    expectedSql: `SELECT rg.nombre AS region, COUNT(DISTINCT c.id_linea) AS lineas
FROM hecho_consumo_dia c JOIN dim_region rg ON c.id_region = rg.id_region
GROUP BY rg.nombre ORDER BY lineas DESC, rg.nombre;`,
    orderMatters: true,
    trampa: 'COUNT(*) da miles y parece un parque de lineas enorme, pero esta contando dias de consumo.',
  },
  {
    id: 'ent-08', bloque: 'aditividad', concept: 'Métrica derivada',
    title: 'Consumo promedio por línea',
    prompt: 'GB promedio por línea en cada plan: total de GB dividido por líneas distintas, redondeado a 2. Columnas: plan, gb_por_linea. De mayor a menor.',
    hint: 'Divide dos agregados, no promedies el consumo diario.',
    starter: 'SELECT pl.nombre AS plan,\n  ROUND((SUM(c.datos_gb) / COUNT(DISTINCT c.id_linea))::numeric, 2) AS gb_por_linea\nFROM ...;',
    expectedSql: `SELECT pl.nombre AS plan, ROUND((SUM(c.datos_gb) / COUNT(DISTINCT c.id_linea))::numeric, 2) AS gb_por_linea
FROM hecho_consumo_dia c JOIN dim_plan pl ON c.id_plan = pl.id_plan
GROUP BY pl.nombre ORDER BY gb_por_linea DESC;`,
    orderMatters: true,
  },
  {
    id: 'ent-09', bloque: 'tiempo', concept: 'Serie mensual',
    title: 'Los tres meses',
    prompt: 'Consumo de datos por mes desde el agregado. Columnas: mes, datos_gb redondeado a 2. En orden de mes.',
    hint: 'El agregado ya tiene la columna mes: no necesita dim_tiempo.',
    starter: 'SELECT mes, ROUND((SUM(datos_gb))::numeric, 2) AS datos_gb\nFROM agregado_consumo_mes\nGROUP BY ...;',
    expectedSql: `SELECT mes, ROUND((SUM(datos_gb))::numeric, 2) AS datos_gb
FROM agregado_consumo_mes GROUP BY mes ORDER BY mes;`,
    orderMatters: true,
  },
  {
    id: 'ent-10', bloque: 'ventanas', concept: 'Participación',
    title: 'Qué región pesa más',
    prompt: 'Por región: GB y su porcentaje del total nacional, redondeado a 2. Columnas: region, datos_gb, participacion. De mayor a menor.',
    hint: 'SUM(...) OVER () da el total nacional.',
    starter: 'SELECT region, datos_gb,\n  ROUND((datos_gb * 100.0 / SUM(datos_gb) OVER ())::numeric, 2) AS participacion\nFROM ( ... );',
    expectedSql: `SELECT region, datos_gb, ROUND((datos_gb * 100.0 / SUM(datos_gb) OVER ())::numeric, 2) AS participacion FROM (
  SELECT rg.nombre AS region, ROUND((SUM(a.datos_gb))::numeric, 2) AS datos_gb
  FROM agregado_consumo_mes a JOIN dim_region rg ON a.id_region = rg.id_region
  GROUP BY rg.nombre
) ORDER BY datos_gb DESC;`,
    orderMatters: true,
  },
  {
    id: 'ent-11', bloque: 'ventanas', concept: 'Ranking por grupo',
    title: 'El plan líder de cada región',
    prompt: 'Para cada región, el plan con más GB. Columnas: region, plan, datos_gb. Ordena por región.',
    hint: 'ROW_NUMBER() OVER (PARTITION BY region ORDER BY datos_gb DESC) y quedarse con el puesto 1.',
    starter: 'SELECT region, plan, datos_gb FROM (\n  SELECT ..., ROW_NUMBER() OVER (PARTITION BY ...) AS puesto\n  FROM ...\n) WHERE puesto = 1;',
    expectedSql: `SELECT region, plan, datos_gb FROM (
  SELECT rg.nombre AS region, pl.nombre AS plan, ROUND((SUM(a.datos_gb))::numeric, 2) AS datos_gb,
    ROW_NUMBER() OVER (PARTITION BY rg.nombre ORDER BY SUM(a.datos_gb) DESC, pl.nombre) AS puesto
  FROM agregado_consumo_mes a
  JOIN dim_region rg ON a.id_region = rg.id_region
  JOIN dim_plan pl ON a.id_plan = pl.id_plan
  GROUP BY rg.nombre, pl.nombre
) WHERE puesto = 1 ORDER BY region;`,
    orderMatters: true,
  },
  {
    id: 'ent-12', bloque: 'comparacion', concept: 'Verificar el agregado',
    title: 'Comprobar que el agregado no miente',
    prompt: 'Compara el total de GB de las dos tablas en una sola fila: columnas detalle, agregado y diferencia, todas redondeadas a 2.',
    hint: 'Dos subconsultas escalares y una resta. Si la diferencia no da cero, el proceso que llena el agregado está roto.',
    starter: 'SELECT\n  ROUND(((SELECT SUM(datos_gb) FROM ...))::numeric, 2) AS detalle,\n  ...;',
    expectedSql: `SELECT
  ROUND(((SELECT SUM(datos_gb) FROM hecho_consumo_dia))::numeric, 2) AS detalle,
  ROUND(((SELECT SUM(datos_gb) FROM agregado_consumo_mes))::numeric, 2) AS agregado,
  ROUND(((SELECT SUM(datos_gb) FROM hecho_consumo_dia) - (SELECT SUM(datos_gb) FROM agregado_consumo_mes))::numeric, 2) AS diferencia;`,
    orderMatters: false,
  },
]

const dataset = {
  id: 'entel',
  nombre: 'Entel',
  subtitulo: 'Telecomunicaciones · Bolivia',
  dominio: 'Telecom',
  tipo: 'estrella',
  concepto: 'Por qué existen las tablas agregadas. La base trae el mismo dato dos veces: al detalle (una fila por SIM y día) y precalculado por mes. Las dos dan el mismo número en las preguntas de alto nivel, pero solo el detalle puede bajar al día. Elegir la tabla correcta es la decisión.',
  nota: 'Entel es la operadora estatal de telecomunicaciones de Bolivia. Los planes, regiones y tecnologías son plausibles y las líneas son inventadas. Ningún número corresponde a la operación real de la empresa.',
  tablas,
  retos,
}

const archivo = `${encabezado('Entel · Telecomunicaciones de Bolivia', 'entel.mjs')}

export const entel = ${JSON.stringify(dataset, null, 2).replace(/"([a-zA-Z_][a-zA-Z0-9_]*)":/g, '$1:')}

entel.seedSql = String.raw\`
${seed.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}
\`
`

writeFileSync(SALIDA, archivo)
console.log(`entel.js escrito · ${consumo.length} filas de detalle · ${agregado.length} de agregado · ${(archivo.length / 1024).toFixed(0)} KB`)
