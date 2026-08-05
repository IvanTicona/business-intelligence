import { Alert, Button, Card, Form, Input, Segmented, Typography } from 'antd'
import { useState } from 'react'
import { useSesion } from './sesion.jsx'
import './acceso.css'

const { Paragraph, Text, Title } = Typography

/**
 * Puerta de entrada al curso.
 *
 * Registro e ingreso en la misma pantalla: son dos formularios casi idénticos y
 * separarlos en dos vistas obliga al alumno a adivinar cuál le toca. El alta es
 * abierta, así que la mayoría llega acá la primera vez sin cuenta.
 */
export default function AccesoPage() {
  const { entrar, crearCuenta } = useSesion()
  const [modo, setModo] = useState('ingreso')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [form] = Form.useForm()

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
      <Card className="acceso-card">
        <div className="acceso-marca">
          <span className="acceso-materia">Inteligencia de Negocios</span>
          <Title level={3} className="acceso-titulo">
            {esRegistro ? 'Crea tu cuenta' : 'Entra al curso'}
          </Title>
          <Paragraph className="acceso-bajada">
            Tu cuenta guarda tus entregas y tus bases de datos, así que puedes seguir desde
            cualquier computadora.
          </Paragraph>
        </div>

        <Segmented
          block
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

        <Form form={form} layout="vertical" onFinish={enviar} requiredMark={false} className="acceso-form">
          {esRegistro && (
            <Form.Item
              name="nombre"
              label="Nombre y apellido"
              rules={[{ required: true, min: 2, message: 'Escribe tu nombre completo' }]}
            >
              <Input size="large" autoComplete="name" placeholder="Ana Mamani" />
            </Form.Item>
          )}

          <Form.Item
            name="correo"
            label="Correo"
            rules={[
              { required: true, message: 'Escribe tu correo' },
              { pattern: /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/, message: 'Ese correo no parece válido' },
            ]}
          >
            <Input size="large" autoComplete="email" placeholder="nombre@upb.edu" />
          </Form.Item>

          <Form.Item
            name="clave"
            label="Contraseña"
            rules={[
              { required: true, message: 'Escribe tu contraseña' },
              ...(esRegistro ? [{ min: 8, message: 'Necesita 8 caracteres o más' }] : []),
            ]}
            extra={esRegistro ? '8 caracteres o más.' : null}
          >
            <Input.Password
              size="large"
              autoComplete={esRegistro ? 'new-password' : 'current-password'}
              placeholder="••••••••"
            />
          </Form.Item>

          <Button type="primary" size="large" htmlType="submit" block loading={enviando}>
            {esRegistro ? 'Crear cuenta y entrar' : 'Entrar'}
          </Button>
        </Form>

        <Text className="acceso-pie">
          {esRegistro
            ? 'Usa tu correo institucional para que el docente pueda reconocerte.'
            : '¿Todavía no tienes cuenta? Cambia a "Soy nuevo" aquí arriba.'}
        </Text>
      </Card>
    </div>
  )
}
