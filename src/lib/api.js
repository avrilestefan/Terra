const BASE = '/api'

export async function fetchLots() {
  const res = await fetch(`${BASE}/lots`)
  if (!res.ok) throw new Error('Error al cargar lotes')
  return res.json()
}

export async function fetchLot(id) {
  const res = await fetch(`${BASE}/lots/${id}`)
  if (!res.ok) throw new Error('Lote no encontrado')
  return res.json()
}

export async function updateLot(id, data) {
  const res = await fetch(`${BASE}/lots/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Error al actualizar lote')
  return res.json()
}
