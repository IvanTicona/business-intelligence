/*
 * Aplica las migraciones contra un PostgreSQL real (PGlite, el mismo motor 18
 * que corre en las consolas) y comprueba el esquema resultante.
 *
 * No reemplaza probar contra el Postgres del contenedor —los roles y los
 * permisos no existen acá— pero atrapa lo que más se rompe en una migración:
 * un error de sintaxis, un índice sobre una columna que no existe, o un orden
 * de archivos que deja una FK apuntando a una tabla que todavía no se creó.
 * Y corre sin Docker.
 */
import { readdir, readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const CARPETA = new URL('../back/src/db/migraciones/', import.meta.url)

const db = new PGlite()
await db.waitReady

const nombres = (await readdir(CARPETA)).filter(n => n.endsWith('.sql')).sort()
console.log(`=== ${nombres.length} migración(es), en orden ===`)

for (const nombre of nombres) {
  const sql = await readFile(new URL(nombre, CARPETA), 'utf8')
  try {
    await db.exec(sql)
    console.log(`  ok   ${nombre}`)
  } catch (err) {
    console.error(`  MAL  ${nombre}: ${err.message}`)
    process.exit(1)
  }
}

console.log('\n=== Se aplican dos veces sin romper (arranques repetidos) ===')
for (const nombre of nombres) {
  const sql = await readFile(new URL(nombre, CARPETA), 'utf8')
  try {
    await db.exec(sql)
    console.log(`  ok   ${nombre} (idempotente)`)
  } catch (err) {
    // Esperado en las que crean objetos sin IF NOT EXISTS: el runner nunca las
    // vuelve a correr. Solo se reporta para saber cuáles son.
    console.log(`  --   ${nombre} no es idempotente: ${err.message.split('\n')[0]}`)
  }
}

const tabla = async (nombre, columnas) => {
  const { rows } = await db.query(
    `SELECT column_name, data_type, is_nullable FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    [nombre],
  )
  const tiene = rows.map(r => r.column_name)
  const faltan = columnas.filter(c => !tiene.includes(c))
  console.log(`  ${nombre.padEnd(22)} ${rows.length} columna(s)${faltan.length ? '  FALTAN: ' + faltan : ''}`)
  return faltan.length === 0
}

console.log('\n=== El esquema quedó como se espera ===')
let bien = true
bien &&= await tabla('practice_submissions', ['id', 'practice_id', 'student_identifier', 'answers', 'created_at'])
bien &&= await tabla('usuarios', ['id', 'correo', 'clave_hash', 'nombre', 'rol', 'activo', 'creado_en', 'ultimo_acceso'])
bien &&= await tabla('sesiones', ['id', 'usuario_id', 'token_hash', 'expira_en', 'creada_en'])

const { rows: indices } = await db.query(
  `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname`,
)
console.log('\n=== Índices ===')
for (const i of indices) console.log('  ' + i.indexname)

console.log('\n=== Las reglas de la tabla usuarios se cumplen ===')
const prueba = async (etiqueta, sql, esperaFallo) => {
  try {
    await db.exec(sql)
    console.log(`  ${esperaFallo ? 'MAL ' : 'ok  '} ${etiqueta}${esperaFallo ? ' (debía fallar y pasó)' : ''}`)
    if (esperaFallo) bien = false
  } catch (err) {
    console.log(`  ${esperaFallo ? 'ok  ' : 'MAL '} ${etiqueta}: ${err.message.split('\n')[0]}`)
    if (!esperaFallo) bien = false
  }
}

await prueba('alta normal', `INSERT INTO usuarios (correo, clave_hash, nombre) VALUES ('ana@upb.edu', 'x', 'Ana')`, false)
await prueba('rol por defecto alumno', `SELECT 1 FROM usuarios WHERE correo='ana@upb.edu' AND rol='alumno' AND activo`, false)
await prueba('correo repetido', `INSERT INTO usuarios (correo, clave_hash, nombre) VALUES ('ana@upb.edu', 'y', 'Otra')`, true)
await prueba('correo repetido en MAYÚSCULAS', `INSERT INTO usuarios (correo, clave_hash, nombre) VALUES ('Ana@UPB.edu', 'y', 'Otra')`, true)
await prueba('rol inventado', `INSERT INTO usuarios (correo, clave_hash, nombre, rol) VALUES ('b@upb.edu','x','B','jefe')`, true)
await prueba('sesión de un usuario inexistente', `INSERT INTO sesiones (usuario_id, token_hash, expira_en) VALUES (9999,'h',NOW())`, true)
await prueba(
  'borrar el usuario se lleva sus sesiones',
  `INSERT INTO sesiones (usuario_id, token_hash, expira_en)
     SELECT id, 'hash-1', NOW() + INTERVAL '7 days' FROM usuarios WHERE correo='ana@upb.edu';
   DELETE FROM usuarios WHERE correo='ana@upb.edu';
   DO $$ BEGIN
     IF EXISTS (SELECT 1 FROM sesiones WHERE token_hash='hash-1') THEN
       RAISE EXCEPTION 'la sesión sobrevivió al borrado del usuario';
     END IF;
   END $$;`,
  false,
)

console.log(bien ? '\n✓ Migraciones válidas' : '\n✗ Hay problemas')
process.exit(bien ? 0 : 1)
