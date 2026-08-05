/*
 * Escribe back/src/db/retos.json con la consulta esperada de cada reto.
 *
 * Hasta ahora la corrección se hacía en el navegador: el front comparaba el
 * resultado del alumno contra el de la consulta de referencia, con ambos ahí
 * mismo. Eso significa que alcanzaba con abrir la consola del navegador y pisar
 * la función de comparación para darse por aprobado.
 *
 * Con este archivo, el servidor sabe cuál es la respuesta y el veredicto lo da
 * él. La fuente sigue siendo el módulo del front —ahí conviven el enunciado, la
 * pista y el ejemplo, que son cosas de la pantalla— y esto es un derivado que
 * se regenera cuando cambia el contenido.
 */
import { writeFileSync } from 'fs'

const SALIDA = new URL('../back/src/db/retos.json', import.meta.url)

const laboratorio = [
  ['ketal', '../front/src/playground/datasets/ketal.js', m => m.ketal],
  ['teleferico', '../front/src/playground/datasets/teleferico.js', m => m.teleferico],
  ['bancosol', '../front/src/playground/datasets/bancosol.js', m => m.bancosol],
  ['arcoiris', '../front/src/playground/datasets/arcoiris.js', m => m.arcoiris],
  ['yaigo', '../front/src/playground/datasets/yaigo.js', m => m.yaigo],
  ['entel', '../front/src/playground/datasets/entel.js', m => m.entel],
  ['upb', '../front/src/playground/datasets/upb.js', m => m.upb],
  ['cinemateca', '../front/src/playground/datasets/cinemateca.js', m => m.cinemateca],
]

const retos = {}
let total = 0

for (const [base, ruta, sacar] of laboratorio) {
  const ds = sacar(await import(new URL(ruta, import.meta.url)))
  for (const reto of ds.retos) {
    retos[reto.id] = { base, sql: reto.expectedSql, orden: Boolean(reto.orderMatters) }
    total += 1
  }
}

// Práctica 3: los retos de consulta sobre Expocruz.
const expocruz = await import(new URL('../front/src/practices/data/expocruz.js', import.meta.url))
for (const reto of expocruz.sqlChallenges ?? []) {
  retos[`p3-${reto.id}`] = { base: 'expocruz', sql: reto.expectedSql, orden: Boolean(reto.orderMatters) }
  total += 1
}

// Práctica 4: las consultas de KPI sobre Spazio Gym.
const spazio = await import(new URL('../front/src/practices/data/spaziogym.js', import.meta.url))
for (const kpi of spazio.kpiChallenges ?? spazio.kpis ?? []) {
  if (!kpi.expectedSql) continue
  retos[`p4-${kpi.id}`] = { base: 'spaziogym', sql: kpi.expectedSql, orden: Boolean(kpi.orderMatters) }
  total += 1
}

writeFileSync(SALIDA, JSON.stringify(retos, null, 1) + '\n', 'utf8')
console.log(`${total} retos exportados a back/src/db/retos.json`)
