import { Button, Card, Tag, Typography } from 'antd'
import { motion } from 'framer-motion'
import { useState } from 'react'
import PracticeIcon from './PracticeIcon.jsx'
import { submitPractice } from '../lib/api.js'
import { useUsuario } from '../auth/sesion.jsx'

const { Title, Paragraph } = Typography

/**
 * Estado de envío compartido por las prácticas. Centraliza el contrato con el
 * backend para que cada playground solo se preocupe por armar sus respuestas.
 *
 * Ya no pide el nombre: la entrega sale firmada por la sesión. Antes el alumno
 * lo escribía a mano en cada práctica, y eso hacía dos daños a la vez —cualquiera
 * podía entregar en nombre de otro, y el mismo alumno aparecía varias veces en
 * el panorama según cómo hubiera escrito su nombre ese día.
 */
export function usePracticeSubmit({ practiceId, onDelivered }) {
  const [state, setState] = useState({ status: 'idle', message: '' })

  async function send(buildAnswers) {
    const validation = buildAnswers()
    if (validation.error) {
      setState({ status: 'error', message: validation.error })
      return
    }

    setState({ status: 'loading', message: '' })

    try {
      await submitPractice({ practiceId, answers: validation.answers })
      setState({ status: 'success', message: 'Práctica enviada correctamente.' })
      onDelivered()
    } catch (error) {
      setState({ status: 'error', message: error.message ?? 'No se pudo enviar la práctica.' })
    }
  }

  return { state, setState, send }
}

/** Con qué cuenta se va a firmar la entrega. */
export function FirmaEntrega() {
  const usuario = useUsuario()
  if (!usuario) return null

  return (
    <p className="entrega-firma">
      Se entrega a nombre de <strong>{usuario.nombre}</strong> <span>({usuario.correo})</span>
    </p>
  )
}

export function PracticeHero({ practiceLabel, title, description, objectives }) {
  return (
    <section className="practice-hero">
      <div className="practice-hero-content">
        <Tag color="blue">{practiceLabel}</Tag>
        <Title className="practice-title">{title}</Title>
        {description && <Paragraph className="practice-copy">{description}</Paragraph>}
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
  const { state, send } = submit.controls

  return (
    <Card className="practice-card submit-card">
      <div className="practice-card-heading">
        <PracticeIcon name="send" />
        <span>Entrega</span>
      </div>
      {hint && <Paragraph className="submit-hint">{hint}</Paragraph>}
      <FirmaEntrega />
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

/**
 * Entrega compacta, pensada para vivir DENTRO de la tarjeta de trabajo:
 * una línea divisoria, el nombre y el botón. Evita una tarjeta aparte que
 * empujaba la página fuera de pantalla.
 */
export function InlineSubmit({ delivered, submit, hint }) {
  const { state, send } = submit.controls

  return (
    <div className="inline-submit">
      <div className="inline-submit-row">
        <div className="inline-submit-field">
          <FirmaEntrega />
        </div>
        <Button
          type="primary"
          size="large"
          className="inline-submit-button"
          disabled={delivered}
          loading={state.status === 'loading'}
          onClick={() => send(submit.buildAnswers)}
        >
          <PracticeIcon name={delivered ? 'check' : 'send'} />
          {delivered ? 'Entregada' : 'Enviar práctica'}
        </Button>
      </div>
      {state.message
        ? <p className={`practice-submit-message practice-submit-message-${state.status}`}>{state.message}</p>
        : hint && <p className="inline-submit-hint">{hint}</p>}
    </div>
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
