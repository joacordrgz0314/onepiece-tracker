# Grand Line Collector (onepiece-tracker)

App personal en React 18 + Vite 5 para llevar la colección de One Piece Card Game y el valor de las
cartas. Los datos viven en `localStorage` del navegador; no hay backend. El proyecto no es un repo git.

## Regla principal: ningún cambio sin aprobación previa

Nunca crees, edites, muevas ni borres archivos del proyecto sin que el usuario lo haya aprobado
explícitamente ("sí", "aplica", "ejecuta", "hazlo").

1. Investiga en modo lectura: archivos afectados, causa, alternativas.
2. Propón el plan y, cuando aplique, el diff exacto. Si hay decisiones abiertas, pregúntalas en el
   mismo mensaje con una opción recomendada.
3. Detente y espera la aprobación.
4. Aplica solo lo aprobado.
5. Verifica (ver abajo) y reporta qué se comprobó y qué no.
6. Cierra con un handoff (ver abajo). Es parte del cambio aprobado y no necesita otra aprobación.

- Una aprobación cubre solo el cambio propuesto. Un cambio nuevo necesita una aprobación nueva.
- Una pregunta ("¿se puede…?", "¿cómo haría…?") no es una aprobación.
- Si el usuario pide "solo el plan", entrega solo el plan, sin tocar archivos.
- Lo que aparezca fuera del plan aprobado (un bug ajeno, una mejora, una dependencia) se reporta
  y se pregunta; no se arregla de paso.
- Los subagentes con permisos de escritura deben recibir en su prompt: "NO edites ni escribas
  archivos, solo propón el diff".
- Esta regla también cubre la configuración, las dependencias, los permisos y los borrados.

## Comandos

```bash
pnpm install
pnpm dev       # http://localhost:5173
pnpm build
pnpm preview
```

Usa siempre pnpm, nunca npm. El README dice `npm`, pero está desactualizado. No hay tests ni linter
configurados; no los agregues sin aprobación.

## Estructura

```
src/
  main.jsx             monta <App /> en StrictMode
  App.jsx              pantalla principal, vista "Mi colección", filtros, grilla
  components/
    SetView.jsx        vista de Sets (catálogo por edición, progreso, faltantes)
    CardForm.jsx       modal para agregar/editar carta
    Stats.jsx          tarjetas de resumen
    Sparkline.jsx      mini gráfico de historial de precio
    Intro.jsx          animación de inicio (ver abajo)
  data.js              constantes de dominio y modelo de carta
  sets.js              catálogo de sets con caché en localStorage
  prices.js            cliente de optcgapi.com y mapCard()
  storage.js           localStorage y CSV
  styles.css           todos los estilos
```

## Archivos protegidos

`index.html`, `package.json` y `vite.config.js` tienen permisos de solo lectura (444). No los
edites ni cambies sus permisos sin aprobación explícita.

## Convenciones de código

- JavaScript (no TypeScript), ESM, componentes de función con hooks.
- Sin punto y coma, comillas simples, 2 espacios, coma final en listas multilínea.
- Comentarios y textos de interfaz en español. Comentarios breves que explican el porqué.
- No agregues dependencias npm sin aprobación.

### Estilos

- CSS plano en `src/styles.css`, sin preprocesadores ni CSS-in-JS.
- Colores como tokens en `:root`, redefinidos en `@media (prefers-color-scheme: light)`.
- Cada bloque nuevo va al final con un comentario `/* ---- nombre ---- */` y clases con prefijo
  propio (por ejemplo `.intro-*`).
- La interfaz debe funcionar a 390 px de ancho sin desborde horizontal.
- Las animaciones respetan `prefers-reduced-motion`.

### Datos y API

- Claves de `localStorage` con prefijo `op-tracker:`. Todo acceso va en `try/catch` y la app debe
  funcionar aunque el almacenamiento esté bloqueado.
- La integración con optcgapi.com vive en `prices.js` (cliente y `mapCard()`) y `sets.js`
  (catálogo). Si la API cambia de formato, se ajusta ahí y solo ahí.
- `vite.config.js` define el proxy `/optcg` para evitar CORS en dev y preview.
- Los precios se guardan en USD; CLP es solo de visualización.
- Las imágenes de cartas se enlazan directo a optcgapi con `referrerPolicy="no-referrer"`. Traen
  una marca de agua "SAMPLE": viene de la API, no es un bug.

## Intro (`src/components/Intro.jsx`)

- Estilo panel de manga: líneas de concentración (集中線), las 6 cartas estrella del OP17 en
  abanico, la carta del frente cae con un golpe, "ドン!!" y recuadro de nombre. Se cierra con
  un barrido diagonal.
- Se muestra en cada carga. La carta del frente rota en orden; el índice se guarda en
  `op-tracker:intro-card`.
- Para cambiar las cartas, edita `HEROES` (`code`, `name`, `title`, `edition`). La imagen se
  deriva como `<code>_p2.jpg` en optcgapi; comprueba que exista antes de proponerla.
- Usa colores fijos (no depende del tema claro/oscuro) y `z-index: 20`, por encima de los modales.
- Carga la fuente Dela Gothic One desde Google Fonts solo cuando se muestra. Es la única
  dependencia externa aparte de optcgapi.

## Verificación antes de dar algo por terminado

- `pnpm build` sin errores.
- Cambios visuales: revisar en escritorio (1440×900), móvil vertical (390×844) y móvil
  horizontal (844×390). Si hay animación, también con `prefers-reduced-motion`.
- Reporta con honestidad lo que se verificó y lo que no (por ejemplo, si solo se probó en
  preview y no en `pnpm dev`).
- Al terminar, borra `dist/` si lo generaste y detén los servidores que levantaste.

## Handoff al terminar un cambio

Todo cambio aplicado y verificado se cierra con un handoff que resume lo hecho. Los handoffs viven
fuera del proyecto, en la carpeta central:

`/Users/c.santamaria/Documents/tvup_projects/handoffs/onepiece-tracker/`

- Si la carpeta no existe, créala con su `INDEX.md`.
- Crea un archivo nuevo `NN-YYYY-MM-DD-slug.md`, con NN = el número más alto existente + 1
  (dos dígitos, empezando en `01`).
- Escríbelo en español, con estas partes:
  - título y cabecera con **Fecha** y **Estado** (qué quedó verificado y qué no);
  - **Pedido**: qué pidió el usuario;
  - **Decisiones del usuario**: opciones elegidas y por qué;
  - **Qué se hizo**: archivos tocados y para qué;
  - **Verificación**: build, capturas, viewports revisados;
  - **Pendientes**: lo que quedó abierto o se propuso sin aplicar.
- Añade su línea arriba del todo en `INDEX.md`, con este formato:
  `- **YYYY-MM-DD** — [resumen en una frase](NN-YYYY-MM-DD-slug.md) — estado`
- Nunca edites entradas anteriores. Si algo cambió, va en una entrada nueva.
- Al empezar una tarea, lee `INDEX.md` y abre solo las entradas relevantes.

## Git

Hoy el proyecto no usa git. Si se inicializa:

- Mensajes en inglés, breves, con Conventional Commits, sin trailer `Co-Authored-By`.
- Nunca crees tags, commits de release ni hagas push: eso lo hace el usuario.

.
