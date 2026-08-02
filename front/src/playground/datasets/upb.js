/*
 * UPB · Universidad Privada Boliviana
 *
 * ARCHIVO GENERADO. No lo edites a mano: se regenera con
 *   node scripts/datasets/upb.mjs
 *
 * Los nombres de negocio son reales para que el alumno reconozca el caso.
 * Las cifras son didácticas y no representan la operación real de la empresa.
 */

export const upb = {
  id: "upb",
  nombre: "UPB",
  subtitulo: "Universidad Privada Boliviana · La Paz",
  dominio: "Educación",
  tipo: "estrella",
  concepto: "Dimensión degenerada y jerarquías. El paralelo vive dentro del hecho porque no tiene atributos propios: saber cuándo NO crear una dimensión es parte del oficio. Además el grain es el semestre, no el día, así que la dimensión de tiempo es el período académico.",
  nota: "Las carreras y facultades corresponden a la oferta de la UPB. Estudiantes, docentes y notas son inventados: cualquier parecido con una persona real es casualidad.",
  tablas: [
    {
      nombre: "hecho_inscripcion",
      rol: "hecho",
      x: 470,
      y: 420,
      columnas: [
        {
          nombre: "id_inscripcion",
          tipo: "INTEGER",
          pk: true
        },
        {
          nombre: "id_periodo",
          tipo: "INTEGER",
          fk: "dim_periodo"
        },
        {
          nombre: "id_estudiante",
          tipo: "INTEGER",
          fk: "dim_estudiante"
        },
        {
          nombre: "id_materia",
          tipo: "INTEGER",
          fk: "dim_materia"
        },
        {
          nombre: "id_docente",
          tipo: "INTEGER",
          fk: "dim_docente"
        },
        {
          nombre: "paralelo",
          tipo: "TEXT"
        },
        {
          nombre: "nota_final",
          tipo: "INTEGER",
          metrica: true
        },
        {
          nombre: "aprobado",
          tipo: "INTEGER",
          metrica: true
        },
        {
          nombre: "creditos",
          tipo: "INTEGER",
          metrica: true
        },
        {
          nombre: "asistencia_pct",
          tipo: "REAL",
          metrica: true
        }
      ]
    },
    {
      nombre: "dim_periodo",
      rol: "dimension",
      x: 130,
      y: 130,
      columnas: [
        {
          nombre: "id_periodo",
          tipo: "INTEGER",
          pk: true
        },
        {
          nombre: "codigo",
          tipo: "TEXT"
        },
        {
          nombre: "anio",
          tipo: "INTEGER"
        },
        {
          nombre: "semestre",
          tipo: "INTEGER"
        }
      ]
    },
    {
      nombre: "dim_estudiante",
      rol: "dimension",
      x: 470,
      y: 120,
      columnas: [
        {
          nombre: "id_estudiante",
          tipo: "INTEGER",
          pk: true
        },
        {
          nombre: "nombre",
          tipo: "TEXT"
        },
        {
          nombre: "sexo",
          tipo: "TEXT"
        },
        {
          nombre: "id_carrera",
          tipo: "INTEGER",
          fk: "dim_carrera"
        },
        {
          nombre: "anio_ingreso",
          tipo: "INTEGER"
        },
        {
          nombre: "colegio_origen",
          tipo: "TEXT"
        },
        {
          nombre: "beca",
          tipo: "TEXT"
        }
      ]
    },
    {
      nombre: "dim_docente",
      rol: "dimension",
      x: 830,
      y: 130,
      columnas: [
        {
          nombre: "id_docente",
          tipo: "INTEGER",
          pk: true
        },
        {
          nombre: "nombre",
          tipo: "TEXT"
        },
        {
          nombre: "dedicacion",
          tipo: "TEXT"
        },
        {
          nombre: "grado",
          tipo: "TEXT"
        },
        {
          nombre: "anio_ingreso",
          tipo: "INTEGER"
        }
      ]
    },
    {
      nombre: "dim_materia",
      rol: "dimension",
      x: 130,
      y: 700,
      columnas: [
        {
          nombre: "id_materia",
          tipo: "INTEGER",
          pk: true
        },
        {
          nombre: "nombre",
          tipo: "TEXT"
        },
        {
          nombre: "id_carrera",
          tipo: "INTEGER",
          fk: "dim_carrera"
        },
        {
          nombre: "semestre",
          tipo: "INTEGER"
        },
        {
          nombre: "creditos",
          tipo: "INTEGER"
        }
      ]
    },
    {
      nombre: "dim_carrera",
      rol: "dimension",
      x: 700,
      y: 720,
      columnas: [
        {
          nombre: "id_carrera",
          tipo: "INTEGER",
          pk: true
        },
        {
          nombre: "nombre",
          tipo: "TEXT"
        },
        {
          nombre: "facultad",
          tipo: "TEXT"
        },
        {
          nombre: "semestres",
          tipo: "INTEGER"
        }
      ]
    }
  ],
  retos: [
    {
      id: "upb-01",
      bloque: "navegar",
      concept: "JOIN + COUNT",
      title: "Inscripciones por carrera",
      prompt: "Cantidad de inscripciones por carrera del estudiante. Columnas: carrera, inscripciones. De mayor a menor.",
      hint: "La carrera está en dim_estudiante, que apunta a dim_carrera.",
      starter: "SELECT ca.nombre AS carrera, COUNT(*) AS inscripciones\nFROM hecho_inscripcion i\nJOIN dim_estudiante e ON ...\nJOIN dim_carrera ca ON ...;",
      expectedSql: "SELECT ca.nombre AS carrera, COUNT(*) AS inscripciones\nFROM hecho_inscripcion i\nJOIN dim_estudiante e ON i.id_estudiante = e.id_estudiante\nJOIN dim_carrera ca ON e.id_carrera = ca.id_carrera\nGROUP BY ca.nombre ORDER BY inscripciones DESC;",
      orderMatters: true
    },
    {
      id: "upb-02",
      bloque: "navegar",
      concept: "Dimensión degenerada",
      title: "El paralelo no tiene tabla",
      prompt: "Inscripciones y nota promedio por paralelo, redondeada a 1. Columnas: paralelo, inscripciones, nota. Ordena por paralelo.",
      hint: "El paralelo está en el hecho: no hay ninguna dimensión que unir. Eso es una dimensión degenerada.",
      starter: "SELECT paralelo, COUNT(*) AS inscripciones, ROUND(AVG(nota_final), 1) AS nota\nFROM hecho_inscripcion\nGROUP BY ...;",
      expectedSql: "SELECT paralelo, COUNT(*) AS inscripciones, ROUND(AVG(nota_final), 1) AS nota\nFROM hecho_inscripcion GROUP BY paralelo ORDER BY paralelo;",
      orderMatters: true
    },
    {
      id: "upb-03",
      bloque: "slice",
      concept: "Filtro por período",
      title: "Solo el último semestre",
      prompt: "Para el período 2025-2: inscripciones por materia. Columnas: materia, inscripciones. De mayor a menor.",
      hint: "El código del período está en dim_periodo.",
      starter: "SELECT m.nombre AS materia, COUNT(*) AS inscripciones\nFROM hecho_inscripcion i\nJOIN dim_materia m ON ...\nJOIN dim_periodo p ON ...\nWHERE p.codigo = ...;",
      expectedSql: "SELECT m.nombre AS materia, COUNT(*) AS inscripciones\nFROM hecho_inscripcion i\nJOIN dim_materia m ON i.id_materia = m.id_materia\nJOIN dim_periodo p ON i.id_periodo = p.id_periodo\nWHERE p.codigo = '2025-2'\nGROUP BY m.nombre ORDER BY inscripciones DESC, m.nombre;",
      orderMatters: true
    },
    {
      id: "upb-04",
      bloque: "aditividad",
      concept: "Tasa, no promedio de flags",
      title: "Tasa de aprobación por materia",
      prompt: "Porcentaje de aprobación por materia, redondeado a 2. Columnas: materia, inscripciones, tasa. De menor a mayor tasa (las más difíciles primero).",
      hint: "aprobado es 0 o 1: SUM cuenta los aprobados y COUNT(*) el total.",
      starter: "SELECT m.nombre AS materia, COUNT(*) AS inscripciones,\n  ROUND(SUM(i.aprobado) * 100.0 / COUNT(*), 2) AS tasa\nFROM ...;",
      expectedSql: "SELECT m.nombre AS materia, COUNT(*) AS inscripciones,\n  ROUND(SUM(i.aprobado) * 100.0 / COUNT(*), 2) AS tasa\nFROM hecho_inscripcion i JOIN dim_materia m ON i.id_materia = m.id_materia\nGROUP BY m.nombre ORDER BY tasa ASC, m.nombre;",
      orderMatters: true
    },
    {
      id: "upb-05",
      bloque: "aditividad",
      concept: "Créditos aditivos",
      title: "Créditos cursados",
      prompt: "Créditos totales cursados por carrera. Columnas: carrera, creditos. De mayor a menor.",
      hint: "Los créditos sí se suman: cada inscripción aporta los suyos.",
      starter: "SELECT ca.nombre AS carrera, SUM(i.creditos) AS creditos\nFROM hecho_inscripcion i\nJOIN ...;",
      expectedSql: "SELECT ca.nombre AS carrera, SUM(i.creditos) AS creditos\nFROM hecho_inscripcion i\nJOIN dim_estudiante e ON i.id_estudiante = e.id_estudiante\nJOIN dim_carrera ca ON e.id_carrera = ca.id_carrera\nGROUP BY ca.nombre ORDER BY creditos DESC;",
      orderMatters: true
    },
    {
      id: "upb-06",
      bloque: "granularidad",
      concept: "Roll-up a facultad",
      title: "De carrera a facultad",
      prompt: "Inscripciones y nota promedio por facultad, redondeada a 1. Columnas: facultad, inscripciones, nota. De mayor a menor cantidad.",
      hint: "La facultad es el nivel superior de la jerarquía dentro de dim_carrera.",
      starter: "SELECT ca.facultad, COUNT(*) AS inscripciones, ...\nFROM hecho_inscripcion i\nJOIN ...;",
      expectedSql: "SELECT ca.facultad, COUNT(*) AS inscripciones, ROUND(AVG(i.nota_final), 1) AS nota\nFROM hecho_inscripcion i\nJOIN dim_estudiante e ON i.id_estudiante = e.id_estudiante\nJOIN dim_carrera ca ON e.id_carrera = ca.id_carrera\nGROUP BY ca.facultad ORDER BY inscripciones DESC;",
      orderMatters: true
    },
    {
      id: "upb-07",
      bloque: "tiempo",
      concept: "Evolución por período",
      title: "Cómo cambió la matrícula",
      prompt: "Inscripciones y estudiantes distintos por período. Columnas: codigo, inscripciones, estudiantes. En orden de período.",
      hint: "Un estudiante se inscribe a varias materias: el conteo de personas necesita DISTINCT.",
      starter: "SELECT p.codigo, COUNT(*) AS inscripciones, COUNT(DISTINCT ...) AS estudiantes\nFROM ...;",
      expectedSql: "SELECT p.codigo, COUNT(*) AS inscripciones, COUNT(DISTINCT i.id_estudiante) AS estudiantes\nFROM hecho_inscripcion i JOIN dim_periodo p ON i.id_periodo = p.id_periodo\nGROUP BY p.codigo ORDER BY p.codigo;",
      orderMatters: true
    },
    {
      id: "upb-08",
      bloque: "tiempo",
      concept: "Comparar semestres",
      title: "Primer contra segundo semestre",
      prompt: "Por año: inscripciones del semestre 1 y del semestre 2 en columnas separadas. Columnas: anio, sem_1, sem_2. En orden de año.",
      hint: "SUM con CASE WHEN sobre el semestre, agrupando por año.",
      starter: "SELECT p.anio,\n  SUM(CASE WHEN p.semestre = 1 THEN 1 ELSE 0 END) AS sem_1,\n  ...\nFROM ...;",
      expectedSql: "SELECT p.anio,\n  SUM(CASE WHEN p.semestre = 1 THEN 1 ELSE 0 END) AS sem_1,\n  SUM(CASE WHEN p.semestre = 2 THEN 1 ELSE 0 END) AS sem_2\nFROM hecho_inscripcion i JOIN dim_periodo p ON i.id_periodo = p.id_periodo\nGROUP BY p.anio ORDER BY p.anio;",
      orderMatters: true
    },
    {
      id: "upb-09",
      bloque: "ventanas",
      concept: "Ranking por grupo",
      title: "La materia más difícil de cada facultad",
      prompt: "Para cada facultad, la materia con menor tasa de aprobación. Columnas: facultad, materia, tasa. Ordena por facultad.",
      hint: "Calcula la tasa por materia y facultad, y usa ROW_NUMBER() con PARTITION BY facultad ordenando ascendente.",
      starter: "SELECT facultad, materia, tasa FROM (\n  SELECT ..., ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ... ASC) AS puesto\n  FROM ...\n) WHERE puesto = 1;",
      expectedSql: "SELECT facultad, materia, tasa FROM (\n  SELECT ca.facultad AS facultad, m.nombre AS materia,\n    ROUND(SUM(i.aprobado) * 100.0 / COUNT(*), 2) AS tasa,\n    ROW_NUMBER() OVER (PARTITION BY ca.facultad ORDER BY SUM(i.aprobado) * 1.0 / COUNT(*) ASC, m.nombre) AS puesto\n  FROM hecho_inscripcion i\n  JOIN dim_materia m ON i.id_materia = m.id_materia\n  JOIN dim_carrera ca ON m.id_carrera = ca.id_carrera\n  GROUP BY ca.facultad, m.nombre\n) WHERE puesto = 1 ORDER BY facultad;",
      orderMatters: true
    },
    {
      id: "upb-10",
      bloque: "ventanas",
      concept: "Promedio del estudiante",
      title: "Los diez mejores promedios",
      prompt: "Los 10 estudiantes con mejor nota promedio, con su carrera. Columnas: nombre, carrera, promedio redondeado a 1, materias.",
      hint: "Agrupa por estudiante, y ordena por el promedio. Muestra también cuántas materias cursó.",
      starter: "SELECT e.nombre, ca.nombre AS carrera, ROUND(AVG(i.nota_final), 1) AS promedio, COUNT(*) AS materias\nFROM ...\nLIMIT 10;",
      expectedSql: "SELECT e.nombre, ca.nombre AS carrera, ROUND(AVG(i.nota_final), 1) AS promedio, COUNT(*) AS materias\nFROM hecho_inscripcion i\nJOIN dim_estudiante e ON i.id_estudiante = e.id_estudiante\nJOIN dim_carrera ca ON e.id_carrera = ca.id_carrera\nGROUP BY e.nombre, ca.nombre ORDER BY promedio DESC, e.nombre LIMIT 10;",
      orderMatters: true
    },
    {
      id: "upb-11",
      bloque: "trampas",
      concept: "Doble conteo",
      title: "Estudiantes no es inscripciones",
      prompt: "Cuántos estudiantes DISTINTOS tiene cada carrera según el hecho. Columnas: carrera, estudiantes. De mayor a menor.",
      hint: "Cada estudiante aparece una vez por materia y por período: son muchas filas por persona.",
      starter: "SELECT ca.nombre AS carrera, COUNT(...) AS estudiantes\nFROM hecho_inscripcion i\nJOIN ...;",
      expectedSql: "SELECT ca.nombre AS carrera, COUNT(DISTINCT i.id_estudiante) AS estudiantes\nFROM hecho_inscripcion i\nJOIN dim_estudiante e ON i.id_estudiante = e.id_estudiante\nJOIN dim_carrera ca ON e.id_carrera = ca.id_carrera\nGROUP BY ca.nombre ORDER BY estudiantes DESC, ca.nombre;",
      orderMatters: true,
      trampa: "COUNT(*) cuenta inscripciones y multiplica por cuatro o cinco la matricula real de cada carrera."
    },
    {
      id: "upb-12",
      bloque: "trampas",
      concept: "Correlación aparente",
      title: "Asistencia y nota",
      prompt: "Nota promedio agrupada por tramo de asistencia: \"Menos de 70\", \"70 a 85\" y \"Mas de 85\". Columnas: tramo, inscripciones, nota. Ordena por tramo.",
      hint: "CASE WHEN arma los tramos; se agrupa por la misma expresión.",
      starter: "SELECT CASE WHEN asistencia_pct < 70 THEN 'Menos de 70'\n            WHEN asistencia_pct <= 85 THEN '70 a 85'\n            ELSE 'Mas de 85' END AS tramo,\n  COUNT(*) AS inscripciones, ROUND(AVG(nota_final), 1) AS nota\nFROM hecho_inscripcion\nGROUP BY ...;",
      expectedSql: "SELECT CASE WHEN asistencia_pct < 70 THEN 'Menos de 70'\n            WHEN asistencia_pct <= 85 THEN '70 a 85'\n            ELSE 'Mas de 85' END AS tramo,\n  COUNT(*) AS inscripciones, ROUND(AVG(nota_final), 1) AS nota\nFROM hecho_inscripcion GROUP BY tramo ORDER BY tramo;",
      orderMatters: true,
      trampa: "Si los tres tramos dan notas parecidas, la conclusion NO es que asistir no sirva: en estos datos la nota se generó aparte de la asistencia. Un cruce sin relación causal es la trampa mas facil de vender en un tablero."
    }
  ]
}

upb.seedSql = String.raw`
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

INSERT INTO dim_carrera (id_carrera, nombre, facultad, semestres) VALUES
  (1, 'Ingenieria de Sistemas', 'Ingenieria', 10);
INSERT INTO dim_carrera (id_carrera, nombre, facultad, semestres) VALUES
  (2, 'Ingenieria Industrial', 'Ingenieria', 10);
INSERT INTO dim_carrera (id_carrera, nombre, facultad, semestres) VALUES
  (3, 'Ingenieria Comercial', 'Empresariales', 9);
INSERT INTO dim_carrera (id_carrera, nombre, facultad, semestres) VALUES
  (4, 'Administracion de Empresas', 'Empresariales', 8);
INSERT INTO dim_carrera (id_carrera, nombre, facultad, semestres) VALUES
  (5, 'Derecho', 'Ciencias Sociales', 10);
INSERT INTO dim_carrera (id_carrera, nombre, facultad, semestres) VALUES
  (6, 'Comunicacion Digital', 'Ciencias Sociales', 8);
INSERT INTO dim_carrera (id_carrera, nombre, facultad, semestres) VALUES
  (7, 'Ingenieria Mecatronica', 'Ingenieria', 10);

INSERT INTO dim_materia (id_materia, nombre, id_carrera, semestre, creditos) VALUES
  (1, 'Introduccion a la Programacion', 1, 1, 4);
INSERT INTO dim_materia (id_materia, nombre, id_carrera, semestre, creditos) VALUES
  (2, 'Estructuras de Datos', 1, 3, 4);
INSERT INTO dim_materia (id_materia, nombre, id_carrera, semestre, creditos) VALUES
  (3, 'Base de Datos I', 1, 4, 4);
INSERT INTO dim_materia (id_materia, nombre, id_carrera, semestre, creditos) VALUES
  (4, 'Business Intelligence', 1, 7, 4);
INSERT INTO dim_materia (id_materia, nombre, id_carrera, semestre, creditos) VALUES
  (5, 'Redes de Computadoras', 1, 6, 3);
INSERT INTO dim_materia (id_materia, nombre, id_carrera, semestre, creditos) VALUES
  (6, 'Investigacion Operativa', 2, 5, 4);
INSERT INTO dim_materia (id_materia, nombre, id_carrera, semestre, creditos) VALUES
  (7, 'Gestion de la Calidad', 2, 7, 3);
INSERT INTO dim_materia (id_materia, nombre, id_carrera, semestre, creditos) VALUES
  (8, 'Microeconomia', 3, 3, 4);
INSERT INTO dim_materia (id_materia, nombre, id_carrera, semestre, creditos) VALUES
  (9, 'Finanzas Corporativas', 3, 6, 4);
INSERT INTO dim_materia (id_materia, nombre, id_carrera, semestre, creditos) VALUES
  (10, 'Marketing Estrategico', 4, 5, 3);
INSERT INTO dim_materia (id_materia, nombre, id_carrera, semestre, creditos) VALUES
  (11, 'Contabilidad General', 4, 2, 4);
INSERT INTO dim_materia (id_materia, nombre, id_carrera, semestre, creditos) VALUES
  (12, 'Derecho Constitucional', 5, 2, 4);
INSERT INTO dim_materia (id_materia, nombre, id_carrera, semestre, creditos) VALUES
  (13, 'Derecho Comercial', 5, 6, 3);
INSERT INTO dim_materia (id_materia, nombre, id_carrera, semestre, creditos) VALUES
  (14, 'Produccion Audiovisual', 6, 4, 3);
INSERT INTO dim_materia (id_materia, nombre, id_carrera, semestre, creditos) VALUES
  (15, 'Sistemas de Control', 7, 6, 4);
INSERT INTO dim_materia (id_materia, nombre, id_carrera, semestre, creditos) VALUES
  (16, 'Robotica', 7, 8, 4);

INSERT INTO dim_docente (id_docente, nombre, dedicacion, grado, anio_ingreso) VALUES
  (1, 'Ximena Saavedra', 'Tiempo completo', 'Licenciatura', 2009);
INSERT INTO dim_docente (id_docente, nombre, dedicacion, grado, anio_ingreso) VALUES
  (2, 'Sergio Aranibar', 'Tiempo horario', 'Maestria', 2013);
INSERT INTO dim_docente (id_docente, nombre, dedicacion, grado, anio_ingreso) VALUES
  (3, 'Claudia Villegas', 'Tiempo completo', 'Maestria', 2014);
INSERT INTO dim_docente (id_docente, nombre, dedicacion, grado, anio_ingreso) VALUES
  (4, 'Alejandro Montaño', 'Tiempo completo', 'Maestria', 2008);
INSERT INTO dim_docente (id_docente, nombre, dedicacion, grado, anio_ingreso) VALUES
  (5, 'Andrea Guzman', 'Tiempo completo', 'Maestria', 2016);
INSERT INTO dim_docente (id_docente, nombre, dedicacion, grado, anio_ingreso) VALUES
  (6, 'Ricardo Ortuño', 'Tiempo horario', 'Maestria', 2015);
INSERT INTO dim_docente (id_docente, nombre, dedicacion, grado, anio_ingreso) VALUES
  (7, 'Lorena Zeballos', 'Tiempo horario', 'Maestria', 2017);
INSERT INTO dim_docente (id_docente, nombre, dedicacion, grado, anio_ingreso) VALUES
  (8, 'Ernesto Revollo', 'Tiempo completo', 'Doctorado', 2019);
INSERT INTO dim_docente (id_docente, nombre, dedicacion, grado, anio_ingreso) VALUES
  (9, 'Mariana Menacho', 'Tiempo horario', 'Licenciatura', 2020);
INSERT INTO dim_docente (id_docente, nombre, dedicacion, grado, anio_ingreso) VALUES
  (10, 'Marcelo Landaeta', 'Tiempo completo', 'Doctorado', 2021);
INSERT INTO dim_docente (id_docente, nombre, dedicacion, grado, anio_ingreso) VALUES
  (11, 'Valeria Saavedra', 'Tiempo horario', 'Doctorado', 2016);
INSERT INTO dim_docente (id_docente, nombre, dedicacion, grado, anio_ingreso) VALUES
  (12, 'Paul Aranibar', 'Tiempo horario', 'Doctorado', 2025);
INSERT INTO dim_docente (id_docente, nombre, dedicacion, grado, anio_ingreso) VALUES
  (13, 'Ximena Villegas', 'Tiempo horario', 'Maestria', 2025);
INSERT INTO dim_docente (id_docente, nombre, dedicacion, grado, anio_ingreso) VALUES
  (14, 'Sergio Montaño', 'Tiempo horario', 'Maestria', 2023);
INSERT INTO dim_docente (id_docente, nombre, dedicacion, grado, anio_ingreso) VALUES
  (15, 'Claudia Guzman', 'Tiempo horario', 'Licenciatura', 2020);
INSERT INTO dim_docente (id_docente, nombre, dedicacion, grado, anio_ingreso) VALUES
  (16, 'Alejandro Ortuño', 'Tiempo completo', 'Doctorado', 2025);
INSERT INTO dim_docente (id_docente, nombre, dedicacion, grado, anio_ingreso) VALUES
  (17, 'Andrea Zeballos', 'Tiempo horario', 'Licenciatura', 2024);
INSERT INTO dim_docente (id_docente, nombre, dedicacion, grado, anio_ingreso) VALUES
  (18, 'Ricardo Revollo', 'Tiempo horario', 'Maestria', 2025);

INSERT INTO dim_periodo (id_periodo, codigo, anio, semestre) VALUES
  (1, '2024-1', 2024, 1);
INSERT INTO dim_periodo (id_periodo, codigo, anio, semestre) VALUES
  (2, '2024-2', 2024, 2);
INSERT INTO dim_periodo (id_periodo, codigo, anio, semestre) VALUES
  (3, '2025-1', 2025, 1);
INSERT INTO dim_periodo (id_periodo, codigo, anio, semestre) VALUES
  (4, '2025-2', 2025, 2);

INSERT INTO dim_estudiante (id_estudiante, nombre, sexo, id_carrera, anio_ingreso, colegio_origen, beca) VALUES
  (1, 'Fernanda Lopez', 'M', 2, 2025, 'De convenio', 'Media beca'),
  (2, 'Mateo Gutierrez', 'F', 6, 2021, 'Particular', 'Ninguna'),
  (3, 'Isabella Duran', 'M', 7, 2024, 'Fiscal', 'Media beca'),
  (4, 'Emilio Aramayo', 'F', 2, 2022, 'De convenio', 'Beca completa'),
  (5, 'Micaela Navarro', 'M', 2, 2025, 'Particular', 'Ninguna'),
  (6, 'Sebastian Jimenez', 'F', 4, 2020, 'Fiscal', 'Media beca'),
  (7, 'Alejandra Fuentes', 'M', 7, 2020, 'De convenio', 'Ninguna'),
  (8, 'Santiago Calderon', 'F', 4, 2020, 'Particular', 'Media beca'),
  (9, 'Antonella Rocha', 'M', 4, 2024, 'Fiscal', 'Ninguna'),
  (10, 'Gabriel Miranda', 'F', 6, 2021, 'De convenio', 'Ninguna'),
  (11, 'Camila Herrera', 'M', 6, 2021, 'Particular', 'Ninguna'),
  (12, 'Nicolas Escobar', 'F', 3, 2021, 'Fiscal', 'Beca completa'),
  (13, 'Valentina Bejarano', 'M', 2, 2024, 'De convenio', 'Ninguna'),
  (14, 'Joaquin Ticona', 'F', 4, 2020, 'Particular', 'Media beca'),
  (15, 'Renata Lopez', 'M', 3, 2024, 'Fiscal', 'Ninguna'),
  (16, 'Ivan Gutierrez', 'F', 1, 2023, 'De convenio', 'Ninguna'),
  (17, 'Fernanda Duran', 'M', 3, 2025, 'Particular', 'Media beca'),
  (18, 'Mateo Aramayo', 'F', 3, 2020, 'Fiscal', 'Ninguna'),
  (19, 'Isabella Navarro', 'M', 2, 2021, 'De convenio', 'Media beca'),
  (20, 'Emilio Jimenez', 'F', 2, 2025, 'Particular', 'Ninguna');
INSERT INTO dim_estudiante (id_estudiante, nombre, sexo, id_carrera, anio_ingreso, colegio_origen, beca) VALUES
  (21, 'Micaela Fuentes', 'M', 1, 2025, 'Fiscal', 'Ninguna'),
  (22, 'Sebastian Calderon', 'F', 3, 2024, 'De convenio', 'Media beca'),
  (23, 'Alejandra Rocha', 'M', 3, 2023, 'Particular', 'Ninguna'),
  (24, 'Santiago Miranda', 'F', 7, 2021, 'Fiscal', 'Beca completa'),
  (25, 'Antonella Herrera', 'M', 1, 2020, 'De convenio', 'Beca completa'),
  (26, 'Gabriel Escobar', 'F', 3, 2023, 'Particular', 'Beca completa'),
  (27, 'Camila Bejarano', 'M', 6, 2024, 'Fiscal', 'Ninguna'),
  (28, 'Nicolas Ticona', 'F', 1, 2024, 'De convenio', 'Media beca'),
  (29, 'Valentina Lopez', 'M', 1, 2022, 'Particular', 'Ninguna'),
  (30, 'Joaquin Gutierrez', 'F', 1, 2024, 'Fiscal', 'Media beca'),
  (31, 'Renata Duran', 'M', 4, 2024, 'De convenio', 'Ninguna'),
  (32, 'Ivan Aramayo', 'F', 4, 2022, 'Particular', 'Beca completa'),
  (33, 'Fernanda Navarro', 'M', 6, 2021, 'Fiscal', 'Beca completa'),
  (34, 'Mateo Jimenez', 'F', 3, 2020, 'De convenio', 'Ninguna'),
  (35, 'Isabella Fuentes', 'M', 3, 2021, 'Particular', 'Ninguna'),
  (36, 'Emilio Calderon', 'F', 2, 2022, 'Fiscal', 'Media beca'),
  (37, 'Micaela Rocha', 'M', 5, 2022, 'De convenio', 'Ninguna'),
  (38, 'Sebastian Miranda', 'F', 7, 2022, 'Particular', 'Ninguna'),
  (39, 'Alejandra Herrera', 'M', 2, 2025, 'Fiscal', 'Ninguna'),
  (40, 'Santiago Escobar', 'F', 5, 2025, 'De convenio', 'Media beca');
INSERT INTO dim_estudiante (id_estudiante, nombre, sexo, id_carrera, anio_ingreso, colegio_origen, beca) VALUES
  (41, 'Antonella Bejarano', 'M', 4, 2024, 'Particular', 'Ninguna'),
  (42, 'Gabriel Ticona', 'F', 6, 2021, 'Fiscal', 'Ninguna'),
  (43, 'Camila Lopez', 'M', 3, 2022, 'De convenio', 'Beca completa'),
  (44, 'Nicolas Gutierrez', 'F', 2, 2024, 'Particular', 'Ninguna'),
  (45, 'Valentina Duran', 'M', 5, 2021, 'Fiscal', 'Ninguna'),
  (46, 'Joaquin Aramayo', 'F', 7, 2020, 'De convenio', 'Ninguna'),
  (47, 'Renata Navarro', 'M', 3, 2025, 'Particular', 'Media beca'),
  (48, 'Ivan Jimenez', 'F', 1, 2023, 'Fiscal', 'Beca completa'),
  (49, 'Fernanda Fuentes', 'M', 4, 2024, 'De convenio', 'Media beca'),
  (50, 'Mateo Calderon', 'F', 3, 2022, 'Particular', 'Beca completa'),
  (51, 'Isabella Rocha', 'M', 7, 2021, 'Fiscal', 'Beca completa'),
  (52, 'Emilio Miranda', 'F', 2, 2022, 'De convenio', 'Ninguna'),
  (53, 'Micaela Herrera', 'M', 4, 2024, 'Particular', 'Media beca'),
  (54, 'Sebastian Escobar', 'F', 6, 2022, 'Fiscal', 'Ninguna'),
  (55, 'Alejandra Bejarano', 'M', 3, 2020, 'De convenio', 'Ninguna'),
  (56, 'Santiago Ticona', 'F', 3, 2022, 'Particular', 'Ninguna'),
  (57, 'Antonella Lopez', 'M', 2, 2020, 'Fiscal', 'Ninguna'),
  (58, 'Gabriel Gutierrez', 'F', 5, 2022, 'De convenio', 'Beca completa'),
  (59, 'Camila Duran', 'M', 6, 2020, 'Particular', 'Media beca'),
  (60, 'Nicolas Aramayo', 'F', 2, 2023, 'Fiscal', 'Beca completa');
INSERT INTO dim_estudiante (id_estudiante, nombre, sexo, id_carrera, anio_ingreso, colegio_origen, beca) VALUES
  (61, 'Valentina Navarro', 'M', 7, 2025, 'De convenio', 'Ninguna'),
  (62, 'Joaquin Jimenez', 'F', 6, 2022, 'Particular', 'Beca completa'),
  (63, 'Renata Fuentes', 'M', 2, 2023, 'Fiscal', 'Beca completa'),
  (64, 'Ivan Calderon', 'F', 6, 2022, 'De convenio', 'Media beca'),
  (65, 'Fernanda Rocha', 'M', 2, 2020, 'Particular', 'Ninguna'),
  (66, 'Mateo Miranda', 'F', 4, 2023, 'Fiscal', 'Ninguna'),
  (67, 'Isabella Herrera', 'M', 5, 2022, 'De convenio', 'Ninguna'),
  (68, 'Emilio Escobar', 'F', 5, 2020, 'Particular', 'Ninguna'),
  (69, 'Micaela Bejarano', 'M', 2, 2024, 'Fiscal', 'Ninguna'),
  (70, 'Sebastian Ticona', 'F', 7, 2021, 'De convenio', 'Media beca'),
  (71, 'Alejandra Lopez', 'M', 1, 2022, 'Particular', 'Ninguna'),
  (72, 'Santiago Gutierrez', 'F', 2, 2022, 'Fiscal', 'Ninguna'),
  (73, 'Antonella Duran', 'M', 7, 2024, 'De convenio', 'Ninguna'),
  (74, 'Gabriel Aramayo', 'F', 6, 2025, 'Particular', 'Ninguna'),
  (75, 'Camila Navarro', 'M', 5, 2025, 'Fiscal', 'Beca completa'),
  (76, 'Nicolas Jimenez', 'F', 5, 2024, 'De convenio', 'Ninguna'),
  (77, 'Valentina Fuentes', 'M', 5, 2020, 'Particular', 'Ninguna'),
  (78, 'Joaquin Calderon', 'F', 5, 2020, 'Fiscal', 'Ninguna'),
  (79, 'Renata Rocha', 'M', 6, 2024, 'De convenio', 'Ninguna'),
  (80, 'Ivan Miranda', 'F', 7, 2020, 'Particular', 'Media beca');
INSERT INTO dim_estudiante (id_estudiante, nombre, sexo, id_carrera, anio_ingreso, colegio_origen, beca) VALUES
  (81, 'Fernanda Herrera', 'M', 6, 2022, 'Fiscal', 'Media beca'),
  (82, 'Mateo Escobar', 'F', 7, 2021, 'De convenio', 'Ninguna'),
  (83, 'Isabella Bejarano', 'M', 1, 2022, 'Particular', 'Beca completa'),
  (84, 'Emilio Ticona', 'F', 5, 2023, 'Fiscal', 'Media beca'),
  (85, 'Micaela Lopez', 'M', 6, 2023, 'De convenio', 'Ninguna'),
  (86, 'Sebastian Gutierrez', 'F', 3, 2020, 'Particular', 'Media beca'),
  (87, 'Alejandra Duran', 'M', 1, 2025, 'Fiscal', 'Ninguna'),
  (88, 'Santiago Aramayo', 'F', 3, 2021, 'De convenio', 'Media beca'),
  (89, 'Antonella Navarro', 'M', 4, 2024, 'Particular', 'Media beca'),
  (90, 'Gabriel Jimenez', 'F', 6, 2021, 'Fiscal', 'Ninguna');

INSERT INTO hecho_inscripcion (id_inscripcion, id_periodo, id_estudiante, id_materia, id_docente, paralelo, nota_final, aprobado, creditos, asistencia_pct) VALUES
  (1, 1, 1, 6, 2, 'B', 36, 0, 4, 72.2),
  (2, 1, 2, 14, 14, 'B', 65, 1, 3, 93.9),
  (3, 1, 3, 16, 5, 'A', 89, 1, 4, 64.4),
  (4, 1, 4, 6, 3, 'A', 46, 0, 4, 66.5),
  (5, 1, 4, 7, 11, 'A', 70, 1, 3, 84),
  (6, 1, 5, 6, 16, 'A', 69, 1, 4, 97),
  (7, 1, 6, 11, 2, 'B', 91, 1, 4, 87.7),
  (8, 1, 6, 10, 1, 'A', 57, 1, 3, 75),
  (9, 1, 7, 16, 14, 'A', 86, 1, 4, 96.5),
  (10, 1, 8, 10, 9, 'A', 44, 0, 3, 85.6),
  (11, 1, 12, 9, 1, 'C', 93, 1, 4, 83.6),
  (12, 1, 12, 8, 5, 'A', 85, 1, 4, 71.7),
  (13, 1, 13, 7, 18, 'B', 61, 1, 3, 99.4),
  (14, 1, 14, 11, 15, 'C', 100, 1, 4, 93.3),
  (15, 1, 14, 10, 16, 'C', 82, 1, 3, 70.1),
  (16, 1, 16, 2, 10, 'B', 99, 1, 4, 94.1),
  (17, 1, 17, 8, 7, 'A', 68, 1, 4, 64.6),
  (18, 1, 18, 9, 12, 'B', 33, 0, 4, 70.3),
  (19, 1, 19, 7, 17, 'A', 97, 1, 3, 98.2),
  (20, 1, 20, 7, 8, 'B', 77, 1, 3, 65.3),
  (21, 1, 20, 6, 12, 'A', 60, 1, 4, 79.5),
  (22, 1, 21, 4, 14, 'C', 75, 1, 4, 80.5),
  (23, 1, 22, 9, 17, 'A', 99, 1, 4, 88.7),
  (24, 1, 22, 8, 15, 'A', 58, 1, 4, 59.7),
  (25, 1, 23, 9, 5, 'A', 24, 0, 4, 72.8),
  (26, 1, 23, 8, 7, 'A', 98, 1, 4, 57.5),
  (27, 1, 24, 16, 15, 'A', 32, 0, 4, 89.8),
  (28, 1, 25, 1, 4, 'B', 97, 1, 4, 62),
  (29, 1, 25, 3, 12, 'B', 57, 1, 4, 67.7),
  (30, 1, 25, 5, 15, 'B', 43, 0, 3, 88.3),
  (31, 1, 25, 2, 1, 'C', 74, 1, 4, 56.2),
  (32, 1, 28, 1, 11, 'C', 36, 0, 4, 67.1),
  (33, 1, 28, 2, 12, 'A', 44, 0, 4, 62.7),
  (34, 1, 28, 3, 15, 'A', 93, 1, 4, 58.2),
  (35, 1, 29, 2, 7, 'B', 21, 0, 4, 71.3),
  (36, 1, 29, 1, 6, 'A', 56, 1, 4, 85.2),
  (37, 1, 29, 3, 17, 'B', 48, 0, 4, 91.2),
  (38, 1, 30, 1, 6, 'A', 66, 1, 4, 62),
  (39, 1, 30, 3, 13, 'A', 39, 0, 4, 65.6),
  (40, 1, 31, 10, 5, 'B', 27, 0, 3, 80.5);
INSERT INTO hecho_inscripcion (id_inscripcion, id_periodo, id_estudiante, id_materia, id_docente, paralelo, nota_final, aprobado, creditos, asistencia_pct) VALUES
  (41, 1, 32, 11, 11, 'B', 89, 1, 4, 71.4),
  (42, 1, 32, 10, 3, 'B', 66, 1, 3, 74.3),
  (43, 1, 33, 14, 15, 'B', 45, 0, 3, 89.5),
  (44, 1, 35, 9, 11, 'C', 61, 1, 4, 80.3),
  (45, 1, 35, 8, 1, 'A', 23, 0, 4, 77.3),
  (46, 1, 36, 6, 13, 'A', 40, 0, 4, 86.4),
  (47, 1, 36, 7, 10, 'C', 47, 0, 3, 94.5),
  (48, 1, 37, 12, 10, 'A', 30, 0, 4, 90.9),
  (49, 1, 38, 15, 1, 'A', 56, 1, 4, 65.3),
  (50, 1, 38, 16, 7, 'B', 100, 1, 4, 74.2),
  (51, 1, 39, 7, 16, 'A', 42, 0, 3, 64.9),
  (52, 1, 39, 6, 18, 'C', 89, 1, 4, 83.6),
  (53, 1, 40, 12, 13, 'C', 91, 1, 4, 59.9),
  (54, 1, 41, 10, 11, 'C', 26, 0, 3, 71.3),
  (55, 1, 46, 16, 6, 'A', 85, 1, 4, 83.9),
  (56, 1, 46, 15, 3, 'B', 31, 0, 4, 72.6),
  (57, 1, 48, 5, 2, 'C', 47, 0, 3, 85.1),
  (58, 1, 48, 3, 11, 'B', 87, 1, 4, 87.1),
  (59, 1, 48, 4, 14, 'C', 24, 0, 4, 98.1),
  (60, 1, 49, 10, 11, 'B', 40, 0, 3, 80.6),
  (61, 1, 50, 9, 2, 'C', 96, 1, 4, 63.3),
  (62, 1, 52, 7, 7, 'A', 63, 1, 3, 68.2),
  (63, 1, 54, 14, 18, 'B', 91, 1, 3, 80.1),
  (64, 1, 56, 9, 13, 'A', 35, 0, 4, 71.9),
  (65, 1, 56, 8, 1, 'A', 89, 1, 4, 56.5),
  (66, 1, 57, 6, 13, 'B', 92, 1, 4, 56.4),
  (67, 1, 57, 7, 10, 'A', 26, 0, 3, 83.6),
  (68, 1, 58, 13, 2, 'A', 69, 1, 3, 98.8),
  (69, 1, 58, 12, 12, 'B', 91, 1, 4, 66.9),
  (70, 1, 59, 14, 9, 'A', 75, 1, 3, 89.9),
  (71, 1, 61, 16, 3, 'A', 75, 1, 4, 57.6),
  (72, 1, 61, 15, 11, 'C', 78, 1, 4, 66.4),
  (73, 1, 62, 14, 5, 'B', 38, 0, 3, 75.5),
  (74, 1, 65, 6, 18, 'C', 31, 0, 4, 71.5),
  (75, 1, 65, 7, 10, 'C', 74, 1, 3, 95.2),
  (76, 1, 66, 10, 17, 'A', 82, 1, 3, 87),
  (77, 1, 66, 11, 7, 'A', 43, 0, 4, 60.7),
  (78, 1, 67, 12, 10, 'C', 75, 1, 4, 97.8),
  (79, 1, 68, 12, 18, 'C', 21, 0, 4, 77.6),
  (80, 1, 69, 7, 7, 'A', 63, 1, 3, 85.2);
INSERT INTO hecho_inscripcion (id_inscripcion, id_periodo, id_estudiante, id_materia, id_docente, paralelo, nota_final, aprobado, creditos, asistencia_pct) VALUES
  (81, 1, 71, 3, 8, 'B', 35, 0, 4, 99.1),
  (82, 1, 71, 2, 2, 'C', 31, 0, 4, 71.7),
  (83, 1, 71, 5, 10, 'B', 46, 0, 3, 76.5),
  (84, 1, 72, 6, 1, 'B', 24, 0, 4, 83),
  (85, 1, 72, 7, 14, 'A', 60, 1, 3, 60.5),
  (86, 1, 74, 14, 11, 'A', 53, 1, 3, 70.2),
  (87, 1, 75, 12, 2, 'A', 29, 0, 4, 95.6),
  (88, 1, 76, 12, 11, 'A', 25, 0, 4, 67.5),
  (89, 1, 76, 13, 14, 'A', 70, 1, 3, 95.8),
  (90, 1, 77, 12, 4, 'B', 77, 1, 4, 67.5),
  (91, 1, 77, 13, 6, 'A', 53, 1, 3, 57.7),
  (92, 1, 78, 12, 2, 'C', 27, 0, 4, 94.1),
  (93, 1, 78, 13, 16, 'A', 77, 1, 3, 72.4),
  (94, 1, 79, 14, 15, 'B', 43, 0, 3, 65.1),
  (95, 1, 80, 15, 4, 'A', 33, 0, 4, 92.9),
  (96, 1, 80, 16, 18, 'C', 48, 0, 4, 72.4),
  (97, 1, 81, 14, 2, 'B', 27, 0, 3, 55.6),
  (98, 1, 83, 5, 7, 'B', 78, 1, 3, 98),
  (99, 1, 83, 4, 12, 'A', 26, 0, 4, 92.8),
  (100, 1, 83, 2, 18, 'A', 23, 0, 4, 74.9),
  (101, 1, 85, 14, 18, 'B', 49, 0, 3, 58.4),
  (102, 1, 87, 1, 2, 'A', 46, 0, 4, 74.6),
  (103, 1, 87, 2, 12, 'A', 20, 0, 4, 63.9),
  (104, 1, 88, 9, 3, 'A', 33, 0, 4, 93.4),
  (105, 1, 88, 8, 9, 'B', 71, 1, 4, 93.7),
  (106, 1, 89, 11, 6, 'B', 81, 1, 4, 87.8),
  (107, 1, 90, 14, 4, 'A', 24, 0, 3, 86.6),
  (108, 2, 1, 7, 3, 'A', 55, 1, 3, 89.7),
  (109, 2, 2, 14, 13, 'A', 84, 1, 3, 80.6),
  (110, 2, 3, 16, 10, 'A', 54, 1, 4, 77.2),
  (111, 2, 3, 15, 5, 'B', 81, 1, 4, 98.8),
  (112, 2, 4, 6, 13, 'A', 95, 1, 4, 56.7),
  (113, 2, 5, 6, 7, 'A', 57, 1, 4, 67.2),
  (114, 2, 5, 7, 12, 'B', 67, 1, 3, 81.8),
  (115, 2, 7, 15, 2, 'B', 59, 1, 4, 90.6),
  (116, 2, 9, 10, 4, 'C', 65, 1, 3, 98),
  (117, 2, 12, 9, 8, 'C', 30, 0, 4, 72.6),
  (118, 2, 14, 10, 3, 'A', 99, 1, 3, 69.9),
  (119, 2, 15, 8, 16, 'B', 79, 1, 4, 99.6),
  (120, 2, 15, 9, 11, 'B', 39, 0, 4, 76.6);
INSERT INTO hecho_inscripcion (id_inscripcion, id_periodo, id_estudiante, id_materia, id_docente, paralelo, nota_final, aprobado, creditos, asistencia_pct) VALUES
  (121, 2, 16, 5, 15, 'C', 32, 0, 3, 87.7),
  (122, 2, 16, 4, 15, 'B', 95, 1, 4, 65.5),
  (123, 2, 17, 9, 16, 'A', 75, 1, 4, 69.7),
  (124, 2, 18, 8, 3, 'B', 25, 0, 4, 70.6),
  (125, 2, 18, 9, 15, 'A', 22, 0, 4, 66.7),
  (126, 2, 19, 7, 6, 'A', 34, 0, 3, 73.2),
  (127, 2, 19, 6, 8, 'A', 82, 1, 4, 56.9),
  (128, 2, 22, 9, 3, 'B', 67, 1, 4, 77.4),
  (129, 2, 24, 16, 9, 'B', 97, 1, 4, 81.6),
  (130, 2, 25, 4, 13, 'A', 66, 1, 4, 58.4),
  (131, 2, 26, 9, 17, 'A', 52, 1, 4, 68.3),
  (132, 2, 26, 8, 9, 'A', 58, 1, 4, 78.1),
  (133, 2, 27, 14, 15, 'A', 75, 1, 3, 72.5),
  (134, 2, 28, 1, 8, 'A', 33, 0, 4, 82.2),
  (135, 2, 28, 3, 14, 'B', 93, 1, 4, 88.3),
  (136, 2, 29, 3, 4, 'A', 24, 0, 4, 63.1),
  (137, 2, 29, 5, 6, 'A', 85, 1, 3, 62.9),
  (138, 2, 29, 1, 6, 'B', 23, 0, 4, 98.5),
  (139, 2, 30, 1, 2, 'C', 97, 1, 4, 84.9),
  (140, 2, 30, 4, 12, 'C', 95, 1, 4, 75.1),
  (141, 2, 30, 2, 17, 'A', 97, 1, 4, 71.5),
  (142, 2, 31, 11, 3, 'A', 27, 0, 4, 81.9),
  (143, 2, 31, 10, 10, 'C', 42, 0, 3, 56.8),
  (144, 2, 33, 14, 5, 'C', 96, 1, 3, 68.5),
  (145, 2, 34, 9, 1, 'A', 78, 1, 4, 56.9),
  (146, 2, 34, 8, 16, 'C', 21, 0, 4, 79),
  (147, 2, 35, 9, 13, 'B', 97, 1, 4, 94.5),
  (148, 2, 36, 6, 4, 'B', 79, 1, 4, 66.7),
  (149, 2, 37, 13, 2, 'A', 72, 1, 3, 63),
  (150, 2, 38, 16, 15, 'B', 94, 1, 4, 93.5),
  (151, 2, 38, 15, 17, 'B', 46, 0, 4, 62.6),
  (152, 2, 39, 6, 1, 'A', 58, 1, 4, 57.9),
  (153, 2, 42, 14, 18, 'B', 97, 1, 3, 96.8),
  (154, 2, 43, 8, 4, 'B', 53, 1, 4, 88.1),
  (155, 2, 44, 7, 9, 'A', 25, 0, 3, 92.7),
  (156, 2, 46, 16, 18, 'B', 95, 1, 4, 93.4),
  (157, 2, 46, 15, 8, 'A', 66, 1, 4, 70.9),
  (158, 2, 48, 2, 9, 'B', 43, 0, 4, 64.5),
  (159, 2, 48, 1, 11, 'B', 90, 1, 4, 57.2),
  (160, 2, 48, 3, 3, 'A', 88, 1, 4, 96.4);
INSERT INTO hecho_inscripcion (id_inscripcion, id_periodo, id_estudiante, id_materia, id_docente, paralelo, nota_final, aprobado, creditos, asistencia_pct) VALUES
  (161, 2, 49, 10, 18, 'A', 90, 1, 3, 62.5),
  (162, 2, 49, 11, 17, 'B', 63, 1, 4, 70.4),
  (163, 2, 50, 8, 2, 'A', 49, 0, 4, 63.8),
  (164, 2, 50, 9, 12, 'C', 62, 1, 4, 84.4),
  (165, 2, 51, 16, 4, 'B', 76, 1, 4, 96.6),
  (166, 2, 51, 15, 1, 'A', 54, 1, 4, 81.8),
  (167, 2, 52, 7, 7, 'B', 96, 1, 3, 93.3),
  (168, 2, 53, 10, 13, 'C', 43, 0, 3, 95),
  (169, 2, 53, 11, 16, 'A', 66, 1, 4, 58.8),
  (170, 2, 54, 14, 5, 'A', 83, 1, 3, 91.1),
  (171, 2, 56, 9, 15, 'A', 71, 1, 4, 56),
  (172, 2, 56, 8, 11, 'C', 27, 0, 4, 67.4),
  (173, 2, 57, 6, 10, 'B', 99, 1, 4, 56.6),
  (174, 2, 58, 13, 1, 'A', 37, 0, 3, 60.5),
  (175, 2, 60, 6, 10, 'B', 74, 1, 4, 92.8),
  (176, 2, 61, 16, 3, 'B', 22, 0, 4, 99.1),
  (177, 2, 61, 15, 15, 'A', 99, 1, 4, 91.3),
  (178, 2, 62, 14, 16, 'B', 22, 0, 3, 78.6),
  (179, 2, 63, 6, 4, 'A', 40, 0, 4, 92.9),
  (180, 2, 63, 7, 10, 'A', 79, 1, 3, 98.3),
  (181, 2, 64, 14, 16, 'B', 38, 0, 3, 69.1),
  (182, 2, 65, 7, 14, 'A', 21, 0, 3, 61.2),
  (183, 2, 66, 11, 7, 'A', 42, 0, 4, 98.3),
  (184, 2, 67, 13, 17, 'B', 75, 1, 3, 63.1),
  (185, 2, 67, 12, 18, 'C', 50, 0, 4, 61.7),
  (186, 2, 68, 12, 1, 'C', 65, 1, 4, 57),
  (187, 2, 68, 13, 9, 'A', 62, 1, 3, 79.2),
  (188, 2, 69, 7, 5, 'A', 82, 1, 3, 86.4),
  (189, 2, 69, 6, 18, 'B', 62, 1, 4, 98.2),
  (190, 2, 70, 15, 2, 'B', 79, 1, 4, 95),
  (191, 2, 73, 15, 14, 'A', 88, 1, 4, 85.5),
  (192, 2, 74, 14, 5, 'B', 28, 0, 3, 69.2),
  (193, 2, 75, 13, 15, 'C', 40, 0, 3, 94.5),
  (194, 2, 76, 12, 10, 'C', 23, 0, 4, 87.7),
  (195, 2, 76, 13, 13, 'A', 37, 0, 3, 74.1),
  (196, 2, 77, 12, 13, 'B', 45, 0, 4, 82.3),
  (197, 2, 78, 12, 10, 'B', 49, 0, 4, 63.3),
  (198, 2, 79, 14, 8, 'A', 54, 1, 3, 75.3),
  (199, 2, 80, 16, 11, 'B', 48, 0, 4, 75.3),
  (200, 2, 80, 15, 7, 'A', 56, 1, 4, 90);
INSERT INTO hecho_inscripcion (id_inscripcion, id_periodo, id_estudiante, id_materia, id_docente, paralelo, nota_final, aprobado, creditos, asistencia_pct) VALUES
  (201, 2, 82, 15, 9, 'B', 37, 0, 4, 62.8),
  (202, 2, 82, 16, 6, 'B', 76, 1, 4, 62.4),
  (203, 2, 83, 3, 18, 'A', 92, 1, 4, 72.5),
  (204, 2, 83, 5, 9, 'B', 37, 0, 3, 65.4),
  (205, 2, 86, 9, 18, 'B', 26, 0, 4, 58),
  (206, 2, 87, 3, 2, 'A', 91, 1, 4, 96.6),
  (207, 2, 87, 4, 3, 'A', 45, 0, 4, 68.8),
  (208, 2, 88, 9, 16, 'B', 67, 1, 4, 63.1),
  (209, 2, 88, 8, 6, 'A', 58, 1, 4, 77.1),
  (210, 2, 89, 11, 9, 'A', 45, 0, 4, 84.7),
  (211, 3, 1, 6, 11, 'C', 72, 1, 4, 77.9),
  (212, 3, 1, 7, 4, 'A', 29, 0, 3, 86.9),
  (213, 3, 2, 14, 13, 'A', 33, 0, 3, 89.1),
  (214, 3, 3, 15, 14, 'B', 21, 0, 4, 81.1),
  (215, 3, 4, 7, 15, 'A', 54, 1, 3, 86.6),
  (216, 3, 5, 7, 16, 'A', 32, 0, 3, 64.4),
  (217, 3, 6, 10, 17, 'A', 61, 1, 3, 77),
  (218, 3, 6, 11, 17, 'A', 94, 1, 4, 90.4),
  (219, 3, 7, 15, 6, 'C', 97, 1, 4, 67.8),
  (220, 3, 8, 11, 17, 'B', 35, 0, 4, 89.2),
  (221, 3, 9, 10, 12, 'A', 97, 1, 3, 88.8),
  (222, 3, 10, 14, 8, 'A', 31, 0, 3, 58.5),
  (223, 3, 11, 14, 1, 'C', 43, 0, 3, 80.5),
  (224, 3, 12, 9, 10, 'A', 70, 1, 4, 56.6),
  (225, 3, 12, 8, 16, 'B', 79, 1, 4, 71),
  (226, 3, 13, 6, 4, 'C', 71, 1, 4, 98.7),
  (227, 3, 13, 7, 11, 'C', 21, 0, 3, 72.9),
  (228, 3, 14, 10, 1, 'B', 24, 0, 3, 56.7),
  (229, 3, 16, 4, 3, 'B', 44, 0, 4, 74),
  (230, 3, 16, 2, 15, 'A', 28, 0, 4, 57.6),
  (231, 3, 17, 8, 9, 'A', 31, 0, 4, 92.6),
  (232, 3, 17, 9, 7, 'B', 52, 1, 4, 80.8),
  (233, 3, 18, 9, 18, 'A', 84, 1, 4, 99),
  (234, 3, 18, 8, 9, 'A', 46, 0, 4, 92.5),
  (235, 3, 19, 6, 6, 'A', 93, 1, 4, 76.7),
  (236, 3, 19, 7, 13, 'C', 50, 0, 3, 98.1),
  (237, 3, 20, 7, 7, 'A', 72, 1, 3, 62.8),
  (238, 3, 21, 4, 9, 'B', 79, 1, 4, 63.2),
  (239, 3, 21, 3, 3, 'A', 76, 1, 4, 56.5),
  (240, 3, 21, 2, 17, 'B', 59, 1, 4, 72.3);
INSERT INTO hecho_inscripcion (id_inscripcion, id_periodo, id_estudiante, id_materia, id_docente, paralelo, nota_final, aprobado, creditos, asistencia_pct) VALUES
  (241, 3, 23, 9, 2, 'B', 81, 1, 4, 90.7),
  (242, 3, 24, 15, 10, 'B', 67, 1, 4, 69.9),
  (243, 3, 26, 8, 13, 'A', 60, 1, 4, 61.5),
  (244, 3, 26, 9, 9, 'A', 59, 1, 4, 93.9),
  (245, 3, 27, 14, 2, 'A', 64, 1, 3, 88.5),
  (246, 3, 28, 1, 9, 'A', 60, 1, 4, 56.8),
  (247, 3, 28, 3, 18, 'C', 63, 1, 4, 61.1),
  (248, 3, 28, 5, 15, 'A', 22, 0, 3, 57.7),
  (249, 3, 28, 4, 1, 'C', 81, 1, 4, 60.4),
  (250, 3, 29, 4, 10, 'A', 78, 1, 4, 62.7),
  (251, 3, 29, 1, 17, 'B', 40, 0, 4, 76.4),
  (252, 3, 29, 5, 9, 'A', 25, 0, 3, 58.7),
  (253, 3, 30, 5, 9, 'A', 37, 0, 3, 57.7),
  (254, 3, 30, 1, 15, 'B', 43, 0, 4, 61.9),
  (255, 3, 30, 2, 8, 'C', 23, 0, 4, 60.3),
  (256, 3, 31, 10, 11, 'A', 52, 1, 3, 93.1),
  (257, 3, 31, 11, 12, 'A', 58, 1, 4, 59.5),
  (258, 3, 33, 14, 14, 'B', 44, 0, 3, 63.7),
  (259, 3, 34, 8, 16, 'B', 78, 1, 4, 78.7),
  (260, 3, 34, 9, 6, 'B', 30, 0, 4, 62.7),
  (261, 3, 35, 9, 14, 'B', 51, 1, 4, 80.3),
  (262, 3, 35, 8, 17, 'A', 76, 1, 4, 93),
  (263, 3, 36, 7, 2, 'C', 41, 0, 3, 73.5),
  (264, 3, 36, 6, 2, 'C', 60, 1, 4, 81),
  (265, 3, 38, 16, 10, 'A', 38, 0, 4, 99.5),
  (266, 3, 38, 15, 18, 'A', 86, 1, 4, 72.7),
  (267, 3, 39, 7, 2, 'B', 48, 0, 3, 80.3),
  (268, 3, 39, 6, 7, 'B', 57, 1, 4, 79.6),
  (269, 3, 40, 13, 3, 'B', 69, 1, 3, 58.7),
  (270, 3, 43, 8, 16, 'B', 24, 0, 4, 67.1),
  (271, 3, 44, 6, 2, 'A', 73, 1, 4, 70),
  (272, 3, 45, 13, 1, 'A', 27, 0, 3, 93.8),
  (273, 3, 45, 12, 15, 'B', 60, 1, 4, 82.8),
  (274, 3, 48, 5, 8, 'B', 74, 1, 3, 95),
  (275, 3, 48, 3, 4, 'B', 91, 1, 4, 57.2),
  (276, 3, 48, 1, 15, 'A', 21, 0, 4, 56.9),
  (277, 3, 51, 15, 6, 'C', 79, 1, 4, 89.1),
  (278, 3, 52, 7, 5, 'B', 43, 0, 3, 72.6),
  (279, 3, 53, 11, 4, 'A', 69, 1, 4, 82.8),
  (280, 3, 55, 9, 14, 'A', 80, 1, 4, 64);
INSERT INTO hecho_inscripcion (id_inscripcion, id_periodo, id_estudiante, id_materia, id_docente, paralelo, nota_final, aprobado, creditos, asistencia_pct) VALUES
  (281, 3, 56, 9, 3, 'A', 74, 1, 4, 95.8),
  (282, 3, 57, 6, 3, 'B', 73, 1, 4, 90.6),
  (283, 3, 58, 13, 12, 'C', 89, 1, 3, 83),
  (284, 3, 59, 14, 3, 'B', 98, 1, 3, 74.1),
  (285, 3, 60, 6, 13, 'B', 85, 1, 4, 80.2),
  (286, 3, 62, 14, 11, 'B', 32, 0, 3, 61.7),
  (287, 3, 63, 6, 16, 'A', 74, 1, 4, 76.9),
  (288, 3, 63, 7, 4, 'A', 99, 1, 3, 88.8),
  (289, 3, 64, 14, 9, 'A', 75, 1, 3, 92.4),
  (290, 3, 66, 10, 5, 'C', 98, 1, 3, 63.4),
  (291, 3, 67, 13, 18, 'A', 99, 1, 3, 59),
  (292, 3, 68, 12, 9, 'A', 81, 1, 4, 81.6),
  (293, 3, 69, 7, 12, 'A', 76, 1, 3, 84.1),
  (294, 3, 70, 15, 2, 'B', 24, 0, 4, 69.9),
  (295, 3, 70, 16, 9, 'B', 44, 0, 4, 78.2),
  (296, 3, 71, 5, 3, 'A', 54, 1, 3, 92.8),
  (297, 3, 71, 2, 6, 'B', 85, 1, 4, 65.2),
  (298, 3, 71, 1, 3, 'B', 49, 0, 4, 60.3),
  (299, 3, 72, 7, 5, 'C', 21, 0, 3, 78.9),
  (300, 3, 73, 16, 7, 'A', 85, 1, 4, 91.9),
  (301, 3, 74, 14, 12, 'B', 60, 1, 3, 60.9),
  (302, 3, 75, 12, 12, 'B', 95, 1, 4, 84.4),
  (303, 3, 75, 13, 8, 'B', 26, 0, 3, 93.4),
  (304, 3, 76, 12, 4, 'B', 67, 1, 4, 74.3),
  (305, 3, 76, 13, 14, 'B', 87, 1, 3, 89.1),
  (306, 3, 77, 12, 2, 'A', 76, 1, 4, 71),
  (307, 3, 77, 13, 2, 'B', 81, 1, 3, 97.4),
  (308, 3, 78, 13, 2, 'A', 66, 1, 3, 96.9),
  (309, 3, 80, 15, 5, 'A', 21, 0, 4, 92.1),
  (310, 3, 82, 16, 1, 'B', 31, 0, 4, 94.3),
  (311, 3, 82, 15, 17, 'B', 55, 1, 4, 63.3),
  (312, 3, 83, 1, 12, 'A', 42, 0, 4, 84.5),
  (313, 3, 83, 5, 11, 'A', 37, 0, 3, 81.2),
  (314, 3, 84, 12, 1, 'A', 25, 0, 4, 78.7),
  (315, 3, 84, 13, 10, 'A', 79, 1, 3, 74.9),
  (316, 3, 85, 14, 8, 'A', 25, 0, 3, 88.5),
  (317, 3, 86, 8, 17, 'B', 85, 1, 4, 99.1),
  (318, 3, 86, 9, 18, 'A', 52, 1, 4, 87.9),
  (319, 3, 87, 3, 6, 'B', 92, 1, 4, 62.8),
  (320, 3, 87, 2, 18, 'B', 74, 1, 4, 78.8);
INSERT INTO hecho_inscripcion (id_inscripcion, id_periodo, id_estudiante, id_materia, id_docente, paralelo, nota_final, aprobado, creditos, asistencia_pct) VALUES
  (321, 3, 88, 8, 4, 'B', 79, 1, 4, 59.8),
  (322, 3, 88, 9, 8, 'C', 43, 0, 4, 69),
  (323, 3, 90, 14, 7, 'B', 57, 1, 3, 57.1),
  (324, 4, 1, 6, 7, 'A', 73, 1, 4, 89.4),
  (325, 4, 1, 7, 2, 'A', 63, 1, 3, 98.7),
  (326, 4, 3, 15, 17, 'C', 28, 0, 4, 56.1),
  (327, 4, 4, 6, 12, 'C', 88, 1, 4, 70.5),
  (328, 4, 4, 7, 14, 'C', 46, 0, 3, 81.4),
  (329, 4, 7, 15, 4, 'A', 87, 1, 4, 89.2),
  (330, 4, 7, 16, 4, 'C', 75, 1, 4, 82.9),
  (331, 4, 8, 10, 13, 'A', 61, 1, 3, 60),
  (332, 4, 8, 11, 2, 'B', 86, 1, 4, 64.7),
  (333, 4, 9, 11, 7, 'A', 31, 0, 4, 60.5),
  (334, 4, 10, 14, 15, 'B', 74, 1, 3, 68.5),
  (335, 4, 12, 8, 18, 'C', 94, 1, 4, 68.6),
  (336, 4, 13, 7, 8, 'B', 31, 0, 3, 96.9),
  (337, 4, 14, 11, 18, 'A', 87, 1, 4, 63.3),
  (338, 4, 15, 8, 9, 'A', 73, 1, 4, 59.6),
  (339, 4, 16, 5, 7, 'A', 73, 1, 3, 86.5),
  (340, 4, 16, 1, 4, 'C', 63, 1, 4, 75.5),
  (341, 4, 17, 8, 10, 'A', 45, 0, 4, 77.6),
  (342, 4, 17, 9, 15, 'B', 35, 0, 4, 67.9),
  (343, 4, 18, 9, 15, 'A', 87, 1, 4, 77.4),
  (344, 4, 18, 8, 9, 'B', 22, 0, 4, 74.1),
  (345, 4, 20, 7, 13, 'B', 31, 0, 3, 70.8),
  (346, 4, 21, 1, 9, 'A', 63, 1, 4, 75.1),
  (347, 4, 21, 3, 18, 'B', 39, 0, 4, 94.4),
  (348, 4, 21, 5, 6, 'A', 71, 1, 3, 87.4),
  (349, 4, 21, 4, 7, 'A', 87, 1, 4, 59.5),
  (350, 4, 22, 8, 3, 'C', 37, 0, 4, 57.8),
  (351, 4, 23, 9, 3, 'C', 71, 1, 4, 73),
  (352, 4, 23, 8, 2, 'C', 64, 1, 4, 88.5),
  (353, 4, 24, 16, 18, 'A', 71, 1, 4, 73.4),
  (354, 4, 25, 5, 6, 'C', 75, 1, 3, 66.7),
  (355, 4, 25, 3, 7, 'A', 54, 1, 4, 95.1),
  (356, 4, 27, 14, 7, 'A', 100, 1, 3, 91.4),
  (357, 4, 28, 1, 16, 'A', 52, 1, 4, 80.1),
  (358, 4, 28, 5, 4, 'A', 41, 0, 3, 83.4),
  (359, 4, 28, 3, 1, 'A', 58, 1, 4, 65.9),
  (360, 4, 29, 2, 15, 'A', 83, 1, 4, 93.3);
INSERT INTO hecho_inscripcion (id_inscripcion, id_periodo, id_estudiante, id_materia, id_docente, paralelo, nota_final, aprobado, creditos, asistencia_pct) VALUES
  (361, 4, 29, 3, 17, 'A', 61, 1, 4, 56.7),
  (362, 4, 30, 4, 4, 'B', 91, 1, 4, 78.6),
  (363, 4, 30, 1, 11, 'B', 92, 1, 4, 63.4),
  (364, 4, 32, 10, 15, 'C', 62, 1, 3, 85.3),
  (365, 4, 32, 11, 13, 'A', 27, 0, 4, 76.8),
  (366, 4, 33, 14, 3, 'A', 42, 0, 3, 80.1),
  (367, 4, 35, 9, 11, 'A', 83, 1, 4, 75.5),
  (368, 4, 36, 7, 7, 'A', 96, 1, 3, 55.8),
  (369, 4, 36, 6, 12, 'B', 78, 1, 4, 93.5),
  (370, 4, 39, 7, 13, 'C', 98, 1, 3, 76.7),
  (371, 4, 40, 13, 4, 'A', 58, 1, 3, 94.4),
  (372, 4, 40, 12, 1, 'B', 25, 0, 4, 99.7),
  (373, 4, 41, 11, 17, 'B', 57, 1, 4, 76.1),
  (374, 4, 41, 10, 14, 'A', 66, 1, 3, 64.5),
  (375, 4, 42, 14, 11, 'C', 78, 1, 3, 79),
  (376, 4, 43, 9, 18, 'A', 91, 1, 4, 75.5),
  (377, 4, 44, 7, 18, 'B', 31, 0, 3, 85),
  (378, 4, 45, 12, 10, 'C', 21, 0, 4, 60.4),
  (379, 4, 47, 8, 4, 'A', 77, 1, 4, 59.6),
  (380, 4, 49, 11, 16, 'C', 75, 1, 4, 94.3),
  (381, 4, 50, 8, 3, 'A', 94, 1, 4, 59.4),
  (382, 4, 51, 15, 14, 'B', 48, 0, 4, 61.8),
  (383, 4, 51, 16, 1, 'A', 54, 1, 4, 94.6),
  (384, 4, 52, 7, 5, 'A', 44, 0, 3, 66.4),
  (385, 4, 52, 6, 2, 'B', 22, 0, 4, 76.6),
  (386, 4, 53, 11, 6, 'A', 84, 1, 4, 88.8),
  (387, 4, 54, 14, 14, 'A', 23, 0, 3, 92.7),
  (388, 4, 55, 8, 9, 'C', 88, 1, 4, 87),
  (389, 4, 58, 12, 5, 'A', 31, 0, 4, 93.8),
  (390, 4, 58, 13, 10, 'A', 50, 0, 3, 79.5),
  (391, 4, 59, 14, 15, 'C', 86, 1, 3, 91.7),
  (392, 4, 60, 7, 2, 'A', 91, 1, 3, 98.6),
  (393, 4, 60, 6, 3, 'A', 52, 1, 4, 84.6),
  (394, 4, 61, 15, 3, 'B', 77, 1, 4, 55.6),
  (395, 4, 61, 16, 15, 'A', 62, 1, 4, 68.9),
  (396, 4, 62, 14, 18, 'A', 52, 1, 3, 60.7),
  (397, 4, 64, 14, 1, 'A', 20, 0, 3, 80),
  (398, 4, 66, 11, 18, 'B', 44, 0, 4, 73.4),
  (399, 4, 66, 10, 18, 'C', 75, 1, 3, 91.9),
  (400, 4, 68, 13, 11, 'B', 61, 1, 3, 55.6);
INSERT INTO hecho_inscripcion (id_inscripcion, id_periodo, id_estudiante, id_materia, id_docente, paralelo, nota_final, aprobado, creditos, asistencia_pct) VALUES
  (401, 4, 68, 12, 9, 'C', 29, 0, 4, 78.9),
  (402, 4, 69, 6, 8, 'C', 69, 1, 4, 75.8),
  (403, 4, 69, 7, 8, 'B', 91, 1, 3, 56.5),
  (404, 4, 70, 16, 6, 'B', 64, 1, 4, 65.4),
  (405, 4, 70, 15, 4, 'B', 89, 1, 4, 59.8),
  (406, 4, 71, 5, 2, 'A', 97, 1, 3, 93.6),
  (407, 4, 71, 4, 2, 'A', 63, 1, 4, 79.7),
  (408, 4, 72, 7, 5, 'B', 97, 1, 3, 96.1),
  (409, 4, 72, 6, 15, 'A', 64, 1, 4, 95.7),
  (410, 4, 73, 15, 2, 'A', 20, 0, 4, 95.7),
  (411, 4, 73, 16, 4, 'A', 45, 0, 4, 86.2),
  (412, 4, 74, 14, 10, 'A', 96, 1, 3, 71.5),
  (413, 4, 76, 13, 8, 'A', 82, 1, 3, 96.1),
  (414, 4, 78, 13, 18, 'B', 77, 1, 3, 93),
  (415, 4, 79, 14, 13, 'A', 76, 1, 3, 71.5),
  (416, 4, 80, 16, 2, 'B', 22, 0, 4, 69.9),
  (417, 4, 80, 15, 14, 'C', 73, 1, 4, 79.6),
  (418, 4, 81, 14, 12, 'A', 30, 0, 3, 82.9),
  (419, 4, 83, 1, 3, 'B', 75, 1, 4, 80.4),
  (420, 4, 83, 2, 12, 'A', 44, 0, 4, 81.1),
  (421, 4, 83, 3, 6, 'A', 87, 1, 4, 92.4),
  (422, 4, 83, 4, 8, 'A', 55, 1, 4, 78.9),
  (423, 4, 85, 14, 10, 'A', 32, 0, 3, 93.9),
  (424, 4, 86, 8, 6, 'A', 74, 1, 4, 75.5),
  (425, 4, 88, 9, 5, 'C', 92, 1, 4, 75.5),
  (426, 4, 88, 8, 15, 'A', 80, 1, 4, 94.8),
  (427, 4, 89, 10, 7, 'A', 81, 1, 3, 85.2),
  (428, 4, 89, 11, 6, 'B', 100, 1, 4, 84.5);
`
