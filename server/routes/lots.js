import { Router } from 'express'
import Lot from '../models/Lot.js'

const router = Router()

// GET /api/lots — todos los lotes
router.get('/', async (req, res) => {
  try {
    const lots = await Lot.find().sort({ id: 1 })
    res.json(lots)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/lots/:id — un lote
router.get('/:id', async (req, res) => {
  try {
    const lot = await Lot.findOne({ id: req.params.id })
    if (!lot) return res.status(404).json({ error: 'Lote no encontrado' })
    res.json(lot)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/lots/:id — actualizar campos (status, precio, etc.)
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['status', 'price_usd', 'area_m2', 'orientation', 'dimensions', 'modelPath', 'panoramaImage']
    const update = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key]
    }
    const lot = await Lot.findOneAndUpdate(
      { id: req.params.id },
      { $set: update },
      { returnDocument: 'after' }
    )
    if (!lot) return res.status(404).json({ error: 'Lote no encontrado' })
    res.json(lot)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
