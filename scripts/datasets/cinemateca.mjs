/*
 * Genera front/src/playground/datasets/cinemateca.js
 *
 * La Cinemateca enseña el HECHO SIN MÉTRICA (factless fact table).
 *
 * hecho_asistencia solo tiene claves foráneas: no hay importe ni cantidad que
 * sumar. La métrica ES la existencia de la fila, y se mide con COUNT(*).
 *
 * De ahí sale la otra mitad de la lección: para responder "qué NO pasó" —qué
 * película no tuvo público, qué sala quedó libre— hay que salir del hecho y
 * consultar las dimensiones con LEFT JOIN. Un hecho sin métrica es también un
 * hecho de cobertura.
 */
import { writeFileSync } from 'fs'
import { rng, entre, pesado, insert, dimTiempo, idTiempo, fechas, encabezado } from './lib.mjs'

const SALIDA = new URL('../../front/src/playground/datasets/cinemateca.js', import.meta.url)
const r = rng(19760101)

const salas = [
  [1, 'Sala 1', 180, 'Planta baja'],
  [2, 'Sala 2', 90, 'Primer piso'],
  [3, 'Sala 3', 60, 'Primer piso'],
  [4, 'Auditorio', 220, 'Segundo piso'],
]

const ciclos = [
  [1, 'Cine boliviano contemporaneo', 'Nacional'],
  [2, 'Retrospectiva Jorge Sanjines', 'Nacional'],
  [3, 'Documental andino', 'Documental'],
  [4, 'Clasicos del cine mudo', 'Internacional'],
  [5, 'Nuevo cine latinoamericano', 'Internacional'],
  [6, 'Animacion independiente', 'Internacional'],
  [7, 'Cine y memoria', 'Documental'],
]

// Películas bolivianas reconocidas junto a clásicos de la programación.
const peliculas = [
  [1, 'Yawar Mallku', 1969, 'Bolivia', 'Drama', 70, 1],
  [2, 'La nacion clandestina', 1989, 'Bolivia', 'Drama', 128, 2],
  [3, 'El coraje del pueblo', 1971, 'Bolivia', 'Documental', 94, 2],
  [4, 'Ukamau', 1966, 'Bolivia', 'Drama', 75, 2],
  [5, 'Cuestion de fe', 1995, 'Bolivia', 'Comedia', 88, 1],
  [6, 'Dependencia sexual', 2003, 'Bolivia', 'Drama', 106, 1],
  [7, 'Zona sur', 2009, 'Bolivia', 'Drama', 109, 1],
  [8, 'El dia que murio el silencio', 1998, 'Bolivia', 'Drama', 100, 1],
  [9, 'Los viejos', 2011, 'Bolivia', 'Documental', 78, 3],
  [10, 'Mineros de Potosi', 2015, 'Bolivia', 'Documental', 82, 3],
  [11, 'Voces del altiplano', 2018, 'Bolivia', 'Documental', 71, 3],
  [12, 'El acorazado Potemkin', 1925, 'URSS', 'Drama', 75, 4],
  [13, 'Metropolis', 1927, 'Alemania', 'Ciencia ficcion', 148, 4],
  [14, 'El gabinete del Dr. Caligari', 1920, 'Alemania', 'Terror', 76, 4],
  [15, 'Los olvidados', 1950, 'Mexico', 'Drama', 80, 5],
  [16, 'La hora de los hornos', 1968, 'Argentina', 'Documental', 260, 5],
  [17, 'Memorias del subdesarrollo', 1968, 'Cuba', 'Drama', 97, 5],
  [18, 'Vals con Bashir', 2008, 'Israel', 'Animacion', 90, 6],
  [19, 'El viaje de Chihiro', 2001, 'Japon', 'Animacion', 125, 6],
  // Estas dos entran al catalogo pero NUNCA se proyectan: son el material del
  // reto de cobertura, que solo se puede resolver con LEFT JOIN.
  [20, 'Cronicas de la Guerra del Chaco', 2021, 'Bolivia', 'Documental', 95, 7],
  [21, 'Archivo perdido', 2020, 'Bolivia', 'Documental', 64, 7],
]

const PELICULAS_SIN_FUNCION = new Set([20, 21])

const publicos = [
  [1, 'General', 20],
  [2, 'Estudiante', 12],
  [3, 'Socio Cinemateca', 0],
  [4, 'Invitado', 0],
]

// --- Hecho sin métrica: una fila = una persona entró a una función ---------

// Un trimestre de programacion: con capacidades y ocupacion REALES, un año
// entero serian decenas de miles de personas y el archivo pesaria 1,5 MB.
// Se acorta el periodo en vez de falsear los numeros.
const dias = fechas('2025-01-01', '2025-03-31')
const asistencias = []
let idAsistencia = 0
let idFuncion = 0
const funciones = []

for (const fecha of dias) {
  const d = new Date(fecha + 'T00:00:00Z')
  if (d.getUTCDay() === 1) continue // los lunes no hay funcion

  const finDeSemana = d.getUTCDay() === 0 || d.getUTCDay() === 6

  for (let f = 0, n = finDeSemana ? entre(r, 2, 3) : entre(r, 1, 2); f < n; f++) {
    idFuncion++
    let pelicula = entre(r, 1, peliculas.length)
    while (PELICULAS_SIN_FUNCION.has(pelicula)) pelicula = entre(r, 1, peliculas.length - 2)

    const sala = Number(pesado(r, [['1', 5], ['2', 4], ['3', 3], ['4', 2]]))
    const ciclo = peliculas[pelicula - 1][6]
    const horario = Number(pesado(r, [['16', 2], ['18', 4], ['20', 5]]))
    funciones.push([idFuncion, idTiempo(fecha), pelicula, sala, ciclo, horario])

    // Cuánta gente entró: ocupación real de la sala, sin escalar.
    const capacidad = salas[sala - 1][2]
    const asistentes = entre(r, Math.round(capacidad * 0.08), Math.round(capacidad * (finDeSemana ? 0.7 : 0.45)))

    for (let a = 0; a < asistentes; a++) {
      idAsistencia++
      asistencias.push([
        idAsistencia,
        idFuncion,
        idTiempo(fecha),
        pelicula,
        sala,
        ciclo,
        Number(pesado(r, [['1', 5], ['2', 4], ['3', 2], ['4', 1]])),
      ])
    }
  }
}

const seed = `
-- ==========================================================================
-- CINEMATECA BOLIVIANA  ·  La Paz
-- Institucion fundada en 1976 para preservar y difundir el cine boliviano.
--
-- hecho_asistencia es un HECHO SIN METRICA (factless fact table): solo tiene
-- claves foraneas. No hay nada que sumar. La metrica es que la fila EXISTA,
-- y se cuenta con COUNT(*).
--
-- Por eso este modelo tambien sirve para preguntar por lo que NO pasó: que
-- pelicula del catalogo no tuvo ni una funcion. Eso no esta en el hecho —
-- justamente porque no ocurrio— y solo aparece con un LEFT JOIN desde la
-- dimension.
-- ==========================================================================

${dimTiempo('2025-01-01', '2025-03-31')}

CREATE TABLE dim_sala (
  id_sala INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  capacidad INTEGER NOT NULL,
  ubicacion TEXT NOT NULL
);

CREATE TABLE dim_ciclo (
  id_ciclo INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL
);

CREATE TABLE dim_pelicula (
  id_pelicula INTEGER PRIMARY KEY,
  titulo TEXT NOT NULL,
  anio INTEGER NOT NULL,
  pais TEXT NOT NULL,
  genero TEXT NOT NULL,
  duracion_min INTEGER NOT NULL,
  id_ciclo INTEGER NOT NULL REFERENCES dim_ciclo(id_ciclo)
);

CREATE TABLE dim_publico (
  id_publico INTEGER PRIMARY KEY,
  tipo TEXT NOT NULL,
  precio REAL NOT NULL
);

-- Grain: una funcion programada.
CREATE TABLE hecho_funcion (
  id_funcion INTEGER PRIMARY KEY,
  id_tiempo INTEGER NOT NULL REFERENCES dim_tiempo(id_tiempo),
  id_pelicula INTEGER NOT NULL REFERENCES dim_pelicula(id_pelicula),
  id_sala INTEGER NOT NULL REFERENCES dim_sala(id_sala),
  id_ciclo INTEGER NOT NULL REFERENCES dim_ciclo(id_ciclo),
  horario INTEGER NOT NULL
);

-- Grain: una persona en una funcion. SIN METRICAS: solo claves.
CREATE TABLE hecho_asistencia (
  id_asistencia INTEGER PRIMARY KEY,
  id_funcion INTEGER NOT NULL REFERENCES hecho_funcion(id_funcion),
  id_tiempo INTEGER NOT NULL REFERENCES dim_tiempo(id_tiempo),
  id_pelicula INTEGER NOT NULL REFERENCES dim_pelicula(id_pelicula),
  id_sala INTEGER NOT NULL REFERENCES dim_sala(id_sala),
  id_ciclo INTEGER NOT NULL REFERENCES dim_ciclo(id_ciclo),
  id_publico INTEGER NOT NULL REFERENCES dim_publico(id_publico)
);

${insert('dim_sala', ['id_sala', 'nombre', 'capacidad', 'ubicacion'], salas)}

${insert('dim_ciclo', ['id_ciclo', 'nombre', 'tipo'], ciclos)}

${insert('dim_pelicula', ['id_pelicula', 'titulo', 'anio', 'pais', 'genero', 'duracion_min', 'id_ciclo'], peliculas)}

${insert('dim_publico', ['id_publico', 'tipo', 'precio'], publicos)}

${insert('hecho_funcion', ['id_funcion', 'id_tiempo', 'id_pelicula', 'id_sala', 'id_ciclo', 'horario'], funciones, 40)}

${insert('hecho_asistencia',
  ['id_asistencia', 'id_funcion', 'id_tiempo', 'id_pelicula', 'id_sala', 'id_ciclo', 'id_publico'],
  asistencias, 60)}
`.trim()

const tablas = [
  { nombre: 'hecho_asistencia', rol: 'hecho', x: 300, y: 430, columnas: [
    { nombre: 'id_asistencia', tipo: 'INTEGER', pk: true },
    { nombre: 'id_funcion', tipo: 'INTEGER', fk: 'hecho_funcion' },
    { nombre: 'id_tiempo', tipo: 'INTEGER', fk: 'dim_tiempo' },
    { nombre: 'id_pelicula', tipo: 'INTEGER', fk: 'dim_pelicula' },
    { nombre: 'id_sala', tipo: 'INTEGER', fk: 'dim_sala' },
    { nombre: 'id_ciclo', tipo: 'INTEGER' },
    { nombre: 'id_publico', tipo: 'INTEGER', fk: 'dim_publico' },
  ] },
  { nombre: 'hecho_funcion', rol: 'hecho', x: 780, y: 430, columnas: [
    { nombre: 'id_funcion', tipo: 'INTEGER', pk: true },
    { nombre: 'id_tiempo', tipo: 'INTEGER' },
    { nombre: 'id_pelicula', tipo: 'INTEGER' },
    { nombre: 'id_sala', tipo: 'INTEGER' },
    { nombre: 'id_ciclo', tipo: 'INTEGER' },
    { nombre: 'horario', tipo: 'INTEGER' },
  ] },
  { nombre: 'dim_tiempo', rol: 'dimension', x: 540, y: 110, columnas: [
    { nombre: 'id_tiempo', tipo: 'INTEGER', pk: true },
    { nombre: 'fecha', tipo: 'TEXT' },
    { nombre: 'anio', tipo: 'INTEGER' },
    { nombre: 'mes', tipo: 'INTEGER' },
    { nombre: 'nombre_mes', tipo: 'TEXT' },
    { nombre: 'trimestre', tipo: 'INTEGER' },
    { nombre: 'dia_semana', tipo: 'TEXT' },
    { nombre: 'es_fin_semana', tipo: 'INTEGER' },
  ] },
  { nombre: 'dim_pelicula', rol: 'dimension', x: 120, y: 730, columnas: [
    { nombre: 'id_pelicula', tipo: 'INTEGER', pk: true },
    { nombre: 'titulo', tipo: 'TEXT' },
    { nombre: 'anio', tipo: 'INTEGER' },
    { nombre: 'pais', tipo: 'TEXT' },
    { nombre: 'genero', tipo: 'TEXT' },
    { nombre: 'duracion_min', tipo: 'INTEGER' },
    { nombre: 'id_ciclo', tipo: 'INTEGER', fk: 'dim_ciclo' },
  ] },
  { nombre: 'dim_ciclo', rol: 'dimension', x: 530, y: 760, columnas: [
    { nombre: 'id_ciclo', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'tipo', tipo: 'TEXT' },
  ] },
  { nombre: 'dim_sala', rol: 'dimension', x: 880, y: 760, columnas: [
    { nombre: 'id_sala', tipo: 'INTEGER', pk: true },
    { nombre: 'nombre', tipo: 'TEXT' },
    { nombre: 'capacidad', tipo: 'INTEGER' },
    { nombre: 'ubicacion', tipo: 'TEXT' },
  ] },
  { nombre: 'dim_publico', rol: 'dimension', x: 120, y: 130, columnas: [
    { nombre: 'id_publico', tipo: 'INTEGER', pk: true },
    { nombre: 'tipo', tipo: 'TEXT' },
    { nombre: 'precio', tipo: 'REAL' },
  ] },
]

const retos = [
  {
    id: 'cin-01', bloque: 'navegar', concept: 'Hecho sin métrica',
    title: 'La métrica es contar filas',
    prompt: 'Asistentes por película. Columnas: titulo, asistentes. Los 10 primeros, de mayor a menor.',
    hint: 'No hay ninguna columna numérica que sumar: cada fila es una persona, así que COUNT(*) es la métrica.',
    starter: 'SELECT p.titulo, COUNT(*) AS asistentes\nFROM hecho_asistencia a\nJOIN dim_pelicula p ON ...\nLIMIT 10;',
    expectedSql: `SELECT p.titulo, COUNT(*) AS asistentes
FROM hecho_asistencia a JOIN dim_pelicula p ON a.id_pelicula = p.id_pelicula
GROUP BY p.titulo ORDER BY asistentes DESC, p.titulo LIMIT 10;`,
    orderMatters: true,
  },
  {
    id: 'cin-02', bloque: 'navegar', concept: 'Agrupar por dimensión',
    title: 'Público por ciclo',
    prompt: 'Asistentes por ciclo. Columnas: ciclo, asistentes. De mayor a menor.',
    hint: 'El ciclo está denormalizado en el hecho, pero el nombre está en dim_ciclo.',
    starter: 'SELECT c.nombre AS ciclo, COUNT(*) AS asistentes\nFROM hecho_asistencia a\nJOIN dim_ciclo c ON ...;',
    expectedSql: `SELECT c.nombre AS ciclo, COUNT(*) AS asistentes
FROM hecho_asistencia a JOIN dim_ciclo c ON a.id_ciclo = c.id_ciclo
GROUP BY c.nombre ORDER BY asistentes DESC;`,
    orderMatters: true,
  },
  {
    id: 'cin-03', bloque: 'trampas', concept: 'Cobertura',
    title: 'Qué películas NO se proyectaron',
    prompt: 'Títulos del catálogo que no tuvieron ni una sola función. Columnas: titulo, anio. Ordena por título.',
    hint: 'Lo que no pasó no está en el hecho. Sal de dim_pelicula con LEFT JOIN y quédate con las que no encontraron pareja.',
    starter: 'SELECT p.titulo, p.anio\nFROM dim_pelicula p\nLEFT JOIN hecho_funcion f ON ...\nWHERE f.id_funcion IS NULL\n...;',
    expectedSql: `SELECT p.titulo, p.anio
FROM dim_pelicula p
LEFT JOIN hecho_funcion f ON f.id_pelicula = p.id_pelicula
WHERE f.id_funcion IS NULL
ORDER BY p.titulo;`,
    orderMatters: true,
    trampa: 'Buscar esto dentro del hecho no da nada: la fila no existe justamente porque el evento no ocurrio. Un hecho sin metrica tambien es un hecho de COBERTURA, y la cobertura se mide desde la dimension.',
  },
  {
    id: 'cin-04', bloque: 'trampas', concept: 'Contar eventos distintos',
    title: 'Funciones no es asistentes',
    prompt: 'Por película: funciones programadas y asistentes totales. Columnas: titulo, funciones, asistentes. Los 10 primeros por asistentes.',
    hint: 'Las funciones se cuentan con COUNT(DISTINCT id_funcion) sobre el hecho de asistencia, o desde hecho_funcion.',
    starter: 'SELECT p.titulo, COUNT(DISTINCT a.id_funcion) AS funciones, COUNT(*) AS asistentes\nFROM hecho_asistencia a\nJOIN ...;',
    expectedSql: `SELECT p.titulo, COUNT(DISTINCT a.id_funcion) AS funciones, COUNT(*) AS asistentes
FROM hecho_asistencia a JOIN dim_pelicula p ON a.id_pelicula = p.id_pelicula
GROUP BY p.titulo ORDER BY asistentes DESC, p.titulo LIMIT 10;`,
    orderMatters: true,
  },
  {
    id: 'cin-05', bloque: 'slice', concept: 'Filtro por atributo',
    title: 'Solo cine boliviano',
    prompt: 'Asistentes a películas de Bolivia, agrupados por género. Columnas: genero, asistentes. De mayor a menor.',
    hint: 'El país es un atributo de dim_pelicula.',
    starter: "SELECT p.genero, COUNT(*) AS asistentes\nFROM hecho_asistencia a\nJOIN dim_pelicula p ON ...\nWHERE p.pais = ...;",
    expectedSql: `SELECT p.genero, COUNT(*) AS asistentes
FROM hecho_asistencia a JOIN dim_pelicula p ON a.id_pelicula = p.id_pelicula
WHERE p.pais = 'Bolivia'
GROUP BY p.genero ORDER BY asistentes DESC, p.genero;`,
    orderMatters: true,
  },
  {
    id: 'cin-06', bloque: 'slice', concept: 'Cruce de dimensiones',
    title: 'Sala por horario',
    prompt: 'Asistentes por sala y horario. Columnas: sala, horario, asistentes. Ordena por sala y horario.',
    hint: 'El horario está en hecho_funcion: hay que llegar hasta ahí desde la asistencia.',
    starter: 'SELECT s.nombre AS sala, f.horario, COUNT(*) AS asistentes\nFROM hecho_asistencia a\nJOIN hecho_funcion f ON ...\nJOIN dim_sala s ON ...;',
    expectedSql: `SELECT s.nombre AS sala, f.horario, COUNT(*) AS asistentes
FROM hecho_asistencia a
JOIN hecho_funcion f ON a.id_funcion = f.id_funcion
JOIN dim_sala s ON a.id_sala = s.id_sala
GROUP BY s.nombre, f.horario ORDER BY s.nombre, f.horario;`,
    orderMatters: true,
  },
  {
    id: 'cin-07', bloque: 'aditividad', concept: 'Precio desde la dimensión',
    title: 'Recaudación sin columna de importe',
    prompt: 'Recaudación total por tipo de público. Columnas: tipo, asistentes, recaudacion redondeada a 2. De mayor a menor recaudación.',
    hint: 'El hecho no guarda el precio: está en dim_publico. Se multiplica el conteo por el precio de la dimensión.',
    starter: 'SELECT pu.tipo, COUNT(*) AS asistentes, ROUND(COUNT(*) * pu.precio, 2) AS recaudacion\nFROM hecho_asistencia a\nJOIN dim_publico pu ON ...;',
    expectedSql: `SELECT pu.tipo, COUNT(*) AS asistentes, ROUND(COUNT(*) * pu.precio, 2) AS recaudacion
FROM hecho_asistencia a JOIN dim_publico pu ON a.id_publico = pu.id_publico
GROUP BY pu.tipo, pu.precio ORDER BY recaudacion DESC;`,
    orderMatters: true,
  },
  {
    id: 'cin-08', bloque: 'aditividad', concept: 'Ocupación',
    title: 'Qué tan llenas están las salas',
    prompt: 'Ocupación promedio por sala: asistentes de cada función sobre la capacidad de la sala, por cien, promediado y redondeado a 2. Columnas: sala, capacidad, ocupacion_pct. De mayor a menor.',
    hint: 'Primero los asistentes por función, y después el promedio de la ocupación de esas funciones.',
    starter: 'SELECT sala, capacidad, ROUND(AVG(pct), 2) AS ocupacion_pct\nFROM (\n  SELECT ..., COUNT(*) * 100.0 / s.capacidad AS pct\n  FROM ... GROUP BY a.id_funcion, ...\n) GROUP BY sala, capacidad;',
    expectedSql: `SELECT sala, capacidad, ROUND(AVG(pct), 2) AS ocupacion_pct FROM (
  SELECT s.nombre AS sala, s.capacidad AS capacidad, COUNT(*) * 100.0 / s.capacidad AS pct
  FROM hecho_asistencia a JOIN dim_sala s ON a.id_sala = s.id_sala
  GROUP BY a.id_funcion, s.nombre, s.capacidad
) GROUP BY sala, capacidad ORDER BY ocupacion_pct DESC;`,
    orderMatters: true,
  },
  {
    id: 'cin-09', bloque: 'tiempo', concept: 'Estacionalidad',
    title: 'El mes con más público',
    prompt: 'Asistentes por mes. Columnas: nombre_mes, asistentes. En orden de mes.',
    hint: 'Agrupa por mes y nombre_mes para poder ordenar cronológicamente.',
    starter: 'SELECT t.nombre_mes, COUNT(*) AS asistentes\nFROM hecho_asistencia a\nJOIN dim_tiempo t ON ...;',
    expectedSql: `SELECT t.nombre_mes, COUNT(*) AS asistentes
FROM hecho_asistencia a JOIN dim_tiempo t ON a.id_tiempo = t.id_tiempo
GROUP BY t.mes, t.nombre_mes ORDER BY t.mes;`,
    orderMatters: true,
  },
  {
    id: 'cin-10', bloque: 'tiempo', concept: 'Día de la semana',
    title: 'El lunes no hay función',
    prompt: 'Asistentes por día de la semana. Columnas: dia_semana, asistentes. De mayor a menor. Fíjate qué día falta.',
    hint: 'Si un día no aparece en el resultado es porque no hay ni una fila: la Cinemateca cierra los lunes.',
    starter: 'SELECT t.dia_semana, COUNT(*) AS asistentes\nFROM hecho_asistencia a\nJOIN dim_tiempo t ON ...;',
    expectedSql: `SELECT t.dia_semana, COUNT(*) AS asistentes
FROM hecho_asistencia a JOIN dim_tiempo t ON a.id_tiempo = t.id_tiempo
GROUP BY t.dia_semana ORDER BY asistentes DESC;`,
    orderMatters: true,
  },
  {
    id: 'cin-11', bloque: 'ventanas', concept: 'Participación',
    title: 'Peso de cada ciclo',
    prompt: 'Por ciclo: asistentes y su porcentaje del total, redondeado a 2. Columnas: ciclo, asistentes, participacion. De mayor a menor.',
    hint: 'SUM(...) OVER () sobre el conteo ya agregado.',
    starter: 'SELECT ciclo, asistentes,\n  ROUND(asistentes * 100.0 / SUM(asistentes) OVER (), 2) AS participacion\nFROM ( ... );',
    expectedSql: `SELECT ciclo, asistentes, ROUND(asistentes * 100.0 / SUM(asistentes) OVER (), 2) AS participacion FROM (
  SELECT c.nombre AS ciclo, COUNT(*) AS asistentes
  FROM hecho_asistencia a JOIN dim_ciclo c ON a.id_ciclo = c.id_ciclo
  GROUP BY c.nombre
) ORDER BY asistentes DESC;`,
    orderMatters: true,
  },
  {
    id: 'cin-12', bloque: 'granularidad', concept: 'Dos grains',
    title: 'Promedio de público por función',
    prompt: 'Por ciclo: funciones, asistentes y promedio de asistentes por función redondeado a 1. Columnas: ciclo, funciones, asistentes, promedio. De mayor a menor promedio.',
    hint: 'Las funciones y las asistencias tienen grain distinto. Cuenta las funciones con DISTINCT dentro de la misma consulta.',
    starter: 'SELECT c.nombre AS ciclo, COUNT(DISTINCT a.id_funcion) AS funciones, COUNT(*) AS asistentes,\n  ROUND(COUNT(*) * 1.0 / COUNT(DISTINCT a.id_funcion), 1) AS promedio\nFROM ...;',
    expectedSql: `SELECT c.nombre AS ciclo, COUNT(DISTINCT a.id_funcion) AS funciones, COUNT(*) AS asistentes,
  ROUND(COUNT(*) * 1.0 / COUNT(DISTINCT a.id_funcion), 1) AS promedio
FROM hecho_asistencia a JOIN dim_ciclo c ON a.id_ciclo = c.id_ciclo
GROUP BY c.nombre ORDER BY promedio DESC;`,
    orderMatters: true,
  },
]

const dataset = {
  id: 'cinemateca',
  nombre: 'Cinemateca Boliviana',
  subtitulo: 'Cultura · La Paz',
  dominio: 'Cultura',
  tipo: 'estrella',
  concepto: 'Hecho sin métrica (factless fact table). hecho_asistencia solo tiene claves: la métrica es que la fila exista, y se cuenta con COUNT(*). De ahí sale la otra mitad de la lección: para saber qué película NO se proyectó hay que salir del hecho con un LEFT JOIN, porque lo que no ocurrió no deja fila.',
  nota: 'La Cinemateca Boliviana fue fundada en 1976 en La Paz y conserva el patrimonio audiovisual del país; la entrada general ronda los Bs 20. Las películas y los ciclos son reales o plausibles; la programación y la asistencia corresponden a un trimestre didáctico de 2025.',
  tablas,
  retos,
}

const archivo = `${encabezado('Cinemateca Boliviana · La Paz', 'cinemateca.mjs')}

export const cinemateca = ${JSON.stringify(dataset, null, 2).replace(/"([a-zA-Z_][a-zA-Z0-9_]*)":/g, '$1:')}

cinemateca.seedSql = String.raw\`
${seed.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}
\`
`

writeFileSync(SALIDA, archivo)
console.log(`cinemateca.js escrito · ${funciones.length} funciones · ${asistencias.length} asistencias · ${(archivo.length / 1024).toFixed(0)} KB`)
