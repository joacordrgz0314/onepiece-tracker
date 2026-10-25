import { useEffect, useMemo, useState } from 'react'

// Animación de inicio: las 6 cartas estrella del OP17 abiertas en abanico, presentadas como
// un panel de manga. Se muestra cada vez que carga la app; la carta del frente va rotando.
// Imágenes de optcgapi.com: la versión alternativa de cada carta es <código>_p2.jpg
const HEROES = [
  { code: 'OP17-118', name: 'Rocks.D.Xebec', title: 'Capitán de los Piratas Rocks', edition: 'Super Alternate Art' },
  { code: 'OP17-022', name: 'Shanks', title: 'Capitán de los Piratas del Pelirrojo', edition: 'Manga' },
  { code: 'OP17-079', name: 'Monkey.D.Luffy', title: 'Capitán de los Piratas del Sombrero de Paja', edition: 'Super Leader Alternate Art' },
  { code: 'OP17-005', name: 'Edward.Newgate', title: 'Capitán de los Piratas de Barbablanca', edition: 'Manga' },
  { code: 'OP17-062', name: 'Kaido', title: 'Capitán de los Piratas de las Bestias', edition: 'Manga' },
  { code: 'OP17-112', name: 'Charlotte Linlin', title: 'Capitana de los Piratas de Big Mom', edition: 'Manga' },
].map((h) => ({ ...h, image: `https://optcgapi.com/media/static/Card_Images/${h.code}_p2.jpg` }))

const KEY = 'op-tracker:intro-card' // índice de la última carta mostrada
const DURATION = 4500 // ms en pantalla una vez lista
const LOAD_TIMEOUT = 5000 // si la carta del frente no carga a tiempo, se omite
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Dela+Gothic+One&display=block'

// Líneas de concentración (集中線) del manga, con semilla fija. Las puntas forman un óvalo
// proporcional a la pantalla para que lleguen desde todos los bordes (también en vertical).
const speedLines = (w, h) => {
  let seed = 17
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const at = (ang, rx, ry = rx) => `${(Math.cos(ang) * rx).toFixed(1)},${(Math.sin(ang) * ry).toFixed(1)}`
  const outer = Math.hypot(w, h) / 2
  return Array.from({ length: 96 }, (_, i) => {
    const a = (i / 96) * Math.PI * 2 + rand() * 0.04
    const spread = 0.005 + rand() * 0.016
    const k = 0.42 + rand() * 0.4
    return `${at(a - spread, outer)} ${at(a + spread, outer)} ${at(a, (k * w) / 2, (k * h) / 2)}`
  })
}

let fontReady
const loadFont = () =>
  (fontReady ??= new Promise((resolve) => {
    const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: FONT_CSS })
    link.onload = () => document.fonts.load('1em "Dela Gothic One"', 'ドンXebec').finally(resolve)
    link.onerror = resolve
    document.head.append(link)
  }))

const loadImage = (src) => {
  const img = new Image()
  img.referrerPolicy = 'no-referrer'
  img.src = src
  return img.decode()
}

// Toca la carta siguiente a la última mostrada; sin almacenamiento, una al azar
const nextTurn = () => {
  try {
    const last = parseInt(localStorage.getItem(KEY), 10)
    return Number.isInteger(last) ? (last + 1) % HEROES.length : 0
  } catch {
    return Math.floor(Math.random() * HEROES.length)
  }
}

export default function Intro() {
  const [turn] = useState(nextTurn)
  const hero = HEROES[turn]
  // el resto del abanico, en el orden en que les tocará ir al frente
  const others = useMemo(
    () => Array.from({ length: HEROES.length - 1 }, (_, i) => HEROES[(turn + 1 + i) % HEROES.length]),
    [turn],
  )
  const [show, setShow] = useState(true)
  const [ready, setReady] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [lines] = useState(() => {
    const { innerWidth: w, innerHeight: h } = window
    return { box: `${-w / 2} ${-h / 2} ${w} ${h}`, points: speedLines(w, h) }
  })

  // Precarga imágenes y fuente; si la carta del frente falla o tarda, la intro se retira sin mostrarse
  useEffect(() => {
    if (!show) return
    try {
      localStorage.setItem(KEY, String(turn))
    } catch {
      /* almacenamiento bloqueado */
    }
    let done = false
    const finish = (ok) => {
      if (done) return
      done = true
      ok ? setReady(true) : setLeaving(true)
    }
    const timeout = setTimeout(() => finish(false), LOAD_TIMEOUT)
    Promise.all([
      loadImage(hero.image),
      loadFont(),
      Promise.allSettled(others.map((h) => loadImage(h.image))),
    ]).then(() => finish(true), () => finish(false))
    return () => {
      done = true
      clearTimeout(timeout)
    }
  }, [show, turn, hero, others])

  useEffect(() => {
    if (!show || leaving) return
    const onKey = (e) => e.key === 'Escape' && setLeaving(true)
    window.addEventListener('keydown', onKey)
    const timer = ready && setTimeout(() => setLeaving(true), DURATION)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(timer)
    }
  }, [show, ready, leaving])

  if (!show) return null

  return (
    <div
      className={`intro${ready ? ' ready' : ''}${leaving ? ' leaving' : ''}`}
      onClick={() => setLeaving(true)}
      onAnimationEnd={(e) => leaving && e.target === e.currentTarget && setShow(false)}
    >
      <svg
        className="intro-lines"
        viewBox={lines.box}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {lines.points.map((points, i) => <polygon key={i} points={points} />)}
      </svg>

      <div className="intro-stage">
        <div className="intro-hand">
          {others.map((h, i) => (
            <div
              className="intro-fan"
              key={h.code}
              style={{ '--a': `${(i - 2) * 12}deg`, '--d': `${0.1 + i * 0.07}s` }}
            >
              <img
                src={h.image}
                alt=""
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
              />
            </div>
          ))}
          <div className="intro-card">
            <div className="intro-face">
              <img src={hero.image} alt={`${hero.name}, ${hero.edition}`} referrerPolicy="no-referrer" />
              <span className="intro-sheen" />
            </div>
            <span className="intro-don" aria-hidden="true">
              ドン<span className="tcy">!!</span>
            </span>
            <p className="intro-caption">
              <small>{hero.title}</small>
              <strong>{hero.name}</strong>
            </p>
          </div>
        </div>
        <p className="intro-meta">
          <b>{hero.code}</b> {hero.edition}
        </p>
      </div>

      <span className="intro-flash" />
      <button className="intro-skip">Saltar</button>
    </div>
  )
}
