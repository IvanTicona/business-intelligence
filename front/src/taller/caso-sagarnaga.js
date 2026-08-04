/*
 * CASO OLTP · Hotel Sagarnaga (calle Sagarnaga 326, zona Rosario, La Paz)
 *
 * El alumno no consulta una base que ya existe: la CONSTRUYE. Escribe el DDL,
 * la puebla y recién entonces la consulta. Por eso el modelo de acá es una
 * ESPECIFICACIÓN a cumplir, no un dataset a leer.
 *
 * Un hotel se eligió a propósito: tiene rangos de fecha y una relación de uno a
 * muchos entre reserva y consumo, cosas que no aparecen en una estrella. Es el
 * paso anterior al data mart, no una versión más chica del mismo ejercicio.
 *
 * Nombre y contexto reales; huéspedes, reservas e importes son didácticos.
 */

/** Especificación del modelo. Es lo que el alumno tiene que lograr. */
export const modelo = [
  {
    tabla: 'tipo_habitacion',
    para: 'Los tipos de habitación que ofrece el hotel.',
    columnas: [
      { nombre: 'id_tipo', tipo: 'INTEGER', pk: true },
      { nombre: 'nombre', tipo: 'TEXT' },
      { nombre: 'capacidad', tipo: 'INTEGER' },
      { nombre: 'precio_noche', tipo: 'REAL' },
    ],
  },
  {
    tabla: 'huesped',
    para: 'Quién se aloja.',
    columnas: [
      { nombre: 'id_huesped', tipo: 'INTEGER', pk: true },
      { nombre: 'nombre', tipo: 'TEXT' },
      { nombre: 'documento', tipo: 'TEXT' },
      { nombre: 'pais', tipo: 'TEXT' },
    ],
  },
  {
    tabla: 'habitacion',
    para: 'Cada habitación física del hotel.',
    columnas: [
      { nombre: 'id_habitacion', tipo: 'INTEGER', pk: true },
      { nombre: 'numero', tipo: 'TEXT' },
      { nombre: 'piso', tipo: 'INTEGER' },
      { nombre: 'id_tipo', tipo: 'INTEGER', fk: 'tipo_habitacion' },
    ],
  },
  {
    tabla: 'reserva',
    para: 'Una estadía: quién, en qué habitación y entre qué fechas.',
    columnas: [
      { nombre: 'id_reserva', tipo: 'INTEGER', pk: true },
      { nombre: 'id_huesped', tipo: 'INTEGER', fk: 'huesped' },
      { nombre: 'id_habitacion', tipo: 'INTEGER', fk: 'habitacion' },
      { nombre: 'fecha_entrada', tipo: 'TEXT' },
      { nombre: 'fecha_salida', tipo: 'TEXT' },
      { nombre: 'estado', tipo: 'TEXT' },
    ],
  },
  {
    tabla: 'consumo',
    para: 'Lo que el huésped gasta durante su estadía: restaurante, lavandería, tours.',
    columnas: [
      { nombre: 'id_consumo', tipo: 'INTEGER', pk: true },
      { nombre: 'id_reserva', tipo: 'INTEGER', fk: 'reserva' },
      { nombre: 'concepto', tipo: 'TEXT' },
      { nombre: 'importe', tipo: 'REAL' },
    ],
  },
]

/**
 * Datos de ejemplo.
 *
 * El alumno escribe el DDL, que es lo que se está enseñando; los datos se los
 * damos nosotros para que las consultas de los últimos pasos tengan una
 * respuesta única y verificable. Si cada uno inventara sus filas, no habría
 * forma de decirle si su consulta está bien.
 */
export const datosDeEjemplo = `
-- Datos de ejemplo del Hotel Sagarnaga.
INSERT INTO tipo_habitacion (id_tipo, nombre, capacidad, precio_noche) VALUES
  (1, 'Individual', 1, 210),
  (2, 'Matrimonial', 2, 320),
  (3, 'Doble twin', 2, 340),
  (4, 'Triple', 3, 430),
  (5, 'Suite', 4, 620);

INSERT INTO huesped (id_huesped, nombre, documento, pais) VALUES
  (1, 'Marisol Quispe', '4821973', 'Bolivia'),
  (2, 'Andreas Müller', 'DE884201', 'Alemania'),
  (3, 'Lucia Fernandez', 'AR221904', 'Argentina'),
  (4, 'Kenji Watanabe', 'JP773310', 'Japon'),
  (5, 'Rodrigo Salazar', '7712044', 'Bolivia'),
  (6, 'Emma Clarke', 'GB559120', 'Reino Unido'),
  (7, 'Paulo Ribeiro', 'BR330871', 'Brasil'),
  (8, 'Ana Terceros', '6620913', 'Bolivia');

INSERT INTO habitacion (id_habitacion, numero, piso, id_tipo) VALUES
  (1, '101', 1, 1),
  (2, '102', 1, 2),
  (3, '103', 1, 2),
  (4, '201', 2, 3),
  (5, '202', 2, 3),
  (6, '203', 2, 4),
  (7, '301', 3, 4),
  (8, '302', 3, 5),
  (9, '303', 3, 1),
  (10, '304', 3, 2);

INSERT INTO reserva (id_reserva, id_huesped, id_habitacion, fecha_entrada, fecha_salida, estado) VALUES
  (1, 1, 2, '2025-03-04', '2025-03-07', 'Finalizada'),
  (2, 2, 8, '2025-03-05', '2025-03-12', 'Finalizada'),
  (3, 3, 4, '2025-03-09', '2025-03-11', 'Finalizada'),
  (4, 4, 1, '2025-03-14', '2025-03-16', 'Finalizada'),
  (5, 5, 6, '2025-04-02', '2025-04-05', 'Finalizada'),
  (6, 2, 8, '2025-04-18', '2025-04-25', 'Finalizada'),
  (7, 6, 5, '2025-05-01', '2025-05-04', 'Finalizada'),
  (8, 7, 3, '2025-05-10', '2025-05-13', 'Cancelada'),
  (9, 1, 2, '2025-06-06', '2025-06-08', 'Finalizada'),
  (10, 8, 7, '2025-06-20', '2025-06-27', 'Finalizada'),
  (11, 3, 4, '2025-07-03', '2025-07-06', 'Finalizada'),
  (12, 6, 10, '2025-07-19', '2025-07-21', 'Cancelada');

INSERT INTO consumo (id_consumo, id_reserva, concepto, importe) VALUES
  (1, 1, 'Restaurante El Tambo', 145.50),
  (2, 1, 'Lavanderia', 60.00),
  (3, 2, 'Restaurante El Tambo', 380.00),
  (4, 2, 'Tour Valle de la Luna', 240.00),
  (5, 2, 'Cafe del Mundo', 95.00),
  (6, 3, 'Cafe del Mundo', 72.00),
  (7, 5, 'Restaurante El Tambo', 210.00),
  (8, 6, 'Tour Tiwanaku', 420.00),
  (9, 6, 'Lavanderia', 85.00),
  (10, 7, 'Cafe del Mundo', 64.00),
  (11, 9, 'Restaurante El Tambo', 130.00),
  (12, 10, 'Tour Chacaltaya', 520.00),
  (13, 10, 'Restaurante El Tambo', 295.00),
  (14, 11, 'Lavanderia', 45.00);

-- ------------------------------------------------------------------
-- Segunda temporada.
--
-- Esta mitad trae casos que la primera no tenia: huespedes de mas paises,
-- estadias de una sola noche y de mas de una semana, reservas en estado
-- 'Confirmada' (todavia no ocurrieron), una habitacion que nunca se ocupo y
-- consumos de conceptos nuevos. Sirve para que las consultas den resultados
-- menos parejos y para que aparezcan los casos borde.
-- ------------------------------------------------------------------

INSERT INTO huesped (id_huesped, nombre, documento, pais) VALUES
  (9, 'Sofia Aramayo', '8830142', 'Bolivia'),
  (10, 'Thomas Berg', 'NO447120', 'Noruega'),
  (11, 'Isabel Duarte', 'PT662084', 'Portugal'),
  (12, 'Nayra Mamani', '9014577', 'Bolivia'),
  (13, 'Chen Wei', 'CN881309', 'China'),
  (14, 'Martin Olivera', 'UY335611', 'Uruguay'),
  (15, 'Aicha Diallo', 'SN229740', 'Senegal'),
  (16, 'Diego Camargo', '7745820', 'Bolivia');

INSERT INTO habitacion (id_habitacion, numero, piso, id_tipo) VALUES
  (11, '104', 1, 1),
  (12, '204', 2, 5),
  (13, '305', 3, 3),
  (14, '306', 3, 4);

INSERT INTO reserva (id_reserva, id_huesped, id_habitacion, fecha_entrada, fecha_salida, estado) VALUES
  (13, 9, 11, '2025-08-02', '2025-08-03', 'Finalizada'),
  (14, 10, 12, '2025-08-08', '2025-08-19', 'Finalizada'),
  (15, 11, 13, '2025-08-15', '2025-08-18', 'Finalizada'),
  (16, 12, 9, '2025-09-01', '2025-09-02', 'Finalizada'),
  (17, 13, 12, '2025-09-12', '2025-09-20', 'Finalizada'),
  (18, 14, 14, '2025-09-25', '2025-09-28', 'Cancelada'),
  (19, 15, 13, '2025-10-04', '2025-10-09', 'Finalizada'),
  (20, 2, 8, '2025-10-17', '2025-10-24', 'Finalizada'),
  (21, 16, 11, '2025-11-07', '2025-11-08', 'Finalizada'),
  (22, 9, 14, '2025-11-21', '2025-11-26', 'Finalizada'),
  (23, 10, 12, '2025-12-19', '2025-12-30', 'Confirmada'),
  (24, 11, 3, '2025-12-26', '2025-12-29', 'Confirmada');

INSERT INTO consumo (id_consumo, id_reserva, concepto, importe) VALUES
  (15, 13, 'Cafe del Mundo', 38.00),
  (16, 14, 'Restaurante El Tambo', 640.00),
  (17, 14, 'Tour Tiwanaku', 420.00),
  (18, 14, 'Lavanderia', 120.00),
  (19, 14, 'Traslado aeropuerto', 180.00),
  (20, 15, 'Cafe del Mundo', 88.00),
  (21, 15, 'Tour Valle de la Luna', 240.00),
  (22, 17, 'Restaurante El Tambo', 512.00),
  (23, 17, 'Traslado aeropuerto', 180.00),
  (24, 17, 'Alquiler sala de reuniones', 350.00),
  (25, 19, 'Tour Chacaltaya', 520.00),
  (26, 19, 'Restaurante El Tambo', 265.00),
  (27, 20, 'Cafe del Mundo', 110.00),
  (28, 20, 'Lavanderia', 95.00),
  (29, 22, 'Restaurante El Tambo', 340.00),
  (30, 22, 'Alquiler sala de reuniones', 350.00);
`.trim()

/** Script con el que arranca el taller. */
export const scriptInicial = `-- Taller OLTP · Hotel Sagarnaga
--
-- Aca construyes la base, no la consultas: escribe el CREATE TABLE de cada
-- tabla que te pide el paso y ejecuta. El diagrama de la derecha se dibuja
-- solo con lo que vayas creando.
--
-- La ficha de la derecha te dice, tabla por tabla, que columnas necesita,
-- cual es la clave primaria y cuales son foraneas.
--
-- Cada ejecucion arranca de una base vacia y corre todo el script de arriba
-- abajo, asi que no borres lo que ya funciona.
`

export const pasos = [
  {
    id: 'sag-01',
    etapa: 'Crear',
    titulo: 'La primera tabla',
    consigna: 'Crea la tabla tipo_habitacion con id_tipo como clave primaria, y las columnas nombre, capacidad y precio_noche.',
    pista: 'CREATE TABLE nombre ( columna TIPO, ... ). La clave primaria se marca con PRIMARY KEY al lado de la columna.',
    verificar: { tipo: 'esquema', tabla: 'tipo_habitacion' },
    porQue: 'Un catálogo: no depende de nadie. Por eso va primero, y por eso el diagrama la pone arriba de todo.',
  },
  {
    id: 'sag-02',
    etapa: 'Crear',
    titulo: 'La tabla de huéspedes',
    consigna: 'Crea la tabla huesped con id_huesped como clave primaria, y las columnas nombre, documento y pais.',
    pista: 'Es la misma forma que la anterior. Otro catálogo, tampoco depende de nadie.',
    verificar: { tipo: 'esquema', tabla: 'huesped' },
  },
  {
    id: 'sag-03',
    etapa: 'Crear',
    titulo: 'La primera clave foránea',
    consigna: 'Crea la tabla habitacion con id_habitacion como clave primaria, las columnas numero y piso, y id_tipo como clave foránea hacia tipo_habitacion.',
    pista: 'La foránea se declara así:  id_tipo INTEGER REFERENCES tipo_habitacion(id_tipo)',
    verificar: { tipo: 'esquema', tabla: 'habitacion' },
    porQue: 'Acá aparece la primera dependencia. Mira cómo el diagrama la baja un nivel y le dibuja la línea: eso es la foránea, no un adorno.',
  },
  {
    id: 'sag-04',
    etapa: 'Crear',
    titulo: 'Dos foráneas en la misma tabla',
    consigna: 'Crea la tabla reserva con id_reserva como clave primaria, id_huesped hacia huesped, id_habitacion hacia habitacion, y las columnas fecha_entrada, fecha_salida y estado.',
    pista: 'Una tabla puede tener varias foráneas. Las fechas van como TEXT en formato AAAA-MM-DD: SQLite no tiene tipo fecha propio.',
    verificar: { tipo: 'esquema', tabla: 'reserva' },
    porQue: 'La reserva es el corazón del OLTP: registra un HECHO del negocio en el momento en que pasa.',
  },
  {
    id: 'sag-05',
    etapa: 'Crear',
    titulo: 'El detalle de la estadía',
    consigna: 'Crea la tabla consumo con id_consumo como clave primaria, id_reserva hacia reserva, y las columnas concepto e importe.',
    pista: 'Una reserva puede tener muchos consumos, pero cada consumo pertenece a una sola reserva: la foránea va del lado de consumo.',
    verificar: { tipo: 'esquema', tabla: 'consumo' },
    porQue: 'Uno a muchos. La foránea siempre va del lado "muchos": si la pusieras en reserva, solo podrías guardar un consumo por estadía.',
  },
  {
    id: 'sag-06',
    etapa: 'Poblar',
    titulo: 'Cargar los datos',
    consigna: 'Agrega los datos de ejemplo al final de tu script con el botón "Pegar datos de ejemplo" y ejecuta. Deben quedar 5 tipos, 16 huéspedes, 14 habitaciones, 24 reservas y 30 consumos.',
    pista: 'Si algún INSERT falla, el mensaje te dice qué columna no coincide: revisa cómo la nombraste en el CREATE TABLE.',
    verificar: {
      tipo: 'filas',
      minimos: { tipo_habitacion: 5, huesped: 16, habitacion: 14, reserva: 24, consumo: 30 },
    },
    porQue: 'Los datos vienen dados para que las consultas de los pasos siguientes tengan una respuesta única y se puedan corregir.',
  },
  {
    id: 'sag-07',
    etapa: 'Consultar',
    titulo: 'Leer una tabla',
    consigna: 'Al final del script, escribe una consulta que traiga el nombre y el precio_noche de los tipos de habitación, del más caro al más barato.',
    pista: 'SELECT columnas FROM tabla ORDER BY columna DESC.',
    verificar: {
      tipo: 'consulta',
      sql: 'SELECT nombre, precio_noche FROM tipo_habitacion ORDER BY precio_noche DESC',
      ordenImporta: true,
    },
  },
  {
    id: 'sag-08',
    etapa: 'Consultar',
    titulo: 'Filtrar',
    consigna: 'Trae el nombre y el pais de los huéspedes que NO son de Bolivia, ordenados por nombre.',
    pista: 'WHERE columna <> valor. Las cadenas van entre comillas simples.',
    verificar: {
      tipo: 'consulta',
      sql: "SELECT nombre, pais FROM huesped WHERE pais <> 'Bolivia' ORDER BY nombre",
      ordenImporta: true,
    },
  },
  {
    id: 'sag-09',
    etapa: 'Consultar',
    titulo: 'Unir dos tablas',
    consigna: 'Muestra el numero de cada habitación junto al nombre de su tipo, ordenado por numero.',
    pista: 'El JOIN se hace por la foránea que creaste: habitacion.id_tipo = tipo_habitacion.id_tipo.',
    verificar: {
      tipo: 'consulta',
      sql: `SELECT h.numero, t.nombre FROM habitacion h
            JOIN tipo_habitacion t ON h.id_tipo = t.id_tipo ORDER BY h.numero`,
      ordenImporta: true,
    },
    porQue: 'La foránea no es decoración: es el camino por el que se vuelven a juntar los datos que el modelo separó.',
  },
  {
    id: 'sag-10',
    etapa: 'Consultar',
    titulo: 'Recorrer tres tablas',
    consigna: 'Muestra el nombre del huésped, el numero de habitación y la fecha_entrada de las reservas en estado Finalizada, ordenado por fecha_entrada.',
    pista: 'Son dos JOIN desde reserva: uno a huesped y otro a habitacion.',
    verificar: {
      tipo: 'consulta',
      sql: `SELECT hu.nombre, ha.numero, r.fecha_entrada
            FROM reserva r
            JOIN huesped hu ON r.id_huesped = hu.id_huesped
            JOIN habitacion ha ON r.id_habitacion = ha.id_habitacion
            WHERE r.estado = 'Finalizada'
            ORDER BY r.fecha_entrada`,
      ordenImporta: true,
    },
  },
  {
    id: 'sag-11',
    etapa: 'Consultar',
    titulo: 'Agrupar y sumar',
    consigna: 'Muestra el nombre del huésped y cuánto gastó en consumos, sumando el importe. Solo los que gastaron algo, de mayor a menor gasto.',
    pista: 'Tres tablas: consumo, reserva y huesped. Después GROUP BY por el huésped y SUM del importe.',
    verificar: {
      tipo: 'consulta',
      sql: `SELECT hu.nombre, SUM(c.importe) AS gasto
            FROM consumo c
            JOIN reserva r ON c.id_reserva = r.id_reserva
            JOIN huesped hu ON r.id_huesped = hu.id_huesped
            GROUP BY hu.nombre ORDER BY gasto DESC`,
      ordenImporta: true,
    },
  },
  {
    id: 'sag-12',
    etapa: 'Consultar',
    titulo: 'Lo que no ocurrió',
    consigna: 'Lista el nombre de los huéspedes que NUNCA hicieron un consumo, ordenados por nombre.',
    pista: 'Un LEFT JOIN deja en NULL lo que no encontró pareja. Después se filtra por ese NULL.',
    verificar: {
      tipo: 'consulta',
      sql: `SELECT hu.nombre FROM huesped hu
            LEFT JOIN reserva r ON hu.id_huesped = r.id_huesped
            LEFT JOIN consumo c ON r.id_reserva = c.id_reserva
            GROUP BY hu.nombre HAVING COUNT(c.id_consumo) = 0 ORDER BY hu.nombre`,
      ordenImporta: true,
    },
    porQue: 'Preguntar por lo que NO pasó es de las cosas más útiles y menos intuitivas del SQL: la respuesta no está en la tabla de movimientos.',
  },
]

export const caso = {
  id: 'sagarnaga',
  nombre: 'Hotel Sagarnaga',
  subtitulo: 'Hotelería · calle Sagarnaga, La Paz',
  resumen: 'Construye desde cero la base transaccional de un hotel: los tipos de habitación, los huéspedes, las reservas y lo que cada uno consume. Primero la creas con SQL, después la consultas.',
  nota: 'El Hotel Sagarnaga está en la calle Sagarnaga 326, zona Rosario, a media cuadra del Mercado de las Brujas. Empezó como negocio familiar en los años 80 con cuatro habitaciones y hoy tiene sesenta. Los huéspedes, reservas e importes de este taller son didácticos.',
  modelo,
  pasos,
  scriptInicial,
  datosDeEjemplo,
}
