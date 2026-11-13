# Editor de correo de Yambo

La pantalla de administración usa `mailcanvas` mediante `frontend/app/components/emails/YamboEmailEditor.tsx`. Plantillas automáticas y comunicados comparten el mismo adaptador.

## Comportamiento

- Carga JavaScript bajo demanda y monta el editor únicamente en el navegador, después de la hidratación. La lista de correos no carga el lienzo ni Monaco.
- Abre maximizado y permite minimizar; al minimizar vuelve a una altura adaptada a la ventana. El formulario conserva el HTML mediante `value` / `onChange`.
- Las plantillas reciben su `templateKey`, sus tokens originales y los valores de ejemplo sin convertir objetos o arrays a strings. El adaptador acepta nombres con o sin `{{ }}`.
- El pie del editor conecta guardar, vista del servidor, restablecer con confirmación y enviar prueba cuando se ha indicado un destinatario. Las acciones en curso no se vuelven a ofrecer desde el editor.
- Los comunicados cargan el detalle por ID antes de montar el editor: la respuesta de la lista puede omitir el cuerpo. Una respuesta tardía no sustituye otro comunicado abierto después.

## Componentes compartidos

Con permiso `email_common:read`, el adaptador consulta `/api/email-common-elements`. Todos los componentes, incluida la cabecera y el pie integrados, aparecen en Insertar → Componentes. La cabecera y el pie se usan también en el envoltorio de la vista local de comunicados: insertarlos manualmente en su cuerpo puede duplicarlos. Los correos automáticos conservan su propio envoltorio de marca del backend.

La navegación del editor muestra la carga y los errores, también maximizado. Si falla la consulta se puede seguir editando y reintentar la carga. Sin permiso no se realiza la petición. Las respuestas de editores desmontados se ignoran.

Los componentes insertados incluyen su HTML de respaldo. El backend actual renderiza el HTML guardado; editar una definición común no actualiza por sí solo todos los correos previamente guardados. La biblioteca del editor puede resolver las definiciones actuales durante la edición, pero no existe una resolución global de referencias en el envío del backend.

## Vista previa y guardado

La vista local es una aproximación con datos de ejemplo; el resultado del servidor es la referencia para el envío y su saneado de HTML. En comunicados la API de vista previa recibe un ID y muestra la última versión guardada: guarda los cambios para verla actualizada. Un comunicado nuevo necesita guardarse antes de usar esa vista.

El envío real continúa en las acciones de Yambo; el editor no envía comunicados automáticamente. Guardar no publica un comunicado ni cambia su audiencia.

## Verificación

Desde `frontend`:

```sh
npm run typecheck
npm test -- app/components/emails app/routes/dashboard/emails/index.test.tsx
npm run build
```

Las pruebas cubren muestras estructuradas, envoltorios, permisos, recuperación de carga, desmontaje, cambios controlados y carga del cuerpo completo de comunicados.

## Recuperación del historial y bloques Thymeleaf

La pestaña **Elementos comunes** recupera las operaciones de creación, edición, restablecimiento y borrado que estaban en `908cccf`. Usa ahora mailcanvas. Los permisos de lectura determinan las pestañas disponibles; tener permiso solo para elementos comunes permite administrarlos sin exigir permisos de campañas.

La compatibilidad con mailcanvas 1.0.0 vive en `emailEditorAdapter.ts`: cierra `<th:block ... />` antes de usar DOMParser, normaliza los espacios de las referencias `:: fragmento(...)` y convierte las referencias a productos/detalles en instancias con su HTML Thymeleaf de respaldo. Se conservan los argumentos de la referencia y no se anidan nuevas instancias al reabrir el mismo HTML. No hace falta publicar otro paquete para que esta corrección funcione en Yambo.

Las confirmaciones y la vista del servidor minimizan primero el editor, para que no queden ocultas debajo del lienzo maximizado.

### Comprobación visual reproducible

```sh
cd frontend
node scripts/review-email-editor.mjs
```

Necesita Playwright/Chromium, igual que las comprobaciones visuales del componente. Las muestras del catálogo se generan ejecutando `EditableEmailDocumentTest` en el backend (salida `backend/target/editable-email-previews/`) y copiando esa carpeta a `frontend/.email-editor-review/server-previews/`. El script usa la pantalla y el componente reales con API y permisos simulados; carga el HTML real de `109-import-data/order-confirmed.html`. No envía correos ni modifica datos del servidor. Guarda capturas e informe en `docs/screenshots/mailcanvas-review/`.

La vista local de los fragmentos usa la representación aproximada de mailcanvas 1.0.0; sus estilos y algunos detalles de muestra no son una copia exacta del render de Thymeleaf del servidor. El HTML de respaldo conserva la referencia original para el envío.


## Correos completos editables y base de datos

Las plantillas iniciales de `backend/src/main/resources/db/changelog/changes/109-import-data/` incluyen ahora cabecera, contenido y pie. El marcador `data-yambo-email-document="v1"` indica al backend y al editor que no deben añadir otro envoltorio.

La migración `110-editable-email-layouts.xml` actualiza las bases donde la 109 ya se ejecutó, sin sustituir el contenido personalizado ni los asuntos. Registra `automatic-header` y `automatic-footer`, independientes del `header`/`footer` de comunicados. Las propiedades del componente permiten editar título/color/fecha y organización/preferencias/año por instancia; su valor inicial sigue conectado a las variables del correo.

Al restablecer una plantilla el editor carga de nuevo el documento inicial completo. El envío sigue saneando el HTML y conserva el fallback de las plantillas del classpath cuando Thymeleaf falla.

Las copias de seguridad locales y el plan revisado se guardan en `.local-backups/email-layout/` (ignorado por Git). `scripts/apply-editable-email-layout.py` aplica el plan en una transacción y verifica que ningún cuerpo haya cambiado desde la revisión. Con `--rollback` restaura los cuerpos del plan; conserva las definiciones comunes para no borrar referencias que ya puedan usar otros correos.


## Catálogo visual y creación de componentes

Las plantillas se muestran como tarjetas con miniaturas del render del servidor. Se cargan al acercarse a la zona visible, conservan el ancho de correo y se pueden ampliar en un diálogo accesible. La búsqueda y los filtros separan pedidos, incidencias, acceso/cuentas y actividades. El HTML queda en el editor de código, no en el listado. Los elementos comunes tienen también tarjetas con una preview local de sus variables globales.

**Nuevo componente** ofrece firma, aviso y botón como puntos de partida. Añadir otro bloque conserva el contenido existente. El nombre y el contenido son necesarios para habilitar el guardado.

El panel Variables permite insertar bindings `${variable}`, buscar por nombre y ver su tipo. Desde **Nueva variable de ejemplo** se pueden generar textos, números, booleanos, objetos y listas; el JSON completo sigue disponible como opción avanzada. Los datos de ejemplo solo viven en la sesión de edición y no crean variables reales en el envío: los nombres deben existir en la plantilla que use el componente.

Al guardar componentes se conservan las directivas Thymeleaf compatibles y sus metadatos del editor. Se eliminan scripts, eventos y URLs estáticas inseguras; el resultado renderizado vuelve a sanearse antes de enviar. La cabecera/pie de comunicados resuelve también las variables guardadas en sus secciones.

Capturas: `screenshots/mailcanvas-review/06-catalogo-previews.png`, `07-preview-ampliada.png`, `08-crear-componente-variables.png` y `09-variables-listas-ejemplos.png`. La comprobación usa la pantalla real y HTML generado por tests del backend, con API y permisos simulados.


## Variables de comunicados por destinatario

El editor carga el catálogo desde `GET /api/campaigns/variables`, con ejemplos ficticios; mantiene un catálogo local compatible mientras no haya conexión. El objeto `destinatario` se puede desplegar en el árbol de variables.

| Variable | Valor en el envío |
| --- | --- |
| `nombre` | Nombre completo del destinatario |
| `primerNombre` | Primera palabra de su nombre |
| `usuario` | Email de acceso: Yambo utiliza el email como nombre de usuario |
| `email` | Email del destinatario |
| `userId` | ID del socio |
| `fecha`, `hora`, `fechaHora` | Fecha y hora del envío en Europe/Madrid |
| `anio` | Año del envío |
| `organizacion`, `dominio` | Datos reales de la organización |
| `preferencesUrl` | Enlace a preferencias de cuenta |
| `destinatario` | Objeto con `id`, `nombre`, `usuario` y `email` |

Se admiten `${nombre}` y `{{nombre}}`, también rutas como `${destinatario.email}`. En el cuerpo, el editor puede generar atributos `th:text` / `th:href`; el backend conserva ese funcionamiento. El asunto admite las mismas variables y elimina saltos de línea. Se puede insertar nombre, email o fecha desde los accesos rápidos bajo el asunto.

El envío sigue siendo una sola tarea asíncrona, con entregas secuenciales, pero ahora cada destinatario obtiene su propio asunto y HTML. La fecha/hora se fija una vez al comenzar esa tarea. La vista previa usa un socio ficticio y el cuerpo guardado, nunca los datos personales de un miembro real. Los valores de texto se insertan escapados y el HTML resultante vuelve a sanearse antes de enviarse.

## Organización del código

La ruta de administración mantiene las consultas y las acciones de guardado. Las vistas están separadas en `components/emails/admin`: plantillas, comunicados, formulario de comunicado y elementos comunes.

`useEmailPreview` gestiona la carga diferida y los reintentos; `EmailPreviewDialog` presenta la ampliación accesible. `ComponentVariablePanel` contiene la edición de variables y `useComponentSamples` mantiene los datos de ejemplo. `useCampaignVariables` carga el catálogo de variables personales con su catálogo local de respaldo.

En el backend, `CampaignVariables` define el catálogo y los valores por destinatario; `CampaignPlaceholders` sustituye las variables en asuntos y HTML. `EditableEmailDocument` construye los documentos editables y `EditableEmailLayoutsChange` coordina su migración sin sobrescribir modificaciones simultáneas.


## Datos de cabecera y restauración

Al editar un correo automático, el panel «Datos de la cabecera» permite personalizar `${headerTitle}`, `${headerColor}` y `${emailDate}`. El botón del mismo nombre en el editor maximizado vuelve al panel y enfoca el título. Los campos vacíos conservan el valor original; la fecha vacía se calcula al enviar. El título y el color originales proceden de `EmailTemplateCatalog` y de los estados de pedidos/incidencias. El nombre de la organización y el dominio se siguen gestionando en Configuración.

Los valores se guardan con el asunto y el cuerpo, en `settings` bajo la clave `emails.variables.<templateKey>`. Solo se admiten esas tres variables; el color debe tener formato `#RRGGBB`. El backend aplica los mismos valores a las vistas previas, las pruebas y los envíos automáticos. La vista previa y el envío de prueba también aceptan los valores aún sin guardar.

«Restablecer» descarta las personalizaciones de un correo. «Restaurar todas las plantillas» hace lo mismo con todos los correos automáticos, en una transacción y tras confirmación. Ambas acciones recuperan asuntos, cuerpos y datos de cabecera originales. No eliminan comunicados ni componentes compartidos. La restauración global usa `DELETE /email-templates`, con el permiso `email_template:update`; no se ejecuta al abrir la página.

## Diseños de comunicado

La pestaña Comunicados ofrece cuatro diseños con miniatura: inscripciones a proyectos, próximas actividades, artículos y pedidos, y novedades de la asociación. Se crean desde `campaignStarters.ts`, con enlaces a rutas existentes y variables `${organizacion}`, `${primerNombre}` y `${dominio}`. Elegir uno abre un borrador editable; hay que completar los detalles indicados y guardar antes de enviar. Los diseños no inventan fechas, precios ni actividades de la asociación.

Capturas de revisión: `docs/screenshots/mailcanvas-review/12-datos-cabecera-web.png`, `13-restaurar-todas-confirmacion.png` `14-plantillas-comunicados-yambo.png` y `15-comunicado-actividad-editor.png`. El escenario visual usa APIs y permisos simulados; las pruebas del backend verifican la persistencia de ajustes y su aplicación al contexto de envío sin conectar a SMTP.


## Controles según el tipo de dato

El panel de cabecera usa un selector de color con campo hexadecimal y un calendario de fecha/hora. La fecha vacía conserva el envío automático; las fechas fijas se guardan en formato `dd/MM/yyyy HH:mm` y se validan también en el backend, sin conversión de zona horaria del navegador.

La creación de variables de ejemplo permite texto, números decimales, booleanos, email, enlaces, imágenes por URL con vista previa, fecha, fecha/hora, color, objetos y arrays. Objetos y listas usan JSON con errores accesibles; solo se añaden si la estructura coincide con el tipo elegido. Los números y booleanos se conservan como valores JSON, no como texto. Estas variables siguen siendo datos de ejemplo de la sesión.

El inspector de componentes de mailcanvas usa controles nativos en modo literal (`T`) según `ComponentProperty.type`; en modo `ƒ` conserva el campo de expresiones con autocompletado. Las propiedades numéricas se exportan como números para que las fórmulas puedan operar con ellas.


El adaptador actualiza los esquemas antiguos de `automatic-header` y `automatic-footer` al abrirlos: `emailDate` usa calendario y `currentYear` usa un campo numérico, incluso si el documento guardado los declaraba como texto. Los componentes personalizados conservan sus tipos definidos. Las instancias y Diseño comparten selectores de color; las medidas de Diseño incluyen unidades y un modo CSS para valores compuestos. Capturas: `19-instancia-controles-tipados.png` y `20-diseno-medidas-colores.png` en `docs/screenshots/mailcanvas-review`.


## Versión del paquete

La integración usa `mailcanvas@1.0.1`, instalado desde el registro npm y fijado en `frontend/package.json` y `frontend/package-lock.json`. La versión incluye controles tipados para propiedades de componentes, selectores de color y medidas con unidades en Diseño. Para reproducir la instalación, ejecuta `npm ci` en `frontend`; no hace falta copiar el build local del editor.
