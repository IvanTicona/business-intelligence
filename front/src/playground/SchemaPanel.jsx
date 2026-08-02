import { useState } from 'react'

/**
 * Lista de tablas y columnas, plegable.
 *
 * El diagrama muestra la FORMA del modelo; este panel muestra los NOMBRES
 * exactos. Sin él, el alumno adivina cómo se llama la columna y pierde el
 * tiempo en errores de tipeo en vez de en pensar la consulta.
 */
export default function SchemaPanel({ tablas, resaltadas = [], columnasActivas }) {
  const [abierta, setAbierta] = useState(null)

  const camposEnUso = tabla =>
    tabla.columnas.filter(c => columnasActivas?.has(`${tabla.nombre}.${c.nombre}`)).length

  return (
    <div className="pg-esquema">
      <span className="practice-panel-label">Esquema</span>

      <ul className="pg-esquema-lista">
        {tablas.map(tabla => {
          const activa = resaltadas.includes(tabla.nombre)
          const desplegada = abierta === tabla.nombre

          return (
            <li key={tabla.nombre} className={activa ? 'pg-esquema-activa' : ''}>
              <button
                type="button"
                className="pg-esquema-tabla"
                onClick={() => setAbierta(desplegada ? null : tabla.nombre)}
                aria-expanded={desplegada}
              >
                <span className={`pg-chip pg-chip-${tabla.rol}`} />
                <code>{tabla.nombre}</code>
                {camposEnUso(tabla) > 0 && (
                  <span className="pg-esquema-uso" title="Campos que usa tu consulta">
                    {camposEnUso(tabla)}
                  </span>
                )}
                <em>{tabla.columnas.length}</em>
              </button>

              {desplegada && (
                <ul className="pg-esquema-columnas">
                  {tabla.columnas.map(columna => (
                    <li
                      key={columna.nombre}
                      className={columnasActivas?.has(`${tabla.nombre}.${columna.nombre}`) ? 'pg-esquema-col-activa' : ''}
                    >
                      <code
                        className={[
                          columna.pk ? 'pg-col-pk' : '',
                          columna.fk ? 'pg-col-fk' : '',
                          columna.metrica ? 'pg-col-metrica' : '',
                        ].join(' ').trim()}
                      >
                        {columna.nombre}
                      </code>
                      <span>{columna.tipo}</span>
                      {columna.fk && <em>→ {columna.fk}</em>}
                      {columna.metrica && <em className="pg-col-marca">métrica</em>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
