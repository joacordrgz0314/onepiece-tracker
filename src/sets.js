// Catálogo de sets (ediciones) y sus cartas, con caché en localStorage.
import { apiGet, mapCard } from './prices.js'

// Lista base para que el selector funcione aunque la API no responda.
// La lista en vivo de la API (si carga) la complementa y pisa los nombres.
export const FALLBACK_SETS = [
  { id: 'OP01', name: 'Romance Dawn' },
  { id: 'OP02', name: 'Paramount War' },
  { id: 'OP03', name: 'Pillars of Strength' },
  { id: 'OP04', name: 'Kingdoms of Intrigue' },
  { id: 'OP05', name: 'Awakening of the New Era' },
  { id: 'OP06', name: 'Wings of the Captain' },
  { id: 'OP07', name: '500 Years in the Future' },
  { id: 'OP08', name: 'Two Legends' },
  { id: 'OP09', name: 'Emperors in the New World' },
  { id: 'OP10', name: 'Royal Bloodlines' },
  { id: 'OP11', name: 'A Fist of Divine Speed' },
  { id: 'OP12', name: 'Legacy of the Master' },
  { id: 'OP13', name: 'Carrying on His Will' },
  { id: 'OP14', name: '' },
  { id: 'OP15', name: '' },
  { id: 'EB01', name: 'Memorial Collection' },
  { id: 'EB02', name: 'Anime 25th Collection' },
  { id: 'PRB01', name: 'Premium Booster The Best' },
]

const KEY_LIST = 'op-tracker:setlist:v1'
const keyCards = (id) => `op-tracker:set:${id}:v1`

const read = (key) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* almacenamiento lleno o bloqueado */
  }
}

export const loadCachedSetList = () => read(KEY_LIST) ?? []
export const loadCachedSet = (id) => read(keyCards(id))
export const saveCachedSet = (id, data) => write(keyCards(id), data)

const normId = (v) => String(v).trim().toUpperCase().replace(/[\s-]/g, '')
const validId = (id) => /^[A-Z]{1,4}\d{1,3}$/.test(id)

// Junta lista en vivo/caché con la lista base, ordenada de forma natural
export function mergeSets(live = []) {
  const map = new Map()
  for (const s of FALLBACK_SETS) map.set(s.id, { ...s })
  for (const s of live) {
    const prev = map.get(s.id)
    map.set(s.id, { id: s.id, name: s.name && s.name !== s.id ? s.name : prev?.name ?? '' })
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))
}

export const setLabel = (s) => (s.name ? `${s.id} · ${s.name}` : s.id)

function toSet(item) {
  const raw =
    item.set_id ?? item.deck_id ?? item.st_id ?? item.set ?? item.id ??
    (item.card_set_id ? String(item.card_set_id).split('-')[0] : null)
  if (raw == null) return null
  const id = normId(raw)
  if (!validId(id)) return null
  return { id, name: item.set_name ?? item.deck_name ?? item.name ?? '' }
}

export async function fetchSetList() {
  const results = await Promise.allSettled([apiGet('/api/allSets/'), apiGet('/api/allDecks/')])
  const map = new Map()
  for (const r of results) {
    if (r.status !== 'fulfilled' || !Array.isArray(r.value)) continue
    for (const item of r.value) {
      const s = toSet(item)
      if (s) map.set(s.id, { ...map.get(s.id), ...s, name: s.name || map.get(s.id)?.name || '' })
    }
  }
  if (map.size === 0) throw new Error('No se pudo leer la lista de sets')
  const list = [...map.values()]
  write(KEY_LIST, list)
  return list
}

const isDeck = (id) => /^ST/i.test(id)

export async function fetchSetCards(id) {
  const hyphen = id.replace(/^([A-Z]+)(\d+)$/, '$1-$2')
  const paths = isDeck(id)
    ? [`/api/decks/${id}/`, `/api/decks/${hyphen}/`, `/api/sets/${id}/`]
    : [`/api/sets/${id}/`, `/api/sets/${hyphen}/`, `/api/decks/${id}/`]

  let lastErr
  for (const path of paths) {
    try {
      const data = await apiGet(path)
      if (Array.isArray(data) && data.length > 0) {
        const seen = new Set()
        return data
          .map(mapCard)
          .filter((c) => c.code && !seen.has(c.code) && seen.add(c.code))
          .sort((a, b) => a.code.localeCompare(b.code, 'en', { numeric: true }))
      }
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr ?? new Error('El set no devolvió cartas')
}
