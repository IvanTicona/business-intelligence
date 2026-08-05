import cors from 'cors'
import express from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { exigirAdmin, poolAdmin as pool } from './db/pools.js'
import { motivoRol, rolListo } from './db/rolAlumno.js'
import { cargarUsuario, exigirDocente, exigirSesion } from './auth/middleware.js'
import { rutasAuth } from './auth/rutas.js'
import { rutasSql } from './sql/rutas.js'
import { rutasDocente } from './docente/rutas.js'
import { rutasTrabajo } from './trabajo/rutas.js'

const app = express()
const adminToken = process.env.ADMIN_TOKEN ?? ''

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

/*
 * `studentIdentifier` ya no viaja en el cuerpo. Antes el alumno escribía su
 * nombre a mano y el servidor le creía: cualquiera podía entregar como
 * cualquiera, y "Juan Pérez" y "juan perez" contaban como dos personas en el
 * panorama. Ahora sale de la sesión y no hay forma de suplantarlo.
 */
const submissionSchema = z.object({
  practiceId: z.enum(['practice-1', 'practice-2', 'practice-3', 'practice-4']),
  answers: z.record(z.string(), z.string().min(1).max(5000)),
})

/*
 * Detrás de nginx, sin esto `req.secure` sería siempre false y `req.ip` sería
 * siempre la IP del proxy: la cookie saldría sin `Secure` y el límite de
 * intentos contaría a todo el curso como un solo visitante. El backend no
 * publica puerto, así que las cabeceras solo pueden venir de nginx.
 */
app.set('trust proxy', true)

/*
 * `credentials: true` porque la sesión viaja en cookie. En Docker no hace falta
 * —nginx sirve todo desde el mismo origen— pero en desarrollo el front corre en
 * otro puerto y sin esto el navegador no manda la cookie.
 */
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true, credentials: true }))
app.use(express.json({ limit: '1mb' }))

// Antes de cualquier ruta: deja `req.usuario` puesto (o null) para todas.
app.use(cargarUsuario)
app.use('/api/auth', rutasAuth())
app.use('/api/sql', rutasSql())
app.use('/api/trabajo', rutasTrabajo())

// Entra el rol 'docente' o el token de siempre, que se retira en la fase 4
// cuando el panel pase a autenticarse con la cuenta.
const soloDocente = exigirDocente(adminToken)
app.use('/api/admin', rutasDocente(soloDocente))

/*
 * El healthcheck reporta si el rol del alumno quedó disponible. Sin esto, un
 * despliegue con la base a medio configurar se ve idéntico a uno sano hasta que
 * un alumno abre una consola en clase y no anda.
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', motorAlumno: rolListo ? 'listo' : motivoRol })
})

app.post('/api/submissions', exigirSesion, async (req, res) => {
  const parsed = submissionSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Datos de entrega inválidos', issues: parsed.error.issues })
  }

  try {
    exigirAdmin()
    const submission = parsed.data
    const config = practiceConfigs[submission.practiceId]
    const missingFields = config.fields
      .map(field => field.key)
      .filter(key => !submission.answers[key]?.trim())

    if (missingFields.length > 0) {
      return res.status(400).json({ message: 'La entrega está incompleta', missingFields })
    }

    const id = randomUUID()
    const { id: usuarioId, nombre, correo } = req.usuario

    await pool.query(
      `INSERT INTO practice_submissions (id, practice_id, student_identifier, answers, usuario_id)
       VALUES ($1, $2, $3, $4::jsonb, $5)`,
      [id, submission.practiceId, `${nombre} <${correo}>`, JSON.stringify(submission.answers), usuarioId],
    )

    res.status(201).json({ id, status: 'delivered' })
  } catch (error) {
    // 23505 es el índice que permite una sola entrega por práctica y cuenta.
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Ya entregaste esta práctica' })
    }

    console.error(error)
    res.status(500).json({ message: 'No se pudo registrar la entrega' })
  }
})

/*
 * Qué entregó ESTA cuenta.
 *
 * Hasta ahora el front se lo creía a una marca en el localStorage del navegador,
 * que no sabía nada de cuentas. Con el login eso empezó a mentir: el alumno que
 * había entregado antes veía "entregada" con una cuenta que en el servidor no
 * tiene ninguna entrega, y el docente no lo veía en su panorama. La verdad la
 * tiene el servidor.
 */
app.get('/api/submissions/mias', exigirSesion, async (req, res) => {
  try {
    const { rows } = await exigirAdmin().query(
      'SELECT practice_id FROM practice_submissions WHERE usuario_id = $1',
      [req.usuario.id],
    )

    return res.json({ entregadas: rows.map(r => r.practice_id) })
  } catch (error) {
    console.error('[entregas] mias:', error)

    return res.status(500).json({ message: 'No se pudieron leer tus entregas' })
  }
})

app.get('/api/admin/submissions', soloDocente, async (req, res) => {
  try {
    exigirAdmin()
    const practiceId = normalizePracticeId(req.query.practiceId)
    const { rows } = await findSubmissions(practiceId)

    res.json({ submissions: rows.map(formatSubmission) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'No se pudieron obtener las entregas' })
  }
})

app.get('/api/admin/submissions.csv', soloDocente, async (req, res) => {
  try {
    exigirAdmin()
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
app.get('/api/admin/panorama', soloDocente, async (_req, res) => {
  try {
    exigirAdmin()

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
