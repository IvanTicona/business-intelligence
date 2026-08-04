// Caso SpazioGym: Práctica 4 (OLTP → OLAP, data mart en estrella única).
// El OLTP se muestra como punto de partida; el alumno diseña la estrella y
// después consulta una estrella ya poblada para escribir los KPIs.

export const oltpTables = [
  { table: 'sucursal', columns: ['id_sucursal PK', 'nombre', 'ciudad'] },
  { table: 'plan', columns: ['id_plan PK', 'nombre', 'precio_mensual'] },
  { table: 'socio', columns: ['id_socio PK', 'nombre', 'ciudad', 'fecha_alta', 'id_sucursal FK'] },
  { table: 'membresia', columns: ['id_membresia PK', 'id_socio FK', 'id_plan FK', 'fecha_inicio', 'fecha_fin', 'estado'] },
  { table: 'instructor', columns: ['id_instructor PK', 'nombre', 'especialidad'] },
  { table: 'clase', columns: ['id_clase PK', 'disciplina', 'id_instructor FK', 'id_sucursal FK', 'fecha_hora', 'cupo'] },
  { table: 'reserva', columns: ['id_reserva PK', 'id_clase FK', 'id_socio FK', 'asistio'] },
  { table: 'pago', columns: ['id_pago PK', 'id_membresia FK', 'fecha', 'monto', 'medio'] },
]

export const businessGoals = [
  'Saber si los socios realmente usan lo que pagan.',
  'Detectar qué disciplinas llenan sala y cuáles se vacían.',
  'Comparar el rendimiento entre sucursales.',
  'Entender la evolución mes a mes para planificar instructores.',
]

/**
 * El grain es LA decisión de la práctica: define qué representa una fila del
 * hecho y, con eso, todo lo que la estrella puede o no responder.
 */
export const grainOptions = [
  {
    id: 'socio',
    label: 'Una fila por socio',
    correct: false,
    why: 'Demasiado grueso. Perdés la clase, la fecha y la disciplina: no puedes responder ni ocupación ni evolución mensual. Un hecho no es un maestro de socios.',
  },
  {
    id: 'reserva',
    label: 'Una fila por reserva de un socio a una clase',
    correct: true,
    why: 'Correcto. Es el evento transaccional más atómico del negocio. Desde aquí se agregan las 4 metas: asistencia, ocupación, sucursal y evolución. Regla de oro: elige SIEMPRE el grain más fino que el negocio necesite, agregar es fácil, desagregar es imposible.',
  },
  {
    id: 'clase',
    label: 'Una fila por clase dictada',
    correct: false,
    why: 'Perdés al socio. Podrías contar asistentes totales, pero no cruzar por plan, ni por segmento de edad, ni saber quién vuelve. Se te cae medio análisis.',
  },
  {
    id: 'mes-sucursal',
    label: 'Una fila por mes y sucursal',
    correct: false,
    why: 'Es una tabla pre-agregada, no un hecho. Te deja sin drill-down: el día que pidan "¿y por disciplina?" tienes que rehacer el data mart entero.',
  },
]

/*
 * El orden de estas listas NO es casual y no debe reagruparse por correctas.
 * Con las correctas al principio, marcar de arriba hacia abajo resolvia el
 * ejercicio antes de terminar de leer, que es justo lo contrario de lo que se
 * evalua. Van intercaladas y la ultima opcion de cada lista es incorrecta,
 * asi que hay que evaluar todas.
 */
export const metricOptions = [
  { id: 'cupo_clase', label: 'cupo_clase', correct: false, why: 'TRAMPA CLÁSICA. El cupo pertenece a la clase, no a la reserva: si lo pones en el hecho, se repite en cada fila y cualquier SUM lo multiplica. Va como atributo de dim_clase y se usa con MAX o AVG.' },
  { id: 'cantidad_reserva', label: 'cantidad_reserva', correct: true, why: 'El contador clásico: 1 por fila. Permite COUNT aditivo en cualquier corte.' },
  { id: 'precio_plan', label: 'precio_plan', correct: false, why: 'Es un atributo de dim_plan. Sumarlo por reserva infla el ingreso.' },
  { id: 'promedio_asistencia', label: 'promedio_asistencia', correct: false, why: 'Los promedios NO son aditivos: el promedio de promedios miente. Se guardan numerador y denominador, y el promedio se calcula al consultar.' },
  { id: 'asistio', label: 'asistio (0/1)', correct: true, why: 'Flag aditivo: SUM(asistio) da asistencias reales y, dividido por las reservas, la tasa de asistencia.' },
  { id: 'nombre_socio', label: 'nombre_socio', correct: false, why: 'Un texto descriptivo nunca es métrica. Va en dim_socio.' },
  { id: 'ingreso_prorrateado', label: 'ingreso_prorrateado', correct: true, why: 'Reparte la mensualidad entre las reservas del período. Es aditivo en el grain elegido, que es la condición para vivir en el hecho.' },
  { id: 'total_socios_activos', label: 'total_socios_activos', correct: false, why: 'Métrica ya agregada a otro grain. Meterla aquí rompe la coherencia del hecho.' },
]

export const dimensionOptions = [
  { id: 'dim_tiempo', label: 'dim_tiempo', correct: true, why: 'Sin dimensión de tiempo no hay evolución mensual. Es obligatoria en prácticamente toda estrella.' },
  { id: 'dim_reserva', label: 'dim_reserva', correct: false, why: 'La reserva ES el hecho. Una dimensión 1:1 con la tabla de hechos no aporta nada: si necesitas el número de reserva, va como dimensión degenerada dentro del hecho.' },
  { id: 'dim_socio', label: 'dim_socio', correct: true, why: 'Permite cortar por ciudad y segmento de edad, y contar socios distintos.' },
  { id: 'dim_clase', label: 'dim_clase', correct: true, why: 'Trae disciplina, instructor, nivel y cupo. Responde "qué disciplinas llenan sala".' },
  { id: 'dim_ingreso', label: 'dim_ingreso', correct: false, why: 'El ingreso es una métrica continua. Las métricas van en el hecho, no en dimensiones.' },
  { id: 'dim_sucursal', label: 'dim_sucursal', correct: true, why: 'Compara rendimiento entre sucursales, una de las metas explícitas.' },
  { id: 'dim_plan', label: 'dim_plan', correct: true, why: 'Permite ver si los planes caros se usan más o menos que los baratos.' },
  { id: 'dim_asistio', label: 'dim_asistio', correct: false, why: 'Un flag de dos valores no merece tabla. Sobre-normalizar la estrella es el error opuesto al de no normalizar nada.' },
]

/**
 * Posiciones del diagrama de estrella. El hecho va al centro y las ocho
 * opciones de dimensión tienen su lugar alrededor: aparecen solo las que el
 * alumno marca, correctas o no, igual que el lienzo del MER.
 */
export const starLayout = {
  hecho: { x: 530, y: 500 },
  /* Las cinco dimensiones correctas ocupan los vertices del anillo, de modo que
     un modelo bien resuelto queda repartido en toda la superficie. Los tres
     distractores caen en los huecos que sobran. */
  dimensiones: {
    dim_socio: { x: 195, y: 170 },
    dim_clase: { x: 880, y: 170 },
    dim_tiempo: { x: 150, y: 520 },
    dim_sucursal: { x: 925, y: 520 },
    dim_plan: { x: 530, y: 880 },
    dim_reserva: { x: 195, y: 855 },
    dim_asistio: { x: 880, y: 855 },
    dim_ingreso: { x: 530, y: 115 },
  },
}

/** Atributos que muestra cada dimensión del diagrama, ya sin el prefijo id_. */
export const starDimensionColumns = {
  dim_tiempo: ['fecha', 'anio', 'mes', 'nombre_mes', 'dia_semana'],
  dim_socio: ['nombre', 'ciudad', 'segmento_edad'],
  dim_clase: ['disciplina', 'instructor', 'cupo', 'nivel'],
  dim_sucursal: ['nombre', 'ciudad'],
  dim_plan: ['nombre', 'precio_mensual'],
}

export const starSchema = [
  { table: 'hecho_reserva', kind: 'fact', columns: ['id_hecho PK', 'id_tiempo FK', 'id_socio FK', 'id_clase FK', 'id_sucursal FK', 'id_plan FK', 'cantidad_reserva', 'asistio', 'ingreso_prorrateado'] },
  { table: 'dim_tiempo', kind: 'dim', columns: ['id_tiempo PK', 'fecha', 'anio', 'mes', 'nombre_mes', 'dia_semana'] },
  { table: 'dim_socio', kind: 'dim', columns: ['id_socio PK', 'nombre', 'ciudad', 'segmento_edad'] },
  { table: 'dim_clase', kind: 'dim', columns: ['id_clase PK', 'disciplina', 'instructor', 'cupo', 'nivel'] },
  { table: 'dim_sucursal', kind: 'dim', columns: ['id_sucursal PK', 'nombre', 'ciudad'] },
  { table: 'dim_plan', kind: 'dim', columns: ['id_plan PK', 'nombre', 'precio_mensual'] },
]

export const spazioGymSeedSql = `
CREATE TABLE dim_sucursal (
  id_sucursal INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  ciudad TEXT NOT NULL
);

CREATE TABLE dim_plan (
  id_plan INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  precio_mensual REAL NOT NULL
);

CREATE TABLE dim_clase (
  id_clase INTEGER PRIMARY KEY,
  disciplina TEXT NOT NULL,
  instructor TEXT NOT NULL,
  cupo INTEGER NOT NULL,
  nivel TEXT NOT NULL
);

CREATE TABLE dim_socio (
  id_socio INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  segmento_edad TEXT NOT NULL
);

CREATE TABLE dim_tiempo (
  id_tiempo INTEGER PRIMARY KEY,
  fecha TEXT NOT NULL,
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  nombre_mes TEXT NOT NULL,
  dia_semana TEXT NOT NULL
);

CREATE TABLE hecho_reserva (
  id_hecho INTEGER PRIMARY KEY,
  id_tiempo INTEGER NOT NULL REFERENCES dim_tiempo(id_tiempo),
  id_socio INTEGER NOT NULL REFERENCES dim_socio(id_socio),
  id_clase INTEGER NOT NULL REFERENCES dim_clase(id_clase),
  id_sucursal INTEGER NOT NULL REFERENCES dim_sucursal(id_sucursal),
  id_plan INTEGER NOT NULL REFERENCES dim_plan(id_plan),
  cantidad_reserva INTEGER NOT NULL,
  asistio INTEGER NOT NULL,
  ingreso_prorrateado REAL NOT NULL
);

INSERT INTO dim_sucursal VALUES
  (1, 'SpazioGym Equipetrol', 'Santa Cruz'),
  (2, 'SpazioGym Sopocachi', 'La Paz'),
  (3, 'SpazioGym Cala Cala', 'Cochabamba');

INSERT INTO dim_plan VALUES
  (1, 'Basico', 250),
  (2, 'Full', 420),
  (3, 'Premium', 650);

INSERT INTO dim_clase VALUES
  (1, 'Spinning', 'Marcela Nunez', 20, 'Intermedio'),
  (2, 'Crossfit', 'Rodrigo Paz', 15, 'Avanzado'),
  (3, 'Yoga', 'Ines Callisaya', 25, 'Inicial'),
  (4, 'Funcional', 'Rodrigo Paz', 18, 'Intermedio'),
  (5, 'Pilates', 'Ines Callisaya', 16, 'Inicial'),
  (6, 'Boxeo', 'Hugo Terceros', 12, 'Avanzado'),
  (7, 'Zumba', 'Marcela Nunez', 30, 'Inicial'),
  (8, 'Musculacion guiada', 'Hugo Terceros', 22, 'Intermedio');

INSERT INTO dim_socio VALUES
  (1, 'Camila Rojas', 'Santa Cruz', '18-25'),
  (2, 'Diego Vargas', 'La Paz', '26-35'),
  (3, 'Ana Quispe', 'Cochabamba', '36-45'),
  (4, 'Mateo Suarez', 'Santa Cruz', '46+'),
  (5, 'Lucia Mendoza', 'La Paz', '18-25'),
  (6, 'Joaquin Flores', 'Cochabamba', '26-35'),
  (7, 'Valeria Ortiz', 'Santa Cruz', '36-45'),
  (8, 'Sebastian Ruiz', 'La Paz', '46+'),
  (9, 'Renata Cespedes', 'Cochabamba', '18-25'),
  (10, 'Ivan Choque', 'Santa Cruz', '26-35'),
  (11, 'Paola Guzman', 'La Paz', '36-45'),
  (12, 'Andres Baldivieso', 'Cochabamba', '46+');

INSERT INTO dim_tiempo VALUES
  (1, '2025-06-03', 2025, 6, 'Junio', 'Lunes'),
  (2, '2025-06-06', 2025, 6, 'Junio', 'Martes'),
  (3, '2025-06-09', 2025, 6, 'Junio', 'Miercoles'),
  (4, '2025-06-12', 2025, 6, 'Junio', 'Jueves'),
  (5, '2025-06-15', 2025, 6, 'Junio', 'Viernes'),
  (6, '2025-06-18', 2025, 6, 'Junio', 'Sabado'),
  (7, '2025-06-21', 2025, 6, 'Junio', 'Lunes'),
  (8, '2025-06-24', 2025, 6, 'Junio', 'Martes'),
  (9, '2025-07-03', 2025, 7, 'Julio', 'Lunes'),
  (10, '2025-07-06', 2025, 7, 'Julio', 'Martes'),
  (11, '2025-07-09', 2025, 7, 'Julio', 'Miercoles'),
  (12, '2025-07-12', 2025, 7, 'Julio', 'Jueves'),
  (13, '2025-07-15', 2025, 7, 'Julio', 'Viernes'),
  (14, '2025-07-18', 2025, 7, 'Julio', 'Sabado'),
  (15, '2025-07-21', 2025, 7, 'Julio', 'Lunes'),
  (16, '2025-07-24', 2025, 7, 'Julio', 'Martes'),
  (17, '2025-08-03', 2025, 8, 'Agosto', 'Lunes'),
  (18, '2025-08-06', 2025, 8, 'Agosto', 'Martes'),
  (19, '2025-08-09', 2025, 8, 'Agosto', 'Miercoles'),
  (20, '2025-08-12', 2025, 8, 'Agosto', 'Jueves'),
  (21, '2025-08-15', 2025, 8, 'Agosto', 'Viernes'),
  (22, '2025-08-18', 2025, 8, 'Agosto', 'Sabado'),
  (23, '2025-08-21', 2025, 8, 'Agosto', 'Lunes'),
  (24, '2025-08-24', 2025, 8, 'Agosto', 'Martes');

INSERT INTO hecho_reserva VALUES
  (1, 1, 1, 6, 1, 2, 1, 0, 35),
  (2, 1, 10, 7, 2, 3, 1, 1, 54.17),
  (3, 1, 2, 4, 1, 1, 1, 1, 20.83),
  (4, 1, 12, 8, 3, 3, 1, 1, 54.17),
  (5, 1, 8, 2, 1, 2, 1, 1, 35),
  (6, 1, 10, 1, 3, 3, 1, 0, 54.17),
  (7, 2, 12, 8, 2, 3, 1, 1, 54.17),
  (8, 2, 8, 3, 2, 3, 1, 1, 54.17),
  (9, 2, 1, 6, 2, 2, 1, 1, 35),
  (10, 3, 11, 3, 1, 3, 1, 1, 54.17),
  (11, 3, 3, 7, 2, 2, 1, 1, 35),
  (12, 3, 1, 8, 2, 1, 1, 1, 20.83),
  (13, 3, 9, 3, 1, 1, 1, 1, 20.83),
  (14, 3, 2, 7, 3, 1, 1, 1, 20.83),
  (15, 4, 12, 3, 1, 1, 1, 1, 20.83),
  (16, 4, 11, 5, 3, 2, 1, 1, 35),
  (17, 4, 12, 5, 1, 3, 1, 1, 54.17),
  (18, 4, 9, 1, 2, 2, 1, 1, 35),
  (19, 4, 12, 4, 1, 2, 1, 1, 35),
  (20, 5, 10, 2, 2, 1, 1, 1, 20.83),
  (21, 5, 12, 7, 3, 2, 1, 1, 35),
  (22, 5, 3, 8, 1, 3, 1, 1, 54.17),
  (23, 5, 5, 4, 2, 1, 1, 0, 20.83),
  (24, 6, 1, 2, 3, 1, 1, 0, 20.83),
  (25, 6, 5, 6, 2, 3, 1, 1, 54.17),
  (26, 6, 4, 8, 2, 1, 1, 0, 20.83),
  (27, 7, 10, 4, 3, 3, 1, 1, 54.17),
  (28, 7, 10, 8, 2, 1, 1, 0, 20.83),
  (29, 7, 1, 1, 3, 3, 1, 1, 54.17),
  (30, 8, 9, 6, 1, 1, 1, 1, 20.83),
  (31, 8, 12, 5, 3, 3, 1, 1, 54.17),
  (32, 8, 4, 4, 3, 3, 1, 1, 54.17),
  (33, 8, 2, 8, 2, 2, 1, 0, 35),
  (34, 9, 12, 1, 3, 2, 1, 0, 35),
  (35, 9, 8, 7, 1, 1, 1, 1, 20.83),
  (36, 9, 9, 3, 1, 1, 1, 1, 20.83),
  (37, 9, 4, 4, 2, 3, 1, 0, 54.17),
  (38, 9, 11, 7, 1, 1, 1, 1, 20.83),
  (39, 9, 7, 5, 2, 1, 1, 1, 20.83),
  (40, 10, 7, 6, 1, 2, 1, 1, 35),
  (41, 10, 8, 7, 3, 1, 1, 1, 20.83),
  (42, 10, 4, 1, 1, 3, 1, 1, 54.17),
  (43, 11, 8, 5, 1, 2, 1, 1, 35),
  (44, 11, 10, 6, 1, 2, 1, 1, 35),
  (45, 11, 5, 3, 1, 3, 1, 1, 54.17),
  (46, 12, 3, 7, 1, 2, 1, 1, 35),
  (47, 12, 8, 6, 2, 3, 1, 1, 54.17),
  (48, 12, 8, 2, 2, 2, 1, 1, 35),
  (49, 12, 3, 5, 3, 3, 1, 1, 54.17),
  (50, 12, 8, 8, 3, 2, 1, 1, 35),
  (51, 12, 3, 1, 2, 2, 1, 0, 35),
  (52, 13, 5, 5, 3, 2, 1, 1, 35),
  (53, 13, 4, 1, 2, 3, 1, 1, 54.17),
  (54, 13, 4, 1, 1, 3, 1, 0, 54.17),
  (55, 13, 9, 4, 1, 2, 1, 0, 35),
  (56, 14, 5, 8, 3, 2, 1, 0, 35),
  (57, 14, 9, 7, 2, 2, 1, 1, 35),
  (58, 14, 7, 1, 1, 3, 1, 0, 54.17),
  (59, 14, 6, 1, 2, 2, 1, 1, 35),
  (60, 14, 9, 1, 1, 2, 1, 0, 35),
  (61, 14, 6, 2, 1, 3, 1, 1, 54.17),
  (62, 15, 1, 3, 1, 2, 1, 1, 35),
  (63, 15, 9, 4, 3, 2, 1, 1, 35),
  (64, 15, 4, 7, 2, 3, 1, 1, 54.17),
  (65, 16, 3, 2, 1, 3, 1, 1, 54.17),
  (66, 16, 9, 2, 2, 3, 1, 0, 54.17),
  (67, 16, 12, 4, 1, 2, 1, 1, 35),
  (68, 17, 1, 4, 1, 3, 1, 1, 54.17),
  (69, 17, 7, 4, 2, 3, 1, 1, 54.17),
  (70, 17, 10, 6, 3, 2, 1, 1, 35),
  (71, 17, 11, 5, 1, 2, 1, 1, 35),
  (72, 17, 5, 5, 3, 2, 1, 1, 35),
  (73, 18, 1, 7, 2, 3, 1, 1, 54.17),
  (74, 18, 7, 1, 1, 3, 1, 1, 54.17),
  (75, 18, 2, 1, 3, 1, 1, 1, 20.83),
  (76, 18, 4, 5, 1, 1, 1, 1, 20.83),
  (77, 18, 5, 4, 2, 1, 1, 1, 20.83),
  (78, 19, 1, 1, 3, 3, 1, 0, 54.17),
  (79, 19, 12, 1, 2, 2, 1, 1, 35),
  (80, 19, 6, 5, 2, 3, 1, 1, 54.17),
  (81, 20, 10, 3, 3, 2, 1, 0, 35),
  (82, 20, 1, 7, 3, 3, 1, 1, 54.17),
  (83, 20, 5, 1, 2, 1, 1, 1, 20.83),
  (84, 21, 2, 5, 2, 2, 1, 1, 35),
  (85, 21, 10, 1, 2, 3, 1, 1, 54.17),
  (86, 21, 9, 1, 1, 2, 1, 0, 35),
  (87, 21, 2, 8, 2, 2, 1, 0, 35),
  (88, 21, 12, 4, 3, 2, 1, 1, 35),
  (89, 21, 6, 2, 2, 3, 1, 1, 54.17),
  (90, 22, 10, 5, 2, 1, 1, 1, 20.83),
  (91, 22, 4, 2, 3, 1, 1, 0, 20.83),
  (92, 22, 6, 6, 1, 1, 1, 0, 20.83),
  (93, 22, 3, 1, 1, 2, 1, 0, 35),
  (94, 22, 9, 4, 3, 2, 1, 0, 35),
  (95, 23, 6, 4, 3, 2, 1, 0, 35),
  (96, 23, 2, 4, 2, 1, 1, 0, 20.83),
  (97, 23, 2, 7, 1, 1, 1, 1, 20.83),
  (98, 23, 9, 4, 3, 2, 1, 1, 35),
  (99, 23, 4, 1, 3, 3, 1, 0, 54.17),
  (100, 23, 3, 5, 3, 3, 1, 1, 54.17),
  (101, 24, 9, 8, 3, 3, 1, 1, 54.17),
  (102, 24, 2, 8, 2, 2, 1, 1, 35),
  (103, 24, 3, 6, 2, 1, 1, 1, 20.83);
`

export const kpiChallenges = [
  {
    id: 'kpi1',
    name: 'Tasa de asistencia global',
    goal: '¿Los socios realmente usan lo que pagan?',
    formula: 'SUM(asistio) / SUM(cantidad_reserva) × 100',
    prompt: 'Devolvé un único número: el porcentaje de reservas que terminaron en asistencia, redondeado a 2 decimales.',
    hint: 'Multiplica por 100.0 (con decimal) antes de dividir, si no Postgres hace división entera entre enteros. Usa ROUND((...)::numeric, 2).',
    starter: 'SELECT ROUND((SUM(...) * 100.0 / SUM(...))::numeric, 2)\nFROM hecho_reserva;',
    expectedSql: 'SELECT ROUND((SUM(asistio) * 100.0 / SUM(cantidad_reserva))::numeric, 2) FROM hecho_reserva;',
    orderMatters: false,
  },
  {
    id: 'kpi2',
    name: 'Asistencias por disciplina',
    goal: '¿Qué disciplinas llenan sala y cuáles se vacían?',
    formula: 'SUM(asistio) agrupado por disciplina',
    prompt: 'Muestra la disciplina y la cantidad de asistencias reales, de mayor a menor.',
    hint: 'Necesitas JOIN con dim_clase. Agrupa por disciplina y ordená el SUM descendente.',
    starter: 'SELECT c.disciplina, SUM(h.asistio)\nFROM hecho_reserva h\nJOIN dim_clase c ON ...\nGROUP BY ...\nORDER BY ...;',
    expectedSql: `SELECT c.disciplina, SUM(h.asistio)
      FROM hecho_reserva h
      JOIN dim_clase c ON h.id_clase = c.id_clase
      GROUP BY c.disciplina
      ORDER BY SUM(h.asistio) DESC;`,
    orderMatters: true,
  },
  {
    id: 'kpi3',
    name: 'Ingreso por sucursal',
    goal: '¿Cómo se compara el rendimiento entre sucursales?',
    formula: 'SUM(ingreso_prorrateado) agrupado por sucursal',
    prompt: 'Muestra el nombre de la sucursal y su ingreso total prorrateado, redondeado a 2 decimales.',
    hint: 'JOIN con dim_sucursal y GROUP BY por el nombre de la sucursal.',
    starter: 'SELECT s.nombre, ROUND((SUM(h.ingreso_prorrateado))::numeric, 2)\nFROM hecho_reserva h\nJOIN dim_sucursal s ON ...\nGROUP BY ...;',
    expectedSql: `SELECT s.nombre, ROUND((SUM(h.ingreso_prorrateado))::numeric, 2)
      FROM hecho_reserva h
      JOIN dim_sucursal s ON h.id_sucursal = s.id_sucursal
      GROUP BY s.nombre;`,
    orderMatters: false,
  },
  {
    id: 'kpi4',
    name: 'Evolución mensual de asistencias',
    goal: '¿Cómo evoluciona mes a mes para planificar instructores?',
    formula: 'SUM(asistio) agrupado por mes, en orden cronológico',
    prompt: 'Muestra el número de mes, el nombre del mes y las asistencias, ordenado cronológicamente.',
    hint: 'Ojo: si ordenás por nombre_mes salen alfabéticamente (Agosto antes que Julio). Agrupa y ordená por el número de mes.',
    starter: 'SELECT t.mes, t.nombre_mes, SUM(h.asistio)\nFROM hecho_reserva h\nJOIN dim_tiempo t ON ...\nGROUP BY ...\nORDER BY ...;',
    expectedSql: `SELECT t.mes, t.nombre_mes, SUM(h.asistio)
      FROM hecho_reserva h
      JOIN dim_tiempo t ON h.id_tiempo = t.id_tiempo
      GROUP BY t.mes, t.nombre_mes
      ORDER BY t.mes;`,
    orderMatters: true,
  },
]
