import mongoose from 'mongoose'

const LotSchema = new mongoose.Schema({
  id:           { type: String, required: true, unique: true },
  status:       { type: String, enum: ['available', 'occupied', 'reserved'], default: 'available' },
  coordinates:  { type: [[[Number]]], required: true },
  centroid:     { type: [Number], required: true },
  area_m2:      { type: Number },
  price_usd:    { type: Number },
  orientation:  { type: String },
  dimensions:   { type: String },
  panoramaImage:{ type: String },
  modelPath:    { type: String },
}, { timestamps: true })

export default mongoose.model('Lot', LotSchema)
