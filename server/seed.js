import 'dotenv/config'
import mongoose from 'mongoose'
import Lot from './models/Lot.js'

const lots = [
  {
    id: 'A1', status: 'available',
    coordinates: [[
      [-55.763010, -34.751580],
      [-55.762837, -34.751590],
      [-55.762849, -34.751935],
      [-55.763021, -34.751957],
      [-55.763010, -34.751580],
    ]],
    centroid: [-55.762929, -34.751766],
    area_m2: 180, price_usd: 28000, orientation: 'Norte', dimensions: '12 x 15m',
    panoramaImage: '/src/assets/panoramas/panorama-A1.jpg',
    modelPath: '/src/assets/panoramas/A1-model.glb'
  },
  {
    id: 'A2', status: 'available',
    coordinates: [[
      [-55.762837, -34.751590],
      [-55.762687, -34.751578],
      [-55.762656, -34.751906],
      [-55.762849, -34.751935],
      [-55.762837, -34.751590],
    ]],
    centroid: [-55.762757, -34.751752],
    area_m2: 210, price_usd: 34000, orientation: 'Norte', dimensions: '14 x 15m',
    panoramaImage: '/src/assets/panoramas/panorama-A2.jpg',
    modelPath: '/src/assets/panoramas/A2-model.glb'
  },
  {
    id: 'A3', status: 'available',
    coordinates: [[
      [-55.762687, -34.751578],
      [-55.762466, -34.751571],
      [-55.762418, -34.751875],
      [-55.762656, -34.751906],
      [-55.762687, -34.751578],
    ]],
    centroid: [-55.762557, -34.751733],
    area_m2: 175, price_usd: 26500, orientation: 'Norte', dimensions: '12 x 14m',
    panoramaImage: '/src/assets/panoramas/panorama-A3.jpg',
    modelPath: '/src/assets/panoramas/A3-model.glb'
  },
  {
    id: 'A4', status: 'available',
    coordinates: [[
      [-55.762466, -34.751571],
      [-55.762270, -34.751542],
      [-55.762201, -34.751813],
      [-55.762418, -34.751875],
      [-55.762466, -34.751571],
    ]],
    centroid: [-55.762339, -34.751700],
    area_m2: 190, price_usd: 31000, orientation: 'Norte', dimensions: '12 x 16m',
    panoramaImage: '/src/assets/panoramas/panorama-A4.jpg',
    modelPath: '/src/assets/panoramas/A4-model.glb'
  },
  {
    id: 'C1', status: 'available',
    coordinates: [[
      [-55.762270, -34.751542],
      [-55.762080, -34.751491],
      [-55.762005, -34.751788],
      [-55.762201, -34.751813],
      [-55.762270, -34.751542],
    ]],
    centroid: [-55.762139, -34.751659],
    area_m2: 185, price_usd: 29000, orientation: 'Norte', dimensions: '12 x 15m',
    panoramaImage: '/src/assets/panoramas/panorama-C1.jpg',
    modelPath: '/src/assets/panoramas/C1-model.glb'
  },
]

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('✅ Conectado a MongoDB')

  for (const lot of lots) {
    await Lot.findOneAndUpdate({ id: lot.id }, lot, { upsert: true, new: true })
    console.log(`  → ${lot.id} guardado`)
  }

  console.log('✅ Seed completado')
  await mongoose.disconnect()
}

seed().catch(err => { console.error(err); process.exit(1) })
