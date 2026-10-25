import { useEffect, useMemo, useRef, useState } from "react";
import CardForm, { withHistory } from "./components/CardForm.jsx";
import Stats from "./components/Stats.jsx";
import SetView from "./components/SetView.jsx";
import Sparkline from "./components/Sparkline.jsx";
import Intro from "./components/Intro.jsx";
import {
  COLORS,
  RARITIES,
  STATUS,
  colorHex,
  colorLabel,
  emptyCard,
  num,
} from "./data.js";
import {
  loadCards,
  saveCards,
  loadSettings,
  saveSettings,
  cardsToCSV,
  csvToCards,
  download,
} from "./storage.js";
import { fetchCardByCode } from "./prices.js";

const SORTS = {
  recent: {
    label: "Más recientes",
    fn: (a, b) => (b.addedAt ?? "").localeCompare(a.addedAt ?? ""),
  },
  code: { label: "Código", fn: (a, b) => a.code.localeCompare(b.code) },
  name: { label: "Nombre", fn: (a, b) => a.name.localeCompare(b.name) },
  price: { label: "Precio (mayor)", fn: (a, b) => num(b.price) - num(a.price) },
  total: {
    label: "Valor total (mayor)",
    fn: (a, b) => num(b.price) * b.qty - num(a.price) * a.qty,
  },
  gain: { label: "Mayor ganancia", fn: (a, b) => gainOf(b) - gainOf(a) },
};

const gainOf = (c) => (num(c.price) - num(c.buyPrice)) * c.qty;

export default function App() {
  const [cards, setCards] = useState(loadCards);
  const [settings, setSettings] = useState(loadSettings);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState("sets");
  const [tab, setTab] = useState("owned");
  const [q, setQ] = useState("");
  const [fSet, setFSet] = useState("");
  const [fColor, setFColor] = useState("");
  const [fRarity, setFRarity] = useState("");
  const [sort, setSort] = useState("recent");
  const [refresh, setRefresh] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => saveCards(cards), [cards]);
  useEffect(() => saveSettings(settings), [settings]);

  // Formato de moneda (los precios se guardan en USD)
  const fmt = (usd) => {
    if (settings.currency === "CLP") {
      return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      }).format(usd * settings.clpRate);
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(usd);
  };

  const owned = cards.filter((c) => c.status === "owned");
  const wish = cards.filter((c) => c.status === "wishlist");

  const stats = useMemo(
    () => ({
      copies: owned.reduce((s, c) => s + c.qty, 0),
      unique: owned.length,
      value: owned.reduce((s, c) => s + num(c.price) * c.qty, 0),
      cost: owned.reduce((s, c) => s + num(c.buyPrice) * c.qty, 0),
      wishCount: wish.length,
      wishValue: wish.reduce((s, c) => s + num(c.price) * c.qty, 0),
    }),
    [cards],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  const sets = useMemo(
    () => [...new Set(cards.map((c) => c.set).filter(Boolean))].sort(),
    [cards],
  );

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return cards
      .filter((c) => c.status === tab)
      .filter((c) => !fSet || c.set === fSet)
      .filter((c) => !fColor || c.color === fColor)
      .filter((c) => !fRarity || c.rarity === fRarity)
      .filter(
        (c) =>
          !term ||
          `${c.code} ${c.name} ${c.set} ${c.notes}`
            .toLowerCase()
            .includes(term),
      )
      .sort(SORTS[sort].fn);
  }, [cards, tab, q, fSet, fColor, fRarity, sort]);

  const upsert = (card) => {
    const next = withHistory(null, card);
    setCards((prev) => {
      const exists = prev.some((c) => c.id === next.id);
      return exists
        ? prev.map((c) => (c.id === next.id ? next : c))
        : [next, ...prev];
    });
    setEditing(null);
  };

  const remove = (card) => {
    if (confirm(`¿Eliminar ${card.code} ${card.name}?`)) {
      setCards((prev) => prev.filter((c) => c.id !== card.id));
    }
  };

  const bump = (card, delta) =>
    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id ? { ...c, qty: Math.max(1, c.qty + delta) } : c,
      ),
    );

  const moveStatus = (card) =>
    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id
          ? { ...c, status: c.status === "owned" ? "wishlist" : "owned" }
          : c,
      ),
    );

  // Actualiza precios de todas las cartas de la pestaña actual (solo versión Normal)
  const refreshPrices = async () => {
    const targets = cards.filter((c) => c.status === tab && c.code);
    const skipped = 0;
    if (targets.length === 0) {
      setRefresh({
        msg: "No hay cartas con código para actualizar.",
        busy: false,
      });
      return;
    }
    let done = 0;
    let failed = 0;
    setRefresh({ msg: `Actualizando 0/${targets.length}…`, busy: true });
    for (const t of targets) {
      try {
        const results = await fetchCardByCode(t.code);
        const r =
          results.find((x) => x.code === t.code) ??
          (t.variant === "Normal" ? results[0] : null);
        if (r?.price != null) {
          setCards((prev) =>
            prev.map((c) =>
              c.id === t.id
                ? withHistory(null, { ...c, price: String(r.price) })
                : c,
            ),
          );
        } else failed++;
      } catch {
        failed++;
      }
      done++;
      setRefresh({
        msg: `Actualizando ${done}/${targets.length}…`,
        busy: true,
      });
      await new Promise((r) => setTimeout(r, 250));
    }
    setRefresh({
      busy: false,
      msg:
        `Listo: ${targets.length - failed} actualizadas, ${failed} sin precio o con error` +
        (skipped ? `, ${skipped} omitidas` : ""),
    });
  };

  const importCSV = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const imported = csvToCards(await file.text());
    if (imported.length === 0)
      return alert("No se encontraron cartas en el CSV");
    setCards((prev) => [...imported, ...prev]);
  };

  const hasFilters = q || fSet || fColor || fRarity;

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>🏴‍☠️ Grand Line Collectors</h1>
          <p className="muted">
            Tu colección de One Piece Card Game. New title
          </p>
        </div>
        <div className="top-actions">
          <div className="seg" title="Moneda de visualización">
            {["USD", "CLP"].map((cur) => (
              <button
                key={cur}
                className={settings.currency === cur ? "on" : ""}
                onClick={() => setSettings((s) => ({ ...s, currency: cur }))}
              >
                {cur}
              </button>
            ))}
          </div>
          {settings.currency === "CLP" && (
            <label className="rate">
              1 USD =
              <input
                type="number"
                min="1"
                value={settings.clpRate}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    clpRate: Math.max(1, parseFloat(e.target.value) || 1),
                  }))
                }
              />
              CLP
            </label>
          )}
          <button
            className="btn primary"
            onClick={() => setEditing(emptyCard())}
          >
            + Agregar carta
          </button>
        </div>
      </header>

      <Stats stats={stats} fmt={fmt} />

      <nav className="viewnav">
        <button
          className={view === "sets" ? "on" : ""}
          onClick={() => setView("sets")}
        >
          🗂 Sets
        </button>
        <button
          className={view === "collection" ? "on" : ""}
          onClick={() => setView("collection")}
        >
          📚 Mi colección
        </button>
      </nav>

      {view === "sets" ? (
        <SetView
          cards={cards}
          setCards={setCards}
          settings={settings}
          setSettings={setSettings}
          fmt={fmt}
          onEdit={setEditing}
        />
      ) : (
        <>
          <nav className="tabs">
            {STATUS.map((s) => (
              <button
                key={s.id}
                className={tab === s.id ? "on" : ""}
                onClick={() => setTab(s.id)}
              >
                {s.label}{" "}
                <span className="count">
                  {cards.filter((c) => c.status === s.id).length}
                </span>
              </button>
            ))}
          </nav>

          <section className="toolbar">
            <input
              className="search"
              placeholder="Buscar por nombre, código o nota…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select value={fSet} onChange={(e) => setFSet(e.target.value)}>
              <option value="">Todos los sets</option>
              {sets.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select value={fColor} onChange={(e) => setFColor(e.target.value)}>
              <option value="">Todos los colores</option>
              {COLORS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              value={fRarity}
              onChange={(e) => setFRarity(e.target.value)}
            >
              <option value="">Toda rareza</option>
              {RARITIES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([k, s]) => (
                <option key={k} value={k}>
                  {s.label}
                </option>
              ))}
            </select>
            {hasFilters && (
              <button
                className="btn ghost"
                onClick={() => {
                  setQ("");
                  setFSet("");
                  setFColor("");
                  setFRarity("");
                }}
              >
                Limpiar
              </button>
            )}
          </section>

          <section className="tools">
            <button
              className="btn ghost"
              onClick={refreshPrices}
              disabled={refresh?.busy}
            >
              ↻ Actualizar precios
            </button>
            <button
              className="btn ghost"
              onClick={() =>
                download("onepiece-coleccion.csv", cardsToCSV(cards))
              }
              disabled={cards.length === 0}
            >
              ⬇ Exportar CSV
            </button>
            <button
              className="btn ghost"
              onClick={() => fileRef.current?.click()}
            >
              ⬆ Importar CSV
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={importCSV}
            />
            {refresh && <span className="hint">{refresh.msg}</span>}
          </section>

          {visible.length === 0 ? (
            <div className="empty">
              {cards.length === 0 ? (
                <>
                  <p className="big">Tu cofre está vacío ⚓</p>
                  <p className="muted">
                    Agrega tu primera carta con el botón de arriba. Escribe el
                    código (por ejemplo <code>OP01-001</code>) y usa “Buscar
                    datos y precio”.
                  </p>
                </>
              ) : (
                <p className="muted">Ninguna carta coincide con los filtros.</p>
              )}
            </div>
          ) : (
            <main className="grid">
              {visible.map((c) => {
                const unit = num(c.price);
                const gain = gainOf(c);
                const hasBuy = c.buyPrice !== "" && c.buyPrice != null;
                return (
                  <article
                    className="card"
                    key={c.id}
                    style={{ "--accent": colorHex(c.color) }}
                  >
                    <div className="thumb">
                      {c.image ? (
                        <img
                          src={c.image}
                          alt={c.name}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="placeholder">{c.code || "?"}</span>
                      )}
                      <span className="badge rarity">{c.rarity}</span>
                    </div>
                    <div className="body">
                      <div className="code">
                        {c.code} <span className="dot" /> {colorLabel(c.color)}
                      </div>
                      <h3>{c.name || "Sin nombre"}</h3>
                      <p className="meta">
                        {c.variant !== "Normal" && (
                          <span className="pill">{c.variant}</span>
                        )}
                        <span className="pill">{c.condition}</span>
                        <span className="pill">{c.type}</span>
                      </p>

                      <div className="price-row">
                        <div>
                          <span className="small muted">Precio c/u</span>
                          <strong>{unit ? fmt(unit) : "—"}</strong>
                        </div>
                        <Sparkline data={c.history} />
                      </div>

                      <div className="price-row">
                        <div>
                          <span className="small muted">Total ×{c.qty}</span>
                          <strong>{unit ? fmt(unit * c.qty) : "—"}</strong>
                        </div>
                        {hasBuy && unit > 0 && (
                          <span
                            className={`delta ${gain >= 0 ? "up" : "down"}`}
                          >
                            {gain >= 0 ? "▲" : "▼"} {fmt(Math.abs(gain))}
                          </span>
                        )}
                      </div>

                      {c.notes && <p className="notes">{c.notes}</p>}

                      <div className="card-actions">
                        <div className="qty">
                          <button
                            onClick={() => bump(c, -1)}
                            aria-label="Quitar uno"
                          >
                            −
                          </button>
                          <span>{c.qty}</span>
                          <button
                            onClick={() => bump(c, 1)}
                            aria-label="Agregar uno"
                          >
                            +
                          </button>
                        </div>
                        <button
                          className="icon"
                          title={
                            c.status === "owned"
                              ? "Mover a deseos"
                              : "Ya la tengo"
                          }
                          onClick={() => moveStatus(c)}
                        >
                          {c.status === "owned" ? "☆" : "✓"}
                        </button>
                        <button
                          className="icon"
                          title="Editar"
                          onClick={() => setEditing(c)}
                        >
                          ✎
                        </button>
                        <button
                          className="icon danger"
                          title="Eliminar"
                          onClick={() => remove(c)}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </main>
          )}
        </>
      )}

      <footer className="foot muted small">
        Los datos se guardan en este navegador (localStorage). Exporta un CSV
        para respaldarlos. Precios de referencia en USD (mercado TCGplayer vía
        optcgapi.com).
      </footer>

      {editing && (
        <CardForm
          initial={editing}
          currencyLabel={settings.currency}
          onSave={upsert}
          onCancel={() => setEditing(null)}
        />
      )}

      <Intro />
    </div>
  );
}
