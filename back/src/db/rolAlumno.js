/**
 * EL ROL POBRE · lo único que ejecuta SQL escrito por un alumno
 *
 * No va como archivo de migración porque necesita una contraseña que viene del
 * entorno, y un .sql no lee variables de entorno. Tampoco va en el script de
 * arranque de la imagen de Postgres: ese solo corre cuando el volumen está
 * vacío, y el del VPS ya tiene datos, así que nunca volvería a ejecutarse.
 * Acá es idempotente y se aplica en cada arranque, que es lo que queremos:
 * cambiar un límite es editar este archivo y desplegar, no entrar a la base a
 * mano.
 *
 * DIFERENCIA IMPORTANTE CON upb-sql: allá el rol de alumno recibe
 * `GRANT SELECT ON ALL TABLES IN SCHEMA public`, y en ese schema viven las
 * tablas del sistema. Acá el rol NO tiene ningún permiso sobre `public`, que es
 * donde están `usuarios` (con los hashes de contraseña) y las entregas. El
 * alumno solo verá los schemas que le concedamos uno por uno.
 */
import { exigirAdmin } from './pools.js'

export const ROL_ALUMNO = 'bi_alumno'

/** Queda en `true` si el rol está listo; el estado se reporta en /health. */
export let rolListo = false
export let motivoRol = 'sin verificar'

export async function asegurarRolAlumno() {
  const clave = process.env.DATABASE_ALUMNO_PASSWORD

  if (!clave) {
    return marcar(false, 'falta DATABASE_ALUMNO_PASSWORD')
  }
  // La contraseña termina interpolada en un CREATE ROLE. Va escapada más
  // abajo, pero además se acota el alfabeto: una defensa sola es una defensa
  // que algún día se rompe.
  if (!/^[A-Za-z0-9_.:@-]{12,}$/.test(clave)) {
    return marcar(false, 'DATABASE_ALUMNO_PASSWORD debe tener 12+ caracteres alfanuméricos o _ . : @ -')
  }

  const cliente = await exigirAdmin().connect()

  try {
    const literal = cliente.escapeLiteral(clave)
    const { rows: base } = await cliente.query('SELECT current_database() AS nombre')
    const baseDatos = cliente.escapeIdentifier(base[0].nombre)

    const { rowCount: existe } = await cliente.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [ROL_ALUMNO])
    const atributos = 'LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS'

    await cliente.query(
      existe
        ? `ALTER ROLE ${ROL_ALUMNO} WITH ${atributos} PASSWORD ${literal}`
        : `CREATE ROLE ${ROL_ALUMNO} WITH ${atributos} PASSWORD ${literal}`,
    )

    /*
     * Los límites van pegados al ROL, no a la sesión. Cada request los vuelve a
     * fijar igual, pero si un día alguien conecta con este usuario por fuera de
     * la aplicación, los límites siguen puestos.
     *
     * `search_path = ''` es el que más importa: sin él, el rol arrancaría
     * mirando `public` por defecto. Cada consulta de alumno fija el suyo.
     */
    for (const ajuste of [
      "statement_timeout = '5s'",
      "idle_in_transaction_session_timeout = '10s'",
      "lock_timeout = '3s'",
      "temp_file_limit = '64MB'",
      "search_path = ''",
    ]) {
      await cliente.query(`ALTER ROLE ${ROL_ALUMNO} SET ${ajuste}`)
    }

    // Puede conectarse a la base y nada más. Los permisos sobre cada schema se
    // conceden de a uno cuando se crean, nunca en bloque.
    await cliente.query(`REVOKE ALL ON DATABASE ${baseDatos} FROM ${ROL_ALUMNO}`)
    await cliente.query(`GRANT CONNECT ON DATABASE ${baseDatos} TO ${ROL_ALUMNO}`)

    /*
     * `public` queda fuera de su alcance. Ojo con el detalle: revocarle los
     * permisos SOLO a este rol no alcanza, porque Postgres le concede USAGE
     * sobre `public` al pseudo-rol PUBLIC, del que todos son miembros. Hay que
     * revocárselo a PUBLIC. El dueño del schema no se ve afectado.
     */
    await cliente.query('REVOKE ALL ON SCHEMA public FROM PUBLIC')
    await cliente.query(`REVOKE ALL ON SCHEMA public FROM ${ROL_ALUMNO}`)
    await cliente.query(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ${ROL_ALUMNO}`)

    return marcar(true, 'listo')
  } catch (err) {
    // Pasa si DATABASE_URL no es superusuario. Se avisa fuerte y el proceso
    // sigue: el resto de la aplicación funciona, pero las consolas no van a
    // poder ejecutar nada y /health lo dice. Degradar en silencio sería peor.
    return marcar(false, err.message)
  } finally {
    cliente.release()
  }
}

function marcar(listo, motivo) {
  rolListo = listo
  motivoRol = motivo

  if (listo) console.log(`[rol] ${ROL_ALUMNO} listo`)
  else console.error(`[rol] ${ROL_ALUMNO} NO está disponible: ${motivo}`)

  return listo
}
