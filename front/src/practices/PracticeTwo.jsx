import { Card, Input, Tag, Typography } from 'antd'
import { useMemo, useState } from 'react'
import PracticeIcon from './PracticeIcon.jsx'
import MerCanvas from './MerCanvas.jsx'
import {
  InlineSubmit,
  PracticeLayout,
  StageTracker,
  usePracticeSubmit,
  EntregaHecha,
} from './PracticeShell.jsx'
import {
  cardinalityQuestions,
  conceptCards,
  primaryKeyQuestions,
} from './data/expocruz.js'

const CAMPOS_ENTREGA = [
  { key: 'classificationScore', label: 'Entidades y atributos' },
  { key: 'primaryKeys', label: 'Claves primarias' },
  { key: 'cardinalities', label: 'Cardinalidades' },
  { key: 'kpis', label: 'KPIs propuestos' },
  { key: 'reflection', label: 'Reflexión' },
]

const { Paragraph } = Typography
const { TextArea } = Input

const objectives = [
  'Distinguir entidades de atributos con criterio, no de memoria.',
  'Elegir claves primarias que no se rompan con el tiempo.',
  'Traducir reglas de negocio a cardinalidades.',
  'Escribir KPIs que el modelo pueda responder de verdad.',
]

export default function PracticeTwo({ delivered, onDelivered, entrega }) {
  const [stage, setStage] = useState(0)
  const [classifications, setClassifications] = useState({})
  const [pkAnswers, setPkAnswers] = useState({})
  const [cardAnswers, setCardAnswers] = useState({})
  const [kpis, setKpis] = useState('')
  const [reflection, setReflection] = useState('')

  const classificationScore = useMemo(
    () => conceptCards.filter(card => classifications[card.id] === card.answer).length,
    [classifications],
  )

  const stages = [
    { id: 'clasificar', label: 'Entidad o atributo', complete: Object.keys(classifications).length === conceptCards.length },
    { id: 'claves', label: 'Claves primarias', complete: Object.keys(pkAnswers).length === primaryKeyQuestions.length },
    { id: 'cardinalidad', label: 'Cardinalidades', complete: Object.keys(cardAnswers).length === cardinalityQuestions.length },
    { id: 'kpis', label: 'KPIs', complete: Boolean(kpis.trim()) },
  ]

  const submit = {
    controls: usePracticeSubmit({ practiceId: 'practice-2', onDelivered }),
    buildAnswers() {
      if (!stages[0].complete) return { error: 'Clasifica los 17 conceptos antes de enviar.' }
      if (!stages[1].complete) return { error: 'Responde las 4 preguntas de claves primarias.' }
      if (!stages[2].complete) return { error: 'Define las 5 cardinalidades.' }
      if (!kpis.trim()) return { error: 'Escribe al menos 2 KPIs.' }
      if (!reflection.trim()) return { error: 'Completa la reflexión final.' }

      return {
        answers: {
          classificationScore: `${classificationScore}/${conceptCards.length} conceptos correctos`,
          primaryKeys: primaryKeyQuestions
            .map(q => {
              const chosen = q.options.find(o => o.id === pkAnswers[q.id])
              return `${q.entity}: ${chosen?.label ?? 'sin responder'} ${chosen?.correct ? '[correcta]' : '[incorrecta]'}`
            })
            .join(' | '),
          cardinalities: cardinalityQuestions
            .map(q => `${q.left}→${q.right}: ${cardAnswers[q.id]} ${cardAnswers[q.id] === q.answer ? '[correcta]' : '[incorrecta]'}`)
            .join(' | '),
          kpis: kpis.trim(),
          reflection: reflection.trim(),
        },
      }
    },
  }

  return (
    <PracticeLayout>
      <EntregaHecha entrega={entrega} campos={CAMPOS_ENTREGA} />
      {/* Mismo esqueleto que la Práctica 3: dos contenedores, titulo dentro de
          la tarjeta de trabajo y el diagrama fijo a la derecha. */}
      <section className="practice-grid practice-grid-schema practice-grid-mer">
        <div className="wizard-column">
          <Card className="practice-card wizard-card">
            <header className="wizard-card-head">
              <div className="wizard-card-titles">
                <Tag color="blue">Práctica 2</Tag>
                <h2 className="wizard-card-title">Del caso ExpoCruz al Modelo Entidad-Relación</h2>
              </div>
              <div className="wizard-card-goals">
                <span className="practice-panel-label">Objetivos</span>
                <ul className="wizard-card-objectives">
                  {objectives.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </header>

            <StageTracker stages={stages} activeStage={stage} onSelect={setStage} />

            {stage === 0 && (
            <ClassificationStage
              classifications={classifications}
              onClassify={(id, value) => setClassifications(current => ({ ...current, [id]: value }))}
            />
          )}
            {stage === 1 && (
            <QuizStage
              heading="Elige la clave primaria"
              intro="Una PK mala no se nota el primer día. Se nota dos años después, cuando cambiarla implica tocar quince tablas."
              questions={primaryKeyQuestions.map(q => ({
                id: q.id,
                title: q.entity,
                options: q.options.map(o => ({ id: o.id, label: o.label, correct: o.correct, why: o.why })),
              }))}
              answers={pkAnswers}
              onAnswer={(questionId, optionId) => setPkAnswers(current => ({ ...current, [questionId]: optionId }))}
            />
          )}
            {stage === 2 && (
            <CardinalityStage
              answers={cardAnswers}
              onAnswer={(id, value) => setCardAnswers(current => ({ ...current, [id]: value }))}
            />
          )}
            {stage === 3 && (
              <DeliverableStage
                kpis={kpis}
                setKpis={setKpis}
                reflection={reflection}
                setReflection={setReflection}
                disabled={delivered}
              />
            )}

            <InlineSubmit
              delivered={delivered}
              submit={submit}
              hint="Se guarda tu puntaje por etapa junto a los KPIs. El diagrama queda reflejado en esas respuestas."
            />
          </Card>
        </div>

        <aside className="schema-column">
          <MerCanvas classifications={classifications} pkAnswers={pkAnswers} cardAnswers={cardAnswers} />
        </aside>
      </section>
    </PracticeLayout>
  )
}

function ClassificationStage({ classifications, onClassify }) {
  return (
    <section className="stage-block">
      <div className="practice-card-heading">
        <PracticeIcon name="ruler" />
        <span>¿Entidad o atributo?</span>
      </div>
      <Paragraph className="stage-intro">
        La pregunta que decide: <strong>¿esto tiene identidad propia y vida independiente, o solo describe a otra cosa?</strong> Clasifica los {conceptCards.length} conceptos del caso. Verás la explicación al instante.
      </Paragraph>

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
    </section>
  )
}

function QuizStage({ heading, intro, questions, answers, onAnswer }) {
  return (
    <section className="stage-block">
      <div className="practice-card-heading">
        <PracticeIcon name="brain" />
        <span>{heading}</span>
      </div>
      <Paragraph className="stage-intro">{intro}</Paragraph>

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
    </section>
  )
}

function CardinalityStage({ answers, onAnswer }) {
  return (
    <section className="stage-block">
      <div className="practice-card-heading">
        <PracticeIcon name="layers" />
        <span>Reglas de negocio → cardinalidades</span>
      </div>
      <Paragraph className="stage-intro">
        Cada regla escrita en castellano tiene una única traducción correcta al modelo. Lee la regla completa antes de responder: la trampa suele estar en el lado que <em>no</em> te mencionan.
      </Paragraph>

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
    </section>
  )
}

function DeliverableStage({ kpis, setKpis, reflection, setReflection, disabled }) {
  return (
    <section className="stage-block">
      <div className="practice-card-heading">
        <PracticeIcon name="edit" />
        <span>KPIs propuestos</span>
      </div>
      <Paragraph className="stage-intro">
        Mira el diagrama que armaste arriba: un KPI sirve solo si ese modelo puede calcularlo. Antes de escribirlo, pregúntate de qué entidad sale el numerador y de cuál el denominador.
      </Paragraph>

      <label className="practice-field">
        <span>2 KPIs: nombre, objetivo y fórmula</span>
        <TextArea
          disabled={disabled}
          rows={7}
          placeholder={'Ej.\nKPI: Ingreso promedio por día de feria\nObjetivo: saber qué jornadas conviene reforzar.\nFórmula: SUM(entrada.precio) / COUNT(DISTINCT dia_feria.id_dia)'}
          value={kpis}
          onChange={event => setKpis(event.target.value)}
        />
      </label>

      <label className="practice-field">
        <span>¿Qué decisión de modelado te costó más y por qué?</span>
        <TextArea disabled={disabled} rows={4} value={reflection} onChange={event => setReflection(event.target.value)} />
      </label>
    </section>
  )
}

