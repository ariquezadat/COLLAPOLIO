# CollaPolio

Juego de mesa multijugador de economía de propiedades, en tiempo real y directo
en el navegador. Alternativa libre, con identidad, tablero, cartas,
ilustraciones y sonidos **100% originales**.

> Compra la cuadra. Cobra la renta. Quiebra a tus amigos.

---

## Arquitectura

El servidor es la **única fuente de verdad**. El cliente nunca calcula dinero,
tiradas ni rentas: sólo renderiza estado y emite intenciones.

```
packages/engine     Reglas puras + tests (sin UI, sin red)
apps/server         Socket.IO + Redis + Postgres opcional
apps/web            Next.js 14 (App Router) + Tailwind + Zustand + Framer Motion
```

Cada sala es una máquina de estados con estas fases:

```
LOBBY → ROLLING → MOVING → RESOLVING_TILE → AWAITING_ACTION
              ↘ AUCTION ↗            ↘ TURN_END → GAME_OVER
```

Toda mutación pasa por `reduce(state, action)`, una función pura y determinista
(el PRNG vive dentro del estado). Cada acción se valida contra el jugador en
turno y contra la fase actual; si no procede, el reducer devuelve un `error` y
el estado no cambia.

### Por qué el reducer es puro

Los dados salen de un `mulberry32` cuyo estado (`state.rng`) viaja dentro del
`GameState`. Eso hace que una partida sea reproducible y que los tests puedan
forzar tiradas concretas sin mockear nada.

---

## Puesta en marcha

```bash
npm install
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env.local

npm run dev:server   # :4000
npm run dev:web      # :3000
```

Redis y Postgres son **opcionales**. Sin `REDIS_URL` las salas viven en memoria;
sin `DATABASE_URL` no se guarda historial. El juego funciona igual.

### Tests

```bash
npm test
```

60 tests sobre el reducer: rentas (base, set completo, casas, hipoteca,
ferrocarriles, servicios), construcción pareja, hipotecas, flujo de turno,
dobles, cárcel, cartas, subastas, intercambios, deuda y quiebra.

---

## Reglas implementadas

| Regla | Detalle |
|---|---|
| Inicio | $1500 configurable, tablero de 40 casillas |
| Turno | 2 dados; dobles → tirada extra; 3 dobles seguidos → cárcel |
| Salida | +$200 al pasar (configurable) |
| Compra | Precio de lista, o subasta si está activada |
| Subasta | Pujas por incrementos, timer que se reinicia con cada puja, gana el mayor postor |
| Renta | Automática; set completo sin construir → x2 |
| Construcción | Sólo con set completo, en turno propio, pareja (máx. 1 casa de diferencia); 4 casas → hotel |
| Hipoteca | 50% del valor; no cobra renta; levantarla cuesta +10% |
| Cárcel | Fianza $50, carta de indulto, o dobles (3 intentos) |
| Servicios | Dados × 4 (uno) o × 10 (ambos) |
| Ferrocarriles | 25 / 50 / 100 / 200 según cantidad |
| Cartas | 16 de Suerte + 16 de Arca; se barajan y los descartes se reintegran |
| Quiebra | Liquidar o quebrar; los activos pasan al acreedor o al banco |
| Trading | Propiedades + dinero + cartas por ambos lados, con contraoferta |
| Timer | Configurable; al expirar se auto-juega la acción mínima |
| Bots | Compran si el efectivo supera 2× el precio o si completan un set; construyen; pujan hasta su techo; aceptan trades con ganancia neta |

### Detalles de criterio

- **Hipotecar y vender casas se permite fuera de turno.** Es la única forma de
  reunir efectivo cuando te cae una renta encima sin ser tu turno. Construir sí
  exige turno propio.
- **`PAY_EACH` con fondos insuficientes** abre una deuda repartida: si el
  jugador quiebra, los activos van al banco en vez de a un acreedor único.
- **Salir de la cárcel con dobles no concede tirada extra.**
- **La fase `TRADING` existe en el protocolo pero los intercambios son
  concurrentes**: se proponen y responden en cualquier fase sin bloquear el
  turno, que es como se juega en la práctica.
- El tope de 32 casas / 12 hoteles del juego físico **no** está implementado:
  el banco tiene construcciones ilimitadas.

---

## Eventos de socket

**Cliente → Servidor**
`join_room`, `leave_room`, `create_room`, `quick_play`, `list_rooms`, `resync`,
`start_game`, `add_bot`, `kick_player`, `set_settings`, `roll_dice`, `ack_card`,
`buy_property`, `decline_purchase`, `bid`, `pass_bid`, `build_house`,
`sell_house`, `mortgage`, `unmortgage`, `propose_trade`, `respond_trade`,
`cancel_trade`, `pay_bail`, `use_jail_card`, `end_turn`, `declare_bankruptcy`,
`chat_message`

**Servidor → Cliente**
`room_state` (snapshot completo), `state_patch` (delta), `dice_rolled`,
`player_moved`, `tile_resolved`, `auction_started`, `auction_bid`,
`auction_won`, `trade_proposed`, `trade_resolved`, `player_bankrupt`,
`game_over`, `card_drawn`, `money_changed`, `log_entry`, `chat_message`,
`player_disconnected`

### Deltas

`state_patch` sólo lleva las claves raíz que cambiaron y las entradas
modificadas de `players` y `board`. El registro viaja aparte como eventos
`log_entry` para no reenviar el array completo en cada acción.

### Reconexión

El id de jugador vive en `localStorage`. Al reconectar, el cliente emite
`resync` y recibe un `room_state` completo. Un jugador desconectado se
auto-juega a los 60 s para que la partida no se congele.

---

## Seguridad

- **Toda** acción se valida en el servidor: fase, turno, propiedad, fondos.
- Los payloads se filtran por forma y rango antes de llegar al reducer
  (`apps/server/src/validate.ts`); las claves desconocidas se descartan.
- El `tradeId` lo genera el servidor, no el cliente.
- Rate limiting por socket con token bucket (25 tokens, 8/s de recarga).
- Nicks y chat se sanitizan de caracteres de control.

---

## Dirección visual

- Fondo casi negro con tinte frío (`#070A11`), superficies elevadas un paso más
  claras, bordes de 1px a baja opacidad, radios de 16–26px.
- Acento violeta `#7C6BFF` y menta `#34E0B4`; cada jugador tiene su color con
  glow suave.
- Tipografía geométrica redondeada (Outfit), pesos 500–800 para cifras, y
  `tabular-nums` en todo el dinero.
- Microinteracciones: hover a escala 1.02, dados 3D con rebote, contador de
  dinero animado, pulso en el jugador activo.

### Dos decisiones que se apartan del brief

1. **Las ilustraciones isométricas son SVG, no `.webp`.** Escalan sin pérdida,
   heredan la paleta del tema (light/dark) y pesan menos que cualquier bitmap
   equivalente. Están en `apps/web/src/components/Iso.tsx`.
2. **Los sonidos se sintetizan con WebAudio** (`apps/web/src/lib/sound.ts`) en
   vez de usar samples de terceros. Cero dudas de licencia y cero bytes de
   descarga.

---

## Despliegue

Está publicado en dos piezas, porque el juego necesita un proceso Node
permanente que Firebase Hosting no puede correr.

| Pieza | Dónde | Cómo |
|---|---|---|
| Web (estática) | Firebase Hosting — `collapolio.web.app` | `npm run deploy:web` |
| Servidor de partidas | Render (plan gratis) | push al repo; Render lee `render.yaml` |

### La URL del servidor no está en el build

`apps/web/public/config.js` define `window.__COLLAPOLIO_CONFIG__.serverUrl` y se
carga antes que la app. Para repuntar la web a otro servidor se edita ese
archivo y se despliega el hosting: **no hace falta recompilar**. Firebase sirve
`config.js` con `no-cache` para que el cambio sea inmediato.

### Web en Firebase

```bash
npm run deploy:web
```

Compila el export estático a `apps/web/out` y lo sube al sitio `collapolio`.
`firebase.json` ya trae los redirects (`/` → `/es`, `/j/CODIGO` → la sala) y las
cabeceras de caché y seguridad.

### Servidor en Render

`render.yaml` es un Blueprint: al conectar el repo, Render crea el servicio
solo. Sólo hay que rellenar `CORS_ORIGIN` con el dominio del hosting.

El plan gratis duerme el servicio tras 15 min sin tráfico y tarda ~1 min en
despertar; con 750 h/mes alcanza de sobra para partidas con amigos. Las salas
viven en memoria, así que un reinicio se lleva las partidas en curso: para que
sobrevivan hay que añadir `REDIS_URL`.

Si escalas a más de una instancia necesitas `REDIS_URL` **y** el adaptador de
Socket.IO para Redis, porque hoy los broadcast son por instancia.

### Alternativa: Vercel + Railway/Fly

Siguen soportados. `vercel.json`, `railway.json`, `fly.toml` y
`apps/server/Dockerfile` están en el repo. Para Vercel hay que quitar
`output: 'export'` de `next.config.mjs` y recuperar SSR.

### Base de datos (opcional)

```bash
npm run prisma:generate --workspace=@collapolio/server
npm run prisma:deploy   --workspace=@collapolio/server
```

Guarda perfiles, historial de partidas y estadísticas acumuladas. El juego
nunca depende de ella.

---

## Estado

- Motor de reglas: completo, 60 tests en verde.
- Servidor: completo, verificado de punta a punta con bots.
- Frontend: landing SSR, browser de salas, lobby, partida, modales, PWA, i18n
  (es/en), sonido y animaciones.
- Pendiente: cuentas registradas (el esquema existe, falta el flujo de login) y
  el adaptador de Redis para Socket.IO multi-instancia.
