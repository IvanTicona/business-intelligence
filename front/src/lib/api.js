// Vacío en Docker: nginx proxea /api al backend desde el mismo origen.
// En dev local se define VITE_API_URL="http://localhost:4000".
export const apiBaseUrl = import.meta.env.VITE_API_URL ?? ''

export function apiUrl(path) {
  return `${apiBaseUrl}${path}`
}

/**
 * Toda llamada al backend pasa por acá.
 *
 * `credentials: 'include'` es lo que hace que viaje la cookie de sesión. En
 * Docker el front y el backend comparten origen y la cookie iría igual, pero en
 * desarrollo el front corre en otro puerto y sin esto el navegador no la manda:
 * el alumno vería "necesitás iniciar sesión" con la sesión abierta.
 */
async function pedir(path, opciones = {}) {
  const respuesta = await fetch(apiUrl(path), {
    credentials: 'include',
    ...opciones,
    headers: opciones.body ? { 'Content-Type': 'application/json', ...opciones.headers } : opciones.headers,
  })

  if (respuesta.status === 204) return null

  const cuerpo = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    const error = new Error(cuerpo?.message ?? 'No se pudo completar la operación')
    error.estado = respuesta.status
    throw error
  }

  return cuerpo
}

// --- Identidad -------------------------------------------------------------

/** Devuelve el usuario o null. No lanza si no hay sesión: no tener es normal. */
export async function quienSoy() {
  try {
    const { usuario } = await pedir('/api/auth/yo')

    return usuario
  } catch {
    return null
  }
}

export async function registrarse({ correo, clave, nombre }) {
  const { usuario } = await pedir('/api/auth/registro', {
    method: 'POST',
    body: JSON.stringify({ correo, clave, nombre }),
  })

  return usuario
}

export async function ingresar({ correo, clave }) {
  const { usuario } = await pedir('/api/auth/ingreso', {
    method: 'POST',
    body: JSON.stringify({ correo, clave }),
  })

  return usuario
}

export function salir() {
  return pedir('/api/auth/salida', { method: 'POST' })
}

export function cambiarClave({ actual, nueva }) {
  return pedir('/api/auth/clave', { method: 'POST', body: JSON.stringify({ actual, nueva }) })
}

// --- Consultas -------------------------------------------------------------

/**
 * Ejecuta SQL contra el Postgres del servidor.
 *
 * Devuelve la misma forma que devolvía el motor del navegador
 * (`{ columns, rows }`), así que las páginas que la consumen no cambian. Un
 * error de SQL del alumno viene DENTRO de la respuesta, no como excepción:
 * equivocarse escribiendo una consulta es parte de aprender, no una falla.
 */
export async function ejecutarConsulta({ base, sql }) {
  return pedir('/api/sql/consulta', { method: 'POST', body: JSON.stringify({ base, sql }) })
}

// --- Entregas --------------------------------------------------------------

// Espejo de las reglas del backend (zod). Validamos aquí también para dar un
// mensaje que diga QUÉ corregir, en vez del "Datos de entrega inválidos".
const MAX_ANSWER_LENGTH = 5000

/**
 * Envía una entrega.
 *
 * Ya no lleva el nombre del alumno: lo pone el servidor desde la sesión. Antes
 * viajaba en el cuerpo y el servidor le creía, así que cualquiera podía
 * entregar en nombre de otro.
 */
export async function submitPractice({ practiceId, answers }) {
  const cleanAnswers = Object.fromEntries(
    Object.entries(answers)
      .map(([key, value]) => [key, String(value ?? '').trim()])
      .filter(([, value]) => value.length > 0),
  )

  const tooLong = Object.entries(cleanAnswers).find(([, value]) => value.length > MAX_ANSWER_LENGTH)
  if (tooLong) {
    throw new Error(`El campo "${tooLong[0]}" tiene ${tooLong[1].length} caracteres y el máximo es ${MAX_ANSWER_LENGTH}. Acorta el contenido.`)
  }

  return pedir('/api/submissions', {
    method: 'POST',
    body: JSON.stringify({ practiceId, answers: cleanAnswers }),
  })
}
