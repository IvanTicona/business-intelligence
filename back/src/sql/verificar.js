/**
 * CORRECCIÓN DE RETOS · el veredicto lo da el servidor
 *
 * Antes la comparación corría en el navegador, con la respuesta correcta al
 * lado: alcanzaba con abrir la consola y pisar la función de comparar para
 * darse por aprobado. Ahora el cliente manda QUÉ reto y QUÉ escribió, y recibe
 * un veredicto que no puede fabricar.
 *
 * La consulta de referencia se corre sobre la MISMA base que la del alumno, así
 * que la comparación es siempre sobre los mismos datos.
 */
import { readFile } from 'node:fs/promises'
import { ejecutarSql } from './ejecutor.js'
import { schemasDisponibles } from '../db/semillas.js'

let retos = null

async function catalogo() {
  if (!retos) {
    retos = JSON.parse(await readFile(new URL('../db/retos.json', import.meta.url), 'utf8'))
  }

  return retos
}

export async function hayReto(id) {
  return Boolean((await catalogo())[id])
}

/**
 * @returns {Promise<{ok: boolean, razon: string, columns, rows, filas, error}>}
 */
export async function verificarReto(id, sqlDelAlumno) {
  const reto = (await catalogo())[id]
  if (!reto) return { ok: false, razon: 'Ese reto no existe.', columns: [], rows: [], filas: 0, error: null }

  const schema = [...schemasDisponibles].find(s => s.replace(/^(ds|pr)_/, '') === reto.base)
  if (!schema) return { ok: false, razon: 'La base de ese reto no está disponible.', columns: [], rows: [], filas: 0, error: null }

  const mio = await ejecutarSql(sqlDelAlumno, schema)
  // Un error de SQL no es "incorrecto": es que todavía no corre. Se devuelve el
  // error y no un veredicto, para que el alumno arregle la consulta primero.
  if (mio.error) return { ok: false, razon: '', columns: [], rows: [], filas: 0, error: mio.error }

  const suyo = await ejecutarSql(reto.sql, schema)
  if (suyo.error) {
    console.error(`[verificar] la consulta de referencia de ${id} falló: ${suyo.error}`)

    return { ok: false, razon: 'No se pudo calcular la respuesta esperada. Avisa al docente.', ...mio }
  }

  const veredicto = comparar(mio, suyo, reto.orden)

  return { ...veredicto, columns: mio.columns, rows: mio.rows, filas: mio.filas, error: null }
}

/** La respuesta, para el botón de "ver solución". */
export async function solucionDe(id) {
  return (await catalogo())[id]?.sql ?? null
}

function comparar(mio, suyo, ordenImporta) {
  if (mio.rows.length !== suyo.rows.length) {
    return {
      ok: false,
      razon: `Tu consulta devuelve ${mio.rows.length} fila(s) y se esperaban ${suyo.rows.length}. Revisa los filtros y los JOIN.`,
    }
  }
  if (mio.columns.length !== suyo.columns.length) {
    return {
      ok: false,
      razon: `Tu consulta devuelve ${mio.columns.length} columna(s) y se esperaban ${suyo.columns.length}.`,
    }
  }

  const mias = normalizar(mio.rows)
  const suyas = normalizar(suyo.rows)

  if (!ordenImporta) {
    mias.sort()
    suyas.sort()
  }

  const distinta = mias.findIndex((f, i) => f !== suyas[i])
  if (distinta !== -1) {
    return {
      ok: false,
      razon: ordenImporta
        ? `La fila ${distinta + 1} no coincide. Revisa el ORDER BY y los valores.`
        : 'Los valores no coinciden. Revisa filtros, joins y agregaciones.',
    }
  }

  return { ok: true, razon: '' }
}

/*
 * Postgres devuelve los NUMERIC como cadena para no perder precisión, así que
 * lo que parece texto puede ser un número: se intenta convertir antes de
 * comparar, o "1533.33" y 1533.33 se considerarían distintos.
 */
function normalizar(filas) {
  return filas.map(fila =>
    fila
      .map(v => {
        if (v === null || v === undefined) return '∅'
        if (typeof v === 'number') return Number(v.toFixed(2))
        if (v instanceof Date) return v.toISOString().slice(0, 10)
        const t = String(v).trim()

        return t !== '' && !Number.isNaN(Number(t)) ? Number(Number(t).toFixed(2)) : t
      })
      .join('␟'),
  )
}
