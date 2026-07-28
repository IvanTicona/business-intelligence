// Vacío en Docker: nginx proxea /api al backend desde el mismo origen.
// En dev local se define VITE_API_URL="http://localhost:4000".
export const apiBaseUrl = import.meta.env.VITE_API_URL ?? ''

export function apiUrl(path) {
  return `${apiBaseUrl}${path}`
}

/**
 * Envía una entrega al backend. Todas las prácticas comparten este contrato:
 * el backend rechaza valores vacíos, así que recortamos y filtramos antes.
 */
// Espejo de las reglas del backend (zod). Validamos acá también para dar un
// mensaje que diga QUÉ corregir, en vez del "Datos de entrega inválidos".
const MAX_ANSWER_LENGTH = 5000
const MIN_STUDENT_LENGTH = 2
const MAX_STUDENT_LENGTH = 160

export async function submitPractice({ practiceId, studentIdentifier, answers }) {
  const student = studentIdentifier.trim()
  if (student.length < MIN_STUDENT_LENGTH) {
    throw new Error('El nombre o código de estudiante necesita al menos 2 caracteres.')
  }
  if (student.length > MAX_STUDENT_LENGTH) {
    throw new Error(`El nombre o código no puede superar los ${MAX_STUDENT_LENGTH} caracteres.`)
  }

  const cleanAnswers = Object.fromEntries(
    Object.entries(answers)
      .map(([key, value]) => [key, String(value ?? '').trim()])
      .filter(([, value]) => value.length > 0),
  )

  const tooLong = Object.entries(cleanAnswers).find(([, value]) => value.length > MAX_ANSWER_LENGTH)
  if (tooLong) {
    throw new Error(`El campo "${tooLong[0]}" tiene ${tooLong[1].length} caracteres y el máximo es ${MAX_ANSWER_LENGTH}. Acortá el contenido.`)
  }

  const response = await fetch(apiUrl('/api/submissions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ practiceId, studentIdentifier: student, answers: cleanAnswers }),
  })

  if (!response.ok) {
    const detail = await response.json().catch(() => null)
    throw new Error(detail?.message ?? 'No se pudo enviar la práctica')
  }

  return response.json()
}
