import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { faLightbulb, faExternalLinkAlt, faTriangleExclamation, faShield } from "@fortawesome/free-solid-svg-icons";
import { AnnotatedFigure, type Callout } from "./shared";

const OVERVIEW_CALLOUTS: Callout[] = [
    { n: 1, desc: "Sección OAuth / Inicio de Sesión", xPct: 70, yPct: 23 },
    { n: 2, desc: "Proveedor Google", xPct: 26, yPct: 49 },
    { n: 3, desc: "Campo Client ID", xPct: 58, yPct: 55 },
    { n: 4, desc: "Guardar configuración OAuth", xPct: 87, yPct: 81 },
];

export function GuideOauthGoogle() {
    return (
        <article className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <FontAwesomeIcon icon={faGoogle} className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                    <h2 className="text-xl font-bold font-display text-yambo-black">Activar «Iniciar sesión con Google»</h2>
                    <p className="text-sm text-gray-400">Guía paso a paso para administradores no técnicos</p>
                </div>
            </div>

            <div className="prose prose-sm max-w-none text-gray-600 space-y-6">
                <AnnotatedFigure src="/images/wiki/guia-oauth-google.png" alt="Sección OAuth / Inicio de Sesión con sus campos señalados" width={1440} height={900} callouts={OVERVIEW_CALLOUTS} />
                {/* Introducción */}
                <div className="bg-yambo-green-50 border border-yambo-green-200 rounded-xl p-4 text-sm">
                    <div className="flex items-start gap-3">
                        <FontAwesomeIcon icon={faLightbulb} className="w-5 h-5 text-yambo-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <strong className="text-yambo-green-800">¿Qué vamos a hacer?</strong>
                            <p className="text-yambo-green-700 mt-1">Vamos a configurar Yambo para que los socios puedan iniciar sesión con su cuenta de Google en lugar de tener que recordar un usuario y contraseña.</p>
                        </div>
                    </div>
                </div>

                {/* Paso 1 */}
                <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-bold text-yambo-black text-base">1. Abrir Google Cloud Console</h3>
                    <p className="mt-1">Abre tu navegador y ve a:</p>
                    <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-yambo-green-600 hover:underline font-medium">
                        console.cloud.google.com <FontAwesomeIcon icon={faExternalLinkAlt} className="w-3 h-3" />
                    </a>
                    <p className="mt-1">Asegúrate de iniciar sesión con la cuenta de Google que quieras usar para gestionar la web (puede ser la cuenta de Yambo o la tuya personal).</p>
                </div>

                {/* Paso 2 */}
                <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-bold text-yambo-black text-base">2. Seleccionar o crear un proyecto</h3>
                    <ul className="mt-1 space-y-1 list-disc pl-5">
                        <li>En la barra superior, haz clic en el selector de proyectos (donde pone el nombre del proyecto actual)</li>
                        <li>Selecciona un proyecto existente o haz clic en <strong>"Nuevo proyecto"</strong></li>
                        <li>Ponle un nombre, por ejemplo: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">Yambo Web</code></li>
                        <li>Haz clic en <strong>"Crear"</strong></li>
                    </ul>
                </div>

                {/* Paso 3 */}
                <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-bold text-yambo-black text-base">3. Crear la pantalla de consentimiento de OAuth</h3>
                    <p className="mt-1">Es la pantalla que ven los usuarios cuando inician sesión («Yambo quiere acceder a tu perfil...»).</p>
                    <ul className="mt-2 space-y-1 list-disc pl-5">
                        <li>En el menú de la izquierda, ve a <strong>"APIs y servicios" → "Pantalla de consentimiento de OAuth"</strong></li>
                        <li>Selecciona <strong>"Externo"</strong> (es la opción para webs públicas como Yambo)</li>
                        <li>Haz clic en <strong>"Crear"</strong></li>
                    </ul>
                    <div className="mt-3 p-3 bg-gray-50 rounded-xl text-sm">
                        <p className="font-medium text-yambo-black">Rellena el formulario:</p>
                        <ul className="mt-1 space-y-1">
                            <li><strong>Nombre de la aplicación:</strong> <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">Yambo</code> (o Yambo Asociación Juvenil)</li>
                            <li><strong>Correo de asistencia:</strong> El correo de contacto de Yambo</li>
                            <li><strong>Datos del desarrollador:</strong> Tu correo electrónico</li>
                        </ul>
                    </div>
                    <p className="mt-2">Haz clic en <strong>"Guardar y continuar"</strong> hasta llegar al final.</p>
                </div>

                {/* Paso 4 */}
                <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-bold text-yambo-black text-base">4. Crear las credenciales OAuth</h3>
                    <p className="mt-1">Vamos a generar el <strong>Client ID</strong> y el <strong>Client Secret</strong>.</p>
                    <ul className="mt-2 space-y-1 list-disc pl-5">
                        <li>En el menú de la izquierda, ve a <strong>"APIs y servicios" → "Credenciales"</strong></li>
                        <li>Haz clic en <strong>"+ Crear credenciales" → "ID de cliente de OAuth"</strong></li>
                        <li>Selecciona <strong>"Aplicación web"</strong></li>
                    </ul>

                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm">
                        <div className="flex items-start gap-2">
                            <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-medium text-yellow-800">Importante: las URIs deben coincidir exactamente</p>
                                <p className="text-yellow-700 mt-1">Añade estos valores exactamente como aparecen aquí (sin espacios, sin barras al final):</p>
                            </div>
                        </div>
                        <div className="mt-2 space-y-2">
                            <div>
                                <p className="font-medium text-yellow-800 text-xs">Orígenes de JavaScript autorizados:</p>
                                <code className="block bg-white border border-yellow-300 px-3 py-1.5 rounded-lg text-xs mt-0.5">https://yambo.cabrasky.net</code>
                            </div>
                            <div>
                                <p className="font-medium text-yellow-800 text-xs">URI de redirección autorizados:</p>
                                <code className="block bg-white border border-yellow-300 px-3 py-1.5 rounded-lg text-xs mt-0.5">https://yambo.cabrasky.net/api/auth/google/callback</code>
                            </div>
                        </div>
                        <p className="text-yellow-700 mt-2 text-xs">Si estás probando en local (tu ordenador), añade también <code className="bg-yellow-100 px-1 rounded">http://localhost:5173</code> como origen y <code className="bg-yellow-100 px-1 rounded">http://localhost:5173/api/auth/google/callback</code> como redirección.</p>
                    </div>

                    <p className="mt-2">Haz clic en <strong>"Crear"</strong>.</p>
                </div>

                {/* Paso 5 */}
                <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-bold text-yambo-black text-base">5. Copiar las credenciales</h3>
                    <p className="mt-1">Google te mostrará una ventana con dos valores. Son así:</p>
                    <div className="mt-2 p-3 bg-gray-50 rounded-xl font-mono text-sm space-y-2">
                        <div>
                            <span className="text-gray-500">ID de cliente (Client ID):</span>
                            <code className="block bg-white border border-gray-200 px-3 py-1.5 rounded-lg mt-0.5 text-blue-600 break-all">123456789-xxxxx.apps.googleusercontent.com</code>
                        </div>
                        <div>
                            <span className="text-gray-500">Secreto de cliente (Client Secret):</span>
                            <code className="block bg-white border border-gray-200 px-3 py-1.5 rounded-lg mt-0.5 text-red-600 break-all">GOCSPX-xxxxxxxxxxxxxxxx</code>
                        </div>
                    </div>
                    <p className="mt-2 text-sm">Copia estos dos valores exactamente como aparecen. Si cierras la ventana, puedes volver a verlos desde <strong>"Credenciales"</strong> → hacer clic en el lápiz ✏️ del cliente que acabas de crear.</p>
                </div>

                {/* Paso 6 */}
                <div className="border-l-4 border-green-500 pl-4">
                    <h3 className="font-bold text-yambo-black text-base">6. Configurar en Yambo</h3>
                    <p className="mt-1">Ahora ve a la configuración de Yambo:</p>
                    <ol className="mt-2 space-y-2 list-decimal pl-5">
                        <li>Ve a <strong>Configuración → OAuth / Inicio de Sesión</strong></li>
                        <li>Activa el interruptor <strong>"Habilitar inicio de sesión con Google"</strong></li>
                        <li>Pega el <strong>Client ID</strong> en el campo correspondiente</li>
                        <li>Pega el <strong>Client Secret</strong> en el campo correspondiente</li>
                        <li>Haz clic en <strong>"Guardar"</strong></li>
                    </ol>
                </div>

                {/* Paso 7 */}
                <div className="border-l-4 border-green-500 pl-4">
                    <h3 className="font-bold text-yambo-black text-base">7. ¡A probar!</h3>
                    <ul className="mt-1 space-y-1 list-disc pl-5">
                        <li>Cierra sesión de Yambo</li>
                        <li>Ve a la pantalla de inicio de sesión</li>
                        <li>Deberías ver el botón <strong>"Iniciar sesión con Google"</strong></li>
                        <li>Púlsalo, acepta los permisos, y ¡ya estás dentro!</li>
                    </ul>
                </div>

                {/* FAQ / Troubleshooting */}
                <div className="border-t border-gray-100 pt-6">
                    <h3 className="font-bold text-yambo-black text-base flex items-center gap-2">
                        <FontAwesomeIcon icon={faLightbulb} className="w-4 h-4 text-yambo-green-500" />
                        Preguntas frecuentes
                    </h3>
                    <div className="mt-3 space-y-4">
                        <div>
                            <p className="font-medium text-yambo-black">¿El botón de Google no aparece?</p>
                            <p className="text-sm mt-0.5">Revisa que en Configuración → OAuth tengas: (1) el interruptor en verde, (2) el Client ID y Client Secret escritos correctamente, (3) hayas pulsado "Guardar".</p>
                        </div>
                        <div>
                            <p className="font-medium text-yambo-black">¿Usuarios con cuenta existente pueden usar Google?</p>
                            <p className="text-sm mt-0.5">Sí. Si un usuario ya tiene cuenta en Yambo con el mismo correo, al iniciar sesión con Google se vinculará automáticamente.</p>
                        </div>
                        <div>
                            <p className="font-medium text-yambo-black">¿Puedo usar la misma configuración para 100Bocas?</p>
                            <p className="text-sm mt-0.5">Sí, pero en las credenciales de Google tienes que añadir el origen y redirección de 100Bocas además del de Yambo.</p>
                        </div>
                        <div>
                            <p className="font-medium text-yambo-black">¿Y si quiero añadir Apple, GitHub u otros?</p>
                            <p className="text-sm mt-0.5">La pantalla de configuración de Yambo ya está preparada. Cada proveedor nuevo tendrá su propio interruptor y campos. Solo hace falta implementarlo en el backend.</p>
                        </div>
                    </div>
                </div>

                {/* Seguridad */}
                <div className="border-t border-gray-100 pt-6">
                    <h3 className="font-bold text-yambo-black text-base flex items-center gap-2">
                        <FontAwesomeIcon icon={faShield} className="w-4 h-4 text-yambo-green-500" />
                        Seguridad
                    </h3>
                    <ul className="mt-2 space-y-1 text-sm list-disc pl-5">
                        <li>El <strong>Client Secret</strong> es confidencial. No lo compartas ni lo publiques en GitHub.</li>
                        <li>Yambo lo guarda en la base de datos y nunca lo muestra en pantalla (siempre aparece oculto).</li>
                        <li>Si crees que se ha visto comprometido, puedes generar uno nuevo desde Google Cloud Console.</li>
                    </ul>
                </div>
            </div>
        </article>
    );
}
