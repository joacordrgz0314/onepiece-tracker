import { useEffect, useMemo, useRef, useState } from 'react'
import { withHistory } from './CardForm.jsx'
import { COLORS, RARITIES, TYPES, colorHex, emptyCard, num } from '../data.js'
import { normalizeColor } from '../prices.js'
import {
  fetchSetCards, fetchSetList, loadCachedSet, loadCachedSetList,
  mergeSets, saveCachedSet, setLabel,
} from '../sets.js'

const TABS = [
  { id: 'all', label: 'Todas' },
  { id: 'have', label: 'Tengo' },
  { id: 'missing', label: 'Me faltan' },
]

const SORTS = {
  code: { label: 'Número', fn: (a, b) => a.code.localeCompare(b.code, 'en', { numeric: true }) },
  price: { label: 'Precio (mayor)', fn: (a, b) => (b.price ?? 0) - (a.price ?? 0) },
  name: { label: 'Nombre', fn: (a, b) => a.name.localeCompare(b.name) },
}

const ago = (ts) => {
  const mins = Math.round((Date.now() - ts) / 60000)
  if (mins < 1) return 'justo ahora'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `hace ${hrs} h`
  return `hace ${Math.round(hrs / 24)} días`
}

export default function SetView({ cards, setCards, settings, setSettings, fmt, onEdit }) {
  const selected = settings.lastSet ?? ''
  const selectedRef = useRef(selected)
  selectedRef.current = selected

  const [setList, setSetList] = useState(() => mergeSets(loadCachedSetList()))
  const [catalog, setCatalog] = useState(null) // { fetchedAt, cards }
  const [load, setLoad] = useState({ busy: false, error: '' })
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [fRarity, setFRarity] = useState('')
  const [fColor, setFColor] = useState('')
  const [sort, setSort] = useState('code')
  const [copied, setCopied] = useState(false)

  // Lista de sets en vivo (si falla se usa la lista base)
  useEffect(() => {
    fetchSetList().then((live) => setSetList(mergeSets(live))).catch(() => {})
  }, [])

  const loadSet = async (id) => {
    setLoad({ busy: true, error: '' })
    try {
      const list = await fetchSetCards(id)
      if (selectedRef.current !== id) return
      const data = { fetchedAt: Date.now(), cards: list }
      saveCachedSet(id, data)
      setCatalog(data)
      // Actualiza el precio de las cartas que ya tienes de este set
      const byCode = new Map(list.map((c) => [c.code, c]))
      setCards((prev) =>
        prev.map((e) => {
          const fresh = byCode.get(e.code)
          return e.status === 'owned' && fresh?.price != null
            ? withHistory(null, { ...e, price: String(fresh.price) })
            : e
        }))
      setLoad({ busy: false, error: '' })
    } catch (e) {
      if (selectedRef.current !== id) return
      setLoad({
        busy: false,
        error: `No se pudieron cargar las cartas de ${id} (${e.message}). Revisa tu conexión e inténtalo de nuevo.`,
      })
    }
  }

  // Al cambiar de set: usa caché si existe, si no lo descarga
  useEffect(() => {
    setTab('all'); setQ(''); setFRarity(''); setFColor('')
    setLoad({ busy: false, error: '' })
    if (!selected) { setCatalog(null); return }
    const cached = loadCachedSet(selected)
    setCatalog(cached)
    if (!cached) loadSet(selected)
  }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

  const ownedMap = useMemo(() => {
    const m = new Map()
    for (const c of cards) if (c.status === 'owned') m.set(c.code, c)
    return m
  }, [cards])

  const items = catalog?.cards ?? []

  const summary = useMemo(() => {
    let have = 0, haveValue = 0, missingValue = 0
    for (const i of items) {
      const mine = ownedMap.get(i.code)
      if (mine) {
        have++
        haveValue += (num(mine.price) || i.price || 0) * mine.qty
      } else {
        missingValue += i.price ?? 0
      }
    }
    return { total: items.length, have, missing: items.length - have, haveValue, missingValue }
  }, [items, ownedMap])

  const rarities = useMemo(
    () => [...new Set(items.map((i) => i.rarity).filter(Boolean))]
      .sort((a, b) => RARITIES.indexOf(a) - RARITIES.indexOf(b)),
    [items],
  )

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    return items
      .filter((i) => tab === 'all' || (tab === 'have') === ownedMap.has(i.code))
      .filter((i) => !fRarity || i.rarity === fRarity)
      .filter((i) => !fColor || normalizeColor(i.color) === fColor)
      .filter((i) => !term || `${i.code} ${i.name}`.toLowerCase().includes(term))
      .sort(SORTS[sort].fn)
  }, [items, tab, q, fRarity, fColor, sort, ownedMap])

  const markOwned = (i) =>
    setCards((prev) => {
      const existing = prev.find((c) => c.code === i.code)
      if (existing) {
        return prev.map((c) => (c.id === existing.id ? { ...c, status: 'owned' } : c))
      }
      const entry = withHistory(null, {
        ...emptyCard(),
        code: i.code,
        name: i.name,
        set: selected,
        rarity: i.rarity || 'C',
        color: normalizeColor(i.color),
        type: TYPES.includes(i.type) ? i.type : 'Character',
        variant: i.variant,
        image: i.image,
        price: i.price != null ? String(i.price) : '',
        status: 'owned',
        qty: 1,
      })
      return [entry, ...prev]
    })

  const unmark = (entry) => {
    if ((entry.qty > 1 || entry.buyPrice !== '') &&
        !confirm(`¿Quitar ${entry.code} de tu colección? Se perderán cantidad y precio pagado.`)) return
    setCards((prev) => prev.filter((c) => c.id !== entry.id))
  }

  const bump = (entry, delta) =>
    setCards((prev) =>
      prev.map((c) => (c.id === entry.id ? { ...c, qty: Math.max(1, c.qty + delta) } : c)))

  const copyMissing = async () => {
    const lines = items
      .filter((i) => !ownedMap.has(i.code))
      .map((i) => `${i.code} ${i.name}${i.rarity ? ` (${i.rarity})` : ''}${i.price != null ? ` - $${i.price.toFixed(2)} USD` : ''}`)
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert(lines.join('\n'))
    }
  }

  const pct = summary.total ? Math.round((summary.have / summary.total) * 100) : 0

  return (
    <div className="setview">
      <section className="setbar">
        <label className="setpick">
          Edición / set
          <select
            value={selected}
            onChange={(e) => setSettings((s) => ({ ...s, lastSet: e.target.value }))}
          >
            <option value="">Elige un set…</option>
            {setList.map((s) => <option key={s.id} value={s.id}>{setLabel(s)}</option>)}
          </select>
        </label>
        {selected && (
          <button className="btn ghost" onClick={() => loadSet(selected)} disabled={load.busy}>
            ↻ {load.busy ? 'Cargando…' : 'Actualizar set y precios'}
          </button>
        )}
        {catalog && !load.busy && (
          <span className="hint">Precios actualizados {ago(catalog.fetchedAt)}</span>
        )}
      </section>

      {!selected && (
        <div className="empty">
          <p className="big">Elige una edición ⚓</p>
          <p className="muted">
            Verás todas las cartas del set. Marca las que tienes y el resto quedará en “Me faltan”.
          </p>
        </div>
      )}

      {selected && load.error && <p className="hint error">{load.error}</p>}
      {selected && load.busy && !catalog && <p className="hint">Descargando cartas del set…</p>}

      {selected && catalog && (
        <>
          <section className="progress-card">
            <div className="progress-head">
              <strong>{selected}</strong>
              <span>{summary.have} / {summary.total} cartas · {pct}%</span>
            </div>
            <div className="progress"><div style={{ width: `${pct}%` }} /></div>
            <div className="progress-stats">
              <span>Valor de lo que tengo: <strong>{fmt(summary.haveValue)}</strong></span>
              <span>Costo de completar (1 de cada una): <strong>{fmt(summary.missingValue)}</strong></span>
            </div>
          </section>

          <nav className="tabs">
            {TABS.map((t) => (
              <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
                {t.label}{' '}
                <span className="count">
                  {t.id === 'all' ? summary.total : t.id === 'have' ? summary.have : summary.missing}
                </span>
              </button>
            ))}
          </nav>

          <section className="toolbar">
            <input
              className="search"
              placeholder="Buscar por nombre o número…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select value={fRarity} onChange={(e) => setFRarity(e.target.value)}>
              <option value="">Toda rareza</option>
              {rarities.map((r) => <option key={r}>{r}</option>)}
            </select>
            <select value={fColor} onChange={(e) => setFColor(e.target.value)}>
              <option value="">Todos los colores</option>
              {COLORS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
            </select>
            {summary.missing > 0 && (
              <button className="btn ghost" onClick={copyMissing}>
                {copied ? '✓ Copiado' : '📋 Copiar faltantes'}
              </button>
            )}
          </section>

          {visible.length === 0 ? (
            <div className="empty">
              <p className="muted">
                {tab === 'missing' && summary.missing === 0
                  ? '🎉 ¡Set completo!'
                  : 'Ninguna carta coincide con los filtros.'}
              </p>
            </div>
          ) : (
            <main className="grid">
              {visible.map((i) => {
                const mine = ownedMap.get(i.code)
                const unit = mine ? num(mine.price) || i.price || 0 : i.price ?? 0
                return (
                  <article
                    className={`card ${mine ? 'have' : 'missing'}`}
                    key={i.code}
                    style={{ '--accent': colorHex(normalizeColor(i.color)) }}
                  >
                    <div className="thumb">
                      {i.image ? (
                        <img
                          src={i.image}
                          alt={i.name}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                      ) : null}
                      <span className="placeholder">{i.code}</span>
                      {i.rarity && <span className="badge rarity">{i.rarity}</span>}
                      {mine && <span className="badge owned">✓</span>}
                    </div>
                    <div className="body">
                      <div className="code">
                        {i.code}
                        {i.variant !== 'Normal' && <span className="pill">{i.variant}</span>}
                      </div>
                      <h3>{i.name || 'Sin nombre'}</h3>

                      <div className="price-row">
                        <div>
                          <span className="small muted">{mine ? 'Precio c/u' : 'Precio de mercado'}</span>
                          <strong>{unit ? fmt(unit) : '—'}</strong>
                        </div>
                        {mine && unit > 0 && (
                          <div className="right">
                            <span className="small muted">Total ×{mine.qty}</span>
                            <strong>{fmt(unit * mine.qty)}</strong>
                          </div>
                        )}
                      </div>

                      <div className="card-actions">
                        {mine ? (
                          <>
                            <div className="qty">
                              <button onClick={() => bump(mine, -1)} aria-label="Quitar uno">−</button>
                              <span>{mine.qty}</span>
                              <button onClick={() => bump(mine, 1)} aria-label="Agregar uno">+</button>
                            </div>
                            <button className="icon" title="Editar (precio pagado, estado…)" onClick={() => onEdit(mine)}>✎</button>
                            <button className="icon danger" title="Quitar de mi colección" onClick={() => unmark(mine)}>✕</button>
                          </>
                        ) : (
                          <button className="btn primary full" onClick={() => markOwned(i)}>
                            + La tengo
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </main>
          )}
        </>
      )}
    </div>
  )
}
