import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:18742'
const CAPITULOS = ['Fuentes de Datos', 'Modelado de Datos', 'Diseño Conceptual', 'Modelo Relacional', 'Normalización', 'Paul W. Landaeta']
const PANTALLAS = [[1536, 864], [1366, 768], [1093, 614]]

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })

await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
await page.locator('.ant-segmented-item-label', { hasText: 'Soy nuevo' }).click()
await page.getByPlaceholder('Nombre y apellido').fill('Slides')
await page.getByPlaceholder('Correo').fill(`sl.${Date.now()}@upb.edu`)
await page.getByPlaceholder(/Contraseña/).first().fill('claveDePrueba123')
await page.getByRole('button', { name: 'Crear cuenta' }).click()
await page.waitForSelector('.course-menu', { timeout: 60000 })

/** Qué sobra y QUÉ lo está causando: el elemento más alto y qué lo limita. */
const medir = () => page.evaluate(() => {
  const c = document.querySelector('.slide-content')
  if (!c) return null
  const sobra = c.scrollHeight - c.clientHeight
  if (sobra <= 4) return null

  const culpables = [...c.querySelectorAll('h1, h2, p, li, img')]
    .map(n => {
      const cs = getComputedStyle(n)
      const r = n.getBoundingClientRect()
      const lineas = Math.round(r.height / (parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2))

      return {
        etiqueta: n.tagName + '.' + (n.className.split(' ')[0] || ''),
        alto: Math.round(r.height),
        ancho: Math.round(r.width),
        maxAncho: cs.maxWidth,
        lineas: Number.isFinite(lineas) ? lineas : null,
        texto: (n.textContent ?? '').trim().slice(0, 44),
      }
    })
    .filter(x => x.alto > 40)
    .sort((a, b) => b.alto - a.alto)
    .slice(0, 2)

  return {
    sobra,
    disponible: Math.round(c.clientWidth),
    numero: document.querySelectorAll('.slide-header span')[1]?.textContent,
    culpables,
  }
})

for (const [w, h] of PANTALLAS) {
  await page.setViewportSize({ width: w, height: h })
  await page.waitForTimeout(400)
  console.log(`\n########## ${w}x${h} ##########`)

  for (const capitulo of CAPITULOS) {
    await page.locator('.ant-menu-item', { hasText: capitulo }).first().click()
    await page.waitForTimeout(900)

    const malos = []
    for (let i = 0; i < 46; i++) {
      const m = await medir()
      if (m) {
        const clave = `${m.numero}|${m.culpables[0]?.texto}`
        if (!malos.some(x => x.clave === clave)) malos.push({ clave, ...m })
      }
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(130)
    }

    if (malos.length) {
      console.log(`\n  ${capitulo} — ${malos.length} lámina(s) con scroll (ancho útil ${malos[0].disponible}px):`)
      for (const m of malos) {
        console.log(`    slide ${m.numero}: sobran ${m.sobra}px`)
        for (const c of m.culpables) {
          console.log(`        ${c.etiqueta.padEnd(22)} ${c.lineas} línea(s) · ${c.ancho}px de max-width:${c.maxAncho}  "${c.texto}"`)
        }
      }
    }
  }
}

await browser.close()
