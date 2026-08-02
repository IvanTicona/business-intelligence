/*
 * Genera front/src/playground/datasets/teleferico.js
 *
 * Mi Teleférico enseña GRAIN DE EVENTO: cada fila del hecho es un viaje, no un
 * resumen. Con eso se puede cortar por hora pico, por línea y por transbordo,
 * cosa que un hecho ya agregado por día no permitiría.
 */
import { writeFileSync } from 'fs'
import { rng, entre, pesado, insert, dimTiempo, idTiempo, fechas, encabezado } from './lib.mjs'

const SALIDA = new URL('../../front/src/playground/datasets/teleferico.js', import.meta.url)
const r = rng(19871115)

// Las diez líneas reales del sistema, con su color como identidad.
const lineas = [
  [1, 'Roja', 2014, 'El Alto Ceja', 'Estacion Central', 2.4],
  [2, 'Amarilla', 2014, 'Ciudad Satelite', 'Libertador', 3.9],
  [3, 'Verde', 2014, 'Libertador', 'Irpavi', 3.7],
  [4, 'Azul', 2017, 'Rio Seco', '16 de Julio', 4.7],
  [5, 'Naranja', 2017, 'Estacion Central', 'Periferica', 2.6],
  [6, 'Blanca', 2018, 'Busch', 'Triangular', 2.9],
  [7, 'Celeste', 2018, 'Libertador', 'Prado', 2.6],
  [8, 'Morada', 2018, 'Faro Murillo', 'Prado', 4.3],
  [9, 'Cafe', 2018, 'Busch', 'Prado', 1.4],
  [10, 'Plateada', 2019, '16 de Julio', 'Faro Murillo', 2.6],
]

// Estaciones reconocibles del sistema, con la ciudad y la altura que marca la
// diferencia entre El Alto y la hoyada.
//
// OJO: una estación de transbordo aparece UNA VEZ POR LÍNEA (Busch y Prado
// están dos veces, con id distinto). No es un error de carga: en el modelo
// dimensional la estación pertenece a una línea, y el mismo andén físico que
// sirve a dos líneas son dos filas. Es un buen ejemplo de que la dimensión
// modela el negocio, no la realidad física.
const estaciones = [
  [1, 'Ceja', 1, 'El Alto', 4050],
  [2, 'Estacion Central', 1, 'La Paz', 3650],
  [3, 'Ciudad Satelite', 2, 'El Alto', 4080],
  [4, 'Buenos Aires', 2, 'La Paz', 3820],
  [5, 'Sopocachi', 2, 'La Paz', 3620],
  [6, 'Libertador', 2, 'La Paz', 3560],
  [7, 'Alto Obrajes', 3, 'La Paz', 3480],
  [8, 'Obrajes', 3, 'La Paz', 3380],
  [9, 'Irpavi', 3, 'La Paz', 3320],
  [10, 'Rio Seco', 4, 'El Alto', 4090],
  [11, 'Plaza La Paz', 4, 'El Alto', 4070],
  [12, '16 de Julio', 4, 'El Alto', 4060],
  [13, 'Periferica', 5, 'La Paz', 3720],
  [14, 'Villarroel', 5, 'La Paz', 3680],
  [15, 'Busch', 6, 'La Paz', 3640],
  [16, 'Triangular', 6, 'La Paz', 3600],
  [17, 'Prado', 7, 'La Paz', 3630],
  [18, 'Faro Murillo', 8, 'El Alto', 4020],
  [19, 'Obelisco', 8, 'La Paz', 3640],
  [20, 'Mercado Rodriguez', 9, 'La Paz', 3660],
  [21, 'Busch', 9, 'La Paz', 3640],
  [22, 'Prado', 9, 'La Paz', 3630],
  [23, '16 de Julio', 10, 'El Alto', 4060],
  [24, 'Faro Murillo', 10, 'El Alto', 4020],
  [25, 'Libertador', 7, 'La Paz', 3560],
]

// Cada línea tiene que tener al menos dos estaciones o el generador elegiría un
// destino inexistente. Mejor fallar acá que producir datos rotos en silencio.
for (const [id, color] of lineas) {
  const propias = estaciones.filter(e => e[2] === id)
  if (propias.length < 2) {
    throw new Error(`La línea ${color} tiene ${propias.length} estación(es): se necesitan al menos 2.`)
  }
}

const tiposPasajero = [
  [1, 'General', 3.0],
  [2, 'Estudiante', 1.5],
  [3, 'Adulto mayor', 1.5],
  [4, 'Persona con discapacidad', 0.0],
]

const franjas = [
  [1, 'Madrugada', 5, 6],
  [2, 'Pico manana', 7, 9],
  [3, 'Media manana', 10, 11],
  [4, 'Mediodia', 12, 14],
  [5, 'Tarde', 15, 17],
  [6, 'Pico tarde', 18, 20],
  [7, 'Noche', 21, 22],
]

// --- Hechos: un viaje por fila -------------------------------------------

const dias = fechas('2025-01-01', '2025-12-31')
const viajes = []
let idViaje = 0

for (const fecha of dias) {
  const d = new Date(fecha + 'T00:00:00Z')
  const domingo = d.getUTCDay() === 0
  const sabado = d.getUTCDay() === 6
  // Un domingo el sistema mueve mucho menos gente que un martes: sin eso, el
  // reto de "dia de la semana" no tendria nada que mostrar.
  const cantidad = domingo ? entre(r, 2, 4) : sabado ? entre(r, 4, 6) : entre(r, 7, 11)

  for (let i = 0; i < cantidad; i++) {
    idViaje++
    // En dia habil el grueso viaja en las dos horas pico.
    const franja = domingo || sabado
      ? Number(pesado(r, [['3', 2], ['4', 3], ['5', 3], ['6', 2], ['7', 1]]))
      : Number(pesado(r, [['1', 1], ['2', 6], ['3', 2], ['4', 3], ['5', 3], ['6', 6], ['7', 1]]))

    const linea = Number(pesado(r, [['1', 5], ['2', 4], ['3', 3], ['4', 5], ['5', 2], ['6', 2], ['7', 2], ['8', 3], ['9', 1], ['10', 2]]))
    const deLinea = estaciones.filter(e => e[2] === linea)
    const origen = deLinea[entre(r, 0, deLinea.length - 1)][0]
    let destino = deLinea[entre(r, 0, deLinea.length - 1)][0]
    if (destino === origen) destino = deLinea[(deLinea.findIndex(e => e[0] === origen) + 1) % deLinea.length][0]

    const tipo = Number(pesado(r, [['1', 6], ['2', 3], ['3', 1], ['4', 1]]))
    const transbordo = pesado(r, [[0, 7], [1, 3]])
    // [id, tipo, tarifa_base] — la tarifa está en el índice 2, no en el 1.
    const tarifa = tiposPasajero[tipo - 1][2] * (transbordo ? 0 : 1)
    const duracion = entre(r, 4, 17)

    viajes.push([idViaje, idTiempo(fecha), franja, linea, origen, destino, tipo, transbordo, Number(tarifa.toFixed(2)), duracion])
  }
}

const seed = `
-- ==========================================================================
-- MI TELEFERICO  ·  La Paz y El Alto
-- Grain del hecho: UN VIAJE. Una fila por persona que pasa el torniquete.
-- ==========================================================================

${dimTiempo('2025-01-01', '2025-12-31')}

CREATE TABLE dim_franja (
  id_franja INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  hora_desde INTEGER NOT NULL,
  hora_hasta INTEGER NOT NULL
);

CREATE TABLE dim_linea (
  id_linea INTEGER PRIMARY KEY,
  color TEXT NOT NULL,
  anio_inauguracion INTEGER NOT NULL,
  cabecera_a TEXT NOT NULL,
  cabecera_b TEXT NOT NULL,
  longitud_km REAL NOT NULL
);

CREATE TABLE dim_estacion (
  id_estacion INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  id_linea INTEGER NOT NULL REFERENCES dim_linea(id_linea),
  ciudad TEXT NOT NULL,
  altura_msnm INTEGER NOT NULL
);

CREATE TABLE dim_pasajero (
  id_tipo_pasajero INTEGER PRIMARY KEY,
  tipo TEXT NOT NULL,
  tarifa_base REAL NOT NULL
);

-- Origen y destino apuntan a la MISMA dimension: es un rol-playing dimension.
CREATE TABLE hecho_viaje (
  id_viaje INTEGER PRIMARY KEY,
  id_tiempo INTEGER NOT NULL REFERENCES dim_tiempo(id_tiempo),
  id_franja INTEGER NOT NULL REFERENCES dim_franja(id_franja),
  id_linea INTEGER NOT NULL REFERENCES dim_linea(id_linea),
  id_estacion_origen INTEGER NOT NULL REFERENCES dim_estacion(id_estacion),
  id_estacion_destino INTEGER NOT NULL REFERENCES dim_estacion(id_estacion),
  id_tipo_pasajero INTEGER NOT NULL REFERENCES dim_pasajero(id_tipo_pasajero),
  es_transbordo INTEGER NOT NULL,
  tarifa_pagada REAL NOT NULL,
  duracion_min INTEGER NOT NULL
);

${insert('dim_franja', ['id_franja', 'nombre', 'hora_desde', 'hora_hasta'], franjas)}

${insert('dim_linea', ['id_linea', 'color', 'anio_inauguracion', 'cabecera_a', 'cabecera_b', 'longitud_km'], lineas)}

${insert('dim_estacion', ['id_estacion', 'nombre', 'id_linea', 'ciudad', 'altura_msnm'], estaciones)}

${insert('dim_pasajero', ['id_tipo_pasajero', 'tipo', 'tarifa_base'], tiposPasajero)}

${insert('hecho_viaje',
  ['id_viaje', 'id_tiempo', 'id_franja', 'id_linea', 'id_estacion_origen', 'id_estacion_destino', 'id_tipo_pasajero', 'es_transbordo', 'tarifa_pagada', 'duracion_min'],
  viajes, 40)}
`.trim()

const tablas = [
  { nombre: 'hecho_viaje', rol: 'hecho', x: 470, y: 400, columnas: [
    { nombre: 'id_viaje', tipo: 'INTEGER', pk: true },
    { nombre: 'id_tiempo', tipo: 'INTEGER', fk: 'dim_tiempo' },
    { nombre: 'id_franja', tipo: 'INTEGER', fk: 'dim_franja' },
    { nombre: 'id_linea', tipo: 'INTEGER', fk: 'dim_linea' },
    { nombre: 'id_estacion_origen', tipo: 'INTEGER', fk: 'dim_estacion' },
    { nombre: 'id_estacion_destino', tipo: 'INTEGER' },
    { nombre: 'id_tipo_pasajero', tipo: 'INTEGER', fk: 'dim_pasajero' },
    { nombre: 'es_transbordo', tipo: 'INTEGER', metrica: true },
    { nombre: 'tarifa_pagada', tipo: 'REAL', metrica: true },
    { nombre: 'duracion_min', tipo: 'INTEGER', metrica: true },
  ] },
  { nombre: 'dim_tiempo', rol: 'dimension', x: 130, y: 120, columnas: [
    { nombre: 'id_tiempo', tipo: 'INTEGER', pk: true },
    { nombre: 'fecha', tipo: 'TEXT' },
    { nombre: 'anio', tipo: 'INTEGER' },
    { nombre: 'mes', tipo: 'INTEGER' },
    { nombre: 'nombre_mes', tipo: 'TEXT' },
    { nombre: 'trimestre', tipo: 'INTEGER' },
    { nombre: 'dia_semana', tipo: 'TEXT' },
    { nombre: 'es_fin_semana', tipo: 'INTEGER' },
  ] },
  { nombre: 'dim_franja', rol: 'dimension', x: 470, y: 110, columnas: [
    { nombre: 'id_franja', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'hora_desde', tipo: 'INTEGER' },
    { nombre: 'hora_hasta', tipo: 'INTEGER' },
  ] },
  { nombre: 'dim_linea', rol: 'dimension', x: 820, y: 120, columnas: [
    { nombre: 'id_linea', tipo: 'INTEGER', pk: true },
    { nombre: 'color', tipo: 'TEXT' },
    { nombre: 'anio_inauguracion', tipo: 'INTEGER' },
    { nombre: 'cabecera_a', tipo: 'TEXT' },
    { nombre: 'cabecera_b', tipo: 'TEXT' },
    { nombre: 'longitud_km', tipo: 'REAL' },
  ] },
  { nombre: 'dim_estacion', rol: 'dimension', x: 130, y: 620, columnas: [
    { nombre: 'id_estacion', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'id_linea', tipo: 'INTEGER', fk: 'dim_linea' },
    { nombre: 'ciudad', tipo: 'TEXT' },
    { nombre: 'altura_msnm', tipo: 'INTEGER' },
  ] },
  { nombre: 'dim_pasajero', rol: 'dimension', x: 820, y: 620, columnas: [
    { nombre: 'id_tipo_pasajero', tipo: 'INTEGER', pk: true },
    { nombre: 'tipo', tipo: 'TEXT' },
    { nombre: 'tarifa_base', tipo: 'REAL' },
  ] },
]

const retos = [
  {
    id: 'tel-01', bloque: 'navegar', concept: 'JOIN + COUNT',
    title: 'Viajes por línea',
    prompt: 'Cuántos viajes tuvo cada línea. Muestra el color de la línea y la cantidad, de mayor a menor.',
    hint: 'El hecho guarda id_linea; el color está en dim_linea. Cada fila del hecho ES un viaje, así que alcanza con COUNT(*).',
    starter: 'SELECT l.color, ...\nFROM hecho_viaje h\nJOIN dim_linea l ON ...\nGROUP BY ...;',
    expectedSql: `SELECT l.color, COUNT(*) AS viajes
FROM hecho_viaje h JOIN dim_linea l ON h.id_linea = l.id_linea
GROUP BY l.color ORDER BY viajes DESC;`,
    orderMatters: true,
  },
  {
    id: 'tel-02', bloque: 'navegar', concept: 'Rol-playing dimension',
    title: 'La misma dimensión dos veces',
    prompt: 'Los 5 pares origen-destino más frecuentes. Muestra nombre de origen, nombre de destino y cantidad de viajes.',
    hint: 'Origen y destino apuntan a dim_estacion. Necesitas unir DOS veces la misma tabla, con alias distintos.',
    starter: 'SELECT o.nombre AS origen, d.nombre AS destino, COUNT(*) AS viajes\nFROM hecho_viaje h\nJOIN dim_estacion o ON ...\nJOIN dim_estacion d ON ...\n...;',
    expectedSql: `SELECT o.nombre AS origen, d.nombre AS destino, COUNT(*) AS viajes
FROM hecho_viaje h
JOIN dim_estacion o ON h.id_estacion_origen = o.id_estacion
JOIN dim_estacion d ON h.id_estacion_destino = d.id_estacion
GROUP BY o.nombre, d.nombre ORDER BY viajes DESC, origen, destino LIMIT 5;`,
    orderMatters: true,
  },
  {
    id: 'tel-03', bloque: 'slice', concept: 'Filtrar por atributo',
    title: 'Slice: solo El Alto',
    prompt: 'Viajes que salieron de una estación de El Alto, agrupados por nombre de estación, de mayor a menor.',
    hint: 'La ciudad es un atributo de la estación de origen, no del hecho.',
    starter: "SELECT o.nombre, COUNT(*) AS viajes\nFROM hecho_viaje h\nJOIN dim_estacion o ON ...\nWHERE o.ciudad = ...;",
    expectedSql: `SELECT o.nombre, COUNT(*) AS viajes
FROM hecho_viaje h JOIN dim_estacion o ON h.id_estacion_origen = o.id_estacion
WHERE o.ciudad = 'El Alto'
GROUP BY o.nombre ORDER BY viajes DESC, o.nombre;`,
    orderMatters: true,
  },
  {
    id: 'tel-04', bloque: 'granularidad', concept: 'Grain de evento',
    title: 'La hora pico',
    prompt: 'Viajes por franja horaria, solo en días hábiles (es_fin_semana = 0). Muestra el nombre de la franja y la cantidad, de mayor a menor.',
    hint: 'Esta pregunta SOLO se puede responder porque el grain es el viaje. Si el hecho estuviera agregado por día, la franja no existiría.',
    starter: 'SELECT f.nombre, COUNT(*) AS viajes\nFROM hecho_viaje h\nJOIN dim_franja f ON ...\nJOIN dim_tiempo t ON ...\nWHERE ...;',
    expectedSql: `SELECT f.nombre, COUNT(*) AS viajes
FROM hecho_viaje h
JOIN dim_franja f ON h.id_franja = f.id_franja
JOIN dim_tiempo t ON h.id_tiempo = t.id_tiempo
WHERE t.es_fin_semana = 0
GROUP BY f.nombre ORDER BY viajes DESC;`,
    orderMatters: true,
  },
  {
    id: 'tel-05', bloque: 'granularidad', concept: 'Drill-down',
    title: 'Del mes al día de la semana',
    prompt: 'Viajes por día de la semana. Muestra dia_semana y la cantidad, de mayor a menor.',
    hint: 'dim_tiempo ya trae dia_semana escrito: no lo calcules con strftime.',
    starter: 'SELECT t.dia_semana, ...\nFROM hecho_viaje h\nJOIN dim_tiempo t ON ...;',
    expectedSql: `SELECT t.dia_semana, COUNT(*) AS viajes
FROM hecho_viaje h JOIN dim_tiempo t ON h.id_tiempo = t.id_tiempo
GROUP BY t.dia_semana ORDER BY viajes DESC;`,
    orderMatters: true,
  },
  {
    id: 'tel-06', bloque: 'aditividad', concept: 'Promedio contra suma',
    title: 'Duración: el promedio sí, la suma no',
    prompt: 'Duración promedio de viaje por línea, redondeada a 1 decimal. Muestra color y promedio, del viaje más largo al más corto.',
    hint: 'Sumar duraciones de viajes distintos no significa nada. La duración es una métrica NO aditiva: se promedia.',
    starter: 'SELECT l.color, ROUND(AVG(...), 1) AS minutos\nFROM hecho_viaje h\nJOIN dim_linea l ON ...;',
    expectedSql: `SELECT l.color, ROUND(AVG(h.duracion_min), 1) AS minutos
FROM hecho_viaje h JOIN dim_linea l ON h.id_linea = l.id_linea
GROUP BY l.color ORDER BY minutos DESC;`,
    orderMatters: true,
    trampa: 'SUM(duracion_min) da un numero enorme y sin sentido: la suma de duraciones de viajes distintos no es ninguna magnitud real.',
  },
  {
    id: 'tel-07', bloque: 'aditividad', concept: 'Flag como métrica',
    title: 'Un flag que sí se suma',
    prompt: 'Porcentaje de viajes que fueron transbordo, por línea. Muestra color y el porcentaje redondeado a 2. De mayor a menor.',
    hint: 'es_transbordo vale 0 o 1: SUM cuenta los transbordos y COUNT(*) el total. Ese es el patrón de un flag aditivo.',
    starter: 'SELECT l.color, ROUND(SUM(...) * 100.0 / COUNT(*), 2) AS pct\nFROM ...;',
    expectedSql: `SELECT l.color, ROUND(SUM(h.es_transbordo) * 100.0 / COUNT(*), 2) AS pct_transbordo
FROM hecho_viaje h JOIN dim_linea l ON h.id_linea = l.id_linea
GROUP BY l.color ORDER BY pct_transbordo DESC;`,
    orderMatters: true,
  },
  {
    id: 'tel-08', bloque: 'tiempo', concept: 'Serie mensual',
    title: 'La curva del año',
    prompt: 'Viajes y recaudación por mes. Muestra nombre_mes, viajes y recaudacion (SUM de tarifa_pagada redondeado a 2), en orden de mes.',
    hint: 'Agrupa por mes y nombre_mes juntos, y ordena por el número de mes para que no salga alfabético.',
    starter: 'SELECT t.nombre_mes, COUNT(*) AS viajes, ...\nFROM ...\nGROUP BY t.mes, t.nombre_mes\nORDER BY ...;',
    expectedSql: `SELECT t.nombre_mes, COUNT(*) AS viajes, ROUND(SUM(h.tarifa_pagada), 2) AS recaudacion
FROM hecho_viaje h JOIN dim_tiempo t ON h.id_tiempo = t.id_tiempo
GROUP BY t.mes, t.nombre_mes ORDER BY t.mes;`,
    orderMatters: true,
  },
  {
    id: 'tel-09', bloque: 'ventanas', concept: 'RANK',
    title: 'La estación más usada de cada línea',
    prompt: 'Para cada línea, la estación de origen con más viajes. Muestra color, nombre de estación y viajes, ordenado por color.',
    hint: 'Numera las estaciones dentro de cada línea con ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ... DESC) y quédate con la primera.',
    starter: 'SELECT color, nombre, viajes FROM (\n  SELECT ..., ROW_NUMBER() OVER (PARTITION BY ... ) AS puesto\n  FROM ...\n) WHERE puesto = 1;',
    expectedSql: `SELECT color, nombre, viajes FROM (
  SELECT l.color AS color, o.nombre AS nombre, COUNT(*) AS viajes,
    ROW_NUMBER() OVER (PARTITION BY l.color ORDER BY COUNT(*) DESC, o.nombre) AS puesto
  FROM hecho_viaje h
  JOIN dim_linea l ON h.id_linea = l.id_linea
  JOIN dim_estacion o ON h.id_estacion_origen = o.id_estacion
  GROUP BY l.color, o.nombre
) WHERE puesto = 1 ORDER BY color;`,
    orderMatters: true,
  },
  {
    id: 'tel-10', bloque: 'ventanas', concept: 'Media móvil',
    title: 'Suavizar la serie',
    prompt: 'Viajes por mes junto a la media móvil de 3 meses, redondeada a 1. Columnas: mes, viajes, media_movil.',
    hint: 'ROWS BETWEEN 2 PRECEDING AND CURRENT ROW define la ventana de tres meses.',
    starter: 'SELECT mes, viajes,\n  ROUND(AVG(viajes) OVER (ORDER BY mes ROWS BETWEEN ... ), 1) AS media_movil\nFROM ( ... );',
    expectedSql: `SELECT mes, viajes, ROUND(AVG(viajes) OVER (ORDER BY mes ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1) AS media_movil
FROM (
  SELECT t.mes AS mes, COUNT(*) AS viajes
  FROM hecho_viaje h JOIN dim_tiempo t ON h.id_tiempo = t.id_tiempo
  GROUP BY t.mes
) ORDER BY mes;`,
    orderMatters: true,
  },
  {
    id: 'tel-11', bloque: 'trampas', concept: 'Gratuito no es nulo',
    title: 'La trampa de la tarifa cero',
    prompt: 'Tarifa promedio efectivamente pagada por tipo de pasajero, contando también los viajes gratuitos. Muestra tipo y el promedio redondeado a 2, de mayor a menor.',
    hint: 'Los transbordos pagan 0, y las personas con discapacidad también. Un cero es un dato, no un faltante: entra en el promedio.',
    starter: 'SELECT p.tipo, ROUND(AVG(...), 2) AS tarifa_promedio\nFROM hecho_viaje h\nJOIN dim_pasajero p ON ...;',
    expectedSql: `SELECT p.tipo, ROUND(AVG(h.tarifa_pagada), 2) AS tarifa_promedio
FROM hecho_viaje h JOIN dim_pasajero p ON h.id_tipo_pasajero = p.id_tipo_pasajero
GROUP BY p.tipo ORDER BY tarifa_promedio DESC;`,
    orderMatters: true,
    trampa: 'Filtrar WHERE tarifa_pagada > 0 sube el promedio y responde otra pregunta: cuanto pagan los que pagan, no cuanto se recauda por viaje.',
  },
  {
    id: 'tel-12', bloque: 'trampas', concept: 'Conteo contra suma',
    title: 'Viajes no es lo mismo que pasajeros pagos',
    prompt: 'Por línea: total de viajes, viajes pagos (tarifa mayor a 0) y recaudación. Columnas: color, viajes, viajes_pagos, recaudacion. Ordena por recaudación de mayor a menor.',
    hint: 'Los tres números salen de la misma pasada con SUM(CASE WHEN ...). No hace falta consultar tres veces.',
    starter: 'SELECT l.color, COUNT(*) AS viajes,\n  SUM(CASE WHEN ... THEN 1 ELSE 0 END) AS viajes_pagos,\n  ...\nFROM ...;',
    expectedSql: `SELECT l.color, COUNT(*) AS viajes,
  SUM(CASE WHEN h.tarifa_pagada > 0 THEN 1 ELSE 0 END) AS viajes_pagos,
  ROUND(SUM(h.tarifa_pagada), 2) AS recaudacion
FROM hecho_viaje h JOIN dim_linea l ON h.id_linea = l.id_linea
GROUP BY l.color ORDER BY recaudacion DESC;`,
    orderMatters: true,
  },
]

const dataset = {
  id: 'teleferico',
  nombre: 'Mi Teleférico',
  subtitulo: 'Transporte por cable · La Paz y El Alto',
  dominio: 'Transporte',
  tipo: 'estrella',
  concepto: 'Grain de evento: cada fila es un viaje, no un resumen. Por eso se puede preguntar por hora pico, por transbordo y por par origen-destino. También es la única base con una dimensión que juega dos papeles (origen y destino apuntan a dim_estacion).',
  nota: 'Las diez líneas, sus colores y las estaciones son reales, igual que las tarifas diferenciadas. Los viajes son una muestra didáctica de un año.',
  tablas,
  retos,
}

const archivo = `${encabezado('Mi Teleférico · La Paz y El Alto', 'teleferico.mjs')}

export const teleferico = ${JSON.stringify(dataset, null, 2).replace(/"([a-zA-Z_][a-zA-Z0-9_]*)":/g, '$1:')}

teleferico.seedSql = String.raw\`
${seed.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}
\`
`

writeFileSync(SALIDA, archivo)
console.log(`teleferico.js escrito · ${viajes.length} viajes · ${(archivo.length / 1024).toFixed(0)} KB`)
