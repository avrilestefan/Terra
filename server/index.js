import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import lotsRouter   from './routes/lots.js'
import renderRouter from './routes/render.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/api/lots',   lotsRouter)
app.use('/api/render', renderRouter)

app.get('/api/health', (_, res) => res.json({ ok: true }))

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB conectado')
    app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`))
  })
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err.message)
    process.exit(1)
  })
