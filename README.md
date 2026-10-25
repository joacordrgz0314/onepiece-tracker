# Grand Line Collector · One Piece TCG

App en React + Vite para llevar tu colección de One Piece Card Game y el valor de tus cartas.

## Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| Node.js | 22.13 o superior. Recomendado **24 LTS** (probado con 24.16.0) | ejecuta las herramientas de desarrollo (Vite); pnpm 11 exige Node ≥ 22.13 |
| pnpm | **11** (probado con 11.5.0) | instala las librerías del proyecto en `node_modules/`. `pnpm-workspace.yaml` usa `allowBuilds`, la regla de pnpm 11 que deja a esbuild (motor de Vite) ejecutar su instalación |
| Navegador | Chrome o Edge 105+, Safari 16+, Firefox 110+ | la animación de inicio usa unidades de contenedor (`cqw`) |
| Internet | — | catálogo, precios e imágenes vienen de optcgapi.com; la fuente de la intro, de Google Fonts |

No hace falta backend, base de datos, variables de entorno ni claves de API.

## Instalación paso a paso

Pensada para quien nunca ha instalado Node. Solo hay que hacerla una vez por equipo.

### 1. Abre una terminal

- **macOS:** pulsa `Cmd + Espacio`, escribe "Terminal" y pulsa Enter.
- **Windows:** abre el menú Inicio, escribe "PowerShell" y ábrelo.
- **Linux:** abre la terminal de tu distribución.

Todos los comandos de esta guía se escriben ahí, uno por línea, pulsando Enter después de cada uno.

### 2. Instala Node.js 24

Node.js permite ejecutar JavaScript fuera del navegador. Lo usan las herramientas que levantan la app.

**macOS y Linux: con nvm**

nvm instala Node sin pedir permisos de administrador y permite cambiar de versión más adelante.

1. Solo en macOS, crea el archivo de configuración de la terminal (si ya existe, no pasa nada):

   ```bash
   touch ~/.zshrc
   ```

2. Instala nvm:

   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash
   ```

   Si macOS te ofrece instalar las "herramientas de línea de comandos para desarrolladores", acepta
   y, cuando termine, repite este paso.

3. **Cierra la terminal y abre una nueva**, para que reconozca el comando `nvm`.
4. Instala Node 24 y déjalo como versión por defecto:

   ```bash
   nvm install 24
   nvm alias default 24
   ```

**Windows: con el instalador oficial**

1. Entra en https://nodejs.org/es/download y descarga el instalador **LTS 24** para Windows (`.msi`).
2. Ábrelo y avanza con las opciones por defecto.
3. **Cierra PowerShell y abre uno nuevo.**
4. Permite que PowerShell ejecute los comandos de Node (solo afecta a tu usuario):

   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   ```

   Responde `S` (o `Y`) si te pide confirmación.

### 3. Comprueba que Node funciona

```bash
node -v
npm -v
```

El primero debe mostrar `v24.` seguido de más números. Si sale "command not found" o "no se reconoce",
cierra la terminal, abre una nueva y vuelve a probar.

### 4. Instala pnpm

npm viene incluido con Node; con él se instala pnpm, el gestor de paquetes que usa este proyecto:

```bash
npm install -g pnpm@11
pnpm -v
```

Debe mostrar `11.` seguido de más números.

### 5. Instala el proyecto y ábrelo

1. Ve a la carpeta del proyecto con `cd`. Truco: escribe `cd ` (con espacio) y arrastra la carpeta
   `onepiece-tracker` a la terminal; se completa la ruta sola.

   ```bash
   cd ruta/a/onepiece-tracker
   ```

2. Instala las librerías del proyecto (la primera vez tarda un poco):

   ```bash
   pnpm install
   ```

3. Levanta la app:

   ```bash
   pnpm dev
   ```

4. Abre http://localhost:5173 en el navegador.

Al abrir se muestra una animación de unos 4 s con cartas del OP17; se salta con un clic, "Saltar"
o Esc. Para apagar la app, vuelve a la terminal y pulsa `Ctrl + C`.

Las próximas veces basta con abrir la terminal, entrar a la carpeta con `cd` y ejecutar `pnpm dev`.

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | servidor de desarrollo con recarga en caliente, en http://localhost:5173 |
| `pnpm build` | genera la web estática en `dist/` |
| `pnpm preview` | sirve `dist/` en http://localhost:4173 para probar el build |

No hay tests ni linter configurados.

## Red y servicios externos

- `vite.config.js` redirige `/optcg/...` a `https://optcgapi.com/...`. Ese proxy solo existe con
  `pnpm dev` y `pnpm preview`.
- Sin proxy, `src/prices.js` llama directo a optcgapi.com, que permite CORS, así que el build
  también funciona.
- Sin conexión la app abre y conserva tu colección, pero solo verás los sets que ya estén en caché,
  no se actualizan precios ni imágenes y la animación de inicio se salta.

## Publicar el build

`pnpm build` deja una web estática en `dist/` que se puede servir desde cualquier hosting estático.
Si se publica en una subruta (por ejemplo `/tracker/`), hay que ajustar `base` en `vite.config.js`.

Los datos de cada persona viven en el `localStorage` de su navegador. Para pasarlos a otro equipo,
usa Exportar e Importar CSV.

## Problemas frecuentes

- **`nvm: command not found` justo después de instalarlo:** cierra la terminal y abre una nueva. En
  macOS, comprueba que existe `~/.zshrc` (paso 2.1) y repite la instalación de nvm.
- **`pnpm: command not found` o "no se reconoce":** cierra y abre la terminal; si sigue, repite
  `npm install -g pnpm@11`.
- **Windows: "la ejecución de scripts está deshabilitada en este sistema":** ejecuta
  `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` y abre un PowerShell nuevo.
- **pnpm avisa que tu versión de Node no es compatible:** necesitas Node 22.13 o superior. Con nvm:
  `nvm install 24` y `nvm use 24`; en Windows, instala la LTS 24 desde nodejs.org.
- **Aviso de scripts de instalación ignorados (esbuild) y `pnpm dev` falla:** comprueba que usas
  pnpm 11 (`pnpm -v`) o ejecuta `pnpm approve-builds` y aprueba esbuild.
- **El puerto 5173 está ocupado:** Vite usa el siguiente libre; mira la URL que muestra la terminal.
- **No cargan precios ni sets:** revisa la conexión. La API es pública y a veces falla; la app sigue
  funcionando con precios manuales.

## Vista de Sets

- Elige una edición (OP01, OP02, EB01, starter decks, etc.) y verás todas las cartas del set.
- Botón **+ La tengo** para marcar cada carta; con − / + ajustas la cantidad.
- Pestañas **Todas / Tengo / Me faltan**, con barra de progreso, valor de lo que tienes
  y costo estimado de completar el set. "Copiar faltantes" deja la lista en el portapapeles.
- Cada carta que tienes muestra su precio c/u y total; "Actualizar set y precios" refresca el
  catálogo y el precio de tus cartas de ese set. El set se guarda en caché local.
- Lo que marcas aquí aparece también en "Mi colección".

## Funciones

- Agregar, editar y eliminar cartas (código, nombre, set, rareza, color, tipo, versión, condición, cantidad, notas)
- Pestañas: **En colección** y **Lista de deseos**
- Precio pagado vs. precio actual → ganancia/pérdida por carta y total
- Historial de precios por carta (mini gráfico)
- Búsqueda y filtros por set, color y rareza; varios órdenes
- Visualización en USD o CLP (tipo de cambio editable)
- "Buscar datos y precio" por código (ej. `OP01-001`) usando optcgapi.com
- "Actualizar precios" para todas las cartas de la pestaña actual (solo versión Normal)
- Exportar / importar CSV (respaldo)
- Datos guardados en `localStorage` del navegador

## Notas sobre precios

- Los precios se guardan en USD (referencia TCGplayer vía optcgapi.com).
- La integración está en `src/prices.js`. Si la API falla o cambia de formato, la app
  sigue funcionando con precios manuales. Es el único archivo a ajustar.
- Para cartas Parallel / Alt Art / Manga, el precio se elige manualmente al buscar
  (la API devuelve varias versiones por código).

## Estructura

```
src/
  App.jsx            pantalla principal, filtros, grilla
  components/        CardForm, Stats, Sparkline
  data.js            constantes y modelo de carta
  storage.js         localStorage y CSV
  prices.js          consulta de precios
  styles.css
```
