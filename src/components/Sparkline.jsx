// Mini gráfico de línea (SVG) para el historial de precios de una carta
export default function Sparkline({ data, width = 90, height = 28 }) {
  if (!data || data.length < 2) {
    return <span className="muted small">sin historial</span>
  }
  const values = data.map((d) => d.price)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (width - 4) + 2
      const y = height - 3 - ((v - min) / span) * (height - 6)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const up = values[values.length - 1] >= values[0]
  return (
    <svg width={width} height={height} role="img" aria-label="historial de precio">
      <polyline
        points={pts}
        fill="none"
        stroke={up ? 'var(--up)' : 'var(--down)'}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
