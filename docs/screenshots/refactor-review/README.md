# Revisión visual del refactor

Comparación píxel a píxel entre las capturas del commit 4c60c70 y las generadas tras el refactor con el mismo escenario automatizado.

- Catálogo: 0 píxeles diferentes.
- Variables de comunicados: 0 píxeles diferentes.
- Creación de componentes: 4324 píxeles diferentes (0,178 %), limitados al color y sombra del botón Guardar, en el rectángulo (1450, 1431)–(1551, 1480). Las dimensiones, el contenido y el espaciado coinciden.

`comparison.json` contiene los resultados. Las imágenes `before-button.png` y `after-button.png` permiten revisar el cambio; las imágenes diff muestran la diferencia absoluta y su versión amplificada.

El escenario usa servicios y permisos simulados, con HTML real de las plantillas. No sustituye una prueba de envío de correo.
