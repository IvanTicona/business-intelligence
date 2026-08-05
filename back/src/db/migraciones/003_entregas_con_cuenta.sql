-- Liga cada entrega a una cuenta real.
--
-- Queda ANULABLE porque las entregas que ya están en el VPS son anteriores al
-- login y no hay a quién ligarlas: su `student_identifier` es texto que escribió
-- el alumno a mano. Esas filas conservan el texto y el docente las sigue viendo;
-- las nuevas traen cuenta.
--
-- ON DELETE SET NULL y no CASCADE: si algún día se borra una cuenta, la entrega
-- tiene que sobrevivir. Es trabajo evaluado, no un dato accesorio de la cuenta.
ALTER TABLE practice_submissions
  ADD COLUMN usuario_id INTEGER REFERENCES usuarios (id) ON DELETE SET NULL;

CREATE INDEX idx_entregas_usuario ON practice_submissions (usuario_id);

-- Una entrega por práctica y por cuenta. Hasta ahora nada impedía mandar la
-- misma práctica veinte veces y el panorama contaba las veinte.
-- Parcial, porque las filas viejas tienen usuario_id NULL y son legítimas.
CREATE UNIQUE INDEX idx_entregas_una_por_cuenta
  ON practice_submissions (practice_id, usuario_id)
  WHERE usuario_id IS NOT NULL;
