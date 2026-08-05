-- GENERADO por scripts/exportar-semillas.mjs — no editar a mano.
-- Fuente: front/src/practices/data/expocruz.js

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
