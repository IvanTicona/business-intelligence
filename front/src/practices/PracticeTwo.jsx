import { Button, Card, Input, Typography } from 'antd'
import { useMemo, useState } from 'react'
import PracticeIcon from './PracticeIcon.jsx'
import {
  PracticeHero,
  PracticeLayout,
  StageTracker,
  SubmitCard,
  usePracticeSubmit,
} from './PracticeShell.jsx'
import {
  cardinalityQuestions,
  conceptCards,
  primaryKeyQuestions,
  relationalSchema,
} from './data/expocruz.js'

const { Paragraph } = Typography
const { TextArea } = Input

const objectives = [
  'Distinguir entidades de atributos con criterio, no de memoria.',
  'Elegir claves primarias que no se rompan con el tiempo.',
  'Traducir reglas de negocio a cardinalidades.',
  'Escribir KPIs que el modelo pueda responder de verdad.',
]

export default function PracticeTwo({ delivered, onDelivered }) {
  const [stage, setStage] = useState(0)
  const [classifications, setClassifications] = useState({})
  const [pkAnswers, setPkAnswers] = useState({})
  const [cardAnswers, setCardAnswers] = useState({})
  const [diagramUrl, setDiagramUrl] = useState('')
  const [kpis, setKpis] = useState('')
  const [reflection, setReflection] = useState('')

  const classificationScore = useMemo(
    () => conceptCards.filter(card => classifications[card.id] === card.answer).length,
    [classifications],
  )
  const pkScore = useMemo(
    () => primaryKeyQuestions.filter(q => q.options.find(o => o.id === pkAnswers[q.id])?.correct).length,
    [pkAnswers],
  )
  const cardScore = useMemo(
    () => cardinalityQuestions.filter(q => cardAnswers[q.id] === q.answer).length,
    [cardAnswers],
  )

  const stages = [
    { id: 'clasificar', label: 'Entidad o atributo', complete: Object.keys(classifications).length === conceptCards.length },
    { id: 'claves', label: 'Claves primarias', complete: Object.keys(pkAnswers).length === primaryKeyQuestions.length },
    { id: 'cardinalidad', label: 'Cardinalidades', complete: Object.keys(cardAnswers).length === cardinalityQuestions.length },
    { id: 'kpis', label: 'Diagrama y KPIs', complete: Boolean(diagramUrl.trim() && kpis.trim()) },
  ]

  const submit = {
    controls: usePracticeSubmit({ practiceId: 'practice-2', onDelivered }),
    buildAnswers() {
      if (!stages[0].complete) return { error: 'Clasificá los 17 conceptos antes de enviar.' }
      if (!stages[1].complete) return { error: 'Respondé las 4 preguntas de claves primarias.' }
      if (!stages[2].complete) return { error: 'Definí las 5 cardinalidades.' }
      if (!diagramUrl.trim()) return { error: 'Pegá el enlace de tu diagrama en ERDPlus.' }
      if (!kpis.trim()) return { error: 'Escribí al menos 2 KPIs.' }
      if (!reflection.trim()) return { error: 'Completá la reflexión final.' }

      return {
        answers: {
          classificationScore: `${classificationScore}/${conceptCards.length} conceptos correctos`,
          primaryKeys: primaryKeyQuestions
            .map(q => {
              const chosen = q.options.find(o => o.id === pkAnswers[q.id])
              return `${q.entity}: ${chosen?.label ?? '—'} ${chosen?.correct ? '[correcta]' : '[incorrecta]'}`
            })
            .join(' | '),
          cardinalities: cardinalityQuestions
            .map(q => `${q.left}→${q.right}: ${cardAnswers[q.id]} ${cardAnswers[q.id] === q.answer ? '[correcta]' : '[incorrecta]'}`)
            .join(' | '),
          diagramUrl: diagramUrl.trim(),
          kpis: kpis.trim(),
          reflection: reflection.trim(),
        },
      }
    },
  }

  return (
    <PracticeLayout>
      <PracticeHero
        practiceLabel="Práctica 2"
        title="Del caso ExpoCruz al Modelo Entidad-Relación"
        description="Actividad grupal. Antes de dibujar nada, hay que decidir qué es entidad, qué es atributo y cómo se relacionan. El diagrama es la consecuencia, no el punto de partida."
        objectives={objectives}
      />

      <StageTracker stages={stages} activeStage={stage} onSelect={setStage} />

      <section className="practice-grid">
        <div className="practice-workspace">
          {stage === 0 && (
            <ClassificationStage
              classifications={classifications}
              onClassify={(id, value) => setClassifications(current => ({ ...current, [id]: value }))}
              score={classificationScore}
            />
          )}
          {stage === 1 && (
            <QuizStage
              heading="Elegí la clave primaria"
              intro="Una PK mala no se nota el primer día. Se nota dos años después, cuando cambiarla implica tocar quince tablas."
              questions={primaryKeyQuestions.map(q => ({
                id: q.id,
                title: q.entity,
                options: q.options.map(o => ({ id: o.id, label: o.label, correct: o.correct, why: o.why })),
              }))}
              answers={pkAnswers}
              onAnswer={(questionId, optionId) => setPkAnswers(current => ({ ...current, [questionId]: optionId }))}
              score={pkScore}
            />
          )}
          {stage === 2 && (
            <CardinalityStage
              answers={cardAnswers}
              onAnswer={(id, value) => setCardAnswers(current => ({ ...current, [id]: value }))}
              score={cardScore}
            />
          )}
          {stage === 3 && (
            <DeliverableStage
              diagramUrl={diagramUrl}
              setDiagramUrl={setDiagramUrl}
              kpis={kpis}
              setKpis={setKpis}
              reflection={reflection}
              setReflection={setReflection}
              disabled={delivered}
            />
          )}
        </div>

        <aside className="practice-sidebar">
          <Card className="practice-card">
            <div className="practice-card-heading">
              <PracticeIcon name="database" />
              <span>Modelo relacional objetivo</span>
            </div>
            <Paragraph className="dataset-copy">
              Así queda el modelo si las decisiones son correctas. En la Práctica 3 vas a consultar exactamente estas tablas.
            </Paragraph>
            <div className="schema-list">
              {relationalSchema.map(item => (
                <div className="schema-table" key={item.table}>
                  <strong>{item.table}</strong>
                  <span>{item.columns.join(', ')}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="practice-card">
            <div className="practice-card-heading">
              <PracticeIcon name="link" />
              <span>Herramienta</span>
            </div>
            <Paragraph className="dataset-copy">
              Dibujá el MER en ERDPlus con cardinalidades y participación, y pegá el enlace en la entrega.
            </Paragraph>
            <Button type="primary" size="large" className="dataset-button" onClick={() => window.open('https://erdplus.com/', '_blank', 'noopener,noreferrer')}>
              <PracticeIcon name="external" />
              Abrir ERDPlus
            </Button>
          </Card>

          <SubmitCard
            delivered={delivered}
            submit={submit}
            hint="Se guarda tu puntaje por etapa junto al diagrama y los KPIs."
          />
        </aside>
      </section>
    </PracticeLayout>
  )
}

function ClassificationStage({ classifications, onClassify, score }) {
  return (
    <Card className="practice-card">
      <div className="practice-card-heading">
        <PracticeIcon name="ruler" />
        <span>¿Entidad o atributo?</span>
      </div>
      <Paragraph className="stage-intro">
        La pregunta que decide: <strong>¿esto tiene identidad propia y vida independiente, o solo describe a otra cosa?</strong> Clasificá los {conceptCards.length} conceptos del caso. Vas a ver la explicación al instante.
      </Paragraph>
      <ScoreBar label="Aciertos" value={score} total={conceptCards.length} />

      <div className="concept-grid">
        {conceptCards.map(card => {
          const chosen = classifications[card.id]
          const isCorrect = chosen === card.answer

          return (
            <div className={`concept-card ${chosen ? (isCorrect ? 'concept-card-ok' : 'concept-card-bad') : ''}`} key={card.id}>
              <strong>{card.label}</strong>
              <p>{card.description}</p>
              <div className="concept-actions">
                <button type="button" className={chosen === 'entidad' ? 'concept-btn concept-btn-active' : 'concept-btn'} onClick={() => onClassify(card.id, 'entidad')}>
                  Entidad
                </button>
                <button type="button" className={chosen === 'atributo' ? 'concept-btn concept-btn-active' : 'concept-btn'} onClick={() => onClassify(card.id, 'atributo')}>
                  Atributo
                </button>
              </div>
              {chosen && (
                <p className={`concept-feedback ${isCorrect ? 'concept-feedback-ok' : 'concept-feedback-bad'}`}>
                  {isCorrect ? '✓ ' : '✗ '}
                  {card.why}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function QuizStage({ heading, intro, questions, answers, onAnswer, score }) {
  return (
    <Card className="practice-card">
      <div className="practice-card-heading">
        <PracticeIcon name="brain" />
        <span>{heading}</span>
      </div>
      <Paragraph className="stage-intro">{intro}</Paragraph>
      <ScoreBar label="Aciertos" value={score} total={questions.length} />

      <div className="quiz-list">
        {questions.map(question => {
          const chosenId = answers[question.id]
          const chosen = question.options.find(o => o.id === chosenId)

          return (
            <div className="quiz-block" key={question.id}>
              <strong className="quiz-title">{question.title}</strong>
              <div className="quiz-options">
                {question.options.map(option => {
                  const isChosen = option.id === chosenId
                  const tone = isChosen ? (option.correct ? 'quiz-option-ok' : 'quiz-option-bad') : ''

                  return (
                    <button type="button" key={option.id} className={`quiz-option ${tone}`} onClick={() => onAnswer(question.id, option.id)}>
                      <code>{option.label}</code>
                    </button>
                  )
                })}
              </div>
              {chosen && (
                <p className={`concept-feedback ${chosen.correct ? 'concept-feedback-ok' : 'concept-feedback-bad'}`}>
                  {chosen.correct ? '✓ ' : '✗ '}
                  {chosen.why}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function CardinalityStage({ answers, onAnswer, score }) {
  return (
    <Card className="practice-card">
      <div className="practice-card-heading">
        <PracticeIcon name="layers" />
        <span>Reglas de negocio → cardinalidades</span>
      </div>
      <Paragraph className="stage-intro">
        Cada regla escrita en castellano tiene una única traducción correcta al modelo. Leé la regla completa antes de responder: la trampa suele estar en el lado que <em>no</em> te mencionan.
      </Paragraph>
      <ScoreBar label="Aciertos" value={score} total={cardinalityQuestions.length} />

      <div className="quiz-list">
        {cardinalityQuestions.map(question => {
          const chosen = answers[question.id]
          const isCorrect = chosen === question.answer

          return (
            <div className="quiz-block" key={question.id}>
              <p className="rule-text">«{question.rule}»</p>
              <div className="cardinality-row">
                <span className="cardinality-entity">{question.left}</span>
                <div className="quiz-options cardinality-options">
                  {question.options.map(option => (
                    <button
                      type="button"
                      key={option}
                      className={`quiz-option ${chosen === option ? (isCorrect ? 'quiz-option-ok' : 'quiz-option-bad') : ''}`}
                      onClick={() => onAnswer(question.id, option)}
                    >
                      <code>{option}</code>
                    </button>
                  ))}
                </div>
                <span className="cardinality-entity">{question.right}</span>
              </div>
              {chosen && (
                <p className={`concept-feedback ${isCorrect ? 'concept-feedback-ok' : 'concept-feedback-bad'}`}>
                  {isCorrect ? '✓ ' : '✗ '}
                  {question.why}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function DeliverableStage({ diagramUrl, setDiagramUrl, kpis, setKpis, reflection, setReflection, disabled }) {
  return (
    <Card className="practice-card">
      <div className="practice-card-heading">
        <PracticeIcon name="edit" />
        <span>Diagrama y KPIs del equipo</span>
      </div>
      <Paragraph className="stage-intro">
        Un KPI sirve solo si el modelo puede calcularlo. Antes de escribirlo, preguntate: ¿de qué tabla sale el numerador? ¿y el denominador?
      </Paragraph>

      <label className="practice-field">
        <span>Enlace al diagrama MER en ERDPlus</span>
        <Input disabled={disabled} placeholder="https://erdplus.com/edit-diagram/..." value={diagramUrl} onChange={event => setDiagramUrl(event.target.value)} />
      </label>

      <label className="practice-field">
        <span>2 KPIs por integrante — nombre, objetivo y fórmula</span>
        <TextArea
          disabled={disabled}
          rows={7}
          placeholder={'Ej.\nKPI: Ingreso promedio por día de feria\nObjetivo: saber qué jornadas conviene reforzar.\nFórmula: SUM(entrada.precio) / COUNT(DISTINCT dia_feria.id_dia)'}
          value={kpis}
          onChange={event => setKpis(event.target.value)}
        />
      </label>

      <label className="practice-field">
        <span>¿Qué decisión de modelado les costó más y por qué?</span>
        <TextArea disabled={disabled} rows={4} value={reflection} onChange={event => setReflection(event.target.value)} />
      </label>
    </Card>
  )
}

export function ScoreBar({ label, value, total }) {
  const percent = total === 0 ? 0 : Math.round((value / total) * 100)

  return (
    <div className="score-bar">
      <div className="score-bar-head">
        <span>{label}</span>
        <strong>{value} / {total}</strong>
      </div>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
