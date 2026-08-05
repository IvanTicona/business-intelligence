import { Button, Card, Input, Layout, Menu, Tag, Typography } from 'antd'
import { motion } from 'framer-motion'
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import PracticeIcon from './practices/PracticeIcon.jsx'
import { FirmaEntrega } from './practices/PracticeShell.jsx'
import PracticeTwo from './practices/PracticeTwo.jsx'
import PracticeThree from './practices/PracticeThree.jsx'
import PracticeFour from './practices/PracticeFour.jsx'
import { apiUrl, submitPractice as enviarPractica } from './lib/api.js'
// La pantalla de acceso la ve todo el mundo antes que cualquier otra cosa, así
// que no va en diferido: dejar la pantalla en blanco mientras baja sería peor.
import AccesoPage from './auth/AccesoPage.jsx'
import { ProveedorSesion, useSesion } from './auth/sesion.jsx'

// El laboratorio arrastra su CSS y sus bases: que no pese en la carga inicial
// de quien solo viene a ver los capítulos.
const PlaygroundPage = lazy(() => import('./playground/PlaygroundPage.jsx'))
const TallerOltpPage = lazy(() => import('./taller/TallerOltpPage.jsx'))
const ConsolaLibrePage = lazy(() => import('./consola/ConsolaLibrePage.jsx'))

const { Content, Sider } = Layout
const { Title, Paragraph } = Typography
const { TextArea } = Input

const adminPracticeConfigs = {
  'practice-1': {
    label: 'Práctica 1',
    csvFilename: 'practica-1-entregas.csv',
    fields: [
      { key: 'rowMeaning', label: '¿Qué representa cada fila del dataset?' },
      { key: 'businessContext', label: '¿Qué tipo de sistema o negocio podría usar estos datos?' },
      { key: 'importantData', label: '¿Qué información importante contiene el dataset?' },
      { key: 'problems', label: 'Problemas identificados en el CSV' },
      { key: 'aiCritique', label: 'Evaluación crítica de la ayuda generada por IA' },
    ],
  },
  'practice-2': {
    label: 'Práctica 2',
    csvFilename: 'practica-2-entregas.csv',
    fields: [
      { key: 'classificationScore', label: 'Clasificación entidad / atributo' },
      { key: 'primaryKeys', label: 'Claves primarias elegidas' },
      { key: 'cardinalities', label: 'Cardinalidades' },
      { key: 'kpis', label: 'KPIs propuestos' },
      { key: 'reflection', label: 'Reflexión' },
    ],
  },
  'practice-3': {
    label: 'Práctica 3',
    csvFilename: 'practica-3-entregas.csv',
    fields: [
      { key: 'solvedCount', label: 'Retos resueltos' },
      { key: 'queries', label: 'Consultas de los retos' },
      { key: 'freeQuery', label: 'Consulta propia' },
      { key: 'reflection', label: 'Reflexión' },
    ],
  },
  'practice-4': {
    label: 'Práctica 4',
    csvFilename: 'practica-4-entregas.csv',
    fields: [
      { key: 'grain', label: 'Grain del hecho' },
      { key: 'factDesign', label: 'Diseño de la estrella' },
      { key: 'kpiDefinitions', label: 'Definición del KPI propio' },
      { key: 'kpiQueries', label: 'Consultas de los KPIs' },
      { key: 'reflection', label: 'Reflexión' },
    ],
  },
}

const aboutItems = [
  { key: 'teacher', label: 'Paul W. Landaeta' },
]

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

// Tres etapas, en orden: primero se construye una base transaccional siguiendo
// una consigna, después se consultan modelos dimensionales ya armados, y al
// final una base vacía sin consigna ninguna.
const labItems = [
  { key: 'taller-oltp', label: 'Taller OLTP' },
  { key: 'playground', label: 'Laboratorio OLAP' },
  { key: 'consola-libre', label: 'Playground' },
]

const practiceStatusStorageKey = 'bi-course-practice-status'

// Módulos bloqueados para los alumnos.
// PARA HABILITAR UNO: bórralo de esta lista y vuelve a desplegar
// (docker compose up -d --build front). No hay fechas ni calendario:
// lo que está aquí está bloqueado, lo que no está, se ve.
const disabledKeys = new Set([])

function isDisabled(key) {
  return disabledKeys.has(key)
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


const chapterThreeSlides = [
  { type: 'cover', eyebrow: 'Capítulo 3', title: 'DISEÑO CONCEPTUAL', text: '' },
  {
    type: 'objectives',
    title: 'Objetivos',
    image: '/slide3.png',
    revealCount: 5,
    items: [
      'Modelo Entidad Relación',
      'Entidades',
      'Atributos',
      'Dominio',
      'Relaciones',
    ],
  },
  { type: 'title-text-image', title: 'Modelo Entidad-Relación (MER)', image: '/slide50.png', revealCount: 2 },
  {
    type: 'feature-cards',
    text: 'Un esquema conceptual es una descripción de alto nivel de la estructura de la BD, independiente del SGBD.',
    revealCount: 5,
    cards: [
      { label: 'EXPRESIVIDAD', image: '/slide51.1.png' },
      { label: 'SIMPLICIDAD', image: '/slide51.2.png' },
      { label: 'MINIMALIDAD', image: '/slide51.3.png' },
      { label: 'FORMALIDAD', image: '/slide51.4.png' },
    ],
  },
  {
    type: 'symbol-list',
    title: 'Notación Chen: los seis símbolos',
    revealCount: 7,
    items: [
      { image: '/slide52.1.png', text: 'Entidad: objeto distinguible, con existencia propia' },
      { image: '/slide52.2.png', text: 'Atributo: propiedad de una entidad o de una relación' },
      { image: '/slide52.3.png', text: 'Entidad débil: no existe sin su entidad padre' },
      { image: '/slide52.4.png', text: 'Relación: asocia dos o más entidades' },
      { image: '/slide52.5.png', text: 'Identificador: único y sin nulos; se subraya' },
      { image: '/slide52.6.png', text: 'Relación identificadora: vincula la débil con su padre' },
    ],
  },
  { type: 'title-image', title: 'Notación Pata de Gallo', image: '/slide53.png', revealCount: 1 },
  {
    type: 'title-text-image',
    title: 'ENTIDAD',
    text: 'Una entidad se define como cualquier cosa u objeto del mundo real que puede ser DISTINGUIBLE y posea existencia propia. La existencia puede ser física o abstracta.',
    image: '/slide54.png',
    revealCount: 3,
  },
  {
    type: 'two-images-text',
    title: 'CLASES DE ENTIDAD',
    images: ['/slide55.1.png', '/slide55.2.png'],
    text: 'Las entidades fuertes existen sin depender de la existencia de otro ejemplar; las entidades débiles dependen de la existencia de otro ejemplar de otra entidad.',
    revealCount: 4,
  },
  {
    type: 'importance',
    variant: 'compact',
    title: 'IDENTIFICACIÓN DE ENTIDADES',
    revealCount: 3,
    items: [
      'Identificar los sustantivos en el Universo del discurso.',
      'Cada entidad identificada debe representar información relevante en el problema.',
      'Cada ejemplar de la entidad debe diferenciarse de otros ejemplares.',
    ],
  },
  {
    type: 'title-text-image',
    title: 'ATRIBUTOS',
    text: 'Son las propiedades o características que describen una entidad o relación.',
    image: '/slide56.png',
    revealCount: 3,
  },
  {
    type: 'title-text-image',
    title: 'ATRIBUTOS COMPUESTOS',
    text: 'Atributos que poseen varios componentes.',
    image: '/slide57.png',
    revealCount: 3,
  },
  {
    type: 'title-text-image',
    title: 'ATRIBUTO MULTIVALUADO',
    text: 'Los atributos multivaluados permiten almacenar varios valores para un ejemplar.',
    image: '/slide58.png',
    revealCount: 3,
  },
  {
    type: 'title-text-image',
    title: 'IDENTIFICADORES',
    text: 'Atributo capaz de garantizar una ocurrencia única en dicha entidad.',
    image: '/slide59.png',
    revealCount: 5,
    items: [
      'No deben existir dos ejemplares de la entidad con el mismo valor.',
      'No deben tener valores nulos.',
    ],
  },
  { type: 'title-image', title: 'Dominio: los valores que un atributo puede tomar', image: '/slide60.png', revealCount: 1 },
  {
    type: 'image-text-under-title',
    variant: 'media-wide',
    title: 'Relación: asociación entre dos o más entidades',
    image: '/slide61.png',
    text: 'Doble borde = entidad DÉBIL y relación IDENTIFICADORA. Una línea de venta no existe sin su venta: se identifica por (id_venta + nro_línea).',
    revealCount: 2,
  },
  { type: 'title-image', title: 'GRADO DE UNA RELACIÓN', image: '/slide62.png', revealCount: 1 },
  {
    type: 'statement',
    title: 'El MER con la mirada puesta en Business Intelligence',
    text: 'Las decisiones que se toman aquí deciden qué KPIs serán posibles.',
    revealCount: 2,
  },
  {
    type: 'image-text-under-title',
    variant: 'media-wide',
    title: 'Un MER real: la cadena de tiendas SurModa',
    image: '/slide63.png',
    text: '«incluye» es N:M y tiene atributos propios: cantidad y precio cobrado.',
    revealCount: 2,
  },
  { type: 'title-image', title: 'Del MER al análisis: qué será hecho y qué será dimensión', image: '/slide64.png', revealCount: 1 },
  { type: 'title-image', title: 'Decisiones del MER que deciden tus KPIs', image: '/slide65.png', revealCount: 1 },
  { type: 'title-image', title: 'Atributos que conviene prever si después habrá BI', image: '/slide66.png', revealCount: 1 },
  { type: 'title-image', title: 'El mismo patrón, en otros dominios', image: '/slide67.png', revealCount: 1 },
  {
    type: 'statement',
    title: 'Un KPI imposible casi nunca es un problema del tablero.\nEs un dato que el MER no previó.',
    revealCount: 1,
  },
]
const chapterFourSlides = [
  { type: 'cover', eyebrow: 'Capítulo 4', title: 'MODELO RELACIONAL', text: '' },
  {
    type: 'objectives',
    title: 'Objetivos',
    image: '/slide3.png',
    revealCount: 4,
    items: [
      'Definir los conceptos del MR',
      'Establecer restricciones',
      'Clave primaria, clave foránea y clave alternativa',
      'De MER a MR',
    ],
  },
  {
    type: 'image-text-under-title',
    variant: 'media-wide',
    title: 'Relación',
    image: '/slide70.png',
    text: 'La relación o vínculo se representa a través de una tabla; esa tabla representa lo que en el modelo entidad-relación se designa como entidad.',
    revealCount: 2,
  },
  { type: 'title-text-image', title: 'Relación', image: '/slide71.png', revealCount: 2 },
  {
    type: 'concept-pair',
    title: 'Restricciones',
    revealCount: 3,
    items: [
      { heading: 'UNICIDAD', text: 'Los valores no se repiten cuando el atributo es marcado como único.' },
      { heading: 'OBLIGATORIEDAD', text: 'Los valores no deben ser nulos si el atributo es marcado como obligatorio.' },
    ],
  },
  {
    type: 'importance',
    variant: 'compact',
    title: 'Restricciones de integridad referencial',
    revealCount: 4,
    items: [
      'No hacer nada: no podremos eliminar y/o modificar la fila.',
      'Cascada: se modifican o eliminan todas las claves secundarias relacionadas.',
      'Poner nulos: las claves secundarias se ponen con valor nulo.',
      'Valor por defecto: las claves secundarias se marcan con un valor por defecto.',
    ],
  },
  {
    type: 'importance',
    variant: 'compact dense',
    title: 'Inherentes',
    revealCount: 6,
    items: [
      'Cada tabla tiene un nombre distinto.',
      'Cada atributo de la tabla toma un solo valor en cada fila.',
      'Cada atributo tiene un nombre distinto en cada tabla (aunque puede coincidir en tablas distintas).',
      'Cada fila es única.',
      'El orden de los atributos no importa.',
      'El orden de las filas no importa.',
    ],
  },
  { type: 'title-text-image', title: 'Claves', image: '/slide72.png', revealCount: 2 },
]

const chapterFiveSlides = [
  { type: 'cover', eyebrow: 'Capítulo 5', title: 'NORMALIZACIÓN', text: '' },
  { type: 'image-stack', images: ['/slide80.png'], revealCount: 1 },
  {
    // El recorrido de la materia en tres pasos: primero se modela el mundo,
    // después se lo lleva a tablas y recién entonces se lo normaliza.
    type: 'concept-flow',
    revealCount: 3,
    nodes: [
      { label: 'Modelo Entidad-Relación' },
      { label: 'Modelo Relacional' },
      { label: 'Normalización' },
    ],
  },
  {
    type: 'quote',
    revealCount: 1,
    text: 'Proceso de organizar los datos de una BD para poder tener una BD flexible a cambios y eliminación de la redundancia y dependencia incoherente.',
  },
  {
    type: 'title-text-image',
    title: 'Formas de la Normalización',
    image: '/slide81.png',
    imageClassName: 'media-capped',
    revealCount: 2,
  },
  {
    type: 'bullet-notes',
    title: 'Redundancias',
    revealCount: 1,
    items: [
      { heading: 'Repetición', text: 'Mismos atributos y valores se encuentran en varias relaciones.' },
    ],
  },
  {
    type: 'image-stack',
    images: ['/slide82.1.png', '/slide82.2.png', '/slide82.3.png'],
    revealCount: 3,
  },
  {
    type: 'bullet-notes',
    title: 'Anomalías',
    revealCount: 3,
    items: [
      { heading: 'Integridad', text: 'Consistencia de información.' },
      { heading: 'Eliminación', text: 'Pérdida de información útil para la BD.' },
      { heading: 'Inserción y modificación', text: 'Obtención de datos erróneos.' },
    ],
  },
  { type: 'statement', title: '1ra. Forma Normal', revealCount: 1 },
  {
    type: 'importance',
    variant: 'compact dense',
    title: 'Pasos para hallar la 1ra FN',
    revealCount: 6,
    items: [
      'Identifique las claves candidatas.',
      'Identifique la clave principal y alternativas.',
      'Cada valor de un atributo debe ser atómico.',
      'Verificar dependencia funcional.',
      'Eliminar redundancias y anomalías.',
      'No existe orden vertical ni horizontal.',
    ],
  },
  {
    type: 'statement',
    variant: 'compact',
    title: 'Dependencia Funcional',
    revealCount: 2,
    text: 'En una relación R se dice que un atributo Y tiene dependencia funcional con un conjunto de atributos X\n(X → Y)\nsi y solo si cada valor de Y está asociado con exactamente un conjunto de valores de X.',
  },
  { type: 'statement', title: '2da. Forma Normal', revealCount: 1 },
  {
    type: 'importance',
    variant: 'compact',
    title: 'Pasos para llegar a la 2da FN',
    revealCount: 3,
    items: [
      'Debemos estar en 1ra Forma Normal.',
      'Verificar si existe una llave primaria compuesta.',
      'Todos los atributos dependen de la llave primaria compuesta.',
    ],
  },
  { type: 'statement', title: '3ra. Forma Normal', revealCount: 1 },
  {
    type: 'importance',
    variant: 'compact',
    title: 'Pasos para llegar a la 3ra FN',
    revealCount: 2,
    items: [
      'Debemos estar en 2da FN.',
      'Eliminar todas las dependencias transitivas.',
    ],
  },
]

// Sección de presentación: un único slide con quién dicta la materia.
const teacherSlides = [
  {
    type: 'speaker',
    name: 'Paul W. Landaeta',
    image: '/slide00.png',
    roles: 'Líder Proyecto – Ganatech SRL YoloPago, Senior Developer – Coderoad SRL, Docente Pregrado UPB',
    contacts: [
      { label: 'correo', value: 'paullandaeta@upb.edu' },
      { label: 'cel', value: '76517816' },
    ],
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

const chapterThreeRoute = [
  ...chapterThreeSlides.flatMap((_, slideIndex) => routeForSlideFrom(chapterThreeSlides, slideIndex, slideIndex + 1)),
]

const chapterFourRoute = [
  ...chapterFourSlides.flatMap((_, slideIndex) => routeForSlideFrom(chapterFourSlides, slideIndex, slideIndex + 1)),
]

const chapterFiveRoute = [
  ...chapterFiveSlides.flatMap((_, slideIndex) => routeForSlideFrom(chapterFiveSlides, slideIndex, slideIndex + 1)),
]

const teacherRoute = [
  ...teacherSlides.flatMap((_, slideIndex) => routeForSlideFrom(teacherSlides, slideIndex, slideIndex + 1)),
]

const chapterDecks = {
  teacher: {
    // Sin número de capítulo: el encabezado del slide muestra este rótulo.
    chapterLabel: 'DOCENTE',
    slides: teacherSlides,
    route: teacherRoute,
  },
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
  'chapter-3': {
    chapterNumber: 3,
    slides: chapterThreeSlides,
    route: chapterThreeRoute,
  },
  'chapter-4': {
    chapterNumber: 4,
    slides: chapterFourSlides,
    route: chapterFourRoute,
  },
  'chapter-5': {
    chapterNumber: 5,
    slides: chapterFiveSlides,
    route: chapterFiveRoute,
  },
}

const menuGroups = [
  {
    key: 'about',
    label: 'Docente',
    type: 'group',
    children: aboutItems,
  },
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
  {
    key: 'lab',
    label: 'Laboratorio',
    type: 'group',
    children: labItems,
  },
]

// Cada práctica es un playground independiente. Agregar una nueva es sumar
// una entrada aquí, no tocar el render.
const PracticePlaygrounds = {
  'practice-1': PracticeOnePlayground,
  'practice-2': PracticeTwo,
  'practice-3': PracticeThree,
  'practice-4': PracticeFour,
}

function Curso() {
  const [collapsed, setCollapsed] = useState(false)
  const [selectedKey, setSelectedKey] = useState(theoryItems[0].key)
  const [routeIndex, setRouteIndex] = useState(0)
  const [practiceStatus, setPracticeStatus] = useState({})
  const isAdminRoute = window.location.pathname.startsWith('/docente/entregas')

  const selectedItem = useMemo(() => {
    return [...aboutItems, ...theoryItems, ...practiceItems, ...labItems].find(item => item.key === selectedKey)
  }, [selectedKey])

  const menuItems = useMemo(() => buildMenuItems(practiceStatus), [practiceStatus])

  useEffect(() => {
    const savedStatus = window.localStorage.getItem(practiceStatusStorageKey)
    if (!savedStatus) return

    try {
      setPracticeStatus(JSON.parse(savedStatus))
    } catch {
      setPracticeStatus({})
    }
  }, [])

  useEffect(() => {
    setRouteIndex(0)
  }, [selectedKey])

  const activeDeck = chapterDecks[selectedKey]
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

  function markDelivered(practiceKey) {
    const nextStatus = { ...practiceStatus, [practiceKey]: 'delivered' }
    setPracticeStatus(nextStatus)
    window.localStorage.setItem(practiceStatusStorageKey, JSON.stringify(nextStatus))
  }

  return (
    <Layout className="app-shell">
      <Sider
        width={320}
        collapsedWidth={88}
        collapsed={collapsed}
        className="course-sider"
      >
        <div className="sidebar-header">
          {!collapsed && (
            <div className="brand">
              <strong>Business<br />Intelligence</strong>
            </div>
          )}

          <button
            type="button"
            className="sidebar-toggle"
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            onClick={() => setCollapsed(current => !current)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m8 7 4-4 4 4M8 17l4 4 4-4" />
            </svg>
          </button>
        </div>

        <BarraSesion colapsado={collapsed} />

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => {
            if (isDisabled(key)) return
            if (!isPracticeDelivered(key, practiceStatus)) setSelectedKey(key)
          }}
          className="course-menu"
          inlineCollapsed={collapsed}
        />

        {!collapsed && (
          <div className="sidebar-footer">
            <img src="/image1.png" alt="" />
            <div>
              <strong>Paul Landaeta</strong>
              <span>Universidad Privada Boliviana</span>
            </div>
          </div>
        )}
      </Sider>

      <Content className="course-content">
        {isAdminRoute ? (
          <AdminSubmissionsPanel />
        ) : isDisabled(selectedKey) ? (
          <BlockedContent title={selectedItem?.label} />
        ) : isSlideDeck ? (
          <SlideCanvas
            slide={activeSlide}
            revealStep={activeRevealStep}
            focusIndex={activeFocusIndex}
            displayNumber={activeDisplayNumber}
            chapterNumber={activeDeck.chapterNumber}
            chapterLabel={activeDeck.chapterLabel}
            onNext={goNextSlide}
            onPrev={goPrevSlide}
          />
        ) : selectedKey === 'taller-oltp' ? (
          <Suspense fallback={<div className="lab-cargando">Cargando el taller…</div>}>
            <TallerOltpPage />
          </Suspense>
        ) : selectedKey === 'playground' ? (
          <Suspense fallback={<div className="lab-cargando">Cargando el laboratorio…</div>}>
            <PlaygroundPage />
          </Suspense>
        ) : selectedKey === 'consola-libre' ? (
          <Suspense fallback={<div className="lab-cargando">Cargando el playground…</div>}>
            <ConsolaLibrePage />
          </Suspense>
        ) : PracticePlaygrounds[selectedKey] ? (
          (() => {
            const Playground = PracticePlaygrounds[selectedKey]

            return (
              <Playground
                key={selectedKey}
                delivered={isPracticeDelivered(selectedKey, practiceStatus)}
                onDelivered={() => markDelivered(selectedKey)}
              />
            )
          })()
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

function buildMenuItems(practiceStatus) {
  return menuGroups.map(group => ({
    ...group,
    children: group.children.map(item => {
      const delivered = isPracticeDelivered(item.key, practiceStatus)
      const blocked = isDisabled(item.key)

      return {
        ...item,
        disabled: blocked || delivered,
        icon: <CourseMenuIcon name={menuIconFor(item.key)} />,
        label: (
          <span className="course-menu-label">
            <span>{item.label}</span>
            {blocked && <MenuStatusIcon name="lock" />}
            {!blocked && delivered && <MenuStatusIcon name="check" />}
          </span>
        ),
      }
    }),
  }))
}

function isPracticeDelivered(key, practiceStatus) {
  return key.startsWith('practice') && practiceStatus[key] === 'delivered'
}

function BlockedContent({ title }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="blocked-content"
    >
      <div className="blocked-icon">🔒</div>
      <Title className="blocked-title">{title ?? 'Módulo bloqueado'}</Title>
      <Paragraph className="blocked-copy">
        Este módulo todavía no está habilitado. Se abre cuando el docente lo libere en clase.
      </Paragraph>
    </motion.main>
  )
}

function menuIconFor(key) {
  if (key.startsWith('chapter')) return 'book'
  if (key.startsWith('practice')) return 'practice'
  if (key === 'playground' || key === 'taller-oltp' || key === 'consola-libre') return 'lab'
  return 'person'
}

function CourseMenuIcon({ name }) {
  const icons = {
    book: <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v16H7.5A2.5 2.5 0 0 0 5 21V5.5Zm0 0V21M8 7h8M8 11h8" />,
    practice: <path d="M8 3h8l3 3v15H5V3h3Zm8 0v4h4M8 12h8M8 16h6" />,
    person: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" />,
    lab: <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7 15h10" />,
  }

  return (
    <svg className="course-menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  )
}

function MenuStatusIcon({ name }) {
  const icons = {
    check: <path d="M20 6 9 17l-5-5" />,
    lock: <path d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6V10Zm6 4v2" />,
  }

  return (
    <svg className={`menu-status-icon menu-status-icon-${name}`} viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  )
}

const PROMPT_PRACTICA_UNO = `Actúa como analista de datos.

Analiza este dataset de reclutamiento.
Primero identifica:
1. Qué representa cada fila.
2. Columnas relevantes para BI.
3. Problemas de calidad.
4. Preguntas que faltan antes de modelar.

No propongas soluciones todavía.`

function PracticeOnePlayground({ delivered, onDelivered }) {
  const datasetSheetUrl = 'https://docs.google.com/spreadsheets/d/1UH5uNvUW8_beBv_3LCabQUmImeYKeHzE7W814foIfFU/edit?usp=sharing'
  const [answers, setAnswers] = useState({
    rowMeaning: '',
    businessContext: '',
    importantData: '',
    problems: '',
    aiCritique: '',
  })
  const [submitState, setSubmitState] = useState({ status: 'idle', message: '' })
  const objectives = [
    'Entender qué representa cada fila del dataset.',
    'Reconocer información útil para análisis de BI.',
    'Detectar problemas de calidad antes de modelar.',
    'Usar IA como apoyo y validar sus respuestas.',
  ]

  const respondidas = Object.values(answers).filter(valor => valor.trim()).length

  function updateAnswer(key, value) {
    setAnswers(current => ({ ...current, [key]: value }))
    setSubmitState({ status: 'idle', message: '' })
  }

  // Usa el mismo envío que las otras tres prácticas en vez de su propio fetch:
  // eran dos caminos que había que acordarse de cambiar juntos.
  async function submitPractice() {
    if (Object.values(answers).some(valor => !valor.trim())) {
      setSubmitState({ status: 'error', message: 'Completa todos los campos antes de enviar.' })
      return
    }

    setSubmitState({ status: 'loading', message: '' })

    try {
      await enviarPractica({ practiceId: 'practice-1', answers })
      setSubmitState({ status: 'success', message: 'Práctica enviada correctamente.' })
      onDelivered()
    } catch (error) {
      setSubmitState({ status: 'error', message: error.message ?? 'No se pudo enviar la práctica.' })
    }
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="practice-playground"
    >
      {/* Misma distribución que las prácticas 2 y 3: dos contenedores, con el
          panel de respuestas ocupando el lugar del diagrama. */}
      <section className="practice-grid practice-grid-schema practice-grid-uno">
        <div className="wizard-column">
          <Card className="practice-card wizard-card">
            <header className="wizard-card-head">
              <div className="wizard-card-titles">
                <Tag color="blue">Práctica 1</Tag>
                <h2 className="wizard-card-title">Diagnóstico de datos de reclutamiento con IA</h2>
              </div>
              <div className="wizard-card-goals">
                <span className="practice-panel-label">Objetivos</span>
                <ul className="wizard-card-objectives">
                  {objectives.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </header>

            <section className="stage-block context-card">
              <div className="practice-card-heading">
                <PracticeIcon name="database" />
                <span>Contexto del caso</span>
              </div>
              <div className="context-blocks">
                <div>
                  <strong>Situación</strong>
                  <p>Una empresa de tecnología en Bolivia analiza candidatos de reclutamiento almacenados en un CSV exportado desde formularios.</p>
                </div>
                <div>
                  <strong>Necesidad de negocio</strong>
                  <p>Recursos Humanos quiere revisar perfiles comunes, salario esperado, experiencia, postgrados y disponibilidad.</p>
                </div>
              </div>
            </section>

            <section className="stage-block">
              <div className="practice-card-heading">
                <PracticeIcon name="spark" />
                <span>Prompt sugerido</span>
              </div>
              <pre className="practice-prompt">{PROMPT_PRACTICA_UNO}</pre>
              <Button type="primary" ghost onClick={() => navigator.clipboard?.writeText(PROMPT_PRACTICA_UNO)}>
                <PracticeIcon name="copy" />
                Copiar prompt
              </Button>
            </section>

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
                  loading={submitState.status === 'loading'}
                  onClick={submitPractice}
                >
                  <PracticeIcon name={delivered ? 'check' : 'send'} />
                  {delivered ? 'Entregada' : 'Enviar práctica'}
                </Button>
              </div>
              {submitState.message && (
                <p className={`practice-submit-message practice-submit-message-${submitState.status}`}>
                  {submitState.message}
                </p>
              )}
            </div>
          </Card>
        </div>

        <aside className="schema-column">
          <div className="answers-panel">
            <div className="answers-panel-head">
              <span className="practice-panel-label">Respuestas guiadas</span>
              <span className="answers-panel-counter">{respondidas}/5 respondidas</span>
            </div>

            <div className="answers-panel-body">
            <label className="practice-field">
              <span>¿Qué representa cada fila del dataset?</span>
              <TextArea disabled={delivered || submitState.status === 'loading'} rows={3} value={answers.rowMeaning} onChange={event => updateAnswer('rowMeaning', event.target.value)} />
            </label>
            <label className="practice-field">
              <span>¿Qué tipo de sistema o negocio podría usar estos datos?</span>
              <TextArea disabled={delivered || submitState.status === 'loading'} rows={3} value={answers.businessContext} onChange={event => updateAnswer('businessContext', event.target.value)} />
            </label>
            <label className="practice-field">
              <span>¿Qué información importante contiene el dataset?</span>
              <TextArea disabled={delivered || submitState.status === 'loading'} rows={3} value={answers.importantData} onChange={event => updateAnswer('importantData', event.target.value)} />
            </label>
            <label className="practice-field">
              <span>Identifica al menos 3 problemas del CSV.</span>
              <TextArea disabled={delivered || submitState.status === 'loading'} rows={4} value={answers.problems} onChange={event => updateAnswer('problems', event.target.value)} />
            </label>
            <label className="practice-field">
              <span>¿Qué aceptarías, corregirías o rechazarías de una ayuda generada por IA?</span>
              <TextArea disabled={delivered || submitState.status === 'loading'} rows={4} value={answers.aiCritique} onChange={event => updateAnswer('aiCritique', event.target.value)} />
            </label>

            {/* El dataset vive junto a las preguntas: es la fuente que hay que
                mirar para responderlas. */}
            <div className="answers-panel-dataset">
              <div className="practice-card-heading">
                <PracticeIcon name="sheet" />
                <span>Dataset de trabajo</span>
              </div>
              <Paragraph className="dataset-copy">
                Abre el archivo en Google Sheets y analiza columnas, valores faltantes, duplicados, formatos y consistencia.
              </Paragraph>
              <Button
                type="primary"
                size="large"
                className="dataset-button"
                disabled={!datasetSheetUrl}
                onClick={() => window.open(datasetSheetUrl, '_blank', 'noopener,noreferrer')}
              >
                <PracticeIcon name="external" />
                Abrir Google Sheets
              </Button>
            </div>
            </div>
          </div>
        </aside>
      </section>
    </motion.main>
  )
}

/**
 * Panorama del curso: lo que el docente necesita ver ANTES de entrar a clase.
 * Cuánto entregó cada práctica, y sobre todo quién dejó de avanzar, que es lo
 * que la lista plana de entregas no muestra.
 */
function PanoramaCurso({ panorama }) {
  const { practicas, estudiantes, resumen } = panorama
  const estancados = estudiantes.filter(e => e.estancado)

  return (
    <section className="panorama">
      <div className="panorama-cifras">
        <article>
          <strong>{resumen.estudiantesUnicos}</strong>
          <span>estudiantes con al menos una entrega</span>
        </article>
        <article>
          <strong>{resumen.completaronTodo}</strong>
          <span>completaron las {practicas.length} prácticas</span>
        </article>
        <article className={resumen.estancados > 0 ? 'panorama-alerta' : ''}>
          <strong>{resumen.estancados}</strong>
          <span>sin avanzar hace 7 días o más</span>
        </article>
      </div>

      <div className="panorama-practicas">
        {practicas.map(practica => (
          <div className="panorama-practica" key={practica.practiceId}>
            <span className="panorama-practica-nombre">{practica.label}</span>
            <div className="panorama-barra">
              <div
                style={{
                  width: resumen.estudiantesUnicos
                    ? `${Math.round((practica.estudiantes / resumen.estudiantesUnicos) * 100)}%`
                    : '0%',
                }}
              />
            </div>
            <span className="panorama-practica-dato">
              {practica.estudiantes} de {resumen.estudiantesUnicos}
            </span>
          </div>
        ))}
      </div>

      {estancados.length > 0 && (
        <div className="panorama-estancados">
          <span className="practice-panel-label">Quiénes se quedaron</span>
          <table>
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Avance</th>
                <th>Le falta</th>
                <th>Última entrega</th>
              </tr>
            </thead>
            <tbody>
              {estancados.map(alumno => (
                <tr key={alumno.studentIdentifier}>
                  <td>{alumno.studentIdentifier}</td>
                  <td>{alumno.completadas} / {alumno.total}</td>
                  <td>{alumno.faltan.map(id => id.replace('practice-', 'P')).join(', ')}</td>
                  <td>hace {alumno.diasSinEntregar} día(s)</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function AdminSubmissionsPanel() {
  const [token, setToken] = useState('')
  const [selectedPracticeId, setSelectedPracticeId] = useState('practice-1')
  const [submissions, setSubmissions] = useState([])
  const [panorama, setPanorama] = useState(null)
  const [status, setStatus] = useState({ type: 'idle', message: '' })
  const selectedPractice = adminPracticeConfigs[selectedPracticeId]

  async function loadSubmissions() {
    setStatus({ type: 'loading', message: '' })

    try {
      const url = new URL(apiUrl('/api/admin/submissions'), window.location.origin)
      url.searchParams.set('practiceId', selectedPracticeId)
      const response = await fetch(url.toString(), {
        headers: token ? { 'x-admin-token': token } : {},
      })

      if (!response.ok) throw new Error('No autorizado')

      const data = await response.json()
      setSubmissions(data.submissions ?? [])
      setStatus({ type: 'success', message: '' })

      // El panorama viaja aparte porque no depende de la práctica elegida.
      cargarPanorama()
    } catch {
      setStatus({ type: 'error', message: 'No se pudieron cargar las entregas.' })
    }
  }

  async function cargarPanorama() {
    try {
      const response = await fetch(apiUrl('/api/admin/panorama'), {
        headers: token ? { 'x-admin-token': token } : {},
      })
      if (!response.ok) throw new Error('No autorizado')
      setPanorama(await response.json())
    } catch {
      setPanorama(null)
    }
  }

  async function downloadCsv() {
    setStatus({ type: 'loading', message: '' })

    try {
      const downloadUrl = new URL(apiUrl('/api/admin/submissions.csv'), window.location.origin)
      downloadUrl.searchParams.set('practiceId', selectedPracticeId)
      const response = await fetch(downloadUrl.toString(), {
        headers: token ? { 'x-admin-token': token } : {},
      })

      if (!response.ok) throw new Error('No se pudo descargar el CSV')

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = selectedPractice.csvFilename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(blobUrl)
      setStatus({ type: 'success', message: '' })
    } catch {
      setStatus({ type: 'error', message: 'No se pudo descargar el CSV.' })
    }
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="admin-panel"
    >
      <section className="admin-panel-header">
        <div>
          <Tag color="blue">Docente</Tag>
          <Title className="admin-title">Entregas de prácticas</Title>
          <Paragraph className="admin-copy">Panel privado para revisar envíos y descargar el consolidado en CSV.</Paragraph>
        </div>
        <div className="admin-actions">
          <select
            className="admin-practice-select"
            value={selectedPracticeId}
            onChange={event => {
              setSelectedPracticeId(event.target.value)
              setSubmissions([])
              setStatus({ type: 'idle', message: '' })
            }}
          >
            {Object.entries(adminPracticeConfigs).map(([practiceId, config]) => (
              <option key={practiceId} value={practiceId}>{config.label}</option>
            ))}
          </select>
          <Input.Password
            placeholder="Token docente"
            value={token}
            onChange={event => setToken(event.target.value)}
          />
          <Button type="primary" loading={status.type === 'loading'} onClick={loadSubmissions}>Cargar entregas</Button>
          <Button loading={status.type === 'loading'} onClick={downloadCsv}>Descargar CSV</Button>
        </div>
      </section>

      {status.message && <p className="admin-status-error">{status.message}</p>}

      {panorama && <PanoramaCurso panorama={panorama} />}

      <section className="admin-submissions-list">
        {submissions.map(submission => (
          <Card className="admin-submission-card" key={submission.id}>
            <div className="admin-submission-meta">
              <strong>{submission.studentIdentifier}</strong>
              <span>{adminPracticeConfigs[submission.practiceId]?.label ?? submission.practiceId} · {new Date(submission.submittedAt).toLocaleString('es-BO')}</span>
            </div>
            <div className="admin-submission-answers">
              {selectedPractice.fields.map(field => (
                <p key={field.key}><strong>{field.label}</strong>{submission.answers?.[field.key] ?? ''}</p>
              ))}
              {selectedPractice.fields.length === 0 && (
                <p><strong>Respuestas</strong>Esta práctica todavía no tiene estructura configurada.</p>
              )}
            </div>
          </Card>
        ))}
        {status.type === 'success' && submissions.length === 0 && (
          <Card className="admin-submission-card">Todavía no hay entregas registradas.</Card>
        )}
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

function SlideCanvas({ slide, revealStep, focusIndex, displayNumber, chapterNumber, chapterLabel, onNext, onPrev }) {
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
        <span>{chapterLabel ?? `CAPÍTULO ${chapterNumber}`}</span>
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
    // `variant` permite agrandar la imagen y achicar el texto en un slide
    // puntual sin alterar el layout que usan los demás capítulos.
    return (
      <div className={`image-text-under-title-layout ${slide.variant ?? ''}`.trim()}>
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
    // `variant` permite achicar tipografia cuando los items son largos, sin
    // tocar el layout que ya usaban los otros capitulos.
    return (
      <div className={`importance-layout ${slide.variant ?? ''}`.trim()}>
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

  // Texto arriba y tarjetas de imagen + etiqueta abajo, apareciendo de a una.
  if (slide.type === 'feature-cards') {
    return (
      <div className="feature-cards-layout">
        <RevealItem show={revealStep >= 1}>
          <Paragraph className="slide-copy feature-cards-intro">{slide.text}</Paragraph>
        </RevealItem>
        <div className="feature-cards-grid">
          {slide.cards.map((card, index) => (
            <RevealItem key={card.label} show={revealStep >= index + 2}>
              <figure className="feature-card">
                <img src={card.image} alt="" />
                <figcaption>{card.label}</figcaption>
              </figure>
            </RevealItem>
          ))}
        </div>
      </div>
    )
  }

  // Catálogo de símbolos en dos columnas: cada fila es icono + descripción.
  if (slide.type === 'symbol-list') {
    return (
      <div className="symbol-list-layout">
        <RevealItem show={revealStep >= 1}>
          <Title className="slide-title symbol-list-title">{slide.title}</Title>
        </RevealItem>
        <div className="symbol-list-grid">
          {slide.items.map((item, index) => (
            <RevealItem key={item.text} show={revealStep >= index + 2}>
              <div className="symbol-list-item">
                <img src={item.image} alt="" />
                <span>{item.text}</span>
              </div>
            </RevealItem>
          ))}
        </div>
      </div>
    )
  }

  // Título, texto y una imagen debajo. Con `items` agrega una lista final.
  // Sin texto, la imagen se adelanta un paso para no dejar un paso vacío.
  if (slide.type === 'title-text-image') {
    const imageStep = slide.text ? 3 : 2
    const listOffset = imageStep + 1

    return (
      <div className="title-text-image-layout">
        <RevealItem show={revealStep >= 1}>
          <Title className="slide-title title-text-image-heading">{slide.title}</Title>
        </RevealItem>
        {slide.text && (
          <RevealItem show={revealStep >= 2}>
            <Paragraph className="slide-copy title-text-image-text">{slide.text}</Paragraph>
          </RevealItem>
        )}
        <RevealItem show={revealStep >= imageStep} className="title-text-image-media-wrap">
          <img className={`title-text-image-media ${slide.imageClassName ?? ''}`.trim()} src={slide.image} alt="" />
        </RevealItem>
        {slide.items && (
          <ul className="title-text-image-list">
            {slide.items.map((item, index) => (
              <motion.li
                key={item}
                initial={false}
                animate={revealStep >= index + listOffset ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              >
                {item}
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  // Dos imágenes comparadas y un texto que las cierra.
  if (slide.type === 'two-images-text') {
    return (
      <div className="two-images-text-layout">
        <RevealItem show={revealStep >= 1}>
          <Title className="slide-title two-images-text-heading">{slide.title}</Title>
        </RevealItem>
        <div className="two-images-text-grid">
          {slide.images.map((image, index) => (
            <RevealItem key={image} show={revealStep >= index + 2}>
              <img src={image} alt="" />
            </RevealItem>
          ))}
        </div>
        <RevealItem show={revealStep >= slide.images.length + 2}>
          <Paragraph className="slide-copy two-images-text-copy">{slide.text}</Paragraph>
        </RevealItem>
      </div>
    )
  }

  // Dos conceptos enfrentados: cada uno con su rótulo y su definición.
  if (slide.type === 'concept-pair') {
    return (
      <div className="concept-pair-layout">
        <RevealItem show={revealStep >= 1}>
          <Title className="slide-title concept-pair-heading">{slide.title}</Title>
        </RevealItem>
        <div className="concept-pair-grid">
          {slide.items.map((item, index) => (
            <RevealItem key={item.heading} show={revealStep >= index + 2}>
              <div className="concept-pair-card">
                <strong>{item.heading}</strong>
                <p>{item.text}</p>
              </div>
            </RevealItem>
          ))}
        </div>
      </div>
    )
  }

  // Una o varias imágenes apiladas, sin título: la lámina es la explicación.
  // Cada imagen entra en su propio paso para poder comentarlas de a una.
  if (slide.type === 'image-stack') {
    // La cantidad viaja como clase: con tres láminas el alto disponible se
    // reparte y cada una necesita un tope propio para no pisar el pie.
    return (
      <div className={`image-stack-layout image-stack-${slide.images.length}`}>
        {slide.images.map((image, index) => (
          <RevealItem key={image} show={revealStep >= index + 1}>
            <img src={image} alt="" />
          </RevealItem>
        ))}
      </div>
    )
  }

  // Definición citada: sin título, la cita ES el slide.
  if (slide.type === 'quote') {
    return (
      <div className="quote-layout">
        <RevealItem show={revealStep >= 1}>
          <blockquote className="quote-text">{slide.text}</blockquote>
        </RevealItem>
      </div>
    )
  }

  // Progresión de conceptos encadenados: cada nodo aparece con su flecha.
  if (slide.type === 'concept-flow') {
    return (
      <div className="concept-flow-layout">
        {slide.title && (
          <RevealItem show={revealStep >= 1}>
            <Title className="slide-title concept-flow-heading">{slide.title}</Title>
          </RevealItem>
        )}
        <ol className="concept-flow-track">
          {slide.nodes.map((node, index) => (
            <motion.li
              key={node.label}
              initial={false}
              animate={revealStep >= index + 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="concept-flow-step">{index + 1}</span>
              <span className="concept-flow-label">{node.label}</span>
            </motion.li>
          ))}
        </ol>
      </div>
    )
  }

  // Título y viñetas con rótulo propio, una debajo de la otra. El título queda
  // fijo y los pasos son los items, igual que en `importance`: revelarlo
  // gastaba un paso en el que el slide se veía vacío.
  if (slide.type === 'bullet-notes') {
    return (
      <div className="bullet-notes-layout">
        <Title className="slide-title bullet-notes-heading">{slide.title}</Title>
        <ul className="bullet-notes-list">
          {slide.items.map((item, index) => (
            <motion.li
              key={item.heading}
              initial={false}
              animate={revealStep >= index + 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            >
              <strong>{item.heading}</strong>
              <span>{item.text}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    )
  }

  // Presentación del docente: datos a la izquierda, retrato a la derecha.
  // Sin pasos: es una tarjeta de presentación, se muestra entera de una.
  if (slide.type === 'speaker') {
    return (
      <div className="speaker-layout">
        <div className="speaker-copy">
          <Title className="slide-title speaker-name">{slide.name}</Title>
          <Paragraph className="slide-copy speaker-roles">{slide.roles}</Paragraph>
          <ul className="speaker-contacts">
            {slide.contacts.map(contact => (
              <li key={contact.label}>
                <span>{contact.label}</span>
                <strong>{contact.value}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div className="speaker-portrait">
          <img src={slide.image} alt={`Retrato de ${slide.name}`} />
        </div>
      </div>
    )
  }

  // Cierre conceptual: solo tipografía, sin imagen. Respeta los saltos de línea.
  if (slide.type === 'statement') {
    return (
      <div className={`statement-layout ${slide.variant ?? ''}`.trim()}>
        <RevealItem show={revealStep >= 1}>
          <Title className="slide-title statement-title">{slide.title}</Title>
        </RevealItem>
        {slide.text && (
          <RevealItem show={revealStep >= 2}>
            <Paragraph className="slide-copy statement-copy">{slide.text}</Paragraph>
          </RevealItem>
        )}
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

/*
 * COMPUERTA DE ACCESO
 *
 * Sin router: la aplicación navega por estado de menú y meterle uno solo para
 * el login sería un refactor de dos mil líneas para una decisión de dos ramas.
 * Acá basta con elegir qué se renderiza.
 *
 * El panel del docente sigue entrando por su ruta y su token, sin pasar por
 * esta compuerta: hoy Paul lo usa así y romperlo lo dejaría sin ver las
 * entregas. Pasa a autenticarse con su cuenta en la fase 4.
 */
export default function App() {
  // El proveedor envuelve SIEMPRE, incluida la ruta del docente: el curso usa
  // la sesión adentro (la barra de identidad, la firma de la entrega) y sin él
  // esos componentes revientan. En la ruta del docente simplemente no hay
  // usuario, así que no se muestran.
  const esRutaDocente = window.location.pathname.startsWith('/docente/entregas')

  return (
    <ProveedorSesion>
      {esRutaDocente ? <Curso /> : <Compuerta />}
    </ProveedorSesion>
  )
}

function Compuerta() {
  const { usuario, cargando } = useSesion()

  // Mientras se le pregunta al servidor quién es. Es un ida y vuelta corto, y
  // mostrar el login antes de saberlo haría parpadear la pantalla a quien ya
  // tiene la sesión abierta.
  if (cargando) {
    return (
      <div className="acceso-fondo">
        <span className="acceso-materia">Cargando tu sesión…</span>
      </div>
    )
  }

  return usuario ? <Curso /> : <AccesoPage />
}

/**
 * Quién está usando la aplicación, arriba del menú.
 *
 * Está a la vista siempre y no escondida en un desplegable a propósito: en un
 * laboratorio de la universidad se comparten computadoras, y entregar una
 * práctica con la sesión de un compañero es un problema real.
 */
function BarraSesion({ colapsado }) {
  const { usuario, cerrar } = useSesion()
  if (!usuario) return null

  if (colapsado) {
    return (
      <div className="sesion-barra sesion-barra-chica" title={`${usuario.nombre} · ${usuario.correo}`}>
        <span className="sesion-rol">{usuario.nombre.slice(0, 1).toUpperCase()}</span>
      </div>
    )
  }

  return (
    <div className="sesion-barra">
      <span className="sesion-nombre" title={usuario.correo}>{usuario.nombre}</span>
      {usuario.rol === 'docente' && <span className="sesion-rol">docente</span>}
      <button type="button" className="sesion-salir" onClick={cerrar}>Salir</button>
    </div>
  )
}
