-- Identidad del curso.
--
-- Hasta hoy un alumno se identificaba escribiendo su nombre en un campo de
-- texto libre al entregar, así que "Juan Pérez" y "juan perez" eran dos
-- personas distintas en el panorama y nadie impedía entregar en nombre de otro.
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  correo TEXT NOT NULL,
  clave_hash TEXT NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'alumno' CHECK (rol IN ('alumno', 'docente')),
  -- El alta es por auto-registro abierto, así que desactivar una cuenta es la
  -- única herramienta del docente contra una cuenta basura. Se desactiva, no se
  -- borra: si borráramos, sus entregas quedarían huérfanas.
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultimo_acceso TIMESTAMPTZ
);

-- Único ignorando mayúsculas: "Ana@upb.edu" y "ana@upb.edu" son la misma
-- persona, y sin esto se registraría dos veces sin darse cuenta.
CREATE UNIQUE INDEX idx_usuarios_correo ON usuarios (LOWER(correo));
CREATE INDEX idx_usuarios_rol ON usuarios (rol);

-- Sesiones abiertas. Guarda el HASH del refresh token, nunca el token: si
-- alguien se lleva un volcado de la base, no se lleva sesiones utilizables.
CREATE TABLE sesiones (
  id BIGSERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expira_en TIMESTAMPTZ NOT NULL,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_sesiones_hash ON sesiones (token_hash);
CREATE INDEX idx_sesiones_usuario ON sesiones (usuario_id);
-- Para poder barrer las vencidas de un saque. En upb-sql esta tabla crece para
-- siempre porque nadie las borra nunca.
CREATE INDEX idx_sesiones_expira ON sesiones (expira_en);
