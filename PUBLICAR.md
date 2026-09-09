# Cómo terminar de publicar CollaPolio

La web **ya está publicada** en https://collapolio.web.app.
Falta el servidor de partidas, que necesita un proceso Node permanente.
Render no acepta subir código local: hay que pasarlo por un repo Git.

El repositorio local ya está listo y commiteado. Sólo faltan estos tres pasos.

---

## 1. Subir el repo a GitHub

Crea un repositorio vacío en https://github.com/new (privado o público, da
igual; Render lee ambos si conectas la cuenta). **No** le añadas README ni
.gitignore, para que quede vacío.

Luego, desde la carpeta del proyecto:

```bash
cd ~/Documentos/collapolio && git remote add origin https://github.com/TU-USUARIO/collapolio.git && git push -u origin main
```

Te pedirá usuario y un token de acceso (no la contraseña). Si no tienes uno:
GitHub → Settings → Developer settings → Personal access tokens → *Generate new
token (classic)* con permiso `repo`.

---

## 2. Crear el servicio en Render

1. Entra a https://render.com y regístrate (no pide tarjeta).
2. **New → Blueprint**, conecta tu GitHub y elige el repo `collapolio`.
3. Render lee `render.yaml` y configura el servicio solo. Confirma con *Apply*.
4. Cuando pregunte por la variable `CORS_ORIGIN`, pon exactamente:

   ```
   https://collapolio.web.app
   ```

El primer build tarda unos 3-5 minutos. Al terminar, Render te da una URL del
estilo `https://collapolio-server.onrender.com`.

---

## 3. Apuntar la web al servidor

Edita `apps/web/public/config.js` y reemplaza la URL:

```js
window.__COLLAPOLIO_CONFIG__ = {
  serverUrl: 'https://collapolio-server.onrender.com',
};
```

Y despliega el hosting:

```bash
cd ~/Documentos/collapolio && npm run deploy:web
```

Listo. No hace falta recompilar nada más: `config.js` se resuelve en runtime y
Firebase lo sirve con `no-cache`.

---

## Comprobar que funciona

```bash
curl https://collapolio-server.onrender.com/health
```

Debe responder `{"ok":true,...}`. Si tarda ~1 minuto la primera vez, es normal:
el plan gratis duerme el servicio tras 15 minutos sin tráfico.

---

## Para jugar con tus amigos

Entra a https://collapolio.web.app, pulsa **Crear partida privada** y comparte
el enlace corto que sale en el lobby:

```
https://collapolio.web.app/j/ABC123
```

## Lo que hay que saber del plan gratis

- **Arranque en frío**: si nadie jugó en 15 minutos, el primer intento tarda
  ~1 minuto. La web muestra "El servidor de partidas no responde. Puede estar
  despertando: reintenta en un minuto." Es eso.
- **Las salas viven en memoria**: si el servidor se reinicia o se duerme a
  mitad de partida, esa partida se pierde. Para evitarlo hay que añadir un
  Redis (Render ofrece uno gratis de 25 MB) y poner `REDIS_URL` en el servicio.
- **750 horas al mes**: de sobra, porque sólo cuenta el tiempo despierto.
- **Una sola instancia**: correcto para este juego tal como está. Escalar a
  varias requiere Redis *y* el adaptador de Socket.IO para Redis.
