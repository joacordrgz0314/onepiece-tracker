// Persistencia local + import/export CSV
import { emptyCard, newId } from './data.js'

const KEY_CARDS = 'op-tracker:cards:v1'
const KEY_SETTINGS = 'op-tracker:settings:v1'

export const defaultSettings = { currency: 'USD', clpRate: 950, lastSet: '' }

export function loadCards() {
  try {
    const raw = localStorage.getItem(KEY_CARDS)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveCards(cards) {
  try {
    localStorage.setItem(KEY_CARDS, JSON.stringify(cards))
  } catch {
    /* almacenamiento lleno o bloqueado */
  }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY_SETTINGS)
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings
  } catch {
    return defaultSettings
  }
}

export function saveSettings(s) {
  try {
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(s))
  } catch {
    /* noop */
  }
}

// ---------- CSV ----------
const FIELDS = [
  'code', 'name', 'set', 'rarity', 'color', 'type', 'variant',
  'condition', 'qty', 'status', 'buyPrice', 'price', 'image', 'notes',
]

const esc = (v) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function cardsToCSV(cards) {
  const rows = [FIELDS.join(',')]
  for (const c of cards) rows.push(FIELDS.map((f) => esc(c[f])).join(','))
  return rows.join('\n')
}

function parseCSV(text) {
  const rows = []
  let row = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') inQ = false
      else cur += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') { row.push(cur); cur = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cur); cur = ''
      if (row.some((x) => x !== '')) rows.push(row)
      row = []
    } else cur += ch
  }
  row.push(cur)
  if (row.some((x) => x !== '')) rows.push(row)
  return rows
}

export function csvToCards(text) {
  const rows = parseCSV(text)
  if (rows.length < 2) return []
  const header = rows[0].map((h) => h.trim())
  return rows.slice(1).map((r) => {
    const obj = emptyCard()
    obj.id = newId()
    header.forEach((h, i) => {
      if (FIELDS.includes(h)) obj[h] = r[i] ?? ''
    })
    obj.qty = Math.max(1, parseInt(obj.qty, 10) || 1)
    return obj
  }).filter((c) => c.code || c.name)
}

export function download(filename, content, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
