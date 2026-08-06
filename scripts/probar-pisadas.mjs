/*
 * Detecta CONTENIDO QUE PISA la cabecera o el pie.
 *
 * Por qué hace falta otro script además de probar-slides.mjs: ese mide
 * `scrollHeight - clientHeight` de .slide-content, y la cabecera y el pie
 * están POSICIONADOS ENCIMA del contenido — .slide-content solo los esquiva
 * con relleno. Contenido que se mete en esa zona de relleno los pisa SIN
 * aumentar scrollHeight, así que el otro script lo da por bueno.
 *
 * Todo se convierte a PÍXELES DE DISEÑO del lienzo (1280x720) dividiendo por
 * --escala-lamina, porque getBoundingClientRect() ya viene multiplicado por el
 * transform.
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:18742'
const CAPITULOS = ['Fuentes de Datos', 'Modelado de Datos', 'Diseño Conceptual', 'Modelo Relacional', 'Normalización', 'Paul W. Landaeta']
const PANTALLAS = (process.env.PANTALLAS ?? '1920x1080,1366x768,1093x614')
  .split(',').map(s => s.split('x').map(Number))
/* Margen de tolerancia: un descriptor de fuente puede sobresalir uno o dos px
   del alto de línea sin que se vea nada. Más que eso ya se nota en clase. */
const TOLERANCIA = Number(process.env.TOLERANCIA ?? 3)

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
await page.locator('.ant-segmented-item-label', { hasText: 'Soy nuevo' }).click()
await page.getByPlaceholder('Nombre y apellido').fill('Pisadas')
await page.getByPlaceholder('Correo').fill(`ps.${Date.now()}@upb.edu`)
await page.getByPlaceholder(/Contraseña/).first().fill('claveDePrueba123')
await page.getByRole('button', { name: 'Crear cuenta' }).click()
await page.waitForSelector('.course-menu', { timeout: 60000 })

const medir = tol => page.evaluate(tolerancia => {
  const marco = document.querySelector('.slide-shell')
  const lienzo = document.querySelector('.slide-lienzo')
  const contenido = document.querySelector('.slide-content')
  if (!marco || !lienzo || !contenido) return null

  const escala = parseFloat(getComputedStyle(marco).getPropertyValue('--escala-lamina')) || 1
  const base = lienzo.getBoundingClientRect()
  const cabecera = parseFloat(getComputedStyle(marco).getPropertyValue('--slide-cabecera')) || 92
  const pieEl = document.querySelector('.slide-footer')
  const pie = pieEl ? pieEl.getBoundingClientRect().height / escala : 88
  const topePie = 720 - pie

  const culpables = []
  for (const n of contenido.querySelectorAll('*')) {
    // Solo lo que dibuja: un envoltorio vacío que se estira no molesta a nadie.
    if (!n.matches('img, h1, h2, h3, p, li, span, strong, figcaption, td, th')) continue
    const r = n.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    if (getComputedStyle(n).visibility === 'hidden') continue
    if (parseFloat(getComputedStyle(n).opacity) < 0.05) continue

    const arriba = (r.top - base.top) / escala
    const abajo = (r.bottom - base.top) / escala
    const invadeCabecera = cabecera - arriba
    const invadePie = abajo - topePie

    if (invadeCabecera > tolerancia || invadePie > tolerancia) {
      culpables.push({
        etiqueta: n.tagName + '.' + (n.className.toString().split(' ')[0] || ''),
        texto: (n.textContent ?? '').trim().slice(0, 40) || (n.tagName === 'IMG' ? n.getAttribute('src') : ''),
        cabecera: invadeCabecera > tolerancia ? Math.round(invadeCabecera) : 0,
        pie: invadePie > tolerancia ? Math.round(invadePie) : 0,
      })
    }
  }

  return {
    numero: document.querySelectorAll('.slide-header span')[1]?.textContent,
    bandas: `cabecera 0-${Math.round(cabecera)} · pie ${Math.round(topePie)}-720`,
    culpables,
  }
}, tol)

let totalMalas = 0
for (const [w, h] of PANTALLAS) {
  await page.setViewportSize({ width: w, height: h })
  // Recargar: volver a hacer clic en el MISMO capítulo no reinicia el índice
  // de lámina y el recorrido queda corrido entre un tamaño y el siguiente.
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.course-menu', { timeout: 60000 })
  console.log(`\n########## ${w}x${h} ##########`)

  for (const capitulo of CAPITULOS) {
    await page.locator('.ant-menu-item', { hasText: capitulo }).first().click()
    await page.waitForTimeout(1100)

    const malas = new Map()
    /*
     * Se recorre hasta que el capitulo da la vuelta, no una cantidad fija de
     * pasos: con un tope fijo el capitulo 1 —25 laminas mas los focos del
     * timeline intercalados— se cortaba en la 20 y las ultimas cinco nunca se
     * miraban. Asi se colo una lamina rota.
     */
    const primero = await page.evaluate(() => document.querySelectorAll('.slide-header span')[1]?.textContent)
    for (let i = 0; i < 200; i++) {
      if (i > 4) {
        const ahora = await page.evaluate(() => document.querySelectorAll('.slide-header span')[1]?.textContent)
        if (ahora === primero) break
      }
      const m = await medir(TOLERANCIA)
      if (m?.culpables.length) {
        // Se queda la peor pisada de cada lámina.
        const peor = Math.max(...m.culpables.map(c => Math.max(c.cabecera, c.pie)))
        const previo = malas.get(m.numero)
        if (!previo || peor > previo.peor) malas.set(m.numero, { peor, ...m })
      }
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(180)
    }

    if (malas.size) {
      totalMalas += malas.size
      console.log(`\n  ${capitulo} — ${malas.size} lámina(s) con contenido pisado:`)
      for (const [numero, m] of malas) {
        console.log(`    slide ${numero} (${m.bandas}):`)
        for (const c of m.culpables.slice(0, 3)) {
          const donde = c.cabecera ? `pisa la CABECERA ${c.cabecera}px` : `pisa el PIE ${c.pie}px`
          console.log(`        ${c.etiqueta.padEnd(24)} ${donde}  "${c.texto}"`)
        }
      }
    }
  }
}

console.log(`\n=== ${totalMalas} lámina(s) con contenido pisando cabecera o pie ===`)
await browser.close()
