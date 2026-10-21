# Escuela de Póker

Aplicación web para aprender Texas Hold'em No Limit desde cero, con fichas ficticias. Es una web estática: no necesita servidor propio, servicios externos ni claves de API. El progreso se guarda en el navegador (`localStorage`), sin registro.

## Probarla en local

```
npm start
```

Abre http://localhost:8123. También funciona abriendo `index.html` directamente en el navegador.

Para ver la versión de producción tal como quedará en Netlify (con las mismas cabeceras de seguridad):

```
npm run build
npm run preview
```

## Publicar en Netlify

`npm run build` comprueba el motor del juego y genera la carpeta `dist/`, que es lo que se publica:

- `assets/app.<huella>.js` y `assets/app.<huella>.css`: todo el código en dos archivos con huella de contenido, que el navegador puede guardar en caché un año.
- `_headers`: política de seguridad de contenidos (CSP) y demás cabeceras, más la caché larga de `assets/`.
- `404.html`, `manifest.webmanifest`, `robots.txt` e `img/icon.svg`.

Hay tres formas de subirla:

1. **Desde un repositorio Git** (recomendado: cada `git push` vuelve a publicar). Sube el proyecto a GitHub, GitLab o Bitbucket y, en Netlify, elige *Add new site → Import an existing project*. `netlify.toml` ya indica el comando (`npm run build`), la carpeta (`dist`) y la versión de Node.
2. **Netlify Drop, sin cuenta de Git.** Ejecuta `npm run build` y arrastra la carpeta `dist` a https://app.netlify.com/drop.
3. **Netlify CLI.** Con la CLI instalada: `npm run build` y después `netlify deploy --prod --dir=dist`.

Las rutas internas usan `#/…`, así que no hace falta configurar redirecciones.

## Comprobaciones del motor

```
npm test
```

Prueba el evaluador (escalera baja, color contra color, full contra full, kickers, la mesa que juega para todos), la baraja, la equity, las reglas No Limit (heads-up, subida mínima, all-in incompleto, opción de la BB, rotación del botón), los botes secundarios y la conservación de fichas en 400 manos entre bots. Netlify las ejecuta en cada despliegue y no publica si alguna falla.

## Versión de prueba en Claude (artefacto)

`npm run build:artifact` junta la app en un solo archivo, `artifact/escuela-poker.html`, con el formato que pide el visor de artefactos. Está publicada en https://claude.ai/artifact/UNbhdVTidnhQfBB74Y3Xof (privada hasta que la compartas). Con `npm start`, http://localhost:8123/artifact/escuela-poker.html muestra ese archivo como lo verá el visor.

## Estructura

| Archivo | Contenido |
| --- | --- |
| `index.html`, `css/styles.css` | Estructura de la app y sistema visual (temas claro y oscuro, animaciones) |
| `js/core.js` | Cartas, barajado Fisher-Yates con `crypto`, evaluador de 5–7 cartas, equity (exacta o Monte Carlo, también asíncrona), rangos, outs, nuts y textura de la mesa |
| `js/preflop-data.js` | Orden de las 169 manos iniciales (generado con `tools/gen-preflop.js`) |
| `js/game.js` | Mesa No Limit (ciegas, orden de acción, botes secundarios), bots con perfiles y entrenador |
| `js/content.js` | Glosario, 6 niveles (lecciones y exámenes), escenarios guiados, test inicial e insignias |
| `js/minigames.js` | Los 10 minijuegos |
| `js/ui.js` | Estado guardado, XP, racha, reto diario, sonido, iconos, fichas, cartas, tabla 13×13 y glosario |
| `js/play.js` | Partida contra bots, modo entrenador, revisión de manos y simulador de riesgo |
| `js/app.js` | Pantallas y navegación |
| `tools/build-site.js` | Genera `dist/` para Netlify |
| `tools/build-artifact.js` | Genera la versión de un solo archivo para Claude |
| `tools/serve.js` | Servidor local de pruebas |
