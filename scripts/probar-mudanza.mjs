/*
 * Prueba la mudanza de la base del navegador al servidor.
 *
 * Arma en PGlite una base como la que tendría un alumno —con foráneas, tipos
 * con precisión, nulos, texto con comillas, fechas y una tabla vacía— genera el
 * volcado con la MISMA función que usa el navegador, y lo aplica contra el
 * servidor por HTTP. Después compara fila por fila que llegó todo.
 */
import { PGlite } from '@electric-sql/pglite'

const BASE = process.env.BASE_URL ?? 'http://localhost:18742'

const SEMILLA = `
CREATE TABLE autor (
  id_autor INTEGER PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  pais TEXT,
  nacido DATE
);
CREATE TABLE libro (
  id_libro INTEGER PRIMARY KEY,
  titulo TEXT NOT NULL,
  id_autor INTEGER REFERENCES autor(id_autor),
  precio NUMERIC(10,2) NOT NULL,
  agotado BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE prestamo (
  id_prestamo INTEGER PRIMARY KEY,
  id_libro INTEGER REFERENCES libro(id_libro),
  nota TEXT
);
CREATE TABLE vacia (id INTEGER PRIMARY KEY);

INSERT INTO autor VALUES
  (1, 'Jesus Urzagasti', 'Bolivia', DATE '1941-01-06'),
  (2, 'Yolanda Bedregal', 'Bolivia', DATE '1913-09-21'),
  (3, 'Sin pais', NULL, NULL);
INSERT INTO libro VALUES
  (1, 'En el pais del silencio', 1, 85.50, FALSE),
  (2, 'Nazareno', 2, 120.00, TRUE),
  (3, 'Titulo con '' comilla y ; punto y coma', 1, 0.99, FALSE);
INSERT INTO prestamo VALUES (1, 1, 'devuelto'), (2, 3, NULL);
`

// La MISMA función que corre en el navegador, sin trucos: acepta una base ya
// abierta justamente para poder probarla acá.
import { volcarBaseVieja } from '../front/src/consola/migrarDelNavegador.js'

console.log('=== Se arma la base "vieja" ===')
const vieja = new PGlite()
await vieja.waitReady
await vieja.exec(SEMILLA)
const antes = {}
for (const t of ['autor', 'libro', 'prestamo', 'vacia']) {
  antes[t] = (await vieja.query(`SELECT * FROM ${t} ORDER BY 1`)).rows
  console.log(`  ${t.padEnd(10)} ${antes[t].length} fila(s)`)
}

const volcado = await volcarBaseVieja(vieja)


console.log(`\n=== Volcado generado: ${volcado.tablas} tabla(s), ${volcado.filas} fila(s) ===`)
console.log(volcado.sql.split('\n').slice(1, 5).join('\n') + '\n  …')

console.log('\n=== Se aplica contra el servidor ===')
const alta = await fetch(`${BASE}/api/auth/registro`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ correo: `mudanza.${Date.now()}@upb.edu`, clave: 'mudanzaDePrueba1', nombre: 'Mudanza' }),
})
const cookie = (alta.headers.get('set-cookie') ?? '').split(';')[0]

const espacio = async (sql, reiniciar = false) => {
  const r = await fetch(`${BASE}/api/sql/espacio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ espacio: 'libre', sql, reiniciar }),
  })
  return r.json()
}

const aplicado = await espacio(volcado.sql, true)
console.log('  error:', aplicado.error ?? 'ninguno')
console.log('  sentencias:', aplicado.sentencias, '· tablas en el modelo:', aplicado.tablas?.length)

console.log('\n=== Los datos llegaron completos ===')
let bien = !aplicado.error
for (const t of ['autor', 'libro', 'prestamo', 'vacia']) {
  const r = await espacio(`SELECT * FROM ${t} ORDER BY 1`)
  const igual = r.filas === antes[t].length
  bien &&= igual && !r.error
  console.log(`  ${t.padEnd(10)} servidor:${r.filas} navegador:${antes[t].length} ${igual ? 'ok' : 'DISTINTO'}${r.error ? ' · ' + r.error.slice(0, 50) : ''}`)
}

console.log('\n=== Casos dificiles ===')
console.log('  texto con comilla y ; :', JSON.stringify((await espacio('SELECT titulo FROM libro WHERE id_libro = 3')).rows?.[0]?.[0]))
console.log('  nulos preservados     :', JSON.stringify((await espacio('SELECT nombre, pais, nacido FROM autor WHERE id_autor = 3')).rows?.[0]))
console.log('  numeric(10,2)         :', JSON.stringify((await espacio('SELECT precio FROM libro WHERE id_libro = 1')).rows?.[0]?.[0]))
console.log('  fecha                 :', JSON.stringify((await espacio('SELECT nacido FROM autor WHERE id_autor = 1')).rows?.[0]?.[0]))
console.log('  boolean               :', JSON.stringify((await espacio('SELECT agotado FROM libro WHERE id_libro = 2')).rows?.[0]?.[0]))
const fk = await espacio(`INSERT INTO libro VALUES (99, 'huerfano', 777, 1.00, FALSE)`)
console.log('  las foraneas viven    :', fk.error ? 'si (rechaza el huerfano)' : 'NO — acepto un huerfano')
bien &&= Boolean(fk.error)
const pk = await espacio(`INSERT INTO autor VALUES (1, 'repetido', NULL, NULL)`)
console.log('  la clave primaria vive:', pk.error ? 'si (rechaza el duplicado)' : 'NO — acepto un duplicado')
bien &&= Boolean(pk.error)

await vieja.close()
console.log(bien ? '\n✓ La mudanza traslada todo sin errores' : '\n✗ Hay problemas')
process.exit(bien ? 0 : 1)
