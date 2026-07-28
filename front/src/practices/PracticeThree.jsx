import { Card, Input, Tag, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import PracticeIcon from './PracticeIcon.jsx'
import SqlWorkbench, { SchemaExplorer } from './SqlWorkbench.jsx'
import { PracticeHero, PracticeLayout, StageTracker, SubmitCard, usePracticeSubmit } from './PracticeShell.jsx'
import { ScoreBar } from './PracticeTwo.jsx'
import { createDatabase } from '../lib/sqlEngine.js'
import { expocruzSeedSql, relationalSchema, sqlChallenges } from './data/expocruz.js'

const { Paragraph } = Typography
const { TextArea } = Input

const objectives = [
  'Escribir SQL sobre un modelo relacional real, no sobre ejemplos de juguete.',
  'Entender la diferencia entre filtrar filas y filtrar grupos.',
  'Recorrer el modelo con JOINs siguiendo las claves foráneas.',
  'Convertir una pregunta de negocio en una consulta.',
]

export default function PracticeThree({ delivered, onDelivered }) {
  const [db, setDb] = useState(null)
  const [dbError, setDbError] = useState('')
  const [stage, setStage] = useState(0)
  const [queries, setQueries] = useState(() =>
    Object.fromEntries(sqlChallenges.map(challenge => [challenge.id, challenge.starter])),
  )
  const [solved, setSolved] = useState({})
  const [freeQuery, setFreeQuery] = useState('SELECT * FROM entrada LIMIT 10;')
  const [freeQuestion, setFreeQuestion] = useState('')
  const [reflection, setReflection] = useState('')

  useEffect(() => {
    let cancelled = false

    createDatabase(expocruzSeedSql)
      .then(database => {
        if (!cancelled) setDb(database)
      })
      .catch(() => {
        if (!cancelled) setDbError('No se pudo iniciar el motor SQL en este navegador.')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const solvedCount = useMemo(() => Object.values(solved).filter(Boolean).length, [solved])
  const activeChallenge = sqlChallenges[stage]

  const stages = sqlChallenges.map((challenge, index) => ({
    id: challenge.id,
    label: `Reto ${index + 1}`,
    complete: Boolean(solved[challenge.id]),
  }))
  stages.push({ id: 'libre', label: 'Consulta libre', complete: Boolean(freeQuestion.trim()) })

  const submit = {
    controls: usePracticeSubmit({ practiceId: 'practice-3', onDelivered }),
    buildAnswers() {
      if (solvedCount < 4) {
        return { error: `Resolvé al menos 4 de los ${sqlChallenges.length} retos antes de enviar. Llevás ${solvedCount}.` }
      }
      if (!freeQuestion.trim()) return { error: 'Escribí la pregunta de negocio de tu consulta libre.' }
      if (!freeQuery.trim()) return { error: 'Escribí tu consulta libre.' }
      if (!reflection.trim()) return { error: 'Completá la reflexión final.' }

      return {
        answers: {
          solvedCount: `${solvedCount}/${sqlChallenges.length} retos resueltos`,
          queries: sqlChallenges
            .map(challenge => `-- ${challenge.title} (${solved[challenge.id] ? 'OK' : 'sin resolver'})\n${queries[challenge.id]}`)
            .join('\n\n'),
          freeQuery: `-- Pregunta: ${freeQuestion.trim()}\n${freeQuery.trim()}`,
          reflection: reflection.trim(),
        },
      }
    },
  }

  if (dbError) {
    return (
      <PracticeLayout>
        <Card className="practice-card">
          <Paragraph>{dbError}</Paragraph>
        </Card>
      </PracticeLayout>
    )
  }

  return (
    <PracticeLayout>
      <PracticeHero
        practiceLabel="Práctica 3"
        title="SQL sobre el modelo relacional de ExpoCruz"
        description="El modelo que diseñaste en la Práctica 2, ya implementado y con datos. Cada consulta se ejecuta de verdad contra una base SQLite que corre en tu navegador."
        objectives={objectives}
      />

      <StageTracker stages={stages} activeStage={stage} onSelect={setStage} />

      <section className="practice-grid">
        <div className="practice-workspace">
          <Card className="practice-card">
            {!db ? (
              <Paragraph className="stage-intro">Iniciando el motor SQL…</Paragraph>
            ) : stage < sqlChallenges.length ? (
              <>
                <div className="practice-card-heading">
                  <PracticeIcon name="database" />
                  <span>{activeChallenge.title}</span>
                  <Tag className="concept-tag">{activeChallenge.concept}</Tag>
                </div>
                <ScoreBar label="Retos resueltos" value={solvedCount} total={sqlChallenges.length} />
                <Paragraph className="stage-intro">{activeChallenge.prompt}</Paragraph>
                <details className="practice-hint">
                  <summary>Ver pista</summary>
                  <p>{activeChallenge.hint}</p>
                </details>
                <SqlWorkbench
                  db={db}
                  value={queries[activeChallenge.id]}
                  onChange={value => setQueries(current => ({ ...current, [activeChallenge.id]: value }))}
                  expectedSql={activeChallenge.expectedSql}
                  orderMatters={activeChallenge.orderMatters}
                  onSolved={() => setSolved(current => ({ ...current, [activeChallenge.id]: true }))}
                  disabled={delivered}
                />
              </>
            ) : (
              <>
                <div className="practice-card-heading">
                  <PracticeIcon name="spark" />
                  <span>Tu propia pregunta</span>
                </div>
                <Paragraph className="stage-intro">
                  Hasta acá respondiste preguntas ajenas. Ahora formulá vos una pregunta de negocio que ExpoCruz querría contestar, y escribí el SQL que la responde. Sin plantilla y sin verificación automática: acá se ve si entendiste.
                </Paragraph>
                <label className="practice-field">
                  <span>Pregunta de negocio</span>
                  <Input
                    disabled={delivered}
                    placeholder="Ej. ¿Qué pabellón genera más ingresos por contratos de stand?"
                    value={freeQuestion}
                    onChange={event => setFreeQuestion(event.target.value)}
                  />
                </label>
                <SqlWorkbench
                  db={db}
                  value={freeQuery}
                  onChange={setFreeQuery}
                  disabled={delivered}
                  rows={9}
                />
                <label className="practice-field">
                  <span>¿Qué te costó más: el JOIN, el GROUP BY o traducir la pregunta a SQL? ¿Por qué?</span>
                  <TextArea disabled={delivered} rows={4} value={reflection} onChange={event => setReflection(event.target.value)} />
                </label>
              </>
            )}
          </Card>
        </div>

        <aside className="practice-sidebar">
          <Card className="practice-card">
            <div className="practice-card-heading">
              <PracticeIcon name="sheet" />
              <span>Esquema</span>
            </div>
            <Paragraph className="dataset-copy">
              11 tablas con datos de las ediciones 2024 y 2025. Los nombres van sin tildes a propósito, como en una base real.
            </Paragraph>
            <SchemaExplorer tables={relationalSchema} title="" />
          </Card>

          <SubmitCard
            delivered={delivered}
            submit={submit}
            hint="Se envían tus consultas tal como las escribiste, resueltas o no."
          />
        </aside>
      </section>
    </PracticeLayout>
  )
}
