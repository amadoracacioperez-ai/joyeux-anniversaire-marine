# Joyeux anniversaire 🎂

Pequeño juego web (HTML, CSS y JS, sin compilación) publicado con GitHub Pages.

## Probar en local

```sh
python3 -m http.server 8000
# abre http://localhost:8000
```

- `?test`: muestra un botón «⏭ Passer» en cada candado para avanzar rápido.
- `?reset`: borra el progreso guardado en ese navegador.

## Editar los textos

El contenido va codificado en `js/contenu.js` para que no se lea a simple vista.

1. `node outils/encoder.mjs --decode` recrea `contenu.source.json` (este archivo no se sube al repo).
2. Edita `contenu.source.json`.
3. `node outils/encoder.mjs` regenera `js/contenu.js`.

## Imagen de vista previa

`img/apercu.png` (1200×630) es una captura de `outils/apercu.html`.
