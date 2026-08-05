-- Adopta la tabla que hasta ahora se creaba en caliente dentro de los handlers.
--
-- Va con IF NOT EXISTS porque en el VPS la tabla YA EXISTE con datos: esta
-- migración solo la pone bajo control de versiones. En una base nueva la crea.
CREATE TABLE IF NOT EXISTS practice_submissions (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL,
  student_identifier TEXT NOT NULL,
  answers JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- El panorama del docente agrupa por estas dos columnas en cada carga y hasta
-- ahora las recorría enteras.
CREATE INDEX IF NOT EXISTS idx_entregas_practica ON practice_submissions (practice_id);
CREATE INDEX IF NOT EXISTS idx_entregas_alumno ON practice_submissions (student_identifier);
