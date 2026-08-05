import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ingresar, quienSoy, registrarse, salir } from '../lib/api.js'

/**
 * La sesión del alumno, disponible en toda la aplicación.
 *
 * No guarda nada en localStorage a propósito. El testigo vive en una cookie
 * httpOnly que este código no puede leer —ni podría leerlo un script inyectado—
 * y quién es el usuario se le pregunta al servidor al cargar. Guardar una copia
 * acá solo serviría para que la pantalla y el servidor terminen discrepando:
 * por ejemplo, seguir mostrando al alumno como conectado después de que el
 * docente desactivó su cuenta.
 */
const Contexto = createContext(null)

export function ProveedorSesion({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true
    quienSoy().then(u => {
      if (!vivo) return
      setUsuario(u)
      setCargando(false)
    })

    return () => { vivo = false }
  }, [])

  const valor = useMemo(
    () => ({
      usuario,
      cargando,
      entrar: async datos => setUsuario(await ingresar(datos)),
      crearCuenta: async datos => setUsuario(await registrarse(datos)),
      cerrar: async () => {
        await salir().catch(() => {})
        setUsuario(null)
      },
      // Para cuando el servidor responde 401 en medio de la sesión: la cuenta
      // se desactivó o el testigo venció.
      olvidar: () => setUsuario(null),
    }),
    [usuario, cargando],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useSesion() {
  const valor = useContext(Contexto)
  if (!valor) throw new Error('useSesion necesita estar dentro de <ProveedorSesion>')

  return valor
}

/** Atajo para los componentes que solo quieren saber quién es. */
export function useUsuario() {
  return useSesion().usuario
}

/** Envuelve una acción para cerrar la sesión si el servidor dice 401. */
export function useConSesion() {
  const { olvidar } = useSesion()

  return useCallback(
    async accion => {
      try {
        return await accion()
      } catch (err) {
        if (err?.estado === 401) olvidar()
        throw err
      }
    },
    [olvidar],
  )
}
