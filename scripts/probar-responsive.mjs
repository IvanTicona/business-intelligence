import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:18742'
const OUT = 'C:/Users/ivant/AppData/Local/Temp/claude/C--Users-ivant-Desktop-PersonalProjects-material-paul/36499da7-c6fa-4d92-bc2b-b9d0f8780086/scratchpad/pdf/'

// Lo que hay de verdad en un aula, no lo que uso yo para probar.
const PANTALLAS = [
  [1920, 1080, 'monitor / laptop al 100%'],
  [1536, 864, '1920x1080 al 125% — LO MAS COMUN'],
  [1440, 900, 'macbook'],
  [1366, 768, 'laptop al 100%'],
  [1280, 720, 'laptop chico'],
  [1093, 614, '1366x768 al 125%'],
]

const SECCIONES = [
  ['Fuentes de Datos', '.slide-content'],
  ['Normalización', '.slide-content'],
  ['Práctica 1', '.practice-playground'],
  ['Práctica 2', '.practice-playground'],
  ['Práctica 3', '.practice-playground'],
  ['Práctica 4', '.practice-playground'],
  ['Taller OLTP', '.sql-editor'],
  ['Laboratorio OLAP', '.sql-editor'],
  ['Playground', '.sql-editor'],
]

const browser = await chromium.launch({ channel: 'chrome' })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
const errores = []
page.on('pageerror', e => errores.push(e.message.slice(0, 90)))

await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
await page.locator('.ant-segmented-item-label', { hasText: 'Soy nuevo' }).click()
await page.getByPlaceholder('Nombre y apellido').fill('Responsive')
await page.getByPlaceholder('Correo').fill(`resp.${Date.now()}@upb.edu`)
await page.getByPlaceholder(/Contraseña/).first().fill('claveDePrueba123')
await page.getByRole('button', { name: 'Crear cuenta' }).click()
await page.waitForSelector('.course-menu', { timeout: 60000 })

/** Mide qué se sale de la pantalla y qué queda cortado. */
const medir = alto => page.evaluate(h => {
  const doc = document.documentElement
  const problemas = []

  if (doc.scrollWidth > doc.clientWidth + 1) {
    problemas.push(`la pagina se desplaza a lo ancho (${doc.scrollWidth} > ${doc.clientWidth})`)
  }

  // Lo que sobresale por abajo de la ventana sin poder desplazarse hasta ahí.
  for (const sel of ['.pg-panel-modelo', '.pg-card', '.practice-playground', '.slide-shell', '.course-sider', '.sql-editor-shell']) {
    for (const n of document.querySelectorAll(sel)) {
      const r = n.getBoundingClientRect()
      if (r.height === 0) continue
      if (r.bottom > h + 2 && doc.scrollHeight <= doc.clientHeight + 2) {
        problemas.push(`${sel} se corta abajo (${Math.round(r.bottom - h)}px fuera, sin scroll)`)
      }
      if (r.right > doc.clientWidth + 2) problemas.push(`${sel} se sale por la derecha`)
    }
  }

  // Texto recortado por un contenedor de alto fijo.
  for (const n of document.querySelectorAll('.slide-content, .pg-ficha, .taller-spec, .practice-objectives-panel')) {
    if (n.scrollHeight > n.clientHeight + 4) {
      const puede = ['auto', 'scroll'].includes(getComputedStyle(n).overflowY)
      const cuanto = n.scrollHeight - n.clientHeight
      problemas.push(
        puede
          ? `aviso: ${n.className.split(' ')[0]} necesita desplazarse (${cuanto}px)`
          : `${n.className.split(' ')[0]} OCULTA contenido sin scroll (${cuanto}px)`,
      )
    }
  }

  /*
   * SUPERPOSICIONES. La cabecera y el pie del slide van posicionados ENCIMA del
   * contenido, así que nada se "desborda": simplemente se pisan y el texto queda
   * ilegible. Medir desbordes no lo detecta — se escapó exactamente así, y solo
   * apareció mirando una captura.
   */
  const contenido = document.querySelector('.slide-content')
  for (const sel of ['.slide-header', '.slide-footer']) {
    const chrome = document.querySelector(sel)
    if (!chrome || !contenido) continue
    const c = chrome.getBoundingClientRect()

    for (const n of contenido.querySelectorAll('h1, h2, p, img, li')) {
      const r = n.getBoundingClientRect()
      if (r.height === 0) continue
      const solapa = Math.min(r.bottom, c.bottom) - Math.max(r.top, c.top)
      if (solapa > 4 && r.left < c.right && r.right > c.left) {
        problemas.push(`${n.tagName} se PISA con ${sel} (${Math.round(solapa)}px)`)
      }
    }
  }

  // El menú: si no entra, tiene que poder desplazarse.
  const menu = document.querySelector('.course-sider')
  if (menu && menu.scrollHeight > menu.clientHeight + 4) {
    const puede = ['auto', 'scroll'].includes(getComputedStyle(menu).overflowY)
    if (!puede) problemas.push(`el menu no entra (${menu.scrollHeight - menu.clientHeight}px) y NO se puede desplazar`)
  }

  return [...new Set(problemas)]
}, alto)

const hallazgos = new Map()

for (const [w, h, nombre] of PANTALLAS) {
  await page.setViewportSize({ width: w, height: h })
  await page.waitForTimeout(500)
  console.log(`\n=== ${w}x${h} · ${nombre} ===`)

  for (const [menu, sel] of SECCIONES) {
    await page.locator('.ant-menu-item', { hasText: menu }).first().click()
    await page.waitForSelector(sel, { timeout: 90000 }).catch(() => {})
    await page.waitForTimeout(menu.includes('Taller') || menu.includes('Labor') || menu.includes('Playg') ? 3200 : 1100)

    const p = await medir(h)
    if (p.length) {
      console.log(`  ${menu}:`)
      for (const x of p) {
        console.log(`      ${x}`)
        hallazgos.set(x.replace(/\(\d+.*?\)/, ''), (hallazgos.get(x.replace(/\(\d+.*?\)/, '')) ?? 0) + 1)
      }
      if (w === 1366) await page.screenshot({ path: `${OUT}resp-${menu.replace(/[^a-z]/gi, '')}-1366.png` })
    }
  }
}

console.log('\n=== Resumen: qué se repite ===')
for (const [p, veces] of [...hallazgos].sort((a, b) => b[1] - a[1])) console.log(`  ${veces}x  ${p}`)

await browser.close()
console.log(errores.length ? '\nEXCEPCIONES: ' + [...new Set(errores)].join(' | ') : '\nsin excepciones')
