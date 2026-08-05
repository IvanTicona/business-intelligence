import { Card, Input, Tag, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import PracticeIcon from './PracticeIcon.jsx'
import { ejecutarConsulta } from '../lib/api.js'
import SqlWorkbench from './SqlWorkbench.jsx'
import StarCanvas from './StarCanvas.jsx'
import { InlineSubmit, PracticeLayout, StageTracker, usePracticeSubmit } from './PracticeShell.jsx'

import {
  businessGoals,
  dimensionOptions,
  grainOptions,
  kpiChallenges,
  metricOptions,
  oltpTables,
} from './data/spaziogym.js'

const BASE = 'spaziogym'
const { Paragraph } = Typography
const { TextArea } = Input

const objectives = [
  'Elegir el grain del hecho, la decisión que condiciona todo lo demás.',
  'Separar métricas aditivas de atributos disfrazados de métrica.',
  'Armar una estrella única que responda los 5 KPIs.',
  'Escribir SQL sobre la estrella y comparar el esfuerzo contra el OLTP.',
]

export default function PracticeFour({ delivered, onDelivered }) {
  const [db, setDb] = useState(null)
  const [dbError, setDbError] = useState('')
  const [stage, setStage] = useState(0)
  const [grain, setGrain] = useState('')
  const [metrics, setMetrics] = useState({})
  const [dimensions, setDimensions] = useState({})
  // Editor vacío a propósito: el esqueleto resolvía medio KPI.
  const [queries, setQueries] = useState(() =>
    Object.fromEntries(kpiChallenges.map(kpi => [kpi.id, ''])),
  )
  const [solved, setSolved] = useState({})
  const [ownKpi, setOwnKpi] = useState('')
  const [ownQuery, setOwnQuery] = useState('')
  const [reflection, setReflection] = useState('')

  /*
   * La base ya no se arma en el navegador: vive en el servidor, sembrada una
   * vez para todo el curso. Solo se comprueba que responda, para avisar si el
   * alumno se quedó sin conexión antes de que se pelee con la consola.
   */
  useEffect(() => {
    let cancelled = false

    ejecutarConsulta({ base: BASE, sql: 'SELECT 1' })
      .then(() => { if (!cancelled) setDb(true) })
      .catch(() => {
        if (!cancelled) setDbError('No se pudo conectar con la base del curso. Revisa tu conexión.')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const metricScore = useMemo(() => scoreSelection(metricOptions, metrics), [metrics])
  const dimensionScore = useMemo(() => scoreSelection(dimensionOptions, dimensions), [dimensions])
  const solvedKpis = useMemo(() => Object.values(solved).filter(Boolean).length, [solved])
  const grainIsCorrect = grainOptions.find(option => option.id === grain)?.correct === true

  const stages = [
    { id: 'grain', label: 'Grain', complete: Boolean(grain) },
    { id: 'metricas', label: 'Métricas', complete: metricScore.decided },
    { id: 'dimensiones', label: 'Dims', complete: dimensionScore.decided },
    ...kpiChallenges.map((kpi, index) => ({
      id: kpi.id,
      label: `KPI ${index + 1}`,
      complete: Boolean(solved[kpi.id]),
    })),
    { id: 'propio', label: 'Propio', complete: Boolean(ownKpi.trim()) },
  ]

  const submit = {
    controls: usePracticeSubmit({ practiceId: 'practice-4', onDelivered }),
    buildAnswers() {
      if (!grain) return { error: 'Elige el grain del hecho antes de enviar.' }
      if (!metricScore.decided) return { error: 'Marca qué columnas del pool son métricas del hecho.' }
      if (!dimensionScore.decided) return { error: 'Marca qué tablas del pool son dimensiones de la estrella.' }
      if (solvedKpis < 3) return { error: `Resuelve al menos 3 de los ${kpiChallenges.length} KPIs en SQL. Llevas ${solvedKpis}.` }
      if (!ownKpi.trim()) return { error: 'Define tu quinto KPI (nombre, objetivo y fórmula).' }
      if (!reflection.trim()) return { error: 'Completa la reflexión final.' }

      const chosenGrain = grainOptions.find(option => option.id === grain)

      return {
        answers: {
          grain: `${chosenGrain.label} ${chosenGrain.correct ? '[correcto]' : '[incorrecto]'}`,
          factDesign: [
            `Métricas elegidas: ${listSelected(metricOptions, metrics)} (${metricScore.hits}/${metricScore.totalCorrect} correctas, ${metricScore.falsePositives} de más)`,
            `Dimensiones elegidas: ${listSelected(dimensionOptions, dimensions)} (${dimensionScore.hits}/${dimensionScore.totalCorrect} correctas, ${dimensionScore.falsePositives} de más)`,
          ].join('\n'),
          kpiDefinitions: `KPI propio:\n${ownKpi.trim()}`,
          kpiQueries: [
            ...kpiChallenges.map(kpi => `-- ${kpi.name} (${solved[kpi.id] ? 'OK' : 'sin resolver'})\n${queries[kpi.id]}`),
            `-- KPI propio\n${ownQuery.trim()}`,
          ].join('\n\n'),
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

  const kpiIndex = stage - 3
  const activeKpi = kpiIndex >= 0 && kpiIndex < kpiChallenges.length ? kpiChallenges[kpiIndex] : null

  return (
    <PracticeLayout>
      {/* Misma distribución que las prácticas 1, 2 y 3. */}
      <section className="practice-grid practice-grid-schema">
        <div className="wizard-column">
          <Card className="practice-card wizard-card">
            <header className="wizard-card-head">
              <div className="wizard-card-titles">
                <Tag color="blue">Práctica 4</Tag>
                <h2 className="wizard-card-title">De OLTP a OLAP: el data mart en estrella de SpazioGym</h2>
              </div>
              <div className="wizard-card-goals">
                <span className="practice-panel-label">Objetivos</span>
                <ul className="wizard-card-objectives">
                  {objectives.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </header>

            <StageTracker stages={stages} activeStage={stage} onSelect={setStage} />

            {/* Las metas y el OLTP son el contexto de las tres etapas de
                diseño; en las de SQL ya no hacen falta y ceden el alto. */}
            {stage <= 2 && (
              <section className="stage-block goals-block">
                <div className="practice-card-heading">
                  <PracticeIcon name="target" />
                  <span>Metas del negocio</span>
                </div>
                <ul className="wizard-card-objectives">
                  {businessGoals.map(goal => <li key={goal}>{goal}</li>)}
                </ul>
                <details className="practice-hint">
                  <summary>Ver el modelo OLTP de origen</summary>
                  <div className="oltp-list">
                    {oltpTables.map(t => (
                      <div key={t.table}>
                        <strong>{t.table}</strong>
                        <span>{t.columns.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </details>
              </section>
            )}

          {stage === 0 && (
            <section className="stage-block">
              <div className="practice-card-heading">
                <PracticeIcon name="ruler" />
                <span>Paso 1: Definir el grain</span>
              </div>
              <Paragraph className="stage-intro">
                El grain responde una sola pregunta: <strong>¿qué representa exactamente una fila de la tabla de hechos?</strong> Se define ANTES de elegir métricas y dimensiones. Si te equivocas aquí, todo lo demás se cae, por más prolijo que lo hagas.
              </Paragraph>
              <div className="option-stack">
                {grainOptions.map(option => {
                  const chosen = grain === option.id

                  return (
                    <button
                      type="button"
                      key={option.id}
                      className={`option-row ${chosen ? (option.correct ? 'option-row-ok' : 'option-row-bad') : ''}`}
                      onClick={() => setGrain(option.id)}
                      disabled={delivered}
                    >
                      <span className="option-label">{option.label}</span>
                      {chosen && <span className="option-why">{option.correct ? '✓ ' : '✗ '}{option.why}</span>}
                    </button>
                  )
                })}
              </div>
              {grain && !grainIsCorrect && (
                <p className="stage-warning">
                  Puedes seguir, pero ojo: las etapas siguientes asumen el grain de reserva. Vuelve a leer las metas de negocio de arriba.
                </p>
              )}
            </section>
          )}

          {stage === 1 && (
            <SelectionStage
              icon="star"
              heading="Paso 2: Métricas del hecho"
              intro="Una métrica vive en el hecho solo si es ADITIVA en el grain elegido: si sumarla por cualquier corte da un número con sentido. Marca las que correspondan; hay trampas."
              options={metricOptions}
              selection={metrics}
              onToggle={id => setMetrics(current => toggle(current, id))}
              score={metricScore}
              disabled={delivered}
            />
          )}

          {stage === 2 && (
            <SelectionStage
              icon="layers"
              heading="Paso 3: Dimensiones de la estrella"
              intro="Las dimensiones son los ejes por los que vas a cortar las métricas: el «por qué», «quién», «cuándo» y «dónde». Marca las que tengan sentido en esta estrella."
              options={dimensionOptions}
              selection={dimensions}
              onToggle={id => setDimensions(current => toggle(current, id))}
              score={dimensionScore}
              disabled={delivered}
            />
          )}

          {activeKpi && (
            <section className="stage-block">
              {!db ? (
                <Paragraph className="stage-intro">Iniciando el motor SQL…</Paragraph>
              ) : (
                <>
                  <div className="practice-card-heading">
                    <PracticeIcon name="database" />
                    <span>{activeKpi.name}</span>
                    <Tag className="concept-tag">KPI {kpiIndex + 1}</Tag>
                  </div>
                  <div className="kpi-meta">
                    <div>
                      <strong>Objetivo</strong>
                      <p>{activeKpi.goal}</p>
                    </div>
                    <div>
                      <strong>Fórmula</strong>
                      <p><code>{activeKpi.formula}</code></p>
                    </div>
                  </div>
                  <Paragraph className="stage-intro">{activeKpi.prompt}</Paragraph>
                  <details className="practice-hint">
                    <summary>Ver pista</summary>
                    <p>{activeKpi.hint}</p>
                  </details>
                  {/* `key` por KPI: al cambiar de etapa el workbench se remonta
                      y el resultado anterior no queda colgado. */}
                  <SqlWorkbench
                    key={activeKpi.id}
                    base="spaziogym"
                    value={queries[activeKpi.id]}
                    onChange={value => setQueries(current => ({ ...current, [activeKpi.id]: value }))}
                    reto={`p4-${activeKpi.id}`}
                    onSolved={() => setSolved(current => ({ ...current, [activeKpi.id]: true }))}
                    disabled={delivered}
                  />
                </>
              )}
            </section>
          )}

          {stage === stages.length - 1 && (
            <section className="stage-block">
              <div className="practice-card-heading">
                <PracticeIcon name="spark" />
                <span>Paso 5: Tu quinto KPI</span>
              </div>
              <Paragraph className="stage-intro">
                El Proyecto Final pide 5 KPIs sobre una estrella única. Cuatro ya los escribiste. El quinto lo defines tú: tiene que responderse con esta misma estrella, sin agregar tablas.
              </Paragraph>
              <label className="practice-field">
                <span>Nombre, objetivo y fórmula del KPI</span>
                <TextArea
                  disabled={delivered}
                  rows={5}
                  placeholder={'Nombre: Tasa de asistencia por segmento de edad\nObjetivo: saber qué franja etaria aprovecha más la membresía.\nFórmula: SUM(asistio) / SUM(cantidad_reserva) por dim_socio.segmento_edad'}
                  value={ownKpi}
                  onChange={event => setOwnKpi(event.target.value)}
                />
              </label>
              {db && <SqlWorkbench base="spaziogym" value={ownQuery} onChange={setOwnQuery} disabled={delivered} rows={8} />}
              <label className="practice-field">
                <span>¿Cuántos JOINs te habría costado este mismo KPI sobre el OLTP? ¿Qué ganaste con la estrella?</span>
                <TextArea disabled={delivered} rows={4} value={reflection} onChange={event => setReflection(event.target.value)} />
              </label>
            </section>
          )}

            <InlineSubmit
              delivered={delivered}
              submit={submit}
              hint="Se envía tu diseño de estrella junto a las consultas de los KPIs."
            />
          </Card>
        </div>

        <aside className="schema-column">
          <StarCanvas grain={grain} metrics={metrics} dimensions={dimensions} />
        </aside>
      </section>
    </PracticeLayout>
  )
}

function SelectionStage({ icon, heading, intro, options, selection, onToggle, score, disabled }) {
  return (
    <Card className="practice-card">
      <div className="practice-card-heading">
        <PracticeIcon name={icon} />
        <span>{heading}</span>
      </div>
      <Paragraph className="stage-intro">{intro}</Paragraph>
      {score.falsePositives > 0 && (
        <p className="stage-warning">
          Marcaste {score.falsePositives} opción(es) que no corresponden. Lee la explicación en rojo: ahí está el concepto.
        </p>
      )}

      <div className="option-stack">
        {options.map(option => {
          const chosen = Boolean(selection[option.id])
          const tone = chosen ? (option.correct ? 'option-row-ok' : 'option-row-bad') : ''

          return (
            <button type="button" key={option.id} className={`option-row ${tone}`} onClick={() => onToggle(option.id)} disabled={disabled}>
              <span className="option-label">
                <span className={`option-check ${chosen ? 'option-check-on' : ''}`}>{chosen ? '✓' : ''}</span>
                <code>{option.label}</code>
              </span>
              {chosen && <span className="option-why">{option.correct ? '✓ ' : '✗ '}{option.why}</span>}
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function toggle(current, id) {
  const next = { ...current }
  if (next[id]) delete next[id]
  else next[id] = true
  return next
}

/**
 * Marcar todas las opciones no debe dar puntaje perfecto: contamos aciertos
 * y falsos positivos por separado, y la etapa se considera resuelta solo
 * cuando encontró todas las correctas sin sobrantes.
 */
function scoreSelection(options, selection) {
  const totalCorrect = options.filter(option => option.correct).length
  const hits = options.filter(option => option.correct && selection[option.id]).length
  const falsePositives = options.filter(option => !option.correct && selection[option.id]).length

  return { hits, totalCorrect, falsePositives, decided: hits === totalCorrect && falsePositives === 0 }
}

function listSelected(options, selection) {
  const chosen = options.filter(option => selection[option.id]).map(option => option.label)
  return chosen.length > 0 ? chosen.join(', ') : '(ninguna)'
}
