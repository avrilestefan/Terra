import { Router } from 'express'

const router = Router()

const STYLE_PROMPTS = {
  MINIMAL:       'minimalist modern interior, clean lines, white walls, natural wood, soft natural lighting',
  INDUSTRIAL:    'industrial interior design, exposed concrete, metal accents, Edison bulbs, loft style',
  NORDIC:        'scandinavian nordic interior, warm wood tones, cozy textiles, large windows, hygge atmosphere',
  MEDITERRANEAN: 'mediterranean interior, terracotta tones, arched doorways, whitewashed walls, vibrant tiles',
  BRUTALIST:     'brutalist architecture interior, raw concrete, bold geometric forms, dramatic shadows',
}

async function pollReplicate(id, token, attempts = 0) {
  if (attempts > 50) throw new Error('Timeout esperando render')

  const res  = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const data = await res.json()

  if (data.status === 'succeeded') {
    const out = data.output
    if (Array.isArray(out)) return out[0]
    return out
  }
  if (data.status === 'failed') throw new Error(data.error ?? 'Render fallido')

  await new Promise(r => setTimeout(r, 1500))
  return pollReplicate(id, token, attempts + 1)
}

// POST /api/render
router.post('/', async (req, res) => {
  const { style, specs } = req.body
  const token = process.env.REPLICATE_TOKEN ?? process.env.VITE_REPLICATE_TOKEN

  if (!token) return res.status(500).json({ error: 'REPLICATE_TOKEN no configurado' })

  const stylePrompt = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.MINIMAL
  const prompt = [
    'architectural visualization, photorealistic exterior render, aerial perspective,',
    'residential house in Uruguay, modern architecture,',
    stylePrompt + ',',
    specs ? specs + ',' : '',
    'lush green landscape, blue sky, professional 4K quality, ultra detailed'
  ].filter(Boolean).join(' ')

  try {
    // Flux Schnell — text-to-image, rápido y sin restricciones de img2img
    const createRes = await fetch(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            prompt,
            num_outputs:    1,
            aspect_ratio:   '4:3',
            output_format:  'webp',
            output_quality: 85,
          }
        })
      }
    )

    const prediction = await createRes.json()
    console.log('Flux prediction created:', prediction.id, prediction.status)

    if (prediction.error) throw new Error(prediction.error)

    // Si ya terminó (muy raro en cold start pero por si acaso)
    if (prediction.status === 'succeeded') {
      const out = prediction.output
      return res.json({ url: Array.isArray(out) ? out[0] : out })
    }

    // Polling hasta que termine
    const url = await pollReplicate(prediction.id, token)
    res.json({ url })
  } catch (err) {
    console.error('Replicate error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
