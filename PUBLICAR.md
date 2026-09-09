# CollaPolio — cómo está publicado

**Jugar:** https://collapolio.web.app

| Pieza | Dónde | URL |
|---|---|---|
| Web (estática) | Firebase Hosting, sitio `collapolio` del proyecto `polla-jets` | https://collapolio.web.app |
| Servidor de partidas | Render, plan gratis, región Virginia | https://collapolio-server.onrender.com |
| Código | GitHub | https://github.com/ariquezadat/COLLAPOLIO |

---

## Invitar a jugar

Crea una partida privada y comparte el enlace corto del lobby:

```
https://collapolio.web.app/j/ABC123
```

También sirve el código de 6 letras: los demás entran por **Todas las salas**
o pegando el enlace.

---

## Actualizar

### La web

```bash
cd ~/Documentos/collapolio && npm run deploy:web
```

Compila el export estático y lo sube a Firebase. Tarda ~1 minuto.

### El servidor

```bash
cd ~/Documentos/collapolio && git push
```

Render tiene `autoDeploy` activado: cada push a `main` redespliega solo.
La autenticación es por clave SSH, no pide nada.

### Cambiar el servidor sin recompilar

`apps/web/public/config.js` define la URL del servidor y se resuelve en
runtime. Para apuntar a otro servidor se edita ese archivo y se despliega el
hosting; Firebase lo sirve con `no-cache`, así que el cambio es inmediato.

Si cambias el dominio de la web, hay que actualizar también `CORS_ORIGIN` en
Render (servicio → Environment), o el navegador bloqueará las conexiones.

---

## Lo que hay que saber del plan gratis de Render

- **No se duerme, medido.** Render documenta que un servicio gratis se apaga
  tras 15 minutos sin tráfico, pero `render.yaml` define
  `healthCheckPath: /health` y Render consulta ese endpoint por su cuenta, lo
  que cuenta como actividad. Dos pruebas con silencio total (17 y 35 minutos)
  encontraron el proceso vivo, con 54 minutos seguidos de uptime, respondiendo
  en 0,44-0,60 s. Si alguna vez quitas el health check, volverá a dormirse.
- **Cuidado con la cuota**: 750 horas de instancia al mes. Estar siempre
  encendido gasta ~744 h en un mes de 31 días, así que cabe pero con poco
  margen. Si añades un segundo servicio gratis, te pasas y Render los suspende
  hasta el mes siguiente.
- **Latencia en partida**: ~180 ms desde Sudamérica (región Virginia).
- **Las salas viven en memoria**: si el servidor se reinicia (por ejemplo al
  desplegar), las partidas en curso se pierden. Para evitarlo hay que crear un
  Redis en Render (gratis, 25 MB) y poner `REDIS_URL` en el servicio.
- **Una sola instancia**: correcto tal como está el juego. Escalar a varias
  requiere Redis *y* el adaptador de Socket.IO para Redis.

---

## Comprobar que todo está vivo

```bash
curl https://collapolio-server.onrender.com/health
```

Debe responder `{"ok":true,...}`. Si tarda, es el arranque en frío.
