/*
 * Genera front/src/playground/datasets/arcoiris.js
 *
 * El Hospital Arco Iris enseña DIMENSIÓN LENTAMENTE CAMBIANTE (SCD tipo 2).
 *
 * dim_paciente guarda VERSIONES: cuando un paciente se muda de zona o cambia de
 * seguro, no se pisa la fila, se cierra la vigente y se abre una nueva. Por eso
 * hay más filas que pacientes, y por eso toda consulta "por paciente" tiene que
 * decidir si quiere la foto histórica o la foto actual. Elegir mal cambia el
 * resultado, y ese es exactamente el ejercicio.
 */
import { writeFileSync } from 'fs'
import { rng, entre, decimal, pesado, insert, dimTiempo, idTiempo, fechas, encabezado } from './lib.mjs'

const SALIDA = new URL('../../front/src/playground/datasets/arcoiris.js', import.meta.url)
const r = rng(20051220)

const especialidades = [
  [1, 'Medicina general', 'Consulta externa', 80],
  [2, 'Pediatria', 'Consulta externa', 120],
  [3, 'Ginecologia y obstetricia', 'Consulta externa', 150],
  [4, 'Traumatologia', 'Consulta externa', 160],
  [5, 'Cardiologia', 'Consulta externa', 200],
  [6, 'Odontologia', 'Consulta externa', 100],
  [7, 'Emergencias', 'Emergencia', 180],
  [8, 'Terapia intensiva', 'Internacion', 950],
  [9, 'Cirugia general', 'Quirofano', 1400],
  [10, 'Laboratorio', 'Apoyo diagnostico', 60],
]

const medicos = []
const nombresMed = ['Ana', 'Carlos', 'Patricia', 'Jorge', 'Silvia', 'Ruben', 'Carmen', 'Mauricio',
  'Lourdes', 'Javier', 'Teresa', 'Gonzalo', 'Fabiola', 'Rodrigo']
const apellidosMed = ['Salinas', 'Zambrana', 'Ergueta', 'Pinto', 'Iriarte', 'Antezana', 'Bustillos',
  'Careaga', 'Nogales', 'Ballivian', 'Trigo', 'Estrada']
for (let i = 1; i <= 22; i++) {
  medicos.push([
    i,
    `Dr. ${nombresMed[(i * 5) % nombresMed.length]} ${apellidosMed[(i * 7) % apellidosMed.length]}`,
    entre(r, 1, especialidades.length),
    pesado(r, [['Planta', 6], ['Consultor externo', 4]]),
    entre(r, 2005, 2024),
  ])
}

const zonas = ['Villa Fatima', 'Miraflores', 'Sopocachi', 'El Alto Ceja', 'Achumani', 'San Pedro', 'Calacoto']
const seguros = ['Particular', 'Seguro privado', 'Caja Nacional de Salud', 'Convenio empresa']

/*
 * SCD tipo 2 a mano: 45 pacientes, y a un tercio de ellos les cambia algo a
 * mitad de año. Ese cambio abre una versión nueva y cierra la anterior.
 */
const pacientes = []
const versionesPorPaciente = new Map()
let idVersion = 0

for (let idPaciente = 1; idPaciente <= 45; idPaciente++) {
  const nombre = `${nombresMed[(idPaciente * 3) % nombresMed.length]} ${apellidosMed[(idPaciente * 11) % apellidosMed.length]}`
  const sexo = idPaciente % 2 === 0 ? 'F' : 'M'
  const nacimiento = entre(r, 1945, 2020)
  const zonaInicial = zonas[(idPaciente * 5) % zonas.length]
  const seguroInicial = seguros[(idPaciente * 7) % seguros.length]
  const cambia = idPaciente % 3 === 0

  idVersion++
  const primera = idVersion
  pacientes.push([
    idVersion, idPaciente, nombre, sexo, nacimiento, zonaInicial, seguroInicial,
    '2025-01-01', cambia ? '2025-06-30' : '9999-12-31', cambia ? 0 : 1,
  ])

  const versiones = [{ id: primera, desde: '2025-01-01', hasta: cambia ? '2025-06-30' : '9999-12-31' }]

  if (cambia) {
    idVersion++
    // Se muda de zona, o le cambia el seguro. Los demás atributos siguen igual.
    const mudanza = idPaciente % 2 === 0
    pacientes.push([
      idVersion, idPaciente, nombre, sexo, nacimiento,
      mudanza ? zonas[(idPaciente * 5 + 3) % zonas.length] : zonaInicial,
      mudanza ? seguroInicial : seguros[(idPaciente * 7 + 1) % seguros.length],
      '2025-07-01', '9999-12-31', 1,
    ])
    versiones.push({ id: idVersion, desde: '2025-07-01', hasta: '9999-12-31' })
  }

  versionesPorPaciente.set(idPaciente, versiones)
}

// --- Hecho: una atención ---------------------------------------------------

const dias = fechas('2025-01-01', '2025-12-31')
const atenciones = []
let idAtencion = 0

for (const fecha of dias) {
  const d = new Date(fecha + 'T00:00:00Z')
  const finDeSemana = d.getUTCDay() === 0 || d.getUTCDay() === 6

  for (let i = 0, n = finDeSemana ? entre(r, 1, 3) : entre(r, 3, 7); i < n; i++) {
    idAtencion++
    const idPaciente = entre(r, 1, 45)
    // La FK apunta a la VERSIÓN vigente el día de la atención: así queda
    // congelado cómo era el paciente en ese momento.
    const versiones = versionesPorPaciente.get(idPaciente)
    const version = versiones.find(v => fecha >= v.desde && fecha <= v.hasta) ?? versiones[versiones.length - 1]

    const especialidad = Number(pesado(r, [['1', 8], ['2', 5], ['3', 4], ['4', 3], ['5', 2], ['6', 3], ['7', 6], ['8', 1], ['9', 2], ['10', 5]]))
    const medicosDe = medicos.filter(m => m[2] === especialidad)
    const medico = medicosDe.length ? medicosDe[entre(r, 0, medicosDe.length - 1)][0] : entre(r, 1, medicos.length)

    const base = especialidades[especialidad - 1][3]
    const importe = decimal(r, base * 0.9, base * 1.35, 2)
    const internado = especialidades[especialidad - 1][2] === 'Internacion' || especialidades[especialidad - 1][2] === 'Quirofano'
    const estancia = internado ? entre(r, 1, 9) : 0

    atenciones.push([idAtencion, idTiempo(fecha), version.id, medico, especialidad, importe, estancia, internado ? 1 : 0])
  }
}

const seed = `
-- ==========================================================================
-- HOSPITAL ARCO IRIS  ·  Villa Fatima, La Paz
--
-- dim_paciente es una DIMENSION LENTAMENTE CAMBIANTE (SCD tipo 2):
-- guarda VERSIONES, no pacientes. Un paciente que se muda tiene dos filas,
-- con su rango de vigencia y una marca de cual es la actual.
-- Por eso el hecho apunta a la version que estaba vigente el dia de la
-- atencion: asi queda congelado como era el paciente en ese momento.
-- ==========================================================================

${dimTiempo('2025-01-01', '2025-12-31')}

CREATE TABLE dim_especialidad (
  id_especialidad INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  area TEXT NOT NULL,
  arancel_base REAL NOT NULL
);

CREATE TABLE dim_medico (
  id_medico INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  id_especialidad INTEGER NOT NULL REFERENCES dim_especialidad(id_especialidad),
  relacion TEXT NOT NULL,
  anio_ingreso INTEGER NOT NULL
);

-- id_version es la clave que usa el hecho (surrogate key).
-- id_paciente es la persona real (natural key), y se repite entre versiones.
CREATE TABLE dim_paciente (
  id_version INTEGER PRIMARY KEY,
  id_paciente INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  sexo TEXT NOT NULL,
  anio_nacimiento INTEGER NOT NULL,
  zona TEXT NOT NULL,
  seguro TEXT NOT NULL,
  vigente_desde TEXT NOT NULL,
  vigente_hasta TEXT NOT NULL,
  es_actual INTEGER NOT NULL
);

-- Grain: una atencion.
CREATE TABLE hecho_atencion (
  id_atencion INTEGER PRIMARY KEY,
  id_tiempo INTEGER NOT NULL REFERENCES dim_tiempo(id_tiempo),
  id_version_paciente INTEGER NOT NULL REFERENCES dim_paciente(id_version),
  id_medico INTEGER NOT NULL REFERENCES dim_medico(id_medico),
  id_especialidad INTEGER NOT NULL REFERENCES dim_especialidad(id_especialidad),
  importe REAL NOT NULL,
  dias_estancia INTEGER NOT NULL,
  es_internacion INTEGER NOT NULL
);

${insert('dim_especialidad', ['id_especialidad', 'nombre', 'area', 'arancel_base'], especialidades)}

${insert('dim_medico', ['id_medico', 'nombre', 'id_especialidad', 'relacion', 'anio_ingreso'], medicos)}

${insert('dim_paciente',
  ['id_version', 'id_paciente', 'nombre', 'sexo', 'anio_nacimiento', 'zona', 'seguro', 'vigente_desde', 'vigente_hasta', 'es_actual'],
  pacientes, 20)}

${insert('hecho_atencion',
  ['id_atencion', 'id_tiempo', 'id_version_paciente', 'id_medico', 'id_especialidad', 'importe', 'dias_estancia', 'es_internacion'],
  atenciones, 40)}
`.trim()

const tablas = [
  { nombre: 'hecho_atencion', rol: 'hecho', x: 470, y: 420, columnas: [
    { nombre: 'id_atencion', tipo: 'INTEGER', pk: true },
    { nombre: 'id_tiempo', tipo: 'INTEGER', fk: 'dim_tiempo' },
    { nombre: 'id_version_paciente', tipo: 'INTEGER', fk: 'dim_paciente' },
    { nombre: 'id_medico', tipo: 'INTEGER', fk: 'dim_medico' },
    { nombre: 'id_especialidad', tipo: 'INTEGER', fk: 'dim_especialidad' },
    { nombre: 'importe', tipo: 'REAL', metrica: true },
    { nombre: 'dias_estancia', tipo: 'INTEGER', metrica: true },
    { nombre: 'es_internacion', tipo: 'INTEGER', metrica: true },
  ] },
  { nombre: 'dim_tiempo', rol: 'dimension', x: 130, y: 130, columnas: [
    { nombre: 'id_tiempo', tipo: 'INTEGER', pk: true },
    { nombre: 'fecha', tipo: 'TEXT' },
    { nombre: 'anio', tipo: 'INTEGER' },
    { nombre: 'mes', tipo: 'INTEGER' },
    { nombre: 'nombre_mes', tipo: 'TEXT' },
    { nombre: 'trimestre', tipo: 'INTEGER' },
    { nombre: 'dia_semana', tipo: 'TEXT' },
    { nombre: 'es_fin_semana', tipo: 'INTEGER' },
  ] },
  { nombre: 'dim_paciente', rol: 'dimension', x: 470, y: 105, columnas: [
    { nombre: 'id_version', tipo: 'INTEGER', pk: true },
    { nombre: 'id_paciente', tipo: 'INTEGER' },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'sexo', tipo: 'TEXT' },
    { nombre: 'anio_nacimiento', tipo: 'INTEGER' },
    { nombre: 'zona', tipo: 'TEXT' },
    { nombre: 'seguro', tipo: 'TEXT' },
    { nombre: 'vigente_desde', tipo: 'TEXT' },
    { nombre: 'vigente_hasta', tipo: 'TEXT' },
    { nombre: 'es_actual', tipo: 'INTEGER' },
  ] },
  { nombre: 'dim_medico', rol: 'dimension', x: 830, y: 130, columnas: [
    { nombre: 'id_medico', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'id_especialidad', tipo: 'INTEGER', fk: 'dim_especialidad' },
    { nombre: 'relacion', tipo: 'TEXT' },
    { nombre: 'anio_ingreso', tipo: 'INTEGER' },
  ] },
  { nombre: 'dim_especialidad', rol: 'dimension', x: 830, y: 660, columnas: [
    { nombre: 'id_especialidad', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'area', tipo: 'TEXT' },
    { nombre: 'arancel_base', tipo: 'REAL' },
  ] },
]

const retos = [
  {
    id: 'ai-01', bloque: 'navegar', concept: 'JOIN + COUNT',
    title: 'Atenciones por especialidad',
    prompt: 'Cantidad de atenciones e importe facturado por especialidad. Columnas: nombre, atenciones, importe. De mayor a menor importe.',
    hint: 'Cada fila del hecho es una atención: COUNT(*) las cuenta.',
    starter: 'SELECT e.nombre, COUNT(*) AS atenciones, ...\nFROM hecho_atencion a\nJOIN dim_especialidad e ON ...;',
    expectedSql: `SELECT e.nombre, COUNT(*) AS atenciones, ROUND((SUM(a.importe))::numeric, 2) AS importe
FROM hecho_atencion a JOIN dim_especialidad e ON a.id_especialidad = e.id_especialidad
GROUP BY e.nombre ORDER BY importe DESC;`,
    orderMatters: true,
  },
  {
    id: 'ai-02', bloque: 'navegar', concept: 'Dimensión encadenada',
    title: 'Del médico a su especialidad',
    prompt: 'Los 5 médicos con más atenciones. Columnas: nombre del médico, su especialidad y la cantidad.',
    hint: 'La especialidad del médico está en dim_medico, que a su vez apunta a dim_especialidad.',
    starter: 'SELECT m.nombre, e.nombre AS especialidad, COUNT(*) AS atenciones\nFROM hecho_atencion a\nJOIN dim_medico m ON ...\nJOIN dim_especialidad e ON ...;',
    expectedSql: `SELECT m.nombre, e.nombre AS especialidad, COUNT(*) AS atenciones
FROM hecho_atencion a
JOIN dim_medico m ON a.id_medico = m.id_medico
JOIN dim_especialidad e ON m.id_especialidad = e.id_especialidad
GROUP BY m.nombre, e.nombre ORDER BY atenciones DESC, m.nombre LIMIT 5;`,
    orderMatters: true,
  },
  {
    id: 'ai-03', bloque: 'trampas', concept: 'SCD: contar personas',
    title: 'Cuántos pacientes hay de verdad',
    prompt: 'Cuántos pacientes distintos existen. Una fila, una columna llamada pacientes.',
    hint: 'dim_paciente guarda VERSIONES: hay más filas que personas. La persona es id_paciente, no id_version.',
    starter: 'SELECT COUNT(...) AS pacientes\nFROM dim_paciente;',
    expectedSql: 'SELECT COUNT(DISTINCT id_paciente) AS pacientes FROM dim_paciente;',
    orderMatters: false,
    trampa: 'COUNT(*) sobre dim_paciente cuenta versiones y da mas de la cuenta: los pacientes que cambiaron de zona o de seguro estan dos veces.',
  },
  {
    id: 'ai-04', bloque: 'trampas', concept: 'SCD: foto histórica',
    title: 'La zona que tenía cuando vino',
    prompt: 'Atenciones agrupadas por la zona que el paciente tenía AL MOMENTO de la atención. Columnas: zona, atenciones. De mayor a menor.',
    hint: 'El hecho apunta a la versión vigente ese día: unir por id_version ya da la foto histórica, sin filtrar nada.',
    starter: 'SELECT p.zona, COUNT(*) AS atenciones\nFROM hecho_atencion a\nJOIN dim_paciente p ON a.id_version_paciente = ...;',
    expectedSql: `SELECT p.zona, COUNT(*) AS atenciones
FROM hecho_atencion a JOIN dim_paciente p ON a.id_version_paciente = p.id_version
GROUP BY p.zona ORDER BY atenciones DESC, p.zona;`,
    orderMatters: true,
  },
  {
    id: 'ai-05', bloque: 'trampas', concept: 'SCD: foto actual',
    title: 'La zona donde vive hoy',
    prompt: 'Las mismas atenciones, pero agrupadas por la zona ACTUAL del paciente. Columnas: zona, atenciones. De mayor a menor. Compara el resultado con el reto anterior.',
    hint: 'Hay que saltar de la versión del hecho a la persona, y de ahí a la versión con es_actual = 1.',
    starter: 'SELECT actual.zona, COUNT(*) AS atenciones\nFROM hecho_atencion a\nJOIN dim_paciente v ON ...\nJOIN dim_paciente actual ON actual.id_paciente = v.id_paciente AND actual.es_actual = 1\n...;',
    expectedSql: `SELECT actual.zona, COUNT(*) AS atenciones
FROM hecho_atencion a
JOIN dim_paciente v ON a.id_version_paciente = v.id_version
JOIN dim_paciente actual ON actual.id_paciente = v.id_paciente AND actual.es_actual = 1
GROUP BY actual.zona ORDER BY atenciones DESC, actual.zona;`,
    orderMatters: true,
    trampa: 'Ninguna de las dos consultas esta mal: responden preguntas DISTINTAS. "Donde vivia cuando se atendio" sirve para planificar la demanda pasada; "donde vive hoy" sirve para contactarlo. Elegir la equivocada es el error.',
  },
  {
    id: 'ai-06', bloque: 'slice', concept: 'Filtro sobre la dimensión',
    title: 'Solo los internados',
    prompt: 'Para las atenciones con internación: especialidad, cantidad y promedio de días de estancia redondeado a 1. De mayor a menor promedio.',
    hint: 'es_internacion es un flag 0/1 en el hecho.',
    starter: 'SELECT e.nombre, COUNT(*) AS casos, ROUND((AVG(a.dias_estancia))::numeric, 1) AS estancia\nFROM hecho_atencion a\nJOIN ...\nWHERE ...;',
    expectedSql: `SELECT e.nombre, COUNT(*) AS casos, ROUND((AVG(a.dias_estancia))::numeric, 1) AS estancia
FROM hecho_atencion a JOIN dim_especialidad e ON a.id_especialidad = e.id_especialidad
WHERE a.es_internacion = 1
GROUP BY e.nombre ORDER BY estancia DESC;`,
    orderMatters: true,
  },
  {
    id: 'ai-07', bloque: 'slice', concept: 'Atributo de la versión',
    title: 'Facturación por tipo de seguro',
    prompt: 'Importe facturado por el seguro que tenía el paciente al momento de la atención. Columnas: seguro, importe. De mayor a menor.',
    hint: 'Otra vez la foto histórica: unir por id_version.',
    starter: 'SELECT p.seguro, ROUND((SUM(a.importe))::numeric, 2) AS importe\nFROM hecho_atencion a\nJOIN dim_paciente p ON ...;',
    expectedSql: `SELECT p.seguro, ROUND((SUM(a.importe))::numeric, 2) AS importe
FROM hecho_atencion a JOIN dim_paciente p ON a.id_version_paciente = p.id_version
GROUP BY p.seguro ORDER BY importe DESC;`,
    orderMatters: true,
  },
  {
    id: 'ai-08', bloque: 'granularidad', concept: 'Roll-up por área',
    title: 'Subir de especialidad a área',
    prompt: 'Importe por área del hospital. Columnas: area, importe. De mayor a menor.',
    hint: 'El área es un nivel más alto que la especialidad dentro de la misma dimensión: es una jerarquía.',
    starter: 'SELECT e.area, ...\nFROM hecho_atencion a\nJOIN dim_especialidad e ON ...;',
    expectedSql: `SELECT e.area, ROUND((SUM(a.importe))::numeric, 2) AS importe
FROM hecho_atencion a JOIN dim_especialidad e ON a.id_especialidad = e.id_especialidad
GROUP BY e.area ORDER BY importe DESC;`,
    orderMatters: true,
  },
  {
    id: 'ai-09', bloque: 'tiempo', concept: 'Estacionalidad',
    title: 'El mes más cargado',
    prompt: 'Atenciones por mes. Columnas: nombre_mes, atenciones. En orden de mes.',
    hint: 'Agrupa por mes y nombre_mes juntos para poder ordenar por el número.',
    starter: 'SELECT t.nombre_mes, COUNT(*) AS atenciones\nFROM hecho_atencion a\nJOIN dim_tiempo t ON ...\nGROUP BY ...;',
    expectedSql: `SELECT t.nombre_mes, COUNT(*) AS atenciones
FROM hecho_atencion a JOIN dim_tiempo t ON a.id_tiempo = t.id_tiempo
GROUP BY t.mes, t.nombre_mes ORDER BY t.mes;`,
    orderMatters: true,
  },
  {
    id: 'ai-10', bloque: 'tiempo', concept: 'Fin de semana',
    title: 'Emergencias de fin de semana',
    prompt: 'Atenciones de Emergencias separadas entre días hábiles y fin de semana. Columnas: tipo_dia (texto "Habil" o "Fin de semana") y atenciones.',
    hint: 'CASE WHEN sobre es_fin_semana arma la etiqueta, y se agrupa por esa misma expresión.',
    starter: "SELECT CASE WHEN t.es_fin_semana = 1 THEN 'Fin de semana' ELSE 'Habil' END AS tipo_dia,\n  COUNT(*) AS atenciones\nFROM ...;",
    expectedSql: `SELECT CASE WHEN t.es_fin_semana = 1 THEN 'Fin de semana' ELSE 'Habil' END AS tipo_dia,
  COUNT(*) AS atenciones
FROM hecho_atencion a
JOIN dim_tiempo t ON a.id_tiempo = t.id_tiempo
JOIN dim_especialidad e ON a.id_especialidad = e.id_especialidad
WHERE e.nombre = 'Emergencias'
GROUP BY tipo_dia ORDER BY atenciones DESC;`,
    orderMatters: true,
  },
  {
    id: 'ai-11', bloque: 'ventanas', concept: 'Participación por área',
    title: 'Peso de cada especialidad en su área',
    prompt: 'Por especialidad: área, nombre, importe y qué porcentaje representa dentro de SU área, redondeado a 2. Ordena por área y por importe descendente.',
    hint: 'PARTITION BY area hace que el total del OVER se calcule por área y no sobre todo el hospital.',
    starter: 'SELECT area, nombre, importe,\n  ROUND((importe * 100.0 / SUM(importe) OVER (PARTITION BY ...))::numeric, 2) AS pct_area\nFROM ( ... );',
    expectedSql: `SELECT area, nombre, importe,
  ROUND((importe * 100.0 / SUM(importe) OVER (PARTITION BY area))::numeric, 2) AS pct_area
FROM (
  SELECT e.area AS area, e.nombre AS nombre, ROUND((SUM(a.importe))::numeric, 2) AS importe
  FROM hecho_atencion a JOIN dim_especialidad e ON a.id_especialidad = e.id_especialidad
  GROUP BY e.area, e.nombre
) ORDER BY area, importe DESC;`,
    orderMatters: true,
  },
  {
    id: 'ai-12', bloque: 'trampas', concept: 'Vigencia',
    title: 'Las versiones que cambiaron',
    prompt: 'Lista los pacientes que tienen más de una versión. Columnas: id_paciente, nombre, versiones. Ordena por id_paciente.',
    hint: 'Agrupa dim_paciente por persona y quédate con los que tienen HAVING COUNT(*) > 1.',
    starter: 'SELECT id_paciente, nombre, COUNT(*) AS versiones\nFROM dim_paciente\nGROUP BY ...\nHAVING ...;',
    expectedSql: `SELECT id_paciente, nombre, COUNT(*) AS versiones
FROM dim_paciente GROUP BY id_paciente, nombre HAVING COUNT(*) > 1 ORDER BY id_paciente;`,
    orderMatters: true,
  },
]

const dataset = {
  id: 'arcoiris',
  nombre: 'Hospital Arco Iris',
  subtitulo: 'Salud · Villa Fátima, La Paz',
  dominio: 'Salud',
  tipo: 'estrella',
  concepto: 'Dimensión lentamente cambiante (SCD tipo 2). dim_paciente guarda versiones, no personas: cuando alguien se muda de zona se abre una fila nueva en vez de pisar la anterior. Toda consulta tiene que decidir entre la foto histórica y la foto actual, y elegir mal cambia el resultado.',
  nota: 'El Hospital Arco Iris está en Villa Fátima, La Paz, y fue la primera institución privada de salud acreditada de segundo nivel en la ciudad. Las especialidades y las zonas son reales. Pacientes, médicos e importes son inventados: ningún dato clínico de esta base corresponde a personas reales.',
  tablas,
  retos,
}

const archivo = `${encabezado('Hospital Arco Iris · Villa Fátima, La Paz', 'arcoiris.mjs')}

export const arcoiris = ${JSON.stringify(dataset, null, 2).replace(/"([a-zA-Z_][a-zA-Z0-9_]*)":/g, '$1:')}

arcoiris.seedSql = String.raw\`
${seed.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}
\`
`

writeFileSync(SALIDA, archivo)
console.log(`arcoiris.js escrito · ${pacientes.length} versiones de paciente · ${atenciones.length} atenciones · ${(archivo.length / 1024).toFixed(0)} KB`)
