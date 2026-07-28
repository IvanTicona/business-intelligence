// Caso ExpoCruz — usado por la Práctica 2 (MER) y la Práctica 3 (SQL).
// El mismo dominio recorre las dos prácticas a propósito: el alumno primero
// lo modela y después consulta el modelo ya implementado.

export const conceptCards = [
  { id: 'expositor', label: 'Expositor', description: 'Persona u organización que muestra productos o servicios en la feria.', answer: 'entidad', why: 'Tiene identidad propia, atributos (NIT, razón social) y participa en relaciones. Es una entidad.' },
  { id: 'razon-social', label: 'Razón social', description: 'Nombre legal registrado de la empresa.', answer: 'atributo', why: 'No existe por sí sola: describe a un Expositor. Es un atributo.' },
  { id: 'nit', label: 'NIT / RUC', description: 'Identificador fiscal de la empresa.', answer: 'atributo', why: 'Describe al Expositor y además es candidato a clave. Sigue siendo un atributo.' },
  { id: 'ciudad', label: 'Ciudad', description: 'Localidad de procedencia del expositor.', answer: 'atributo', why: 'Acá alcanza con un atributo. Solo sería entidad si necesitáramos guardar datos propios de la ciudad (departamento, población).' },
  { id: 'sector', label: 'Sector económico', description: 'Categoría de actividad de un expositor.', answer: 'entidad', why: 'Es un catálogo reutilizable: muchos expositores comparten el mismo sector. Modelarlo como entidad evita repetir texto y permite agrupar KPIs.' },
  { id: 'stand', label: 'Stand', description: 'Espacio físico asignado dentro de un pabellón.', answer: 'entidad', why: 'Tiene identidad propia y se relaciona con Pabellón y con Expositor. Entidad.' },
  { id: 'ubicacion', label: 'Ubicación', description: 'Posición del stand dentro del pabellón.', answer: 'atributo', why: 'Describe al Stand. Atributo.' },
  { id: 'pabellon', label: 'Pabellón', description: 'Área o edificio que agrupa varios stands.', answer: 'entidad', why: 'Agrupa stands y tiene atributos propios. Entidad.' },
  { id: 'edicion', label: 'Edición (año)', description: 'Versión anual de ExpoCruz que agrupa días.', answer: 'entidad', why: 'Es el eje temporal del negocio: agrupa días, eventos y contratos. Entidad.' },
  { id: 'dia-feria', label: 'Día de feria', description: 'Cada jornada dentro de una edición.', answer: 'entidad', why: 'Las entradas son válidas para un día específico, así que el día necesita identidad propia. Entidad débil respecto de Edición.' },
  { id: 'entrada', label: 'Entrada (Ticket)', description: 'Comprobante de acceso válido para un día.', answer: 'entidad', why: 'Es el hecho transaccional del negocio. Entidad.' },
  { id: 'precio-entrada', label: 'Precio de entrada', description: 'Monto definido para una entrada.', answer: 'atributo', why: 'Describe a la Entrada. Atributo (y futura métrica de tu estrella).' },
  { id: 'forma-pago', label: 'Forma de pago', description: 'Medio utilizado al pagar (efectivo, tarjeta, QR).', answer: 'atributo', why: 'Con un dominio cerrado de 3 valores, un atributo alcanza.' },
  { id: 'visitante', label: 'Visitante', description: 'Persona que asiste a la feria y adquiere entradas.', answer: 'entidad', why: 'Tiene identidad y compra varias entradas. Entidad.' },
  { id: 'evento', label: 'Evento', description: 'Actividad programada: concierto, charla, premiación.', answer: 'entidad', why: 'Tiene fecha, pabellón y tipo propios. Entidad.' },
  { id: 'patrocinador', label: 'Patrocinador', description: 'Organización que aporta recursos a cambio de visibilidad.', answer: 'entidad', why: 'Entidad con atributos y relación con Edición.' },
  { id: 'nivel-patrocinio', label: 'Nivel de patrocinio', description: 'Clasificación del aporte del patrocinador (oro, plata, bronce).', answer: 'atributo', why: 'Clasifica al Patrocinador. Atributo.' },
]

export const primaryKeyQuestions = [
  {
    id: 'pk-expositor',
    entity: 'Expositor',
    options: [
      { id: 'razon_social', label: 'razon_social', correct: false, why: 'Dos empresas distintas pueden registrarse con nombres muy parecidos, y el nombre legal puede cambiar. Una PK nunca debería cambiar.' },
      { id: 'nit', label: 'nit', correct: false, why: 'Es único y buen candidato… pero es una clave natural externa: si el SIN cambia el formato, arrastrás el cambio a todas las FKs. Sirve como UNIQUE, no como PK.' },
      { id: 'id_expositor', label: 'id_expositor (surrogate)', correct: true, why: 'Clave surrogate: estable, corta, sin significado de negocio. El nit queda como UNIQUE. Este es el patrón estándar.' },
      { id: 'nit_ciudad', label: 'nit + ciudad', correct: false, why: 'Clave compuesta innecesaria: si el nit ya es único, agregarle ciudad solo complica las FKs.' },
    ],
  },
  {
    id: 'pk-dia',
    entity: 'Día de feria',
    options: [
      { id: 'fecha', label: 'fecha', correct: false, why: 'Casi funciona… pero si algún día se modelan dos ediciones solapadas o ferias en otra ciudad, se rompe. Depende de la Edición.' },
      { id: 'id_dia', label: 'id_dia (surrogate)', correct: true, why: 'Surrogate simple. Se agrega UNIQUE(id_edicion, fecha) para blindar la regla de negocio real.' },
      { id: 'id_edicion', label: 'id_edicion', correct: false, why: 'Una edición tiene MUCHOS días. Esta clave solo permitiría un día por edición.' },
      { id: 'numero_dia', label: 'numero_dia', correct: false, why: 'El "día 1" existe en cada edición: se repite. No identifica unívocamente.' },
    ],
  },
  {
    id: 'pk-entrada',
    entity: 'Entrada',
    options: [
      { id: 'id_visitante_dia', label: 'id_visitante + id_dia', correct: false, why: 'Impide que un visitante compre dos entradas para el mismo día (por ejemplo, para traer un acompañante). Restringe una regla que el negocio no pidió.' },
      { id: 'id_entrada', label: 'id_entrada (surrogate)', correct: true, why: 'Cada ticket es un hecho independiente. Surrogate y listo.' },
      { id: 'precio', label: 'precio', correct: false, why: 'Se repite en miles de filas. Ni siquiera es candidato.' },
      { id: 'fecha_compra', label: 'fecha_compra', correct: false, why: 'Dos entradas pueden venderse en el mismo instante. No es única.' },
    ],
  },
  {
    id: 'pk-contrato',
    entity: 'Contrato de stand (Expositor ↔ Stand en una Edición)',
    options: [
      { id: 'id_expositor', label: 'id_expositor', correct: false, why: 'Un expositor contrata VARIOS stands (regla 3). Se repetiría.' },
      { id: 'id_stand', label: 'id_stand', correct: false, why: 'El mismo stand se contrata en distintas ediciones. Se repetiría entre años.' },
      { id: 'compuesta', label: 'id_expositor + id_stand + id_edicion', correct: true, why: 'Es una relación N:M con atributo propio (monto). La PK compuesta de las tres FKs expresa exactamente la regla: un expositor toma un stand una vez por edición.' },
      { id: 'monto', label: 'monto', correct: false, why: 'Es una métrica, no un identificador.' },
    ],
  },
]

export const cardinalityQuestions = [
  {
    id: 'card-edicion-dia',
    rule: 'ExpoCruz se realiza una vez al año. Cada edición tiene varios días de feria.',
    left: 'Edición',
    right: 'Día de feria',
    options: ['1:1', '1:N', 'N:M'],
    answer: '1:N',
    why: 'Una edición tiene muchos días, pero cada día pertenece a UNA sola edición. La FK id_edicion vive en dia_feria.',
  },
  {
    id: 'card-pabellon-stand',
    rule: 'Cada pabellón tiene muchos stands.',
    left: 'Pabellón',
    right: 'Stand',
    options: ['1:1', '1:N', 'N:M'],
    answer: '1:N',
    why: 'Un stand está físicamente en un solo pabellón. FK id_pabellon en stand.',
  },
  {
    id: 'card-expositor-stand',
    rule: 'Un expositor puede contratar uno o varios stands en una edición.',
    left: 'Expositor',
    right: 'Stand',
    options: ['1:1', '1:N', 'N:M'],
    answer: 'N:M',
    why: 'Un expositor toma varios stands y un stand se alquila a distintos expositores en distintas ediciones. N:M ⇒ nace la tabla intermedia contrato_stand, con el monto como atributo de la relación.',
  },
  {
    id: 'card-visitante-entrada',
    rule: 'Un visitante puede comprar entradas para días específicos.',
    left: 'Visitante',
    right: 'Entrada',
    options: ['1:1', '1:N', 'N:M'],
    answer: '1:N',
    why: 'Cada entrada pertenece a un único visitante, pero un visitante compra muchas. Ojo: Visitante ↔ Día SÍ es N:M, y la Entrada es justamente esa tabla intermedia.',
  },
  {
    id: 'card-edicion-evento',
    rule: 'En una edición se programan eventos con fecha/hora y pabellón.',
    left: 'Edición',
    right: 'Evento',
    options: ['1:1', '1:N', 'N:M'],
    answer: '1:N',
    why: 'Un evento pertenece a una sola edición. FK id_edicion en evento.',
  },
]

export const relationalSchema = [
  { table: 'pabellon', columns: ['id_pabellon PK', 'nombre', 'superficie_m2'] },
  { table: 'stand', columns: ['id_stand PK', 'id_pabellon FK', 'codigo', 'ubicacion', 'superficie_m2'] },
  { table: 'sector_economico', columns: ['id_sector PK', 'nombre'] },
  { table: 'expositor', columns: ['id_expositor PK', 'razon_social', 'nit UNIQUE', 'id_sector FK', 'ciudad'] },
  { table: 'edicion', columns: ['id_edicion PK', 'anio', 'tema'] },
  { table: 'dia_feria', columns: ['id_dia PK', 'id_edicion FK', 'fecha'] },
  { table: 'contrato_stand', columns: ['id_contrato PK', 'id_expositor FK', 'id_stand FK', 'id_edicion FK', 'monto'] },
  { table: 'visitante', columns: ['id_visitante PK', 'nombre', 'ciudad', 'anio_nacimiento'] },
  { table: 'entrada', columns: ['id_entrada PK', 'id_visitante FK', 'id_dia FK', 'precio', 'forma_pago'] },
  { table: 'evento', columns: ['id_evento PK', 'id_edicion FK', 'id_pabellon FK', 'nombre', 'tipo', 'fecha_hora'] },
  { table: 'patrocinador', columns: ['id_patrocinador PK', 'id_edicion FK', 'razon_social', 'nivel_patrocinio', 'aporte'] },
]

export const expocruzSeedSql = `
CREATE TABLE pabellon (
  id_pabellon INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  superficie_m2 INTEGER NOT NULL
);

CREATE TABLE stand (
  id_stand INTEGER PRIMARY KEY,
  id_pabellon INTEGER NOT NULL REFERENCES pabellon(id_pabellon),
  codigo TEXT NOT NULL,
  ubicacion TEXT NOT NULL,
  superficie_m2 INTEGER NOT NULL
);

CREATE TABLE sector_economico (
  id_sector INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL
);

CREATE TABLE expositor (
  id_expositor INTEGER PRIMARY KEY,
  razon_social TEXT NOT NULL,
  nit TEXT NOT NULL UNIQUE,
  id_sector INTEGER NOT NULL REFERENCES sector_economico(id_sector),
  ciudad TEXT NOT NULL
);

CREATE TABLE edicion (
  id_edicion INTEGER PRIMARY KEY,
  anio INTEGER NOT NULL,
  tema TEXT NOT NULL
);

CREATE TABLE dia_feria (
  id_dia INTEGER PRIMARY KEY,
  id_edicion INTEGER NOT NULL REFERENCES edicion(id_edicion),
  fecha TEXT NOT NULL,
  UNIQUE (id_edicion, fecha)
);

CREATE TABLE contrato_stand (
  id_contrato INTEGER PRIMARY KEY,
  id_expositor INTEGER NOT NULL REFERENCES expositor(id_expositor),
  id_stand INTEGER NOT NULL REFERENCES stand(id_stand),
  id_edicion INTEGER NOT NULL REFERENCES edicion(id_edicion),
  monto REAL NOT NULL,
  UNIQUE (id_expositor, id_stand, id_edicion)
);

CREATE TABLE visitante (
  id_visitante INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  anio_nacimiento INTEGER NOT NULL
);

CREATE TABLE entrada (
  id_entrada INTEGER PRIMARY KEY,
  id_visitante INTEGER NOT NULL REFERENCES visitante(id_visitante),
  id_dia INTEGER NOT NULL REFERENCES dia_feria(id_dia),
  precio REAL NOT NULL,
  forma_pago TEXT NOT NULL
);

CREATE TABLE evento (
  id_evento INTEGER PRIMARY KEY,
  id_edicion INTEGER NOT NULL REFERENCES edicion(id_edicion),
  id_pabellon INTEGER NOT NULL REFERENCES pabellon(id_pabellon),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  fecha_hora TEXT NOT NULL
);

CREATE TABLE patrocinador (
  id_patrocinador INTEGER PRIMARY KEY,
  id_edicion INTEGER NOT NULL REFERENCES edicion(id_edicion),
  razon_social TEXT NOT NULL,
  nivel_patrocinio TEXT NOT NULL,
  aporte REAL NOT NULL
);

INSERT INTO pabellon VALUES
  (1, 'Tecnologia', 2500),
  (2, 'Industria', 3200),
  (3, 'Gastronomia', 1800);

INSERT INTO stand VALUES
  (1, 1, 'T-01', 'Ala Norte', 24),
  (2, 1, 'T-02', 'Ala Norte', 24),
  (3, 1, 'T-03', 'Ala Sur', 36),
  (4, 2, 'I-01', 'Ala Este', 48),
  (5, 2, 'I-02', 'Ala Este', 48),
  (6, 2, 'I-03', 'Ala Oeste', 60),
  (7, 3, 'G-01', 'Patio Central', 18),
  (8, 3, 'G-02', 'Patio Central', 18),
  (9, 3, 'G-03', 'Ala Norte', 20),
  (10, 1, 'T-04', 'Ala Sur', 36);

INSERT INTO sector_economico VALUES
  (1, 'Tecnologia'),
  (2, 'Manufactura'),
  (3, 'Alimentos'),
  (4, 'Servicios Financieros'),
  (5, 'Turismo'),
  (6, 'Educacion');

INSERT INTO expositor VALUES
  (1, 'Andina Software SRL', '1023456789', 1, 'Santa Cruz'),
  (2, 'Bolivian Cloud SA', '1023456790', 1, 'La Paz'),
  (3, 'Metalurgica del Sur', '1023456791', 2, 'Santa Cruz'),
  (4, 'Textiles Illimani', '1023456792', 2, 'La Paz'),
  (5, 'Delicias Crucenas', '1023456793', 3, 'Santa Cruz'),
  (6, 'Cafe Yungas', '1023456794', 3, 'La Paz'),
  (7, 'Banco Oriental', '1023456795', 4, 'Santa Cruz'),
  (8, 'Fintech Altiplano', '1023456796', 4, 'Cochabamba'),
  (9, 'Nube Andina Labs', '1023456797', 1, 'Cochabamba'),
  (10, 'Amazonia Tours', '1023456798', 5, 'Santa Cruz'),
  (11, 'Instituto Tecnologico Oriental', '1023456799', 6, 'Santa Cruz');

INSERT INTO edicion VALUES
  (1, 2024, 'Innovacion Productiva'),
  (2, 2025, 'Bolivia Digital');

INSERT INTO dia_feria VALUES
  (1, 1, '2024-09-20'),
  (2, 1, '2024-09-21'),
  (3, 1, '2024-09-22'),
  (4, 1, '2024-09-23'),
  (5, 2, '2025-09-19'),
  (6, 2, '2025-09-20'),
  (7, 2, '2025-09-21'),
  (8, 2, '2025-09-22');

INSERT INTO contrato_stand VALUES
  (1, 1, 1, 2, 12000),
  (2, 1, 2, 2, 12000),
  (3, 2, 3, 2, 18000),
  (4, 3, 4, 2, 22000),
  (5, 4, 5, 2, 22000),
  (6, 5, 7, 2, 9000),
  (7, 6, 8, 2, 9000),
  (8, 7, 6, 2, 28000),
  (9, 8, 10, 2, 18000),
  (10, 1, 1, 1, 10000),
  (11, 3, 4, 1, 20000),
  (12, 5, 7, 1, 8000);

INSERT INTO visitante VALUES
  (1, 'Camila Rojas', 'Santa Cruz', 1998),
  (2, 'Diego Vargas', 'La Paz', 1995),
  (3, 'Ana Quispe', 'El Alto', 2001),
  (4, 'Mateo Suarez', 'Santa Cruz', 1990),
  (5, 'Lucia Mendoza', 'Cochabamba', 1999),
  (6, 'Joaquin Flores', 'Santa Cruz', 1988),
  (7, 'Valeria Ortiz', 'Tarija', 2003),
  (8, 'Sebastian Ruiz', 'Santa Cruz', 1993),
  (9, 'Renata Cespedes', 'La Paz', 1997),
  (10, 'Ivan Choque', 'El Alto', 2000);

INSERT INTO entrada VALUES
  (1, 1, 5, 50, 'QR'),
  (2, 1, 6, 50, 'QR'),
  (3, 1, 7, 50, 'Tarjeta'),
  (4, 2, 5, 50, 'Efectivo'),
  (5, 2, 8, 60, 'Efectivo'),
  (6, 3, 6, 50, 'QR'),
  (7, 3, 7, 50, 'QR'),
  (8, 4, 5, 50, 'Tarjeta'),
  (9, 4, 6, 50, 'Tarjeta'),
  (10, 4, 7, 50, 'Tarjeta'),
  (11, 4, 8, 60, 'Tarjeta'),
  (12, 5, 8, 60, 'QR'),
  (13, 6, 5, 50, 'Efectivo'),
  (14, 6, 6, 50, 'Efectivo'),
  (15, 7, 7, 50, 'QR'),
  (16, 8, 5, 50, 'Tarjeta'),
  (17, 8, 6, 50, 'QR'),
  (18, 8, 7, 50, 'QR'),
  (19, 8, 8, 60, 'QR'),
  (20, 9, 6, 50, 'Efectivo'),
  (21, 9, 8, 60, 'Tarjeta'),
  (22, 10, 5, 50, 'Efectivo'),
  (23, 10, 7, 50, 'Efectivo'),
  (24, 1, 8, 60, 'QR'),
  (25, 2, 6, 50, 'Efectivo'),
  (26, 3, 8, 60, 'Tarjeta'),
  (27, 5, 5, 50, 'QR'),
  (28, 5, 6, 50, 'QR'),
  (29, 7, 8, 60, 'Tarjeta'),
  (30, 9, 5, 50, 'Efectivo'),
  (31, 1, 1, 45, 'Efectivo'),
  (32, 1, 2, 45, 'Efectivo'),
  (33, 4, 1, 45, 'Tarjeta'),
  (34, 4, 3, 45, 'Tarjeta'),
  (35, 6, 2, 45, 'Efectivo'),
  (36, 6, 4, 55, 'Efectivo'),
  (37, 8, 3, 45, 'QR'),
  (38, 8, 4, 55, 'QR'),
  (39, 2, 1, 45, 'QR'),
  (40, 10, 4, 55, 'Efectivo');

INSERT INTO evento VALUES
  (1, 2, 1, 'Bolivia Digital Summit', 'Charla', '2025-09-19 10:00'),
  (2, 2, 2, 'Noche de Innovacion', 'Concierto', '2025-09-20 20:00'),
  (3, 2, 1, 'Premiacion Emprendedores', 'Premiacion', '2025-09-21 18:00'),
  (4, 2, 3, 'Ruta Gastronomica', 'Charla', '2025-09-22 12:00'),
  (5, 1, 2, 'Foro Industrial', 'Charla', '2024-09-21 09:00'),
  (6, 1, 2, 'Cierre ExpoCruz 2024', 'Concierto', '2024-09-23 21:00');

INSERT INTO patrocinador VALUES
  (1, 2, 'Banco Oriental', 'Oro', 150000),
  (2, 2, 'Telecom Boliviana', 'Plata', 80000),
  (3, 2, 'Cerveceria Nacional', 'Oro', 150000),
  (4, 2, 'Seguros del Sur', 'Bronce', 40000),
  (5, 1, 'Banco Oriental', 'Oro', 120000);
`

export const sqlChallenges = [
  {
    id: 'q1',
    concept: 'SELECT + WHERE',
    title: 'Reto 1 — Filtrar filas',
    prompt: 'Traé la razón social y la ciudad de los expositores de Santa Cruz.',
    hint: 'SELECT columnas FROM tabla WHERE condicion. Las cadenas van entre comillas simples.',
    starter: 'SELECT razon_social, ciudad\nFROM expositor\nWHERE ...;',
    expectedSql: "SELECT razon_social, ciudad FROM expositor WHERE ciudad = 'Santa Cruz';",
    orderMatters: false,
  },
  {
    id: 'q2',
    concept: 'ORDER BY + LIMIT',
    title: 'Reto 2 — Ordenar y recortar',
    prompt: 'Mostrá el código y la superficie de los 3 stands más grandes, del más grande al más chico.',
    hint: 'ORDER BY columna DESC ordena de mayor a menor. LIMIT corta el resultado.',
    starter: 'SELECT codigo, superficie_m2\nFROM stand\nORDER BY ...\nLIMIT ...;',
    expectedSql: 'SELECT codigo, superficie_m2 FROM stand ORDER BY superficie_m2 DESC LIMIT 3;',
    orderMatters: true,
  },
  {
    id: 'q3',
    concept: 'INNER JOIN',
    title: 'Reto 3 — Unir dos tablas',
    prompt: 'Listá la razón social de cada expositor junto al nombre de su sector económico.',
    hint: 'El JOIN se hace por la FK: expositor.id_sector = sector_economico.id_sector.',
    starter: 'SELECT e.razon_social, s.nombre\nFROM expositor e\nJOIN sector_economico s ON ...;',
    expectedSql: 'SELECT e.razon_social, s.nombre FROM expositor e JOIN sector_economico s ON e.id_sector = s.id_sector;',
    orderMatters: false,
  },
  {
    id: 'q4',
    concept: 'JOIN múltiple',
    title: 'Reto 4 — Recorrer el modelo',
    prompt: 'Para la edición 2025, mostrá la razón social del expositor, el código del stand y el nombre del pabellón donde está ese stand.',
    hint: 'Encadená: contrato_stand → expositor, contrato_stand → stand → pabellon, y filtrá contrato_stand por la edición cuyo anio sea 2025 (o id_edicion = 2).',
    starter: 'SELECT ex.razon_social, st.codigo, pa.nombre\nFROM contrato_stand c\nJOIN expositor ex ON ...\nJOIN stand st ON ...\nJOIN pabellon pa ON ...\nWHERE ...;',
    expectedSql: `SELECT ex.razon_social, st.codigo, pa.nombre
      FROM contrato_stand c
      JOIN expositor ex ON c.id_expositor = ex.id_expositor
      JOIN stand st ON c.id_stand = st.id_stand
      JOIN pabellon pa ON st.id_pabellon = pa.id_pabellon
      JOIN edicion ed ON c.id_edicion = ed.id_edicion
      WHERE ed.anio = 2025;`,
    orderMatters: false,
  },
  {
    id: 'q5',
    concept: 'GROUP BY + agregación',
    title: 'Reto 5 — Primer KPI real',
    prompt: 'Calculá el ingreso total por entradas para cada forma de pago. Devolvé la forma de pago y la suma del precio.',
    hint: 'SUM(precio) con GROUP BY forma_pago. Todo lo que no esté agregado va en el GROUP BY.',
    starter: 'SELECT forma_pago, SUM(precio)\nFROM entrada\nGROUP BY ...;',
    expectedSql: 'SELECT forma_pago, SUM(precio) FROM entrada GROUP BY forma_pago;',
    orderMatters: false,
  },
  {
    id: 'q6',
    concept: 'GROUP BY + HAVING + JOIN',
    title: 'Reto 6 — Filtrar después de agrupar',
    prompt: 'Mostrá el nombre del sector económico y cuántos expositores tiene, pero solo los sectores con 2 o más expositores.',
    hint: 'WHERE filtra filas ANTES de agrupar; HAVING filtra grupos DESPUÉS. Acá necesitás HAVING COUNT(*) >= 2.',
    starter: 'SELECT s.nombre, COUNT(*)\nFROM expositor e\nJOIN sector_economico s ON ...\nGROUP BY ...\nHAVING ...;',
    expectedSql: `SELECT s.nombre, COUNT(*)
      FROM expositor e
      JOIN sector_economico s ON e.id_sector = s.id_sector
      GROUP BY s.nombre
      HAVING COUNT(*) >= 2;`,
    orderMatters: false,
  },
]
