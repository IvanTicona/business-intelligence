import app from './app.js'
import { sincronizarDocentes } from './auth/rutas.js'
import { migrar } from './db/migrar.js'
import { asegurarRolAlumno } from './db/rolAlumno.js'

const port = process.env.PORT ?? 4000

/*
 * El esquema se pone al día ANTES de aceptar tráfico. Si una migración falla,
 * el proceso muere: es preferible que el contenedor no levante a que atienda
 * requests contra un esquema a medias.
 *
 * El rol del alumno no aborta el arranque —se avisa y /health lo reporta—
 * porque su ausencia solo deja sin servicio a las consolas, no al resto.
 */
try {
  await migrar()
} catch (err) {
  console.error('[arranque] no se pudo migrar la base:', err.message)
  process.exit(1)
}

await asegurarRolAlumno()
await sincronizarDocentes()

app.listen(port, () => {
  console.log(`BI course API escuchando en http://localhost:${port}`)
})
