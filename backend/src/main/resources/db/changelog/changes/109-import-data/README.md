# Plantillas iniciales de correo

Los 15 archivos HTML contienen el documento editable: una cabecera enlazada a `automatic-header`, el contenido original y un pie enlazado a `automatic-footer`. El contenedor lleva `data-yambo-email-document="v1"` para que el backend no vuelva a añadir el layout externo.

Los componentes incluyen HTML de respaldo. Las variables `headerTitle`, `headerColor`, `headerIcon`, `emailDate`, `currentYear`, `organizationName` y `preferencesUrl` se resuelven con los datos reales del correo y se exponen también como muestras del editor.

La migración 109 lee estos archivos al crear una base nueva. La migración **110-editable-email-layouts.xml** actualiza las bases donde la 109 ya estaba aplicada: conserva cada cuerpo existente, añade sus secciones y registra los dos componentes comunes. No modifica asuntos ni sustituye contenido personalizado. Ambas rutas son idempotentes respecto al marcador de documento completo.

No se debe insertar además la cabecera/pie de comunicados (`header`/`footer`) en estos documentos: pertenecen a otro envoltorio. El saneado del HTML se mantiene en el backend antes del envío.
