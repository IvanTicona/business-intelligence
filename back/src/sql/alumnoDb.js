/**
 * LA BASE PROPIA DE CADA ALUMNO
 *
 * Cada alumno tiene su ROL de Postgres (`alumno_{id}`) y sus schemas, de los
 * que ese rol es dueño. Se conecta con ese rol, no con uno compartido.
 *
 * POR QUÉ NO ALCANZA UN ROL COMPARTIDO CON `SET ROLE`
 *
 * La forma barata sería un solo rol para todos y `SET LOCAL ROLE alumno_42` por
 * pedido. No sirve, y conviene entender por qué antes de que a alguien le
 * parezca que acá sobra complejidad:
 *
 *   - Para poder hacer `SET ROLE alumno_42`, el rol compartido tiene que ser
 *     MIEMBRO de `alumno_42`. Y si va a servir a todos, tiene que ser miembro de
 *     todos. Entonces, desde una sesión de ese rol, `SET ROLE alumno_43` también
 *     funciona: el permiso se evalúa contra el rol de la SESIÓN, no contra el
 *     que esté activo en ese momento.
 *   - Se podría prohibir `SET ROLE` en el texto del alumno, pero se escapa con
 *     `DO $$ BEGIN EXECUTE 'SET ROLE alumno_43'; END $$`. Para taparlo habría
 *     que prohibir también los bloques DO, y este es el playground LIBRE: mutilar
 *     PL/pgSQL para sostener un permiso mal puesto es arreglarlo al revés.
 *
 * Esto no es teórico: upb-sql hace exactamente eso —`GRANT ALL ON SCHEMA
 * user_{id} TO dbupb_student` con un rol único para todos— y su documentación
 * afirma que un alumno no puede leer el schema de otro. Puede: le alcanza con
 * escribir el nombre completo.
 *
 * Con un rol por alumno la frontera la pone Postgres: `alumno_42` simplemente no
 * tiene ningún permiso sobre `alumno_43_libre`, y no hay SQL que se lo dé.
 *
 * EL COSTO es un pool de conexiones por alumno activo. Se acota fuerte: una
 * conexión cada uno, y el pool se cierra tras unos minutos sin uso.
 */
import { createHmac } from 'node:crypto'
import pg from 'pg'
import { exigirAdmin } from '../db/pools.js'
import { ROL_ALUMNO } from '../db/rolAlumno.js'

const { Pool } = pg

/** Espacios de trabajo. Uno por consola con base propia. */
export const ESPACIOS = { taller: 'taller', libre: 'libre' }

const MAX_POR_ALUMNO = 1
const OCIOSO_MS = 10_000
const EVICTAR_MS = 5 * 60 * 1000

const pools = new Map()
const preparados = new Set()

const nombreRol = id => `alumno_${id}`
export const nombreSchema = (id, espacio) => `alumno_${id}_${espacio}`

/**
 * La contraseña se DERIVA, no se guarda.
 *
 * Sale de un HMAC entre la clave del rol compartido y el id del alumno, así que
 * no hace falta ni una columna más en la base ni un secreto por alumno, y
 * cambiar esa clave las rota todas. Como se vuelve a aplicar con ALTER ROLE
 * cada vez que se prepara un alumno, la rotación se arregla sola.
 */
function claveDe(id) {
  const semilla = process.env.DATABASE_ALUMNO_PASSWORD ?? ''

  return createHmac('sha256', semilla).update(`alumno:${id}`).digest('hex')
}

/**
 * Crea (si falta) el rol del alumno y sus schemas. Idempotente.
 *
 * Se hace perezosamente, en el primer uso, y no al registrarse: la mayoría de
 * los alumnos abre los capítulos antes que una consola, y crear roles y schemas
 * para cuentas que quizá nunca ejecuten nada es trabajo y basura de más.
 */
export async function prepararAlumno(id) {
  if (preparados.has(id)) return

  const rol = nombreRol(id)
  const cliente = await exigirAdmin().connect()

  try {
    const clave = cliente.escapeLiteral(claveDe(id))
    const { rowCount: existe } = await cliente.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [rol])
    const atributos = 'LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS'

    await cliente.query(existe ? `ALTER ROLE ${rol} WITH ${atributos} PASSWORD ${clave}` : `CREATE ROLE ${rol} WITH ${atributos} PASSWORD ${clave}`)

    // Los mismos límites que el rol compartido: valen aunque alguien conecte
    // con este usuario por fuera de la aplicación.
    for (const ajuste of [
      "statement_timeout = '5s'",
      "idle_in_transaction_session_timeout = '10s'",
      "lock_timeout = '3s'",
      "temp_file_limit = '64MB'",
      "search_path = ''",
    ]) {
      await cliente.query(`ALTER ROLE ${rol} SET ${ajuste}`)
    }

    const { rows } = await cliente.query('SELECT current_database() AS nombre')
    await cliente.query(`GRANT CONNECT ON DATABASE ${cliente.escapeIdentifier(rows[0].nombre)} TO ${rol}`)

    // AUTHORIZATION: el rol es DUEÑO del schema, así que puede crear, borrar y
    // alterar dentro sin necesidad de un solo GRANT. Y nadie más entra.
    for (const espacio of Object.values(ESPACIOS)) {
      await cliente.query(`CREATE SCHEMA IF NOT EXISTS ${nombreSchema(id, espacio)} AUTHORIZATION ${rol}`)
    }

    /*
     * Las bases del curso, en solo lectura. El rol compartido ya las tiene, pero
     * este rol no hereda de aquel: son roles distintos. Se le conceden acá para
     * que desde su taller pueda mirar un modelo del laboratorio.
     */
    const { rows: cursoSchemas } = await cliente.query(
      `SELECT nspname FROM pg_namespace WHERE nspname LIKE 'ds\\_%' OR nspname LIKE 'pr\\_%'`,
    )
    for (const { nspname } of cursoSchemas) {
      await cliente.query(`GRANT USAGE ON SCHEMA ${nspname} TO ${rol}`)
      await cliente.query(`GRANT SELECT ON ALL TABLES IN SCHEMA ${nspname} TO ${rol}`)
    }

    preparados.add(id)
  } finally {
    cliente.release()
  }
}

/** Pool del alumno, creado a demanda y cerrado cuando deja de usarse. */
export function poolDeAlumno(id) {
  barrerOciosos()

  const guardado = pools.get(id)
  if (guardado) {
    guardado.ultimoUso = Date.now()

    return guardado.pool
  }

  const url = new URL(process.env.DATABASE_ALUMNO_URL ?? '')
  url.username = nombreRol(id)
  url.password = claveDe(id)

  const pool = new Pool({
    connectionString: url.toString(),
    ssl: process.env.DATABASE_SSL !== 'false' ? { rejectUnauthorized: false } : false,
    max: MAX_POR_ALUMNO,
    idleTimeoutMillis: OCIOSO_MS,
    connectionTimeoutMillis: 5000,
  })
  pool.on('error', err => console.error(`[pg:alumno ${id}] ${err.message}`))

  pools.set(id, { pool, ultimoUso: Date.now() })

  return pool
}

/*
 * Sin esto, una clase de treinta alumnos deja treinta pools vivos para siempre.
 * Se barre al pedir un pool en vez de con un temporizador: si nadie pide nada,
 * tampoco hace falta limpiar.
 */
function barrerOciosos() {
  const corte = Date.now() - EVICTAR_MS

  for (const [id, dato] of pools) {
    if (dato.ultimoUso < corte) {
      pools.delete(id)
      dato.pool.end().catch(() => {})
    }
  }
}

/**
 * Vacía un espacio de trabajo del alumno, sin tocar el otro.
 *
 * Va por el pool admin, y no por el del alumno, por una razón que costó un bug:
 * el alumno es dueño de su schema y puede BORRARLO, pero volver a crearlo pide
 * permiso de crear schemas EN LA BASE, que no tiene ni debe tener —con él se
 * fabricaría schemas fuera de los suyos. Haciéndolo con su propia conexión, el
 * DROP funcionaba y el CREATE fallaba: quedaba sin espacio de trabajo y sin
 * poder rehacerlo.
 *
 * Que lo haga el admin no rompe la regla que importa: lo que nunca corre con
 * privilegios de más es el SQL que ESCRIBE el alumno. Esto es una sentencia fija
 * del servidor, sin nada que venga de afuera.
 */
export async function vaciarEspacio(id, espacio) {
  const schema = nombreSchema(id, espacio)
  const cliente = await exigirAdmin().connect()

  try {
    await cliente.query('BEGIN')
    await cliente.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
    await cliente.query(`CREATE SCHEMA ${schema} AUTHORIZATION ${nombreRol(id)}`)
    await cliente.query('COMMIT')
  } catch (err) {
    await cliente.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    cliente.release()
  }
}

/** Cuánto ocupa el trabajo del alumno. Lo usa el panel del docente. */
export async function tamañoDeAlumno(id) {
  const { rows } = await exigirAdmin().query(
    `SELECT COALESCE(SUM(pg_total_relation_size(c.oid)), 0)::bigint AS bytes,
            COUNT(*)::int AS tablas
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = ANY($1) AND c.relkind = 'r'`,
    [Object.values(ESPACIOS).map(e => nombreSchema(id, e))],
  )

  return { bytes: Number(rows[0].bytes), tablas: rows[0].tablas }
}

/** Para las pruebas y el cierre ordenado. */
export async function cerrarPoolsDeAlumnos() {
  const todos = [...pools.values()].map(d => d.pool.end().catch(() => {}))
  pools.clear()
  preparados.clear()
  await Promise.all(todos)
}

export { ROL_ALUMNO }
