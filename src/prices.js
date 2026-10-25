// Cliente de optcgapi.com (API pública, precios de mercado TCGplayer en USD).
// Endpoints confirmados en https://optcgapi.com/documentation:
//   /api/allSets/  /api/sets/{set_id}/  /api/sets/card/{card_id}/
//   /api/allDecks/ /api/decks/{st_id}/  /api/decks/card/{card_id}/
//
// El formato exacto del JSON no pude verificarlo, así que mapCard() acepta varios
// nombres de campo. Si la API cambia, este es el único archivo a ajustar.

const DIRECT = 'https://optcgapi.com'
const PROXY = '/optcg' // proxy de Vite (dev/preview) para evitar problemas de CORS

export async function apiGet(path, { signal } = {}) {
  let lastErr
  for (const url of [PROXY + path, DIRECT + path]) {
    try {
      const res = await fetch(url, { signal })
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue }
      const type = res.headers.get('content-type') ?? ''
      if (!type.includes('json')) { lastErr = new Error('la respuesta no es JSON'); continue }
      return await res.json()
    } catch (e) {
      if (e.name === 'AbortError') throw e
      lastErr = e
    }
  }
  throw lastErr ?? new Error('sin respuesta')
}

const RARITY_MAP = {
  common: 'C', uncommon: 'UC', rare: 'R', 'super rare': 'SR', 'secret rare': 'SEC',
  leader: 'L', special: 'SP', 'special card': 'SP', 'treasure rare': 'TR', promo: 'P',
}

const toNumber = (v) => {
  const n = parseFloat(Array.isArray(v) ? v[0] : v)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function mapCard(c) {
  const code = String(c.card_set_id ?? c.card_image_id ?? c.card_id ?? c.id ?? '').trim()
  const name = c.card_name ?? c.name ?? ''
  const rawRarity = String(c.rarity ?? '').trim()
  const rarity = RARITY_MAP[rawRarity.toLowerCase()] ?? rawRarity
  const parallel = /_p\d+$/i.test(code) || /parallel|alt(ernate)? art/i.test(name)
  return {
    code,
    name,
    set: c.set_id ?? c.set_name ?? '',
    rarity,
    color: c.card_color ?? c.color ?? '',
    type: c.card_type ?? c.type ?? '',
    image: c.card_image ?? c.image ?? '',
    price: toNumber(c.market_price) ?? toNumber(c.inventory_price),
    variant: parallel ? 'Parallel' : 'Normal',
  }
}

export async function fetchCardByCode(code, opts) {
  const clean = code.trim().toUpperCase()
  if (!clean) throw new Error('Falta el código de la carta')
  const base = /^ST/i.test(clean) ? 'decks' : 'sets'
  const data = await apiGet(`/api/${base}/card/${encodeURIComponent(clean)}/`, opts)
  const list = (Array.isArray(data) ? data : data ? [data] : []).map(mapCard)
  if (list.length === 0) throw new Error('Carta no encontrada')
  return list
}

// Normaliza el color de la API ("Red/Green" -> Multi, "Red" -> Red)
export function normalizeColor(c) {
  if (!c) return 'Red'
  if (c.includes('/')) return 'Multi'
  const known = ['Red', 'Green', 'Blue', 'Purple', 'Black', 'Yellow']
  return known.find((k) => k.toLowerCase() === c.toLowerCase()) ?? 'Multi'
}
