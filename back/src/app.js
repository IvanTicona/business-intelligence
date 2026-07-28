import cors from 'cors'
import express from 'express'
import pg from 'pg'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

const { Pool } = pg

const app = express()
const adminToken = process.env.ADMIN_TOKEN ?? ''
const databaseUrl = process.env.DATABASE_URL

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
    })
  : null

const submissionSchema = z.object({
  practiceId: z.string().min(1).max(60),
  studentIdentifier: z.string().min(2).max(160),
  answers: z.object({
    rowMeaning: z.string().min(1).max(5000),
    businessContext: z.string().min(1).max(5000),
    importantData: z.string().min(1).max(5000),
    problems: z.string().min(1).max(5000),
    aiCritique: z.string().min(1).max(5000),
  }),
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

app.get('/api/admin/submissions', requireAdmin, async (_req, res) => {
  try {
    await ensureDatabase()
    const { rows } = await pool.query(
      `SELECT id, practice_id, student_identifier, answers, created_at
       FROM practice_submissions
       ORDER BY created_at DESC`,
    )

    res.json({ submissions: rows.map(formatSubmission) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'No se pudieron obtener las entregas' })
  }
})

app.get('/api/admin/submissions.csv', requireAdmin, async (_req, res) => {
  try {
    await ensureDatabase()
    const { rows } = await pool.query(
      `SELECT id, practice_id, student_identifier, answers, created_at
       FROM practice_submissions
       ORDER BY created_at DESC`,
    )

    const csv = toCsv(rows.map(formatSubmission))
    res.header('Content-Type', 'text/csv; charset=utf-8')
    res.header('Content-Disposition', 'attachment; filename="entregas-practicas-bi.csv"')
    res.send(csv)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'No se pudo generar el CSV' })
  }
})

function requireAdmin(req, res, next) {
  if (!adminToken) return next()

  const providedToken = req.header('x-admin-token') ?? req.query.token
  if (providedToken !== adminToken) {
    return res.status(401).json({ message: 'Acceso docente no autorizado' })
  }

  next()
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
    rowMeaning: answers.rowMeaning ?? '',
    businessContext: answers.businessContext ?? '',
    importantData: answers.importantData ?? '',
    problems: answers.problems ?? '',
    aiCritique: answers.aiCritique ?? '',
    submittedAt: row.created_at,
  }
}

function toCsv(rows) {
  const headers = [
    'id',
    'practice_id',
    'student_identifier',
    'row_meaning',
    'business_context',
    'important_data',
    'problems',
    'ai_critique',
    'submitted_at',
  ]

  const body = rows.map(row => [
    row.id,
    row.practiceId,
    row.studentIdentifier,
    row.rowMeaning,
    row.businessContext,
    row.importantData,
    row.problems,
    row.aiCritique,
    row.submittedAt,
  ].map(escapeCsv).join(','))

  return [headers.join(','), ...body].join('\n')
}

function escapeCsv(value) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

export default app
