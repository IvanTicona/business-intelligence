-- GENERADO por scripts/exportar-semillas.mjs — no editar a mano.
-- Fuente: front/src/practices/data/spaziogym.js

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
