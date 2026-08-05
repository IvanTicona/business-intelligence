import { Alert, Button, Form, Input, Segmented } from 'antd'
import { useState } from 'react'
import { useSesion } from './sesion.jsx'
import './acceso.css'

/**
 * Puerta de entrada al curso.
 *
 * Dos paneles: a la izquierda qué es esto, a la derecha el formulario. El de la
 * izquierda desaparece en pantallas angostas, donde el formulario es lo único
 * que importa.
 *
 * Registro e ingreso comparten pantalla: son dos formularios casi idénticos y
 * separarlos obliga al alumno a adivinar cuál le toca. Como el alta es abierta,
 * la mayoría llega acá sin cuenta la primera vez.
 */
export default function AccesoPage() {
  const { entrar, crearCuenta } = useSesion()
  const [modo, setModo] = useState('ingreso')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  const esRegistro = modo === 'registro'

  async function enviar(valores) {
    setEnviando(true)
    setError(null)

    try {
      if (esRegistro) await crearCuenta(valores)
      else await entrar({ correo: valores.correo, clave: valores.clave })
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="acceso-fondo">
      <div className="acceso-panel">
        <section className="acceso-hero">
          <h1 className="acceso-hero-titulo">
            Inteligencia
            <br />
            de Negocios
          </h1>
          <p className="acceso-hero-bajada">
            Modela, consulta y construye bases de datos sobre PostgreSQL de verdad.
          </p>

          {/* Una consulta, no un eslogan: dice de qué se trata la materia mejor
              que cualquier frase. */}
          <pre className="acceso-hero-sql">
            <code>
              <b>SELECT</b> concepto, practica{'\n'}
              <b>FROM</b> curso.inteligencia_negocios{'\n'}
              <b>WHERE</b> base = <i>&apos;PostgreSQL real&apos;</i>{'\n'}
              <b>ORDER BY</b> aprendizaje <b>DESC</b>;
            </code>
          </pre>

          <div className="acceso-hero-cifras">
            <div>
              <strong>5</strong>
              <span>capítulos</span>
            </div>
            <div>
              <strong>4</strong>
              <span>prácticas</span>
            </div>
            <div>
              <strong>106</strong>
              <span>retos SQL</span>
            </div>
          </div>
        </section>

        <section className="acceso-formulario">
          <div className="acceso-card">
            <h2 className="acceso-titulo">{esRegistro ? 'Crea tu cuenta' : 'Entra al curso'}</h2>

            <Segmented
              block
              className="acceso-modo"
              value={modo}
              onChange={valor => {
                setModo(valor)
                setError(null)
              }}
              options={[
                { label: 'Ya tengo cuenta', value: 'ingreso' },
                { label: 'Soy nuevo', value: 'registro' },
              ]}
            />

            {error && <Alert className="acceso-error" type="error" message={error} showIcon />}

            <Form layout="vertical" onFinish={enviar} requiredMark={false} className="acceso-form">
              {esRegistro && (
                <Form.Item name="nombre" rules={[{ required: true, min: 2, message: 'Escribe tu nombre completo' }]}>
                  <Input size="large" autoComplete="name" placeholder="Nombre y apellido" />
                </Form.Item>
              )}

              <Form.Item
                name="correo"
                rules={[
                  { required: true, message: 'Escribe tu correo' },
                  { pattern: /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/, message: 'Ese correo no parece válido' },
                ]}
              >
                <Input size="large" autoComplete="email" placeholder="Correo" />
              </Form.Item>

              <Form.Item
                name="clave"
                rules={[
                  { required: true, message: 'Escribe tu contraseña' },
                  ...(esRegistro ? [{ min: 8, message: 'Necesita 8 caracteres o más' }] : []),
                ]}
              >
                <Input.Password
                  size="large"
                  autoComplete={esRegistro ? 'new-password' : 'current-password'}
                  placeholder={esRegistro ? 'Contraseña (8 caracteres o más)' : 'Contraseña'}
                />
              </Form.Item>

              <Button type="primary" size="large" htmlType="submit" block loading={enviando} className="acceso-boton">
                {esRegistro ? 'Crear cuenta' : 'Entrar'}
              </Button>
            </Form>
          </div>
        </section>
      </div>
    </div>
  )
}
