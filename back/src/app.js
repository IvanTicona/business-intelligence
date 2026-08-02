import cors from 'cors'
import express from 'express'
import pg from 'pg'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

const { Pool } = pg

const app = express()
const adminToken = process.env.ADMIN_TOKEN ?? ''
const databaseUrl = process.env.DATABASE_URL
const databaseSsl = process.env.DATABASE_SSL !== 'false'

if (!adminToken) {
  throw new Error('ADMIN_TOKEN es obligatorio: sin token el panel docente queda abierto a cualquiera')
}
const practiceConfigs = {
  'practice-1': {
    label: 'Práctica 1 · Exploración del dataset',
    csvFilename: 'practica-1-entregas.csv',
    fields: [
      { key: 'rowMeaning', csvHeader: 'row_meaning' },
      { key: 'businessContext', csvHeader: 'business_context' },
      { key: 'importantData', csvHeader: 'important_data' },
      { key: 'problems', csvHeader: 'problems' },
      { key: 'aiCritique', csvHeader: 'ai_critique' },
    ],
  },
  'practice-2': {
    label: 'Práctica 2 · Del caso al MER',
    csvFilename: 'practica-2-entregas.csv',
    fields: [
      { key: 'classificationScore', csvHeader: 'clasificacion_entidad_atributo' },
      { key: 'primaryKeys', csvHeader: 'claves_primarias' },
      { key: 'cardinalities', csvHeader: 'cardinalidades' },
      { key: 'kpis', csvHeader: 'kpis_propuestos' },
      { key: 'reflection', csvHeader: 'reflexion' },
    ],
  },
  'practice-3': {
    label: 'Práctica 3 · Consultas SQL',
    csvFilename: 'practica-3-entregas.csv',
    fields: [
      { key: 'solvedCount', csvHeader: 'retos_resueltos' },
      { key: 'queries', csvHeader: 'consultas_sql' },
      { key: 'freeQuery', csvHeader: 'consulta_propia' },
      { key: 'reflection', csvHeader: 'reflexion' },
    ],
  },
  'practice-4': {
    label: 'Práctica 4 · Data mart en estrella',
    csvFilename: 'practica-4-entregas.csv',
    fields: [
      { key: 'grain', csvHeader: 'grain_del_hecho' },
      { key: 'factDesign', csvHeader: 'diseno_estrella' },
      { key: 'kpiDefinitions', csvHeader: 'definicion_kpis' },
      { key: 'kpiQueries', csvHeader: 'consultas_kpis' },
      { key: 'reflection', csvHeader: 'reflexion' },
    ],
  },
}

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: databaseSsl ? { rejectUnauthorized: false } : false,
    })
  : null

const submissionSchema = z.object({
  practiceId: z.enum(['practice-1', 'practice-2', 'practice-3', 'practice-4']),
  studentIdentifier: z.string().min(2).max(160),
  answers: z.record(z.string(), z.string().min(1).max(5000)),
})

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }))
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/submissions', async (req, res) => {
  const parsed = submissionSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Datos de entrega inválidos', issues: parsed.error.issues })
  }

  try {
    await ensureDatabase()
    const submission = parsed.data
    const config = practiceConfigs[submission.practiceId]
    const missingFields = config.fields
      .map(field => field.key)
      .filter(key => !submission.answers[key]?.trim())

    if (missingFields.length > 0) {
      return res.status(400).json({ message: 'La entrega está incompleta', missingFields })
    }

    const id = randomUUID()

    await pool.query(
      `INSERT INTO practice_submissions (id, practice_id, student_identifier, answers)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [id, submission.practiceId, submission.studentIdentifier, JSON.stringify(submission.answers)],
    )

    res.status(201).json({ id, status: 'delivered' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'No se pudo registrar la entrega' })
  }
})

app.get('/api/admin/submissions', requireAdmin, async (req, res) => {
  try {
    await ensureDatabase()
    const practiceId = normalizePracticeId(req.query.practiceId)
    const { rows } = await findSubmissions(practiceId)

    res.json({ submissions: rows.map(formatSubmission) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'No se pudieron obtener las entregas' })
  }
})

app.get('/api/admin/submissions.csv', requireAdmin, async (req, res) => {
  try {
    await ensureDatabase()
    const practiceId = normalizePracticeId(req.query.practiceId)
    const config = practiceConfigs[practiceId]
    const { rows } = await findSubmissions(practiceId)

    const csv = toCsv(rows.map(formatSubmission), config)
    res.header('Content-Type', 'text/csv; charset=utf-8')
    res.header('Content-Disposition', `attachment; filename="${config.csvFilename}"`)
    res.send(csv)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'No se pudo generar el CSV' })
  }
})

/*
 * Panorama del curso para el docente.
 *
 * Contesta las tres preguntas que se hacen antes de una clase: quién entregó,
 * quién va quedando atrás y qué ejercicio traba a más gente. Todo sale de
 * practice_submissions: no hay tabla nueva ni login.
 */
app.get('/api/admin/panorama', requireAdmin, async (_req, res) => {
  try {
    await ensureDatabase()

    const practicas = Object.keys(practiceConfigs)

    const { rows: porPractica } = await pool.query(
      `SELECT practice_id,
              COUNT(*)::int AS entregas,
              COUNT(DISTINCT student_identifier)::int AS estudiantes,
              MIN(created_at) AS primera,
              MAX(created_at) AS ultima
       FROM practice_submissions
       GROUP BY practice_id`,
    )

    // Un alumno "se quedó" si entregó alguna práctica pero no las siguientes.
    const { rows: porEstudiante } = await pool.query(
      `SELECT student_identifier,
              ARRAY_AGG(DISTINCT practice_id ORDER BY practice_id) AS practicas,
              COUNT(DISTINCT practice_id)::int AS completadas,
              MAX(created_at) AS ultima
       FROM practice_submissions
       GROUP BY student_identifier
       ORDER BY completadas ASC, ultima ASC`,
    )

    const total = practicas.length
    const ahora = Date.now()

    const estudiantes = porEstudiante.map(fila => {
      const faltan = practicas.filter(id => !fila.practicas.includes(id))
      const diasSinEntregar = Math.floor((ahora - new Date(fila.ultima).getTime()) / 86400000)

      return {
        studentIdentifier: fila.student_identifier,
        completadas: fila.completadas,
        total,
        faltan,
        ultimaEntrega: fila.ultima,
        diasSinEntregar,
        // El corte de 7 días es el mismo criterio que usa el reporte de upb-sql:
        // no es que no haya entregado, es que dejó de avanzar.
        estancado: faltan.length > 0 && diasSinEntregar >= 7,
      }
    })

    res.json({
      practicas: practicas.map(id => {
        const fila = porPractica.find(p => p.practice_id === id)
        return {
          practiceId: id,
          label: practiceConfigs[id].label ?? id,
          entregas: fila?.entregas ?? 0,
          estudiantes: fila?.estudiantes ?? 0,
          primera: fila?.primera ?? null,
          ultima: fila?.ultima ?? null,
        }
      }),
      estudiantes,
      resumen: {
        estudiantesUnicos: estudiantes.length,
        completaronTodo: estudiantes.filter(e => e.faltan.length === 0).length,
        estancados: estudiantes.filter(e => e.estancado).length,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'No se pudo generar el panorama del curso' })
  }
})

function requireAdmin(req, res, next) {
  const providedToken = req.header('x-admin-token') ?? req.query.token
  if (providedToken !== adminToken) {
    return res.status(401).json({ message: 'Acceso docente no autorizado' })
  }

  next()
}

function normalizePracticeId(value) {
  const practiceId = typeof value === 'string' ? value : 'practice-1'
  return practiceConfigs[practiceId] ? practiceId : 'practice-1'
}

function findSubmissions(practiceId) {
  return pool.query(
    `SELECT id, practice_id, student_identifier, answers, created_at
     FROM practice_submissions
     WHERE practice_id = $1
     ORDER BY created_at DESC`,
    [practiceId],
  )
}

async function ensureDatabase() {
  if (!pool) throw new Error('DATABASE_URL no configurado')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS practice_submissions (
      id TEXT PRIMARY KEY,
      practice_id TEXT NOT NULL,
      student_identifier TEXT NOT NULL,
      answers JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

function formatSubmission(row) {
  const answers = row.answers ?? {}

  return {
    id: row.id,
    practiceId: row.practice_id,
    studentIdentifier: row.student_identifier,
    answers,
    submittedAt: row.created_at,
  }
}

function toCsv(rows, config) {
  const headers = [
    'id',
    'practice_id',
    'student_identifier',
    ...config.fields.map(field => field.csvHeader),
    'submitted_at',
  ]

  const body = rows.map(row => [
    row.id,
    row.practiceId,
    row.studentIdentifier,
    ...config.fields.map(field => row.answers[field.key] ?? ''),
    row.submittedAt,
  ].map(escapeCsv).join(','))

  return [headers.join(','), ...body].join('\n')
}

function escapeCsv(value) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

export default app
