/**
 * DOS POOLS, DOS ROLES · la separación de privilegios del curso
 *
 * `poolAdmin` es el dueño: corre migraciones, crea los schemas y atiende las
 * tablas del sistema (usuarios, entregas). Nunca ejecuta SQL escrito por un
 * alumno.
 *
 * `poolAlumno` conecta con un rol deliberadamente pobre y es el ÚNICO que
 * ejecuta lo que el alumno escribe. Que sean dos conexiones distintas —y no la
 * misma con un `SET ROLE`— es a propósito: `SET ROLE` se puede revertir con
 * `RESET ROLE` desde el mismo SQL del alumno, y ahí se cae toda la separación.
 *
 * Esto es lo que upb-sql hace a medias: tiene los dos pools, pero manda al pool
 * admin cualquier consulta con GRANT o CREATE ROLE cuando cree estar "en modo
 * ejercicio", y ese modo lo decide el cliente en el cuerpo del request. Acá el
 * SQL de alumno no toca el pool admin nunca, sin excepciones ni modos.
 */
import pg from 'pg'

const { Pool } = pg

const urlAdmin = process.env.DATABASE_URL
const urlAlumno = process.env.DATABASE_ALUMNO_URL
const conSsl = process.env.DATABASE_SSL !== 'false'

const ssl = conSsl ? { rejectUnauthorized: false } : false

export const poolAdmin = urlAdmin
  ? new Pool({
      connectionString: urlAdmin,
      ssl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : null

/*
 * Más conexiones que el pool admin y con vida corta: son consultas de alumnos
 * en clase, muchas a la vez y todas breves. El `statement_timeout` va también
 * pegado al rol en la base, no solo acá, para que valga aunque alguien conecte
 * con ese usuario por fuera de la aplicación.
 */
export const poolAlumno = urlAlumno
  ? new Pool({
      connectionString: urlAlumno,
      ssl,
      max: 30,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    })
  : null

// Un error en una conexión ociosa llega como evento suelto: sin este manejador
// tumba el proceso entero de Node.
for (const [nombre, pool] of [['admin', poolAdmin], ['alumno', poolAlumno]]) {
  pool?.on('error', err => console.error(`[pg:${nombre}] error en conexión ociosa:`, err.message))
}

export function exigirAdmin() {
  if (!poolAdmin) throw new Error('DATABASE_URL no está configurado')

  return poolAdmin
}

export function exigirAlumno() {
  if (!poolAlumno) throw new Error('DATABASE_ALUMNO_URL no está configurado')

  return poolAlumno
}

export async function cerrarPools() {
  await Promise.all([poolAdmin?.end(), poolAlumno?.end()])
}
