import { Card, Input, Tag, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import PracticeIcon from './PracticeIcon.jsx'
import SqlWorkbench from './SqlWorkbench.jsx'
import SchemaDiagram, { tablasEnConsulta } from './SchemaDiagram.jsx'
import { InlineSubmit, PracticeLayout, StageTracker, usePracticeSubmit } from './PracticeShell.jsx'
import { createDatabase } from '../lib/sqlEngine.js'
import { expocruzSeedSql, sqlChallenges } from './data/expocruz.js'

const { Paragraph } = Typography
const { TextArea } = Input

const objectives = [
  'Entender la diferencia entre filtrar filas y filtrar grupos.',
  'Recorrer el modelo con JOINs siguiendo las claves foráneas.',
  'Convertir una pregunta de negocio en una consulta.',
]

export default function PracticeThree({ delivered, onDelivered }) {
  const [db, setDb] = useState(null)
  const [dbError, setDbError] = useState('')
  const [stage, setStage] = useState(0)
  // Editor vacío a propósito: el esqueleto que había antes resolvía medio reto.
  const [queries, setQueries] = useState(() =>
    Object.fromEntries(sqlChallenges.map(challenge => [challenge.id, ''])),
  )
  const [solved, setSolved] = useState({})
  const [freeQuery, setFreeQuery] = useState('')
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
  stages.push({ id: 'libre', label: 'Libre', complete: Boolean(freeQuestion.trim()) })

  // El diagrama ilumina lo que el alumno está escribiendo AHORA, no solo al
  // ejecutar: así descubre que le falta una tabla antes de apretar el botón.
  const consultaActual = stage < sqlChallenges.length ? queries[sqlChallenges[stage].id] : freeQuery
  const tablasActivas = useMemo(() => tablasEnConsulta(consultaActual), [consultaActual])

  const submit = {
    controls: usePracticeSubmit({ practiceId: 'practice-3', onDelivered }),
    buildAnswers() {
      if (solvedCount < 4) {
        return { error: `Resuelve al menos 4 de los ${sqlChallenges.length} retos antes de enviar. Llevas ${solvedCount}.` }
      }
      if (!freeQuestion.trim()) return { error: 'Escribe la pregunta de negocio de tu consulta libre.' }
      if (!freeQuery.trim()) return { error: 'Escribe tu consulta libre.' }
      if (!reflection.trim()) return { error: 'Completa la reflexión final.' }

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
      {/* Dos contenedores y nada mas: a la izquierda titulo, wizard y consola;
          a la derecha el diagrama, que es material de consulta permanente. */}
      <section className="practice-grid practice-grid-schema">
        <div className="wizard-column">
          <Card className="practice-card wizard-card">
            <header className="wizard-card-head">
              <div className="wizard-card-titles">
                <Tag color="blue">Práctica 3</Tag>
                <h2 className="wizard-card-title">SQL sobre el modelo relacional de ExpoCruz</h2>
              </div>
              <div className="wizard-card-goals">
                <span className="practice-panel-label">Objetivos</span>
                <ul className="wizard-card-objectives">
                  {objectives.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </header>

            <StageTracker stages={stages} activeStage={stage} onSelect={setStage} />
            {!db ? (
              <Paragraph className="stage-intro">Iniciando el motor SQL…</Paragraph>
            ) : stage < sqlChallenges.length ? (
              <>
                <div className="practice-card-heading">
                  <PracticeIcon name="database" />
                  <span>{activeChallenge.title}</span>
                  <Tag className="concept-tag">{activeChallenge.concept}</Tag>
                </div>
                <Paragraph className="stage-intro">{activeChallenge.prompt}</Paragraph>
                <details className="practice-hint">
                  <summary>Ver pista</summary>
                  <p>{activeChallenge.hint}</p>
                </details>
                {/* `key` por reto: al cambiar de etapa el workbench se vuelve a
                    montar y el resultado anterior no queda colgado en pantalla. */}
                <SqlWorkbench
                  key={activeChallenge.id}
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
                  Hasta aquí respondiste preguntas ajenas. Ahora formula una pregunta de negocio que ExpoCruz querría contestar, y escribe el SQL que la responde. Sin plantilla y sin verificación automática: aquí se ve si entendiste.
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

            {db && (
              <InlineSubmit
                delivered={delivered}
                submit={submit}
                hint="Se envían tus consultas tal como las escribiste, resueltas o no."
              />
            )}
          </Card>
        </div>

        <aside className="schema-column">
          <SchemaDiagram activas={tablasActivas} />
        </aside>
      </section>
    </PracticeLayout>
  )
}
