import { Card, Input, Tag, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import PracticeIcon from './PracticeIcon.jsx'
import SqlWorkbench, { SchemaExplorer } from './SqlWorkbench.jsx'
import { PracticeHero, PracticeLayout, StageTracker, SubmitCard, usePracticeSubmit } from './PracticeShell.jsx'
import { ScoreBar } from './PracticeTwo.jsx'
import { createDatabase } from '../lib/sqlEngine.js'
import {
  businessGoals,
  dimensionOptions,
  grainOptions,
  kpiChallenges,
  metricOptions,
  oltpTables,
  spazioGymSeedSql,
  starSchema,
} from './data/spaziogym.js'

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
  const [queries, setQueries] = useState(() =>
    Object.fromEntries(kpiChallenges.map(kpi => [kpi.id, kpi.starter])),
  )
  const [solved, setSolved] = useState({})
  const [ownKpi, setOwnKpi] = useState('')
  const [ownQuery, setOwnQuery] = useState('SELECT * FROM hecho_reserva LIMIT 10;')
  const [reflection, setReflection] = useState('')

  useEffect(() => {
    let cancelled = false

    createDatabase(spazioGymSeedSql)
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

  const metricScore = useMemo(() => scoreSelection(metricOptions, metrics), [metrics])
  const dimensionScore = useMemo(() => scoreSelection(dimensionOptions, dimensions), [dimensions])
  const solvedKpis = useMemo(() => Object.values(solved).filter(Boolean).length, [solved])
  const grainIsCorrect = grainOptions.find(option => option.id === grain)?.correct === true

  const stages = [
    { id: 'grain', label: 'Grain', complete: Boolean(grain) },
    { id: 'metricas', label: 'Métricas', complete: metricScore.decided },
    { id: 'dimensiones', label: 'Dimensiones', complete: dimensionScore.decided },
    ...kpiChallenges.map((kpi, index) => ({
      id: kpi.id,
      label: `KPI ${index + 1}`,
      complete: Boolean(solved[kpi.id]),
    })),
    { id: 'propio', label: 'KPI propio', complete: Boolean(ownKpi.trim()) },
  ]

  const submit = {
    controls: usePracticeSubmit({ practiceId: 'practice-4', onDelivered }),
    buildAnswers() {
      if (!grain) return { error: 'Elegí el grain del hecho antes de enviar.' }
      if (!metricScore.decided) return { error: 'Marcá qué columnas del pool son métricas del hecho.' }
      if (!dimensionScore.decided) return { error: 'Marcá qué tablas del pool son dimensiones de la estrella.' }
      if (solvedKpis < 3) return { error: `Resolvé al menos 3 de los ${kpiChallenges.length} KPIs en SQL. Llevás ${solvedKpis}.` }
      if (!ownKpi.trim()) return { error: 'Definí tu quinto KPI (nombre, objetivo y fórmula).' }
      if (!reflection.trim()) return { error: 'Completá la reflexión final.' }

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
      <PracticeHero
        practiceLabel="Práctica 4"
        title="De OLTP a OLAP: el data mart en estrella de SpazioGym"
        description="El modelo transaccional ya existe y funciona. El problema es que responder una pregunta de negocio ahí adentro cuesta cinco JOINs. Vamos a diseñar una estrella única que las responda todas."
        objectives={objectives}
      />

      <StageTracker stages={stages} activeStage={stage} onSelect={setStage} />

      <section className="practice-grid">
        <div className="practice-workspace">
          {stage === 0 && (
            <Card className="practice-card">
              <div className="practice-card-heading">
                <PracticeIcon name="ruler" />
                <span>Paso 1 — Definir el grain</span>
              </div>
              <Paragraph className="stage-intro">
                El grain responde una sola pregunta: <strong>¿qué representa exactamente una fila de la tabla de hechos?</strong> Se define ANTES de elegir métricas y dimensiones. Si te equivocás acá, todo lo demás se cae, por más prolijo que lo hagas.
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
                  Podés seguir, pero ojo: las etapas siguientes asumen el grain de reserva. Volvé a leer las metas de negocio del panel derecho.
                </p>
              )}
            </Card>
          )}

          {stage === 1 && (
            <SelectionStage
              icon="star"
              heading="Paso 2 — Métricas del hecho"
              intro="Una métrica vive en el hecho solo si es ADITIVA en el grain elegido: si sumarla por cualquier corte da un número con sentido. Marcá las que correspondan; hay trampas."
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
              heading="Paso 3 — Dimensiones de la estrella"
              intro="Las dimensiones son los ejes por los que vas a cortar las métricas: el «por qué», «quién», «cuándo» y «dónde». Marcá las que tengan sentido en esta estrella."
              options={dimensionOptions}
              selection={dimensions}
              onToggle={id => setDimensions(current => toggle(current, id))}
              score={dimensionScore}
              disabled={delivered}
            />
          )}

          {activeKpi && (
            <Card className="practice-card">
              {!db ? (
                <Paragraph className="stage-intro">Iniciando el motor SQL…</Paragraph>
              ) : (
                <>
                  <div className="practice-card-heading">
                    <PracticeIcon name="database" />
                    <span>{activeKpi.name}</span>
                    <Tag className="concept-tag">KPI {kpiIndex + 1}</Tag>
                  </div>
                  <ScoreBar label="KPIs resueltos" value={solvedKpis} total={kpiChallenges.length} />
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
                  <SqlWorkbench
                    db={db}
                    value={queries[activeKpi.id]}
                    onChange={value => setQueries(current => ({ ...current, [activeKpi.id]: value }))}
                    expectedSql={activeKpi.expectedSql}
                    orderMatters={activeKpi.orderMatters}
                    onSolved={() => setSolved(current => ({ ...current, [activeKpi.id]: true }))}
                    disabled={delivered}
                  />
                </>
              )}
            </Card>
          )}

          {stage === stages.length - 1 && (
            <Card className="practice-card">
              <div className="practice-card-heading">
                <PracticeIcon name="spark" />
                <span>Paso 5 — Tu quinto KPI</span>
              </div>
              <Paragraph className="stage-intro">
                El Proyecto Final pide 5 KPIs sobre una estrella única. Cuatro ya los escribiste. El quinto lo definís vos: tiene que responderse con esta misma estrella, sin agregar tablas.
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
              {db && <SqlWorkbench db={db} value={ownQuery} onChange={setOwnQuery} disabled={delivered} rows={8} />}
              <label className="practice-field">
                <span>¿Cuántos JOINs te habría costado este mismo KPI sobre el OLTP? ¿Qué ganaste con la estrella?</span>
                <TextArea disabled={delivered} rows={4} value={reflection} onChange={event => setReflection(event.target.value)} />
              </label>
            </Card>
          )}
        </div>

        <aside className="practice-sidebar">
          <Card className="practice-card">
            <div className="practice-card-heading">
              <PracticeIcon name="target" />
              <span>Metas del negocio</span>
            </div>
            <div className="practice-objective-list">
              {businessGoals.map(goal => (
                <div className="practice-objective" key={goal}>
                  <PracticeIcon name="target" />
                  <span>{goal}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="practice-card">
            <div className="practice-card-heading">
              <PracticeIcon name="database" />
              <span>{stage >= 3 ? 'Estrella implementada' : 'Modelo OLTP de origen'}</span>
            </div>
            <Paragraph className="dataset-copy">
              {stage >= 3
                ? 'La estrella ya poblada con 103 reservas de 3 meses. Consultá acá los nombres exactos.'
                : 'Este es el transaccional que ya existe. Mirá cuántos saltos hay entre una reserva y el nombre de la sucursal.'}
            </Paragraph>
            <SchemaExplorer tables={stage >= 3 ? starSchema : oltpTables} title="" />
          </Card>

          <SubmitCard
            delivered={delivered}
            submit={submit}
            hint="Se envía tu diseño de estrella junto a las consultas de los KPIs."
          />
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
      <ScoreBar label="Correctas encontradas" value={score.hits} total={score.totalCorrect} />
      {score.falsePositives > 0 && (
        <p className="stage-warning">
          Marcaste {score.falsePositives} opción(es) que no corresponden. Leé la explicación en rojo: ahí está el concepto.
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
