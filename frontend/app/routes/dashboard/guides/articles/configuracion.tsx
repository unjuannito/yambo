import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { AnnotatedFigure, type Callout } from "./shared";

const OVERVIEW_CALLOUTS: Callout[] = [
    { n: 1, desc: "Título de la página", xPct: 30, yPct: 12 },
    { n: 2, desc: "Pestaña OAuth / Inicio de Sesión", xPct: 70, yPct: 23 },
    { n: 3, desc: "Configuración de la Organización", xPct: 58, yPct: 34 },
    { n: 4, desc: "Guardar la organización", xPct: 84, yPct: 70 },
];

export function GuideConfiguracion() {
    return (
        <article className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                    <FontAwesomeIcon icon={faGear} className="w-5 h-5 text-yambo-green-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold font-display text-yambo-black">Configuración general</h2>
                    <p className="text-sm text-gray-400">Ajustes de la web accesibles desde «Configuración» en el menú de administración</p>
                </div>
            </div>

            <div className="prose prose-sm max-w-none text-gray-600 space-y-6">
                <AnnotatedFigure src="/images/wiki/guia-configuracion.png" alt="Página de Configuración con sus secciones señaladas" width={1440} height={900} callouts={OVERVIEW_CALLOUTS} />
                <div>
                    <h3 className="font-bold text-yambo-black text-base">¿Qué se puede configurar?</h3>
                    <p className="mt-1">La página se divide en ocho pestañas. Cada una guarda una parte distinta de la web:</p>
                    <ul className="mt-1 space-y-1 list-disc pl-5">
                        <li><strong>Organización:</strong> nombre corto (se usa en los asuntos de los correos) y nombre legal (beneficiario de los pagos).</li>
                        <li><strong>Aplicación:</strong> el dominio usado para generar enlaces en los correos y el plazo en días para crear incidencias tras cerrar un pedido.</li>
                        <li><strong>Banco:</strong> el IBAN al que los socios hacen las transferencias de sus pedidos.</li>
                        <li><strong>Email:</strong> el servidor SMTP desde el que la web envía los correos (confirmaciones, avisos…).</li>
                        <li><strong>Contacto:</strong> el correo, Instagram y TikTok que se muestran en la página pública de contacto.</li>
                        <li><strong>Archivos:</strong> el tamaño máximo permitido para las imágenes y archivos que se suben.</li>
                        <li><strong>IA:</strong> la conexión con Ollama, usada para generar metadatos SEO automáticamente.</li>
                        <li><strong>OAuth / Inicio de sesión:</strong> activar «Iniciar sesión con Google» y pegar sus credenciales. Ver la guía <a href="/mi-espacio/admin/guias/oauth-google" className="text-yambo-green-600 hover:underline">Google — Inicio de sesión</a>.</li>
                    </ul>
                </div>

                <div>
                    <h3 className="font-bold text-yambo-black text-base">Cómo guardar los cambios</h3>
                    <ol className="mt-2 space-y-2 list-decimal pl-5">
                        <li>Ve a <strong>Administración → Configuración</strong></li>
                        <li>Modifica los campos que necesites</li>
                        <li>Pulsa <strong>«Guardar»</strong></li>
                        <li>Verifica que el cambio se ve en la web (puede requerir recargar la página)</li>
                    </ol>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm">
                    <div className="flex items-start gap-3">
                        <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-yellow-800">Credenciales OAuth</p>
                            <p className="text-yellow-700 mt-1">El Client Secret nunca se muestra en pantalla (aparece oculto). Si necesitas cambiarlo, genera uno nuevo en Google Cloud Console y pégalo aquí.</p>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-yambo-black text-base">Pestaña a pestaña</h3>
                    <p className="mt-1">Esto es lo que hace cada pestaña, con su captura:</p>

                    <h4 className="font-bold text-yambo-black text-sm mt-4">Aplicación</h4>
                    <p className="mt-1">Configura el <strong>dominio</strong> que se usa para montar los enlaces de los correos electrónicos y el número de <strong>días</strong> durante los que se pueden crear incidencias después de cerrar un pedido. Pasado ese plazo ya no se podrán abrir incidencias sobre pedidos cerrados.</p>
                    <AnnotatedFigure src="/images/wiki/configuracion-aplicacion.png" alt="Pestaña Aplicación de Configuración" width={1440} height={900} callouts={[
                        { n: 1, desc: "Configuración de la Aplicación", xPct: 58, yPct: 34 },
                        { n: 2, desc: "Guardar la aplicación", xPct: 85, yPct: 70 },
                    ]} />

                    <h4 className="font-bold text-yambo-black text-sm mt-4">Banco</h4>
                    <p className="mt-1">El <strong>IBAN</strong> al que los socios harán la transferencia de sus pedidos. Es el dato que aparece en las instrucciones de pago.</p>
                    <AnnotatedFigure src="/images/wiki/configuracion-banco.png" alt="Pestaña Banco de Configuración" width={1440} height={900} callouts={[
                        { n: 1, desc: "Configuración Bancaria", xPct: 58, yPct: 34 },
                        { n: 2, desc: "Guardar la configuración bancaria", xPct: 87, yPct: 55 },
                    ]} />

                    <h4 className="font-bold text-yambo-black text-sm mt-4">Email</h4>
                    <p className="mt-1">Datos del servidor <strong>SMTP</strong> (servidor, puerto, usuario y contraseña) y del remitente (correo y nombre) desde el que se envían los correos de la aplicación. Hay una sección avanzada para STARTTLS y tiempos de espera.</p>
                    <AnnotatedFigure src="/images/wiki/configuracion-email.png" alt="Pestaña Email de Configuración" width={1440} height={900} callouts={[
                        { n: 1, desc: "Configuración de Correo Electrónico", xPct: 58, yPct: 34 },
                        { n: 2, desc: "Guardar el email", xPct: 87, yPct: 80 },
                    ]} />

                    <h4 className="font-bold text-yambo-black text-sm mt-4">Contacto</h4>
                    <p className="mt-1">El <strong>correo de contacto</strong>, <strong>Instagram</strong> y <strong>TikTok</strong> que se muestran en la página pública de contacto.</p>
                    <AnnotatedFigure src="/images/wiki/configuracion-contacto.png" alt="Pestaña Contacto de Configuración" width={1440} height={900} callouts={[
                        { n: 1, desc: "Configuración de Contacto", xPct: 58, yPct: 34 },
                        { n: 2, desc: "Guardar el contacto", xPct: 86, yPct: 76 },
                    ]} />

                    <h4 className="font-bold text-yambo-black text-sm mt-4">Archivos</h4>
                    <p className="mt-1">El <strong>tamaño máximo</strong> (en MB) permitido para las imágenes y archivos que se suben a la web. Afecta a todas las subidas.</p>
                    <AnnotatedFigure src="/images/wiki/configuracion-archivos.png" alt="Pestaña Archivos de Configuración" width={1440} height={900} callouts={[
                        { n: 1, desc: "Configuración de Archivos", xPct: 58, yPct: 34 },
                        { n: 2, desc: "Guardar los archivos", xPct: 86, yPct: 59 },
                    ]} />

                    <h4 className="font-bold text-yambo-black text-sm mt-4">IA</h4>
                    <p className="mt-1">La <strong>URL del servidor Ollama</strong> y el <strong>modelo</strong> a usar para la generación automática de metadatos SEO. El modelo debe estar descargado en el servidor.</p>
                    <AnnotatedFigure src="/images/wiki/configuracion-ia.png" alt="Pestaña IA de Configuración" width={1440} height={900} callouts={[
                        { n: 1, desc: "Configuración de IA (Ollama)", xPct: 58, yPct: 34 },
                        { n: 2, desc: "Guardar la configuración de IA", xPct: 88, yPct: 74 },
                    ]} />

                    <p className="mt-3 text-sm">La pestaña <strong>Organización</strong> es la de la captura inicial de esta guía, y <strong>OAuth / Inicio de Sesión</strong> tiene su propia <a href="/mi-espacio/admin/guias/oauth-google" className="text-yambo-green-600 hover:underline">guía paso a paso</a>.</p>
                </div>
            </div>
        </article>
    );
}
