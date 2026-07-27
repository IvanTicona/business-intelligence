import { Button, Card, Checkbox, Input, Layout, Menu, Tag, Typography } from 'antd'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'

const { Content, Sider } = Layout
const { Title, Paragraph } = Typography
const { TextArea } = Input

const theoryItems = [
  { key: 'chapter-1', label: 'Fuentes de Datos y Gestión Inteligente' },
  { key: 'chapter-2', label: 'Modelado de Datos' },
  { key: 'chapter-3', label: 'Diseño Conceptual' },
  { key: 'chapter-4', label: 'Modelo Relacional' },
  { key: 'chapter-5', label: 'Normalización' },
]

const practiceItems = [
  { key: 'practice-1', label: 'Práctica 1' },
  { key: 'practice-2', label: 'Práctica 2' },
  { key: 'practice-3', label: 'Práctica 3' },
  { key: 'practice-4', label: 'Práctica 4' },
]

const releaseSchedule = {
  'chapter-1': '2026-07-27',
  'practice-1': '2026-07-28',
  'chapter-2': '2026-07-29',
  'practice-2': '2026-07-30',
  'chapter-3': '2026-07-31',
  'chapter-4': '2026-08-03',
  'practice-3': '2026-08-04',
  'chapter-5': '2026-08-05',
  'practice-4': '2026-08-06',
}

const chapterOneSlides = [
  { type: 'cover', eyebrow: 'Capítulo 1', title: 'FUENTES DE DATOS Y GESTIÓN INTELIGENTE', text: '' },
  { type: 'question-image', title: '¿Qué veremos?', image: '/slide2.png', revealCount: 1 },
  {
    type: 'objectives',
    title: 'Objetivos',
    image: '/slide3.png',
    revealCount: 4,
    items: ['Modelado Conceptual (MER)', 'Modelado Relacional', 'SQL Práctico', 'De OLTP a BI'],
  },
  { type: 'title-image', title: 'PIPELINE BI', image: '/slide4.png', revealCount: 1 },
  { type: 'question-image', title: 'Introducción a las bases de datos', image: '/slide2.png', revealCount: 1 },
  {
    type: 'symbols',
    title: 'Símbolos',
    text: 'Es la representación de una idea de una forma gráfica, en la cual una persona puede dar su propia interpretación a partir de su percepción.',
    revealCount: 3,
    images: ['/slide6.1.png', '/slide6.2.png', '/slide6.3.png', '/slide6.4.png', '/slide6.5.jpg'],
  },
  {
    type: 'data-definition',
    title: 'Datos',
    image: '/slide7.png',
    revealCount: 2,
    text: 'Hechos conocidos que se pueden grabar y que tienen un',
    emphasis: 'SIGNIFICADO IMPLÍCITO',
    example: 'Elefante, 2 metros, 2 febrero de 2003,... etc.',
  },
  {
    type: 'text-image',
    title: '¿Qué es una base de datos?',
    text: 'Es una colección de datos relacionados',
    image: '/slide8.jpg',
    imageSide: 'right',
    revealCount: 2,
  },
  {
    type: 'text-image',
    title: 'Información',
    text: 'Es un conjunto de datos procesados',
    image: '/slide9.png',
    imageSide: 'left',
    revealCount: 2,
  },
  {
    type: 'text-image',
    title: 'Sistema de información',
    text: 'Es un conjunto de datos procesados que interactúan entre sí con un fin común.',
    image: '/slide10.png',
    imageSide: 'left',
    revealCount: 2,
  },
  {
    type: 'stacked-image',
    title: 'Base de datos',
    text: 'Colección de datos organizados sistemáticamente relacionados entre sí.',
    image: '/slide11.png',
    revealCount: 2,
  },
  {
    type: 'image-title',
    title: 'EVOLUCIÓN DE LAS BASES DE DATOS',
    image: '/slide12.png',
    revealCount: 1,
  },
  {
    id: 'timeline-overview',
    type: 'timeline-overview',
    title: 'EVOLUCIÓN DE LAS BASES DE DATOS',
    image: '/slide13.png',
  },
  {
    id: 'timeline-context',
    type: 'two-images',
    title: 'Ficheros',
    images: ['/slide14.1.jpg', '/slide14.2.jpg'],
  },
  {
    id: 'timeline-zoom',
    type: 'zoom-timeline',
    title: 'EVOLUCIÓN DE LAS BASES DE DATOS',
    image: '/slide13.png',
    focusPoints: [
      { scale: 130, x: '-23%', y: '42%', marker: { left: '12%', bottom: '4.5%', width: '34%', height: '18%', color: '#E11D48' } },
      { scale: 130, x: '42%', y: '42%', marker: { left: '22%', bottom: '4.5%', width: '38%', height: '18%', color: '#E11D48' } },
      { scale: 130, x: '96%', y: '42%', marker: { left: '34%', bottom: '4.5%', width: '40%', height: '18%', color: '#E11D48' } },
      { scale: 130, x: '136%', y: '42%', marker: { left: '51%', bottom: '4.5%', width: '36%', height: '18%', color: '#E11D48' } },
    ],
  },
  {
    id: 'hierarchical-databases',
    type: 'text-image',
    title: 'Base de datos jerárquicas',
    text: 'Modelo de BD que organiza los datos en una estructura tipo árbol, puede tener un único padre, pero sí varios hijos.',
    image: '/slide15.png',
    imageSide: 'left',
    revealCount: 2,
  },
  {
    id: 'nosql-databases',
    type: 'nosql-horizontal',
    title: 'Base de datos NO SQL',
    text: 'Son BD que permiten almacenar datos sin la necesidad de tener una relación fuerte.',
    images: ['/slide18.1.png', '/slide18.2.png'],
    revealCount: 3,
  },
  {
    id: 'graph-databases',
    type: 'text-image',
    title: 'Base de datos en grafos',
    text: 'BD NOSQL diseñadas para gestionar relaciones complejas entre datos de manera eficiente.',
    image: '/slide20.jpg',
    imageSide: 'left',
    revealCount: 2,
  },
  {
    id: 'relational-databases',
    type: 'title-image-static',
    title: 'Base de datos relacional',
    image: '/slide22.png',
  },
  {
    id: 'relational-components',
    type: 'relational-components',
    title: 'Componentes de BD relacional',
    items: ['Tablas', 'Atributos', 'Claves', 'Registros', 'Relaciones', 'Consultas'],
    image: '/slide22.png',
    revealCount: 7,
  },
  {
    id: 'dbms',
    type: 'dbms',
    title: 'Sistema de gestión de base de datos',
    text: 'Es un conjunto de programas que permiten la manipulación de datos de una base de datos.',
    emphasis: 'Creación, Modificación, Eliminación y extracción.',
    images: ['/slide24.1.png', '/slide24.2.png', '/slide24.3.png', '/slide24.4.png', '/slide24.5.png', '/slide24.6.png'],
    revealCount: 7,
  },
  {
    id: 'importance',
    type: 'importance',
    title: 'Importancia:',
    items: ['Seguridad', 'Recuperación', 'Integridad y consistencia', 'Diccionario de datos', 'Control de concurrencia'],
    revealCount: 5,
  },
]

const chapterTwoSlides = [
  { type: 'cover', eyebrow: 'Capítulo 2', title: 'MODELADO DE DATOS', text: '' },
  {
    type: 'objectives',
    title: 'Objetivos',
    image: '/slide3.png',
    revealCount: 5,
    items: [
      'Definir los sistemas de base de datos',
      'Uso de una metodología',
      'Etapas del ciclo de vida de un sistema de información',
      'Niveles de abstracción de datos',
      'Lenguaje ubicuo',
    ],
  },
  {
    type: 'side-title-image',
    title: 'Sistema de base de datos',
    image: '/slide30.png',
    imageSide: 'left',
    revealCount: 1,
  },
  {
    type: 'text-over-image',
    text: 'Es el conjunto de recursos para manejar grandes volúmenes de información.',
    image: '/slide31.png',
    revealCount: 2,
  },
  {
    type: 'side-title-image',
    title: '¿Ya estoy listo para diseñar mi base de datos?',
    image: '/slide8.jpg',
    imageSide: 'right',
    revealCount: 1,
  },
  {
    type: 'side-title-image',
    title: 'Sin una metodología',
    image: '/slide32.jpg',
    imageSide: 'right',
    revealCount: 1,
  },
  {
    type: 'side-title-image',
    title: 'Con metodología',
    image: '/slide33.jpg',
    imageSide: 'right',
    revealCount: 1,
  },
  {
    type: 'title-image-static',
    title: 'Ciclo de vida',
    image: '/slide34.png',
    imageClassName: 'cycle-slide-image',
  },
  {
    type: 'lifecycle-list',
    title: 'Ciclo de vida de sistemas de base de datos',
    revealCount: 7,
    items: [
      'Planificación del proyecto',
      'Definición del sistema',
      'Recolección y análisis de los requisitos',
      'Diseño de la base de datos',
      'Selección del SGBD',
      'Implementación',
      'Conversión y carga de datos',
    ],
  },
  {
    type: 'planning-resources',
    title: 'Planificación del proyecto',
    revealCount: 3,
    items: [
      { label: 'Tareas', image: '/slide35.1.png' },
      { label: 'Recurso humano', image: '/slide35.2.png' },
      { label: 'Recurso monetario', image: '/slide35.3.png' },
    ],
  },
  {
    type: 'title-image-static',
    title: 'Sistema',
    image: '/slide36.png',
    imageClassName: 'system-slide-image',
    revealCount: 1,
  },
  {
    type: 'image-list',
    title: 'Recolección y análisis de requisitos',
    image: '/slide37.png',
    revealCount: 6,
    items: [
      'Entrevistar al personal',
      'Encontrar aplicaciones similares',
      'Examinar documentos',
      'Utilizar cuestionarios',
      'Experiencia',
    ],
  },
  {
    type: 'image-text-under-title',
    title: 'Universo del discurso',
    image: '/slide38.jpg',
    imageClassName: 'universe-slide-image',
    text: 'Conjunto de necesidades de un dominio de negocio particular',
    revealCount: 2,
  },
  {
    type: 'title-image-static',
    title: 'Lenguaje ubicuo',
    image: '/slide39.png',
    imageClassName: 'extra-large-slide-image',
    titleClassName: 'single-line-title',
    revealCount: 1,
  },
  {
    type: 'title-image-static',
    title: 'Niveles de abstracción',
    image: '/slide40.svg',
    imageClassName: 'extra-large-slide-image',
    titleClassName: 'single-line-title',
    revealCount: 1,
  },
  {
    type: 'abstraction-level',
    title: 'Nivel externo',
    image: '/slide41.png',
    markerIndex: 0,
    revealCount: 2,
    text: 'Cada esquema externo describe la parte de la base de datos que interesa a un grupo de usuarios determinados.',
  },
  {
    type: 'abstraction-level',
    title: 'Nivel conceptual',
    image: '/slide41.png',
    markerIndex: 1,
    revealCount: 2,
    text: 'Este esquema oculta los detalles de las estructuras de almacenamiento y se concentra en describir entidades, atributos, relaciones operaciones de los usuarios.',
  },
  {
    type: 'abstraction-level',
    title: 'Nivel interno',
    image: '/slide41.png',
    markerIndex: 2,
    revealCount: 2,
    text: 'Este esquema se especifica mediante un modelo físico y describe todos los detalles para el almacenamiento de la base de datos, así como los métodos de acceso.',
  },
]

const chapterOneRoute = [
  ...chapterOneSlides.slice(0, 12).flatMap((_, slideIndex) => routeForSlide(slideIndex, slideIndex + 1)),
  ...routeForSlide(12, 13),
  ...routeForSlide(13, 14),
  // Flujo guiado: los focos del timeline se intercalan con slides puente,
  // pero la numeración visible avanza de forma continua.
  ...routeForTimelineFocus(0, 15),
  ...routeForSlide(15, 16),
  ...routeForTimelineFocus(2, 17),
  ...routeForSlide(16, 18),
  ...routeForTimelineFocus(3, 19),
  ...routeForSlide(17, 20),
  ...routeForTimelineFocus(1, 21),
  ...routeForSlide(18, 22),
  ...routeForSlide(19, 23),
  ...routeForSlide(20, 24),
  ...routeForSlide(21, 25),
]

const chapterTwoRoute = [
  ...chapterTwoSlides.flatMap((_, slideIndex) => routeForSlideFrom(chapterTwoSlides, slideIndex, slideIndex + 1)),
]

const chapterDecks = {
  'chapter-1': {
    chapterNumber: 1,
    slides: chapterOneSlides,
    route: chapterOneRoute,
  },
  'chapter-2': {
    chapterNumber: 2,
    slides: chapterTwoSlides,
    route: chapterTwoRoute,
  },
}

const menuGroups = [
  {
    key: 'theory',
    label: 'Teoría',
    type: 'group',
    children: theoryItems,
  },
  {
    key: 'practice',
    label: 'Práctica',
    type: 'group',
    children: practiceItems,
  },
]

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  const [selectedKey, setSelectedKey] = useState(theoryItems[0].key)
  const [routeIndex, setRouteIndex] = useState(0)
  const [internetDate, setInternetDate] = useState(null)
  const [timeStatus, setTimeStatus] = useState('loading')

  const selectedItem = useMemo(() => {
    return [...theoryItems, ...practiceItems].find(item => item.key === selectedKey)
  }, [selectedKey])

  const menuItems = useMemo(() => buildMenuItems(internetDate), [internetDate])
  const selectedIsUnlocked = isUnlocked(selectedKey, internetDate)

  useEffect(() => {
    async function loadInternetDate() {
      try {
        const currentDate = await getInternetDate()

        setInternetDate(currentDate)
        setTimeStatus('ready')
      } catch {
        setInternetDate(null)
        setTimeStatus('error')
      }
    }

    loadInternetDate()
  }, [])

  useEffect(() => {
    if (timeStatus !== 'ready') return
    if (isUnlocked(selectedKey, internetDate)) return

    const firstUnlocked = [...theoryItems, ...practiceItems].find(item => isUnlocked(item.key, internetDate))
    if (firstUnlocked) setSelectedKey(firstUnlocked.key)
  }, [internetDate, selectedKey, timeStatus])

  useEffect(() => {
    setRouteIndex(0)
  }, [selectedKey])

  const activeDeck = selectedIsUnlocked ? chapterDecks[selectedKey] : null
  const isSlideDeck = Boolean(activeDeck)
  const activeRoute = activeDeck?.route[routeIndex]
  const activeSlide = activeDeck?.slides[activeRoute?.slideIndex ?? 0]
  const activeRevealStep = activeRoute?.revealStep ?? 0
  const activeFocusIndex = activeRoute?.focusIndex
  const activeDisplayNumber = activeRoute?.displayNumber ?? 1

  function goNextSlide() {
    if (!activeDeck) return
    setRouteIndex(current => Math.min(current + 1, activeDeck.route.length - 1))
  }

  function goPrevSlide() {
    if (!activeDeck) return
    setRouteIndex(current => Math.max(current - 1, 0))
  }

  return (
    <Layout className="app-shell">
      <Sider
        width={320}
        collapsedWidth={88}
        collapsed={collapsed}
        className="course-sider"
      >
        <div className="sidebar-top">
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            onClick={() => setCollapsed(current => !current)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {!collapsed && (
          <>
            <div className="brand">
              <strong>Business Intelligence</strong>
            </div>

            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              items={menuItems}
              onClick={({ key }) => {
                if (isUnlocked(key, internetDate)) setSelectedKey(key)
              }}
              className="course-menu"
            />
          </>
        )}
      </Sider>

      <Content className="course-content">
        {timeStatus === 'loading' ? (
          <LockedContent
            title="Sincronizando fecha del curso"
            text="Estamos consultando la hora global de internet antes de desbloquear contenido."
          />
        ) : timeStatus === 'error' ? (
          <LockedContent
            title="Contenido bloqueado"
            text="No se pudo obtener la hora global de internet. Por seguridad, el contenido queda bloqueado."
          />
        ) : !selectedIsUnlocked ? (
          <LockedContent
            title="Contenido bloqueado"
            text="Este módulo todavía no está disponible según el calendario del curso."
          />
        ) : isSlideDeck ? (
          <SlideCanvas
            slide={activeSlide}
            revealStep={activeRevealStep}
            focusIndex={activeFocusIndex}
            displayNumber={activeDisplayNumber}
            chapterNumber={activeDeck.chapterNumber}
            onNext={goNextSlide}
            onPrev={goPrevSlide}
          />
        ) : selectedKey === 'practice-1' ? (
          <PracticeOnePlayground />
        ) : (
          <motion.main
            key={selectedKey}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="content-card"
          >
            <span className="eyebrow">
              {selectedKey.startsWith('chapter') ? 'Teoría' : 'Práctica'}
            </span>
            <Title className="content-title">{selectedItem?.label}</Title>
            <Paragraph className="content-copy">
              Espacio base para desarrollar el contenido, slides y actividades interactivas de esta sección.
            </Paragraph>
          </motion.main>
        )}
      </Content>
    </Layout>
  )
}

function buildMenuItems(currentDate) {
  return menuGroups.map(group => ({
    ...group,
    children: group.children.map(item => {
      const unlocked = isUnlocked(item.key, currentDate)

      return {
        ...item,
        disabled: !unlocked,
        label: (
          <span className="locked-menu-label">
            <span>{item.label}</span>
            {!unlocked && <span aria-label="Bloqueado">🔒</span>}
          </span>
        ),
      }
    }),
  }))
}

async function getInternetDate() {
  const providers = [
    {
      url: 'https://timeapi.io/api/Time/current/zone?timeZone=America/La_Paz',
      parse: data => data.dateTime?.slice(0, 10),
    },
    {
      url: 'https://worldtimeapi.org/api/timezone/America/La_Paz',
      parse: data => data.datetime?.slice(0, 10),
    },
  ]

  for (const provider of providers) {
    try {
      const response = await fetch(provider.url, { cache: 'no-store' })
      if (!response.ok) continue

      const data = await response.json()
      const date = provider.parse(data)
      if (date) return date
    } catch {
      // Intentamos el siguiente proveedor antes de bloquear contenido.
    }
  }

  throw new Error('No se pudo obtener la fecha global de internet')
}

function isUnlocked(key, currentDate) {
  if (!currentDate) return false
  const releaseDate = releaseSchedule[key]
  if (!releaseDate) return false
  return currentDate >= releaseDate
}

function LockedContent({ title, text }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="locked-content"
    >
      <div className="locked-icon">🔒</div>
      <Title className="locked-title">{title}</Title>
      <Paragraph className="locked-copy">{text}</Paragraph>
    </motion.main>
  )
}

function PracticeOnePlayground() {
  const [answers, setAnswers] = useState({
    rowMeaning: '',
    businessContext: '',
    importantData: '',
    problems: '',
    aiCritique: '',
  })
  const [checked, setChecked] = useState([])

  const checklist = [
    'Identifiqué qué representa cada fila del dataset.',
    'Propuse un dominio o sistema que podría usar estos datos.',
    'Seleccioné información relevante para análisis de BI.',
    'Detecté al menos 3 problemas de calidad de datos.',
    'Usé IA como apoyo, pero validé críticamente la respuesta.',
  ]

  function updateAnswer(key, value) {
    setAnswers(current => ({ ...current, [key]: value }))
  }

  const markdown = `# Práctica 1: Diagnóstico de datos de reclutamiento

## 1. Qué representa cada fila
${answers.rowMeaning || '_Pendiente_'}

## 2. Sistema o negocio posible
${answers.businessContext || '_Pendiente_'}

## 3. Información importante del dataset
${answers.importantData || '_Pendiente_'}

## 4. Problemas detectados
${answers.problems || '_Pendiente_'}

## 5. Crítica a la ayuda de IA
${answers.aiCritique || '_Pendiente_'}
`

  return (
    <motion.main
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="practice-playground"
    >
      <section className="practice-hero">
        <Tag color="blue">Práctica 1</Tag>
        <Title className="practice-title">Diagnóstico de datos de reclutamiento con IA</Title>
        <Paragraph className="practice-copy">
          Objetivo: entender el dataset, detectar problemas de calidad y usar IA como asistente crítico, no como reemplazo del criterio humano.
        </Paragraph>
      </section>

      <section className="practice-grid">
        <div className="practice-workspace">
          <Card title="Contexto del caso" className="practice-card">
            <Paragraph>
              Una empresa de tecnología en Bolivia analiza candidatos de reclutamiento almacenados en un CSV exportado desde formularios.
            </Paragraph>
            <Paragraph>
              Recursos Humanos quiere revisar perfiles comunes, salario esperado, experiencia, postgrados y disponibilidad.
            </Paragraph>
          </Card>

          <Card title="Respuestas guiadas" className="practice-card">
            <label className="practice-field">
              <span>¿Qué representa cada fila del dataset?</span>
              <TextArea rows={3} value={answers.rowMeaning} onChange={event => updateAnswer('rowMeaning', event.target.value)} />
            </label>
            <label className="practice-field">
              <span>¿Qué tipo de sistema o negocio podría usar estos datos?</span>
              <TextArea rows={3} value={answers.businessContext} onChange={event => updateAnswer('businessContext', event.target.value)} />
            </label>
            <label className="practice-field">
              <span>¿Qué información importante contiene el dataset?</span>
              <TextArea rows={3} value={answers.importantData} onChange={event => updateAnswer('importantData', event.target.value)} />
            </label>
            <label className="practice-field">
              <span>Identificá al menos 3 problemas del CSV.</span>
              <TextArea rows={4} value={answers.problems} onChange={event => updateAnswer('problems', event.target.value)} />
            </label>
            <label className="practice-field">
              <span>¿Qué aceptarías, corregirías o rechazarías de una ayuda generada por IA?</span>
              <TextArea rows={4} value={answers.aiCritique} onChange={event => updateAnswer('aiCritique', event.target.value)} />
            </label>
          </Card>
        </div>

        <aside className="practice-sidebar">
          <Card title="Prompt sugerido" className="practice-card">
            <pre className="practice-prompt">{`Actúa como analista de datos.

Analiza este dataset de reclutamiento.
Primero identifica:
1. Qué representa cada fila.
2. Columnas relevantes para BI.
3. Problemas de calidad.
4. Preguntas que faltan antes de modelar.

No propongas soluciones todavía.`}</pre>
            <Button
              type="primary"
              onClick={() => navigator.clipboard?.writeText(`Actúa como analista de datos.

Analiza este dataset de reclutamiento.
Primero identifica:
1. Qué representa cada fila.
2. Columnas relevantes para BI.
3. Problemas de calidad.
4. Preguntas que faltan antes de modelar.

No propongas soluciones todavía.`)}
            >
              Copiar prompt
            </Button>
          </Card>

          <Card title="Checklist de validación" className="practice-card">
            <Checkbox.Group value={checked} onChange={setChecked}>
              <div className="practice-checklist">
                {checklist.map(item => (
                  <Checkbox key={item} value={item}>{item}</Checkbox>
                ))}
              </div>
            </Checkbox.Group>
          </Card>

          <Card title="Entregable Markdown" className="practice-card">
            <pre className="practice-output">{markdown}</pre>
          </Card>
        </aside>
      </section>
    </motion.main>
  )
}

function getRevealCount(slide) {
  return slide.revealCount ?? 0
}

function routeForSlide(slideIndex, displayNumber) {
  return routeForSlideFrom(chapterOneSlides, slideIndex, displayNumber)
}

function routeForSlideFrom(slides, slideIndex, displayNumber) {
  const revealCount = getRevealCount(slides[slideIndex])
  return Array.from({ length: revealCount + 1 }, (_, revealStep) => ({
    slideIndex,
    revealStep,
    displayNumber,
  }))
}

function routeForTimelineFocus(focusIndex, displayNumber) {
  return [
    { slideIndex: 14, revealStep: 0, focusIndex, displayNumber },
    { slideIndex: 14, revealStep: 1, focusIndex, displayNumber },
  ]
}

function SlideCanvas({ slide, revealStep, focusIndex, displayNumber, chapterNumber, onNext, onPrev }) {
  const slideRef = useRef(null)

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        onNext()
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        onPrev()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNext, onPrev])

  async function toggleFullscreen(event) {
    event.stopPropagation()
    event.currentTarget.blur()

    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }

    await slideRef.current?.requestFullscreen()
  }

  return (
    <section className="slide-shell" ref={slideRef}>
      <header className="slide-header">
        <span>CAPÍTULO {chapterNumber}</span>
        <span>{displayNumber}</span>
      </header>

      <motion.main
        key={slide.id ?? `${displayNumber}-${slide.title}`}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
        className="slide-content"
      >
        <SlideBody slide={slide} revealStep={revealStep} focusIndex={focusIndex} />
      </motion.main>

      <footer className="slide-footer">
        <span>Realizado por <strong>Paul Landaeta</strong><br />©2026</span>
        <button type="button" className="fullscreen-button" aria-label="Pantalla completa" onClick={toggleFullscreen}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 9V5h4M19 9V5h-4M5 15v4h4M19 15v4h-4" />
          </svg>
        </button>
        <span className="footer-brand">
          <img src="/image1.png" alt="" />
          Universidad Privada Boliviana
        </span>
      </footer>
    </section>
  )
}

function RevealItem({ show, children, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function SlideBody({ slide, revealStep, focusIndex }) {
  if (slide.type === 'cover') {
    return (
      <>
        <img className="chapter-logo" src="/image2.png" alt="Universidad Privada Boliviana" />
        <Title className="slide-title slide-title-cover">{slide.title}</Title>
      </>
    )
  }

  if (slide.type === 'question-image') {
    return (
      <div className="question-image-layout">
        <RevealItem show={revealStep >= 1}>
          <img src={slide.image} alt="" />
        </RevealItem>
        <RevealItem show={revealStep >= 1}>
          <Title className="slide-title question-title">{slide.title}</Title>
        </RevealItem>
      </div>
    )
  }

  if (slide.type === 'objectives') {
    return (
      <div className="objectives-layout">
        <div>
          <Title className="slide-title objectives-title">{slide.title}</Title>
          <ul className="objectives-list">
            {slide.items.map((item, index) => (
              <motion.li
                key={item}
                initial={false}
                animate={revealStep > index ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              >
                {item}
              </motion.li>
            ))}
          </ul>
        </div>
        <RevealItem show={revealStep >= 1}>
          <img src={slide.image} alt="" />
        </RevealItem>
      </div>
    )
  }

  if (slide.type === 'title-image') {
    return (
      <div className="title-image-layout">
        <RevealItem show={revealStep >= 1}>
          <Title className="slide-title title-image-title">{slide.title}</Title>
        </RevealItem>
        <RevealItem show={revealStep >= 1}>
          <img src={slide.image} alt="" />
        </RevealItem>
      </div>
    )
  }

  if (slide.type === 'two-images') {
    return (
      <div className="two-images-layout">
        <Title className="slide-title two-images-title">{slide.title}</Title>
        <div className="two-images-grid">
          {slide.images.map(image => (
            <img key={image} src={image} alt="" />
          ))}
        </div>
      </div>
    )
  }

  if (slide.type === 'symbols') {
    return (
      <div className="symbols-layout">
        <div>
          <RevealItem show={revealStep >= 1}>
            <Title className="slide-title symbols-title">{slide.title}</Title>
          </RevealItem>
          <RevealItem show={revealStep >= 3}>
            <Paragraph className="slide-copy symbols-copy">{slide.text}</Paragraph>
          </RevealItem>
        </div>
        <div className="symbols-grid">
          {slide.images.map(image => (
            <RevealItem key={image} show={revealStep >= 2}>
              <img src={image} alt="" />
            </RevealItem>
          ))}
        </div>
      </div>
    )
  }

  if (slide.type === 'data-definition') {
    return (
      <div className="data-definition-layout">
        <div className="data-definition-text">
          <Title className="slide-title data-title">{slide.title}</Title>
          <RevealItem show={revealStep >= 1}>
            <Paragraph className="slide-copy data-copy">
              {slide.text} <strong>{slide.emphasis}</strong>
            </Paragraph>
          </RevealItem>
        </div>
        <RevealItem show={revealStep >= 2}>
          <div className="data-example-row">
            <img src={slide.image} alt="" />
            <span>{slide.example}</span>
          </div>
        </RevealItem>
      </div>
    )
  }

  if (slide.type === 'side-title-image') {
    const image = (
      <RevealItem show={revealStep >= 1}>
        <img src={slide.image} alt="" />
      </RevealItem>
    )

    const title = (
      <RevealItem show={revealStep >= 1}>
        <Title className="slide-title side-title-image-title">{slide.title}</Title>
      </RevealItem>
    )

    return (
      <div className="side-title-image-layout">
        {slide.imageSide === 'left' ? image : title}
        {slide.imageSide === 'left' ? title : image}
      </div>
    )
  }

  if (slide.type === 'text-over-image') {
    return (
      <div className="text-over-image-layout">
        <RevealItem show={revealStep >= 1}>
          <Paragraph className="slide-copy text-over-image-text">{slide.text}</Paragraph>
        </RevealItem>
        <RevealItem show={revealStep >= 2}>
          <img src={slide.image} alt="" />
        </RevealItem>
      </div>
    )
  }

  if (slide.type === 'text-image') {
    const isStaticSlide = slide.revealCount == null
    const image = (
      <RevealItem show={isStaticSlide || revealStep >= 1}>
        <img src={slide.image} alt="" />
      </RevealItem>
    )

    const text = (
      <div className="text-image-copy">
        <RevealItem show={isStaticSlide || revealStep >= 1}>
          <Title className="slide-title text-image-title">{slide.title}</Title>
        </RevealItem>
        <RevealItem show={isStaticSlide || revealStep >= 2}>
          <Paragraph className="slide-copy text-image-text">{slide.text}</Paragraph>
        </RevealItem>
      </div>
    )

    return (
      <div className="text-image-layout">
        {slide.imageSide === 'left' ? image : text}
        {slide.imageSide === 'left' ? text : image}
      </div>
    )
  }

  if (slide.type === 'nosql-horizontal') {
    return (
      <div className="nosql-layout">
        <Title className="slide-title nosql-title">{slide.title}</Title>
        <div className="nosql-content">
          {slide.images.map((image, index) => (
            <RevealItem key={image} show={revealStep >= index + 1}>
              <img src={image} alt="" />
            </RevealItem>
          ))}
          <RevealItem show={revealStep >= 3}>
            <Paragraph className="slide-copy nosql-text">{slide.text}</Paragraph>
          </RevealItem>
        </div>
      </div>
    )
  }

  if (slide.type === 'stacked-image') {
    return (
      <div className="stacked-image-layout">
        <RevealItem show={revealStep >= 1}>
          <img src={slide.image} alt="" />
        </RevealItem>
        <RevealItem show={revealStep >= 1}>
          <Title className="slide-title stacked-image-title">{slide.title}</Title>
        </RevealItem>
        <RevealItem show={revealStep >= 2}>
          <Paragraph className="slide-copy stacked-image-text">{slide.text}</Paragraph>
        </RevealItem>
      </div>
    )
  }

  if (slide.type === 'title-image-static') {
    return (
      <div className="title-image-static-layout">
        <RevealItem show={slide.revealCount == null || revealStep >= 1}>
          <Title className={`slide-title title-image-static-title ${slide.titleClassName ?? ''}`}>{slide.title}</Title>
        </RevealItem>
        <RevealItem show={slide.revealCount == null || revealStep >= 1}>
          <img className={slide.imageClassName} src={slide.image} alt="" />
        </RevealItem>
      </div>
    )
  }

  if (slide.type === 'image-list') {
    return (
      <div className="image-list-layout">
        <RevealItem show={revealStep >= 1}>
          <Title className="slide-title image-list-title">{slide.title}</Title>
        </RevealItem>
        <div className="image-list-content">
          <RevealItem show={revealStep >= 1}>
            <img className={slide.imageClassName} src={slide.image} alt="" />
          </RevealItem>
          <ul>
            {slide.items.map((item, index) => (
              <motion.li
                key={item}
                initial={false}
                animate={revealStep >= index + 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              >
                {item}
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  if (slide.type === 'image-text-under-title') {
    return (
      <div className="image-text-under-title-layout">
        <RevealItem show={revealStep >= 1}>
          <Title className="slide-title image-text-under-title-heading">{slide.title}</Title>
        </RevealItem>
        <div className="image-text-under-title-content">
          <RevealItem show={revealStep >= 1}>
            <img src={slide.image} alt="" />
          </RevealItem>
          <RevealItem show={revealStep >= 2}>
            <Paragraph className="slide-copy image-text-under-title-text">{slide.text}</Paragraph>
          </RevealItem>
        </div>
      </div>
    )
  }

  if (slide.type === 'abstraction-level') {
    return (
      <div className="abstraction-level-layout">
        <RevealItem show={revealStep >= 1}>
          <Title className="slide-title abstraction-level-title">{slide.title}</Title>
        </RevealItem>
        <div className="abstraction-level-content">
          <RevealItem show={revealStep >= 1}>
            <div className="abstraction-level-image-frame">
              <img src={slide.image} alt="" />
              <motion.div
                className="abstraction-level-marker"
                initial={false}
                animate={{
                  top: `${slide.markerIndex * 33.33}%`,
                }}
                transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </RevealItem>
          <RevealItem show={revealStep >= 2}>
            <Paragraph className="slide-copy abstraction-level-text">{slide.text}</Paragraph>
          </RevealItem>
        </div>
      </div>
    )
  }

  if (slide.type === 'lifecycle-list') {
    return (
      <div className="lifecycle-list-layout">
        <Title className="slide-title lifecycle-list-title">{slide.title}</Title>
        <ul className="lifecycle-list">
          {slide.items.map((item, index) => (
            <motion.li
              key={item}
              initial={false}
              animate={revealStep >= index + 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            >
              {item}
            </motion.li>
          ))}
        </ul>
      </div>
    )
  }

  if (slide.type === 'planning-resources') {
    return (
      <div className="planning-resources-layout">
        <div className="planning-resources-grid">
          {slide.items.map((item, index) => (
            <RevealItem key={item.label} show={revealStep >= index + 1}>
              <article className="planning-resource-card">
                <h3>{item.label}</h3>
                <img src={item.image} alt="" />
              </article>
            </RevealItem>
          ))}
        </div>
        <Title className="slide-title planning-resources-title">{slide.title}</Title>
      </div>
    )
  }

  if (slide.type === 'relational-components') {
    return (
      <div className="relational-components-layout">
        <RevealItem show={revealStep >= 1}>
          <Title className="slide-title relational-components-title">{slide.title}</Title>
        </RevealItem>
        <div className="relational-components-content">
          <ul>
            {slide.items.map((item, index) => (
              <motion.li
                key={item}
                initial={false}
                animate={revealStep >= index + 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              >
                {item}
              </motion.li>
            ))}
          </ul>
          <RevealItem show={revealStep >= 1}>
            <img src={slide.image} alt="" />
          </RevealItem>
        </div>
      </div>
    )
  }

  if (slide.type === 'dbms') {
    return (
      <div className="dbms-layout">
        <Title className="slide-title dbms-title">{slide.title}</Title>
        <div className="dbms-content">
          <RevealItem show={revealStep >= 7}>
            <Paragraph className="slide-copy dbms-text">
              {slide.text} <strong>{slide.emphasis}</strong>
            </Paragraph>
          </RevealItem>
          <div className="dbms-grid">
            {slide.images.map((image, index) => (
              <RevealItem key={image} show={revealStep >= index + 1}>
                <img src={image} alt="" />
              </RevealItem>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (slide.type === 'importance') {
    return (
      <div className="importance-layout">
        <Title className="slide-title importance-title">{slide.title}</Title>
        <ul className="importance-list">
          {slide.items.map((item, index) => (
            <motion.li
              key={item}
              initial={false}
              animate={revealStep >= index + 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            >
              {item}
            </motion.li>
          ))}
        </ul>
      </div>
    )
  }

  if (slide.type === 'image-title') {
    return (
      <div className="image-title-layout">
        <RevealItem show={revealStep >= 1}>
          <img src={slide.image} alt="" />
        </RevealItem>
        <RevealItem show={revealStep >= 1}>
          <Title className="slide-title image-title-heading">{slide.title}</Title>
        </RevealItem>
      </div>
    )
  }

  if (slide.type === 'timeline-overview') {
    return (
      <div className="timeline-overview-layout">
        <Title className="slide-title timeline-overview-title">{slide.title}</Title>
        <img src={slide.image} alt="" />
      </div>
    )
  }

  if (slide.type === 'zoom-timeline') {
    const timelineFocusIndex = focusIndex ?? Math.max(revealStep - 1, 0)
    const focus = slide.focusPoints[timelineFocusIndex]
    const isZoomed = revealStep > 0
    const fullTimelineView = {
      backgroundSize: '100% auto',
      backgroundPosition: 'center center',
    }
    const focusedTimelineView = {
      backgroundSize: `${focus.scale}% auto`,
      backgroundPosition: `${focus.x} ${focus.y}`,
    }

    return (
      <div className="zoom-timeline-layout">
        <Title className="slide-title zoom-timeline-title">{slide.title}</Title>
        <div className="zoom-timeline-frame">
          <motion.div
            key={`timeline-focus-${timelineFocusIndex}-${revealStep}`}
            className="zoom-timeline-image"
            initial={isZoomed ? fullTimelineView : false}
            animate={isZoomed ? focusedTimelineView : fullTimelineView}
            transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
            style={{ backgroundImage: `url(${slide.image})` }}
          />
          {isZoomed && focus.marker && (
            <motion.div
              className="zoom-focus-marker"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: 0.58, ease: [0.22, 1, 0.36, 1] }}
              style={{
                left: focus.marker.left,
                bottom: focus.marker.bottom,
                width: focus.marker.width,
                height: focus.marker.height,
                borderColor: focus.marker.color,
              }}
            />
          )}
        </div>
      </div>
    )
  }

  if (slide.type === 'placeholder') {
    return (
      <div className="placeholder-layout">
        <Title className="slide-title placeholder-title">{slide.title}</Title>
        {slide.text && <Paragraph className="slide-copy placeholder-copy">{slide.text}</Paragraph>}
      </div>
    )
  }

  return (
    <>
      <Title className="slide-title">{slide.title}</Title>
      {slide.text && <Paragraph className="slide-copy">{slide.text}</Paragraph>}
    </>
  )
}
