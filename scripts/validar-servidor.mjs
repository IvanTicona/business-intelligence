/*
 * Corre TODOS los retos del laboratorio contra el backend, tal como los correrá
 * un alumno: por HTTP, con sesión, y ejecutados por el rol pobre en el Postgres
 * del servidor.
 *
 * `validar-contenido.mjs` ya los valida contra PGlite, pero eso comprueba el
 * SQL, no el camino: permisos, search_path, tope de filas y tiempo máximo solo
 * se ejercitan yendo de verdad por la API.
 */
const BASE = process.env.BASE_URL ?? 'http://localhost:18742'

const bases = [
  ['ketal', '../front/src/playground/datasets/ketal.js', m => m.ketal],
  ['teleferico', '../front/src/playground/datasets/teleferico.js', m => m.teleferico],
  ['bancosol', '../front/src/playground/datasets/bancosol.js', m => m.bancosol],
  ['arcoiris', '../front/src/playground/datasets/arcoiris.js', m => m.arcoiris],
  ['yaigo', '../front/src/playground/datasets/yaigo.js', m => m.yaigo],
  ['entel', '../front/src/playground/datasets/entel.js', m => m.entel],
  ['upb', '../front/src/playground/datasets/upb.js', m => m.upb],
  ['cinemateca', '../front/src/playground/datasets/cinemateca.js', m => m.cinemateca],
]

// Cuenta de prueba propia: el endpoint pide sesión.
const correo = `validador.${Date.now()}@upb.edu`
const alta = await fetch(`${BASE}/api/auth/registro`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ correo, clave: 'validadorDeContenido1', nombre: 'Validador' }),
})

if (!alta.ok) {
  console.error(`No se pudo crear la cuenta de prueba: ${alta.status}`)
  process.exit(1)
}

const cookie = (alta.headers.get('set-cookie') ?? '').split(';')[0]

const consultar = async (base, sql) => {
  const r = await fetch(`${BASE}/api/sql/consulta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ base, sql }),
  })

  return r.json()
}

let total = 0
let mal = 0
let vacios = 0
let lento = 0

for (const [id, ruta, sacar] of bases) {
  const ds = sacar(await import(new URL(ruta, import.meta.url)))
  const fallos = []
  let ok = 0

  for (const reto of ds.retos) {
    total += 1
    const salida = await consultar(id, reto.expectedSql)

    if (salida.error) {
      mal += 1
      fallos.push(`${reto.id}: ${salida.error.slice(0, 90)}`)
    } else if (salida.filas === 0) {
      // Una consulta correcta que no devuelve nada no le enseña nada al alumno.
      vacios += 1
      fallos.push(`${reto.id}: 0 filas`)
    } else {
      ok += 1
      if (salida.ms > 1000) { lento += 1; fallos.push(`${reto.id}: tardó ${salida.ms} ms`) }
    }
  }

  console.log(`  ${ds.nombre ?? id}`.padEnd(28) + `${ok}/${ds.retos.length}`)
  for (const f of fallos) console.log(`      ${f}`)
}

console.log(`\n${total} retos · ${total - mal - vacios} bien · ${mal} con error · ${vacios} sin filas · ${lento} lentos`)
process.exit(mal + vacios > 0 ? 1 : 0)
