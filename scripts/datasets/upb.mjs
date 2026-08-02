/*
 * Genera front/src/playground/datasets/upb.js
 *
 * La UPB enseña DIMENSIÓN DEGENERADA y jerarquías.
 *
 * El código de paralelo ("A", "B", "C") vive DENTRO del hecho, sin tabla propia:
 * es una dimensión degenerada. Meterle una dim_paralelo con tres filas sería
 * ruido puro. Saber cuándo NO crear una dimensión es parte del oficio.
 *
 * Además la base es la propia universidad del alumno, lo cual no es un detalle
 * menor: se puede consultar a sí mismo.
 */
import { writeFileSync } from 'fs'
import { rng, entre, decimal, pesado, insert, encabezado } from './lib.mjs'

const SALIDA = new URL('../../front/src/playground/datasets/upb.js', import.meta.url)
const r = rng(20260315)

const carreras = [
  [1, 'Ingenieria de Sistemas', 'Ingenieria', 10],
  [2, 'Ingenieria Industrial', 'Ingenieria', 10],
  [3, 'Ingenieria Comercial', 'Empresariales', 9],
  [4, 'Administracion de Empresas', 'Empresariales', 8],
  [5, 'Derecho', 'Ciencias Sociales', 10],
  [6, 'Comunicacion Digital', 'Ciencias Sociales', 8],
  [7, 'Ingenieria Mecatronica', 'Ingenieria', 10],
]

const materias = [
  [1, 'Introduccion a la Programacion', 1, 1, 4],
  [2, 'Estructuras de Datos', 1, 3, 4],
  [3, 'Base de Datos I', 1, 4, 4],
  [4, 'Business Intelligence', 1, 7, 4],
  [5, 'Redes de Computadoras', 1, 6, 3],
  [6, 'Investigacion Operativa', 2, 5, 4],
  [7, 'Gestion de la Calidad', 2, 7, 3],
  [8, 'Microeconomia', 3, 3, 4],
  [9, 'Finanzas Corporativas', 3, 6, 4],
  [10, 'Marketing Estrategico', 4, 5, 3],
  [11, 'Contabilidad General', 4, 2, 4],
  [12, 'Derecho Constitucional', 5, 2, 4],
  [13, 'Derecho Comercial', 5, 6, 3],
  [14, 'Produccion Audiovisual', 6, 4, 3],
  [15, 'Sistemas de Control', 7, 6, 4],
  [16, 'Robotica', 7, 8, 4],
]

const docentes = []
const nombresDoc = ['Paul', 'Andrea', 'Marcelo', 'Claudia', 'Ernesto', 'Ximena', 'Ricardo', 'Valeria',
  'Alejandro', 'Mariana', 'Sergio', 'Lorena']
const apellidosDoc = ['Landaeta', 'Villegas', 'Ortuño', 'Menacho', 'Aranibar', 'Guzman', 'Revollo',
  'Saavedra', 'Montaño', 'Zeballos']
for (let i = 1; i <= 18; i++) {
  docentes.push([
    i,
    `${nombresDoc[(i * 5) % nombresDoc.length]} ${apellidosDoc[(i * 7) % apellidosDoc.length]}`,
    pesado(r, [['Tiempo completo', 4], ['Tiempo horario', 6]]),
    pesado(r, [['Licenciatura', 2], ['Maestria', 6], ['Doctorado', 2]]),
    entre(r, 2008, 2025),
  ])
}

const periodos = [
  [1, '2024-1', 2024, 1],
  [2, '2024-2', 2024, 2],
  [3, '2025-1', 2025, 1],
  [4, '2025-2', 2025, 2],
]

const colegios = ['Fiscal', 'Particular', 'De convenio']
const estudiantes = []
const nombresEst = ['Ivan', 'Camila', 'Sebastian', 'Fernanda', 'Nicolas', 'Alejandra', 'Mateo', 'Valentina',
  'Santiago', 'Isabella', 'Joaquin', 'Antonella', 'Emilio', 'Renata', 'Gabriel', 'Micaela']
const apellidosEst = ['Ticona', 'Rocha', 'Aramayo', 'Bejarano', 'Calderon', 'Duran', 'Escobar', 'Fuentes',
  'Gutierrez', 'Herrera', 'Jimenez', 'Lopez', 'Miranda', 'Navarro']
for (let i = 1; i <= 90; i++) {
  estudiantes.push([
    i,
    `${nombresEst[(i * 3) % nombresEst.length]} ${apellidosEst[(i * 11) % apellidosEst.length]}`,
    i % 2 === 0 ? 'F' : 'M',
    entre(r, 1, carreras.length),
    entre(r, 2020, 2025),
    colegios[(i * 5) % colegios.length],
    pesado(r, [['Ninguna', 5], ['Media beca', 3], ['Beca completa', 2]]),
  ])
}

// --- Hecho: una inscripción de un estudiante a una materia en un periodo ---

const inscripciones = []
let idInscripcion = 0

for (const [idPeriodo] of periodos) {
  for (const estudiante of estudiantes) {
    // No todos cursan todos los periodos.
    if (r() > 0.78) continue

    // [id, nombre, id_carrera, semestre, creditos] — la carrera es el índice 2.
    const deSuCarrera = materias.filter(m => m[2] === estudiante[3])
    if (!deSuCarrera.length) throw new Error(`La carrera ${estudiante[3]} no tiene materias.`)
    const cuantas = entre(r, 2, Math.min(5, deSuCarrera.length))
    const elegidas = new Set()

    for (let i = 0; i < cuantas; i++) {
      const materia = deSuCarrera[entre(r, 0, deSuCarrera.length - 1)]
      if (elegidas.has(materia[0])) continue
      elegidas.add(materia[0])

      idInscripcion++
      const nota = entre(r, 20, 100)
      const aprobado = nota >= 51 ? 1 : 0
      inscripciones.push([
        idInscripcion,
        idPeriodo,
        estudiante[0],
        materia[0],
        entre(r, 1, docentes.length),
        // Dimension degenerada: el paralelo vive aca, sin tabla propia.
        pesado(r, [['A', 5], ['B', 3], ['C', 2]]),
        nota,
        aprobado,
        materia[4],
        decimal(r, 55, 100, 1),
      ])
    }
  }
}

const seed = `
-- ==========================================================================
-- UPB  ·  Universidad Privada Boliviana
--
-- DIMENSION DEGENERADA: el paralelo ("A", "B", "C") vive DENTRO del hecho.
-- No tiene tabla propia porque no tiene atributos: crear dim_paralelo con
-- tres filas y una sola columna seria ruido. Reconocer ese caso es parte del
-- oficio de modelar.
--
-- El periodo tambien es su propia dimension en vez de una dim_tiempo diaria:
-- el grain academico es el semestre, no el dia.
-- ==========================================================================

CREATE TABLE dim_carrera (
  id_carrera INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  facultad TEXT NOT NULL,
  semestres INTEGER NOT NULL
);

CREATE TABLE dim_materia (
  id_materia INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  id_carrera INTEGER NOT NULL REFERENCES dim_carrera(id_carrera),
  semestre INTEGER NOT NULL,
  creditos INTEGER NOT NULL
);

CREATE TABLE dim_docente (
  id_docente INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  dedicacion TEXT NOT NULL,
  grado TEXT NOT NULL,
  anio_ingreso INTEGER NOT NULL
);

CREATE TABLE dim_periodo (
  id_periodo INTEGER PRIMARY KEY,
  codigo TEXT NOT NULL,
  anio INTEGER NOT NULL,
  semestre INTEGER NOT NULL
);

CREATE TABLE dim_estudiante (
  id_estudiante INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  sexo TEXT NOT NULL,
  id_carrera INTEGER NOT NULL REFERENCES dim_carrera(id_carrera),
  anio_ingreso INTEGER NOT NULL,
  colegio_origen TEXT NOT NULL,
  beca TEXT NOT NULL
);

-- Grain: un estudiante en una materia en un periodo.
CREATE TABLE hecho_inscripcion (
  id_inscripcion INTEGER PRIMARY KEY,
  id_periodo INTEGER NOT NULL REFERENCES dim_periodo(id_periodo),
  id_estudiante INTEGER NOT NULL REFERENCES dim_estudiante(id_estudiante),
  id_materia INTEGER NOT NULL REFERENCES dim_materia(id_materia),
  id_docente INTEGER NOT NULL REFERENCES dim_docente(id_docente),
  paralelo TEXT NOT NULL,
  nota_final INTEGER NOT NULL,
  aprobado INTEGER NOT NULL,
  creditos INTEGER NOT NULL,
  asistencia_pct REAL NOT NULL
);

${insert('dim_carrera', ['id_carrera', 'nombre', 'facultad', 'semestres'], carreras)}

${insert('dim_materia', ['id_materia', 'nombre', 'id_carrera', 'semestre', 'creditos'], materias)}

${insert('dim_docente', ['id_docente', 'nombre', 'dedicacion', 'grado', 'anio_ingreso'], docentes)}

${insert('dim_periodo', ['id_periodo', 'codigo', 'anio', 'semestre'], periodos)}

${insert('dim_estudiante', ['id_estudiante', 'nombre', 'sexo', 'id_carrera', 'anio_ingreso', 'colegio_origen', 'beca'], estudiantes, 20)}

${insert('hecho_inscripcion',
  ['id_inscripcion', 'id_periodo', 'id_estudiante', 'id_materia', 'id_docente', 'paralelo', 'nota_final', 'aprobado', 'creditos', 'asistencia_pct'],
  inscripciones, 40)}
`.trim()

const tablas = [
  { nombre: 'hecho_inscripcion', rol: 'hecho', x: 470, y: 420, columnas: [
    { nombre: 'id_inscripcion', tipo: 'INTEGER', pk: true },
    { nombre: 'id_periodo', tipo: 'INTEGER', fk: 'dim_periodo' },
    { nombre: 'id_estudiante', tipo: 'INTEGER', fk: 'dim_estudiante' },
    { nombre: 'id_materia', tipo: 'INTEGER', fk: 'dim_materia' },
    { nombre: 'id_docente', tipo: 'INTEGER', fk: 'dim_docente' },
    { nombre: 'paralelo', tipo: 'TEXT' },
    { nombre: 'nota_final', tipo: 'INTEGER', metrica: true },
    { nombre: 'aprobado', tipo: 'INTEGER', metrica: true },
    { nombre: 'creditos', tipo: 'INTEGER', metrica: true },
    { nombre: 'asistencia_pct', tipo: 'REAL', metrica: true },
  ] },
  { nombre: 'dim_periodo', rol: 'dimension', x: 130, y: 130, columnas: [
    { nombre: 'id_periodo', tipo: 'INTEGER', pk: true },
    { nombre: 'codigo', tipo: 'TEXT' },
    { nombre: 'anio', tipo: 'INTEGER' },
    { nombre: 'semestre', tipo: 'INTEGER' },
  ] },
  { nombre: 'dim_estudiante', rol: 'dimension', x: 470, y: 120, columnas: [
    { nombre: 'id_estudiante', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'sexo', tipo: 'TEXT' },
    { nombre: 'id_carrera', tipo: 'INTEGER', fk: 'dim_carrera' },
    { nombre: 'anio_ingreso', tipo: 'INTEGER' },
    { nombre: 'colegio_origen', tipo: 'TEXT' },
    { nombre: 'beca', tipo: 'TEXT' },
  ] },
  { nombre: 'dim_docente', rol: 'dimension', x: 830, y: 130, columnas: [
    { nombre: 'id_docente', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'dedicacion', tipo: 'TEXT' },
    { nombre: 'grado', tipo: 'TEXT' },
    { nombre: 'anio_ingreso', tipo: 'INTEGER' },
  ] },
  { nombre: 'dim_materia', rol: 'dimension', x: 130, y: 700, columnas: [
    { nombre: 'id_materia', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'id_carrera', tipo: 'INTEGER', fk: 'dim_carrera' },
    { nombre: 'semestre', tipo: 'INTEGER' },
    { nombre: 'creditos', tipo: 'INTEGER' },
  ] },
  { nombre: 'dim_carrera', rol: 'dimension', x: 700, y: 720, columnas: [
    { nombre: 'id_carrera', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'facultad', tipo: 'TEXT' },
    { nombre: 'semestres', tipo: 'INTEGER' },
  ] },
]

const retos = [
  {
    id: 'upb-01', bloque: 'navegar', concept: 'JOIN + COUNT',
    title: 'Inscripciones por carrera',
    prompt: 'Cantidad de inscripciones por carrera del estudiante. Columnas: carrera, inscripciones. De mayor a menor.',
    hint: 'La carrera está en dim_estudiante, que apunta a dim_carrera.',
    starter: 'SELECT ca.nombre AS carrera, COUNT(*) AS inscripciones\nFROM hecho_inscripcion i\nJOIN dim_estudiante e ON ...\nJOIN dim_carrera ca ON ...;',
    expectedSql: `SELECT ca.nombre AS carrera, COUNT(*) AS inscripciones
FROM hecho_inscripcion i
JOIN dim_estudiante e ON i.id_estudiante = e.id_estudiante
JOIN dim_carrera ca ON e.id_carrera = ca.id_carrera
GROUP BY ca.nombre ORDER BY inscripciones DESC;`,
    orderMatters: true,
  },
  {
    id: 'upb-02', bloque: 'navegar', concept: 'Dimensión degenerada',
    title: 'El paralelo no tiene tabla',
    prompt: 'Inscripciones y nota promedio por paralelo, redondeada a 1. Columnas: paralelo, inscripciones, nota. Ordena por paralelo.',
    hint: 'El paralelo está en el hecho: no hay ninguna dimensión que unir. Eso es una dimensión degenerada.',
    starter: 'SELECT paralelo, COUNT(*) AS inscripciones, ROUND(AVG(nota_final), 1) AS nota\nFROM hecho_inscripcion\nGROUP BY ...;',
    expectedSql: `SELECT paralelo, COUNT(*) AS inscripciones, ROUND(AVG(nota_final), 1) AS nota
FROM hecho_inscripcion GROUP BY paralelo ORDER BY paralelo;`,
    orderMatters: true,
  },
  {
    id: 'upb-03', bloque: 'slice', concept: 'Filtro por período',
    title: 'Solo el último semestre',
    prompt: 'Para el período 2025-2: inscripciones por materia. Columnas: materia, inscripciones. De mayor a menor.',
    hint: 'El código del período está en dim_periodo.',
    starter: "SELECT m.nombre AS materia, COUNT(*) AS inscripciones\nFROM hecho_inscripcion i\nJOIN dim_materia m ON ...\nJOIN dim_periodo p ON ...\nWHERE p.codigo = ...;",
    expectedSql: `SELECT m.nombre AS materia, COUNT(*) AS inscripciones
FROM hecho_inscripcion i
JOIN dim_materia m ON i.id_materia = m.id_materia
JOIN dim_periodo p ON i.id_periodo = p.id_periodo
WHERE p.codigo = '2025-2'
GROUP BY m.nombre ORDER BY inscripciones DESC, m.nombre;`,
    orderMatters: true,
  },
  {
    id: 'upb-04', bloque: 'aditividad', concept: 'Tasa, no promedio de flags',
    title: 'Tasa de aprobación por materia',
    prompt: 'Porcentaje de aprobación por materia, redondeado a 2. Columnas: materia, inscripciones, tasa. De menor a mayor tasa (las más difíciles primero).',
    hint: 'aprobado es 0 o 1: SUM cuenta los aprobados y COUNT(*) el total.',
    starter: 'SELECT m.nombre AS materia, COUNT(*) AS inscripciones,\n  ROUND(SUM(i.aprobado) * 100.0 / COUNT(*), 2) AS tasa\nFROM ...;',
    expectedSql: `SELECT m.nombre AS materia, COUNT(*) AS inscripciones,
  ROUND(SUM(i.aprobado) * 100.0 / COUNT(*), 2) AS tasa
FROM hecho_inscripcion i JOIN dim_materia m ON i.id_materia = m.id_materia
GROUP BY m.nombre ORDER BY tasa ASC, m.nombre;`,
    orderMatters: true,
  },
  {
    id: 'upb-05', bloque: 'aditividad', concept: 'Créditos aditivos',
    title: 'Créditos cursados',
    prompt: 'Créditos totales cursados por carrera. Columnas: carrera, creditos. De mayor a menor.',
    hint: 'Los créditos sí se suman: cada inscripción aporta los suyos.',
    starter: 'SELECT ca.nombre AS carrera, SUM(i.creditos) AS creditos\nFROM hecho_inscripcion i\nJOIN ...;',
    expectedSql: `SELECT ca.nombre AS carrera, SUM(i.creditos) AS creditos
FROM hecho_inscripcion i
JOIN dim_estudiante e ON i.id_estudiante = e.id_estudiante
JOIN dim_carrera ca ON e.id_carrera = ca.id_carrera
GROUP BY ca.nombre ORDER BY creditos DESC;`,
    orderMatters: true,
  },
  {
    id: 'upb-06', bloque: 'granularidad', concept: 'Roll-up a facultad',
    title: 'De carrera a facultad',
    prompt: 'Inscripciones y nota promedio por facultad, redondeada a 1. Columnas: facultad, inscripciones, nota. De mayor a menor cantidad.',
    hint: 'La facultad es el nivel superior de la jerarquía dentro de dim_carrera.',
    starter: 'SELECT ca.facultad, COUNT(*) AS inscripciones, ...\nFROM hecho_inscripcion i\nJOIN ...;',
    expectedSql: `SELECT ca.facultad, COUNT(*) AS inscripciones, ROUND(AVG(i.nota_final), 1) AS nota
FROM hecho_inscripcion i
JOIN dim_estudiante e ON i.id_estudiante = e.id_estudiante
JOIN dim_carrera ca ON e.id_carrera = ca.id_carrera
GROUP BY ca.facultad ORDER BY inscripciones DESC;`,
    orderMatters: true,
  },
  {
    id: 'upb-07', bloque: 'tiempo', concept: 'Evolución por período',
    title: 'Cómo cambió la matrícula',
    prompt: 'Inscripciones y estudiantes distintos por período. Columnas: codigo, inscripciones, estudiantes. En orden de período.',
    hint: 'Un estudiante se inscribe a varias materias: el conteo de personas necesita DISTINCT.',
    starter: 'SELECT p.codigo, COUNT(*) AS inscripciones, COUNT(DISTINCT ...) AS estudiantes\nFROM ...;',
    expectedSql: `SELECT p.codigo, COUNT(*) AS inscripciones, COUNT(DISTINCT i.id_estudiante) AS estudiantes
FROM hecho_inscripcion i JOIN dim_periodo p ON i.id_periodo = p.id_periodo
GROUP BY p.codigo ORDER BY p.codigo;`,
    orderMatters: true,
  },
  {
    id: 'upb-08', bloque: 'tiempo', concept: 'Comparar semestres',
    title: 'Primer contra segundo semestre',
    prompt: 'Por año: inscripciones del semestre 1 y del semestre 2 en columnas separadas. Columnas: anio, sem_1, sem_2. En orden de año.',
    hint: 'SUM con CASE WHEN sobre el semestre, agrupando por año.',
    starter: 'SELECT p.anio,\n  SUM(CASE WHEN p.semestre = 1 THEN 1 ELSE 0 END) AS sem_1,\n  ...\nFROM ...;',
    expectedSql: `SELECT p.anio,
  SUM(CASE WHEN p.semestre = 1 THEN 1 ELSE 0 END) AS sem_1,
  SUM(CASE WHEN p.semestre = 2 THEN 1 ELSE 0 END) AS sem_2
FROM hecho_inscripcion i JOIN dim_periodo p ON i.id_periodo = p.id_periodo
GROUP BY p.anio ORDER BY p.anio;`,
    orderMatters: true,
  },
  {
    id: 'upb-09', bloque: 'ventanas', concept: 'Ranking por grupo',
    title: 'La materia más difícil de cada facultad',
    prompt: 'Para cada facultad, la materia con menor tasa de aprobación. Columnas: facultad, materia, tasa. Ordena por facultad.',
    hint: 'Calcula la tasa por materia y facultad, y usa ROW_NUMBER() con PARTITION BY facultad ordenando ascendente.',
    starter: 'SELECT facultad, materia, tasa FROM (\n  SELECT ..., ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ... ASC) AS puesto\n  FROM ...\n) WHERE puesto = 1;',
    expectedSql: `SELECT facultad, materia, tasa FROM (
  SELECT ca.facultad AS facultad, m.nombre AS materia,
    ROUND(SUM(i.aprobado) * 100.0 / COUNT(*), 2) AS tasa,
    ROW_NUMBER() OVER (PARTITION BY ca.facultad ORDER BY SUM(i.aprobado) * 1.0 / COUNT(*) ASC, m.nombre) AS puesto
  FROM hecho_inscripcion i
  JOIN dim_materia m ON i.id_materia = m.id_materia
  JOIN dim_carrera ca ON m.id_carrera = ca.id_carrera
  GROUP BY ca.facultad, m.nombre
) WHERE puesto = 1 ORDER BY facultad;`,
    orderMatters: true,
  },
  {
    id: 'upb-10', bloque: 'ventanas', concept: 'Promedio del estudiante',
    title: 'Los diez mejores promedios',
    prompt: 'Los 10 estudiantes con mejor nota promedio, con su carrera. Columnas: nombre, carrera, promedio redondeado a 1, materias.',
    hint: 'Agrupa por estudiante, y ordena por el promedio. Muestra también cuántas materias cursó.',
    starter: 'SELECT e.nombre, ca.nombre AS carrera, ROUND(AVG(i.nota_final), 1) AS promedio, COUNT(*) AS materias\nFROM ...\nLIMIT 10;',
    expectedSql: `SELECT e.nombre, ca.nombre AS carrera, ROUND(AVG(i.nota_final), 1) AS promedio, COUNT(*) AS materias
FROM hecho_inscripcion i
JOIN dim_estudiante e ON i.id_estudiante = e.id_estudiante
JOIN dim_carrera ca ON e.id_carrera = ca.id_carrera
GROUP BY e.nombre, ca.nombre ORDER BY promedio DESC, e.nombre LIMIT 10;`,
    orderMatters: true,
  },
  {
    id: 'upb-11', bloque: 'trampas', concept: 'Doble conteo',
    title: 'Estudiantes no es inscripciones',
    prompt: 'Cuántos estudiantes DISTINTOS tiene cada carrera según el hecho. Columnas: carrera, estudiantes. De mayor a menor.',
    hint: 'Cada estudiante aparece una vez por materia y por período: son muchas filas por persona.',
    starter: 'SELECT ca.nombre AS carrera, COUNT(...) AS estudiantes\nFROM hecho_inscripcion i\nJOIN ...;',
    expectedSql: `SELECT ca.nombre AS carrera, COUNT(DISTINCT i.id_estudiante) AS estudiantes
FROM hecho_inscripcion i
JOIN dim_estudiante e ON i.id_estudiante = e.id_estudiante
JOIN dim_carrera ca ON e.id_carrera = ca.id_carrera
GROUP BY ca.nombre ORDER BY estudiantes DESC, ca.nombre;`,
    orderMatters: true,
    trampa: 'COUNT(*) cuenta inscripciones y multiplica por cuatro o cinco la matricula real de cada carrera.',
  },
  {
    id: 'upb-12', bloque: 'trampas', concept: 'Correlación aparente',
    title: 'Asistencia y nota',
    prompt: 'Nota promedio agrupada por tramo de asistencia: "Menos de 70", "70 a 85" y "Mas de 85". Columnas: tramo, inscripciones, nota. Ordena por tramo.',
    hint: 'CASE WHEN arma los tramos; se agrupa por la misma expresión.',
    starter: "SELECT CASE WHEN asistencia_pct < 70 THEN 'Menos de 70'\n            WHEN asistencia_pct <= 85 THEN '70 a 85'\n            ELSE 'Mas de 85' END AS tramo,\n  COUNT(*) AS inscripciones, ROUND(AVG(nota_final), 1) AS nota\nFROM hecho_inscripcion\nGROUP BY ...;",
    expectedSql: `SELECT CASE WHEN asistencia_pct < 70 THEN 'Menos de 70'
            WHEN asistencia_pct <= 85 THEN '70 a 85'
            ELSE 'Mas de 85' END AS tramo,
  COUNT(*) AS inscripciones, ROUND(AVG(nota_final), 1) AS nota
FROM hecho_inscripcion GROUP BY tramo ORDER BY tramo;`,
    orderMatters: true,
    trampa: 'Si los tres tramos dan notas parecidas, la conclusion NO es que asistir no sirva: en estos datos la nota se generó aparte de la asistencia. Un cruce sin relación causal es la trampa mas facil de vender en un tablero.',
  },
]

const dataset = {
  id: 'upb',
  nombre: 'UPB',
  subtitulo: 'Universidad Privada Boliviana · La Paz',
  dominio: 'Educación',
  tipo: 'estrella',
  concepto: 'Dimensión degenerada y jerarquías. El paralelo vive dentro del hecho porque no tiene atributos propios: saber cuándo NO crear una dimensión es parte del oficio. Además el grain es el semestre, no el día, así que la dimensión de tiempo es el período académico.',
  nota: 'Las carreras y facultades corresponden a la oferta de la UPB. Estudiantes, docentes y notas son inventados: cualquier parecido con una persona real es casualidad.',
  tablas,
  retos,
}

const archivo = `${encabezado('UPB · Universidad Privada Boliviana', 'upb.mjs')}

export const upb = ${JSON.stringify(dataset, null, 2).replace(/"([a-zA-Z_][a-zA-Z0-9_]*)":/g, '$1:')}

upb.seedSql = String.raw\`
${seed.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}
\`
`

writeFileSync(SALIDA, archivo)
console.log(`upb.js escrito · ${inscripciones.length} inscripciones · ${(archivo.length / 1024).toFixed(0)} KB`)
