import { useState } from 'react'
import {
  COLORS, RARITIES, TYPES, VARIANTS, CONDITIONS, STATUS,
  setFromCode, todayISO,
} from '../data.js'
import { fetchCardByCode, normalizeColor } from '../prices.js'

export default function CardForm({ initial, onSave, onCancel, currencyLabel }) {
  const [card, setCard] = useState(initial)
  const [lookup, setLookup] = useState({ state: 'idle', msg: '', options: [] })

  const set = (k, v) => setCard((c) => ({ ...c, [k]: v }))

  const applyResult = (r) => {
    setCard((c) => ({
      ...c,
      code: r.code || c.code,
      name: r.name || c.name,
      set: r.set || c.set || setFromCode(r.code || c.code),
      rarity: RARITIES.includes(r.rarity) ? r.rarity : c.rarity,
      color: normalizeColor(r.color) || c.color,
      type: TYPES.includes(r.type) ? r.type : c.type,
      image: r.image || c.image,
      price: r.price != null ? String(r.price) : c.price,
    }))
    setLookup({ state: 'ok', msg: 'Datos cargados desde optcgapi.com (USD)', options: [] })
  }

  const search = async () => {
    setLookup({ state: 'loading', msg: 'Buscando…', options: [] })
    try {
      const results = await fetchCardByCode(card.code)
      if (results.length === 1) applyResult(results[0])
      else {
        setLookup({
          state: 'choose',
          msg: `${results.length} versiones encontradas, elige una:`,
          options: results,
        })
      }
    } catch (e) {
      setLookup({
        state: 'error',
        msg: `No se pudo consultar la API (${e.message}). Puedes completar los datos a mano.`,
        options: [],
      })
    }
  }

  const submit = (e) => {
    e.preventDefault()
    if (!card.code.trim() && !card.name.trim()) return
    const code = card.code.trim().toUpperCase()
    onSave({
      ...card,
      code,
      set: card.set || setFromCode(code),
      qty: Math.max(1, parseInt(card.qty, 10) || 1),
    })
  }

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <form
        className="modal"
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2>{initial.name || initial.code ? 'Editar carta' : 'Agregar carta'}</h2>

        <div className="row">
          <label className="grow">
            Código
            <input
              value={card.code}
              onChange={(e) => set('code', e.target.value)}
              placeholder="OP01-001"
              autoFocus
            />
          </label>
          <button
            type="button"
            className="btn ghost align-end"
            onClick={search}
            disabled={!card.code.trim() || lookup.state === 'loading'}
          >
            🔍 Buscar datos y precio
          </button>
        </div>

        {lookup.msg && <p className={`hint ${lookup.state}`}>{lookup.msg}</p>}
        {lookup.options.length > 0 && (
          <div className="options">
            {lookup.options.map((o, i) => (
              <button type="button" key={i} className="chip" onClick={() => applyResult(o)}>
                {o.name} · {o.rarity || '?'} {o.price != null ? `· $${o.price}` : ''}
              </button>
            ))}
          </div>
        )}

        <label>
          Nombre
          <input value={card.name} onChange={(e) => set('name', e.target.value)} placeholder="Roronoa Zoro" />
        </label>

        <div className="row">
          <label className="grow">
            Set
            <input value={card.set} onChange={(e) => set('set', e.target.value)} placeholder="OP01" />
          </label>
          <label>
            Rareza
            <select value={card.rarity} onChange={(e) => set('rarity', e.target.value)}>
              {RARITIES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label>
            Color
            <select value={card.color} onChange={(e) => set('color', e.target.value)}>
              {COLORS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
        </div>

        <div className="row">
          <label className="grow">
            Tipo
            <select value={card.type} onChange={(e) => set('type', e.target.value)}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="grow">
            Versión
            <select value={card.variant} onChange={(e) => set('variant', e.target.value)}>
              {VARIANTS.map((v) => <option key={v}>{v}</option>)}
            </select>
          </label>
          <label>
            Estado
            <select value={card.condition} onChange={(e) => set('condition', e.target.value)}>
              {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>

        <div className="row">
          <label>
            Cantidad
            <input type="number" min="1" value={card.qty} onChange={(e) => set('qty', e.target.value)} />
          </label>
          <label className="grow">
            Precio pagado (USD c/u)
            <input type="number" step="0.01" min="0" value={card.buyPrice} onChange={(e) => set('buyPrice', e.target.value)} />
          </label>
          <label className="grow">
            Precio actual (USD c/u)
            <input type="number" step="0.01" min="0" value={card.price} onChange={(e) => set('price', e.target.value)} />
          </label>
        </div>

        <div className="row">
          <label className="grow">
            Lista
            <select value={card.status} onChange={(e) => set('status', e.target.value)}>
              {STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <label className="grow">
            URL de imagen (opcional)
            <input value={card.image} onChange={(e) => set('image', e.target.value)} placeholder="https://…" />
          </label>
        </div>

        <label>
          Notas
          <textarea rows="2" value={card.notes} onChange={(e) => set('notes', e.target.value)} />
        </label>

        <p className="hint">Los precios se guardan en USD (como TCGplayer). Moneda de visualización: {currencyLabel}.</p>

        <div className="actions">
          <button type="button" className="btn ghost" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="btn primary">Guardar</button>
        </div>
      </form>
    </div>
  )
}

// Agrega un punto al historial si el precio cambió
export function withHistory(prev, next) {
  const p = parseFloat(next.price)
  if (!Number.isFinite(p)) return next
  const history = next.history ?? []
  const last = history[history.length - 1]
  if (last && last.price === p) return next
  if (last && last.date === todayISO()) {
    return { ...next, history: [...history.slice(0, -1), { date: todayISO(), price: p }] }
  }
  return { ...next, history: [...history, { date: todayISO(), price: p }] }
}
