import { Layout, Typography } from 'antd'
import { motion } from 'framer-motion'

const { Content } = Layout
const { Title, Paragraph } = Typography

export default function App() {
  return (
    <Layout className="app-shell">
      <Content className="hero">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="hero-card"
        >
          <span className="eyebrow">Business Intelligence</span>
          <Title className="hero-title">Curso en construcción</Title>
          <Paragraph className="hero-copy">
            Base inicial del front para capítulos, slides y prácticas interactivas.
          </Paragraph>
        </motion.section>
      </Content>
    </Layout>
  )
}
