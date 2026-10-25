export default function Stats({ stats, fmt }) {
  const gain = stats.value - stats.cost
  const pct = stats.cost > 0 ? (gain / stats.cost) * 100 : null
  const tiles = [
    { label: 'Cartas totales', value: stats.copies, sub: `${stats.unique} únicas` },
    { label: 'Valor actual', value: fmt(stats.value), sub: 'precio de mercado' },
    { label: 'Invertido', value: fmt(stats.cost), sub: 'precio pagado' },
    {
      label: 'Ganancia / pérdida',
      value: `${gain >= 0 ? '+' : ''}${fmt(gain)}`,
      sub: pct == null ? '—' : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
      tone: gain > 0 ? 'up' : gain < 0 ? 'down' : '',
    },
    { label: 'Lista de deseos', value: stats.wishCount, sub: stats.wishCount ? `≈ ${fmt(stats.wishValue)}` : 'vacía' },
  ]
  return (
    <section className="stats">
      {tiles.map((t) => (
        <div className={`tile ${t.tone ?? ''}`} key={t.label}>
          <span className="tile-label">{t.label}</span>
          <strong className="tile-value">{t.value}</strong>
          <span className="tile-sub">{t.sub}</span>
        </div>
      ))}
    </section>
  )
}
