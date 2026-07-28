import { Button, Card, Input, Tag, Typography } from 'antd'
import { motion } from 'framer-motion'
import { useState } from 'react'
import PracticeIcon from './PracticeIcon.jsx'
import { submitPractice } from '../lib/api.js'

const { Title, Paragraph } = Typography

/**
 * Estado de envío compartido por las prácticas. Centraliza el contrato con el
 * backend para que cada playground solo se preocupe por armar sus respuestas.
 */
export function usePracticeSubmit({ practiceId, onDelivered }) {
  const [studentId, setStudentId] = useState('')
  const [state, setState] = useState({ status: 'idle', message: '' })

  async function send(buildAnswers) {
    if (!studentId.trim()) {
      setState({ status: 'error', message: 'Escribí tu nombre o código de estudiante.' })
      return
    }

    const validation = buildAnswers()
    if (validation.error) {
      setState({ status: 'error', message: validation.error })
      return
    }

    setState({ status: 'loading', message: '' })

    try {
      await submitPractice({ practiceId, studentIdentifier: studentId, answers: validation.answers })
      setState({ status: 'success', message: 'Práctica enviada correctamente.' })
      onDelivered()
    } catch (error) {
      setState({ status: 'error', message: error.message ?? 'No se pudo enviar la práctica.' })
    }
  }

  return { studentId, setStudentId, state, setState, send }
}

export function PracticeHero({ practiceLabel, title, description, objectives }) {
  return (
    <section className="practice-hero">
      <div className="practice-hero-content">
        <Tag color="blue">{practiceLabel}</Tag>
        <Title className="practice-title">{title}</Title>
        <Paragraph className="practice-copy">{description}</Paragraph>
      </div>
      <div className="practice-objectives-panel">
        <span className="practice-panel-label">Objetivos</span>
        <div className="practice-objective-list">
          {objectives.map(item => (
            <div className="practice-objective" key={item}>
              <PracticeIcon name="target" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * Barra de etapas. Marca completadas para que el alumno vea el avance real
 * en vez de un formulario largo sin retroalimentación.
 */
export function StageTracker({ stages, activeStage, onSelect }) {
  return (
    <nav className="stage-tracker">
      {stages.map((stage, index) => (
        <button
          type="button"
          key={stage.id}
          className={[
            'stage-chip',
            index === activeStage ? 'stage-chip-active' : '',
            stage.complete ? 'stage-chip-complete' : '',
          ].join(' ').trim()}
          onClick={() => onSelect(index)}
        >
          <span className="stage-chip-index">{stage.complete ? '✓' : index + 1}</span>
          <span className="stage-chip-label">{stage.label}</span>
        </button>
      ))}
    </nav>
  )
}

export function SubmitCard({ delivered, submit, hint }) {
  const { studentId, setStudentId, state, send } = submit.controls
  const disabled = delivered || state.status === 'loading'

  return (
    <Card className="practice-card submit-card">
      <div className="practice-card-heading">
        <PracticeIcon name="send" />
        <span>Entrega</span>
      </div>
      {hint && <Paragraph className="submit-hint">{hint}</Paragraph>}
      <label className="practice-field">
        <span>Nombre completo o código de estudiante</span>
        <Input disabled={disabled} value={studentId} onChange={event => setStudentId(event.target.value)} />
      </label>
      <Button
        type="primary"
        size="large"
        className="submit-practice-button"
        disabled={delivered}
        loading={state.status === 'loading'}
        onClick={() => send(submit.buildAnswers)}
      >
        <PracticeIcon name={delivered ? 'check' : 'send'} />
        {delivered ? 'Práctica entregada' : 'Enviar práctica'}
      </Button>
      {state.message && (
        <p className={`practice-submit-message practice-submit-message-${state.status}`}>{state.message}</p>
      )}
    </Card>
  )
}

export function PracticeLayout({ children }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="practice-playground"
    >
      {children}
    </motion.main>
  )
}
