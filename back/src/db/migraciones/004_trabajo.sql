-- El trabajo del alumno que no es una base: el texto de sus scripts y su avance
-- en el taller.
--
-- Hasta ahora vivía en el localStorage del navegador, lo que dejaba la promesa a
-- medias: su BASE lo seguía a cualquier computadora, pero el script con el que
-- la construyó no, y en el taller además veía "0 de 12" con la base completa.
--
-- Clave-valor a propósito. Son pocas cosas, chicas, y de forma distinta entre
-- sí; una columna por cada una obligaría a una migración cada vez que se agrega
-- una consola.
CREATE TABLE trabajo (
  usuario_id INTEGER NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  clave TEXT NOT NULL,
  valor TEXT NOT NULL,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, clave)
);
