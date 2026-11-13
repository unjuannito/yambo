# Revisión de bloques e historial

## Evidencia Git

- `820f75a` conserva las 15 plantillas importadas y la API de elementos comunes.
- `908cccf` contenía una pestaña de elementos comunes, su cliente CRUD y traducciones. Ese checkpoint aparece en el reflog antes de los resets y no es ancestro del HEAD actual. La integración previa solo había vuelto a añadir la operación de lectura.
- `e2f8f0c` conserva una exploración posterior del editor; no se ha aplicado ese stash completo, porque incluye un editor anterior y cambios de diseño que no corresponden a mailcanvas.
- Los archivos de las plantillas y sus fragmentos siguen en el repositorio. No se ha comprobado ni alterado el contenido de la base de datos desplegada.

## Recuperado y corregido

1. Pestaña Elementos comunes y operaciones crear, actualizar, restablecer y borrar; editor React en lugar de restaurar TipTap.
2. Traducciones de la pestaña y sus formularios.
3. Cabecera y pie de nuevo visibles en la biblioteca. El filtro previo por `!builtIn` dejaba la biblioteca vacía cuando solo existían esos dos registros.
4. Fragmentos autocerrados de Thymeleaf normalizados antes de parsear HTML: los siguientes bloques ya no quedan anidados en el primero.
5. Referencias `:: fragmentName` compatibles con el renderer local de 1.0.0.
6. Fragmentos de detalles/productos visibles como componentes, conservando la referencia del backend y sus argumentos.
7. Errores y reintento dentro del editor maximizado; confirmaciones y vista del servidor accesibles al minimizar.
8. Acceso independiente a las pestañas según sus permisos.

## Validación visual

Las capturas y `report.json` en `screenshots/mailcanvas-review/` se generan con Chromium, la pantalla React real y el correo real `order-confirmed.html`. La API y los permisos son simulados. Se comprueban los tres componentes de la biblioteca, los seis bloques del correo, la visualización del producto y la inserción de la firma como séptimo bloque.

No se ha hecho reset, checkout ni restauración global del repositorio. Se han conservado los cambios locales existentes. Las correcciones de parser/render también están en el código fuente de mailcanvas; Yambo lleva compatibilidad para su paquete 1.0.0 instalado.
