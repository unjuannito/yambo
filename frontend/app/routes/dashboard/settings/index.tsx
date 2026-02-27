import { useState, useEffect } from "react";
import type { Route } from "./+types/settings";
import { RequirePermission } from "~/components/common/RequirePermission";
import InputComponent from "~/components/common/forms/InputComponent";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { settingsService, type EmailConfig, type UploadConfig, type OllamaConfig } from "~/services/settingsService";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Yambo - Configuración" },
        { name: "description", content: "Configuración general del sistema" },
    ];
}

type SettingsTab = "organization" | "application" | "bank" | "email" | "contact" | "upload" | "ai";

export default function Settings() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<SettingsTab>("organization");
    const [savingTab, setSavingTab] = useState<SettingsTab | null>(null);

    // Organization settings
    const [organizationName, setOrganizationName] = useState("");
    const [organizationLegalName, setOrganizationLegalName] = useState("");

    // Application settings
    const [domain, setDomain] = useState("");
    const [issueCreationWindowDays, setIssueCreationWindowDays] = useState("30");

    // Bank settings
    const [iban, setIban] = useState("");

    // Email settings
    const [emailConfig, setEmailConfig] = useState<EmailConfig>({
        host: "",
        port: "587",
        username: "",
        password: "",
        from: "",
        fromName: "",
    });

    // Contact settings
    const [contactEmail, setContactEmail] = useState("");
    const [contactInstagram, setContactInstagram] = useState("");
    const [contactTiktok, setContactTiktok] = useState("");

    // Upload settings
    const [uploadConfig, setUploadConfig] = useState<UploadConfig>({
        maxFileSizeMb: 5,
        allowedTypes: "image/jpeg,image/png,image/gif,image/webp,image/svg+xml",
    });

    // AI / Ollama settings
    const [ollamaConfig, setOllamaConfig] = useState<OllamaConfig>({
        apiUrl: "http://localhost:11434",
        model: "phi3:mini",
    });

    // Advanced SMTP settings
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [smtpConfig, setSmtpConfig] = useState({
        auth: true,
        starttlsEnable: true,
        starttlsRequired: true,
        connectionTimeout: 5000,
        timeout: 5000,
        writeTimeout: 5000,
    });

    const currentHost = typeof window !== "undefined" ? window.location.origin : "";

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            setError(null);
            const [allSettings, domainValue, ibanValue, emailConfigValue, smtpConfigValue, issueCreationWindowDaysValue, uploadConfigValue, ollamaConfigValue] = await Promise.all([
                settingsService.getAllSettings(),
                settingsService.getDomain(),
                settingsService.getIban(),
                settingsService.getEmailConfig(),
                settingsService.getSmtpAdvancedConfig(),
                settingsService.getIssueCreationWindowDays(),
                settingsService.getUploadConfig(),
                settingsService.getOllamaConfig(),
            ]);

            // Load organization settings
            const nameSetting = allSettings.find(s => s.key === "organization.name");
            if (nameSetting) setOrganizationName(nameSetting.value);

            const legalNameSetting = allSettings.find(s => s.key === "organization.legal_name");
            if (legalNameSetting) setOrganizationLegalName(legalNameSetting.value);

            // Contact settings
            const contactEmailSetting = allSettings.find(s => s.key === "contact.email");
            if (contactEmailSetting) setContactEmail(contactEmailSetting.value);
            const contactInstagramSetting = allSettings.find(s => s.key === "contact.instagram");
            if (contactInstagramSetting) setContactInstagram(contactInstagramSetting.value);
            const contactTiktokSetting = allSettings.find(s => s.key === "contact.tiktok");
            if (contactTiktokSetting) setContactTiktok(contactTiktokSetting.value);

            setDomain(domainValue);
            setIban(ibanValue);
            setEmailConfig(emailConfigValue);
            setSmtpConfig(smtpConfigValue);
            setIssueCreationWindowDays(String(issueCreationWindowDaysValue));
            setUploadConfig(uploadConfigValue);
            setOllamaConfig(ollamaConfigValue);
        } catch (err) {
            setError(getErrorMessage(err, "Error al cargar la configuración"));
        } finally {
            setLoading(false);
        }
    };

    const handleSaveOrganizationSettings = async () => {
        try {
            setSavingTab("organization");
            await settingsService.updateSettingsBulk({
                "organization.name": organizationName,
                "organization.legal_name": organizationLegalName,
            });
            toast.success("Configuración de la organización guardada correctamente");
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al guardar la configuración de la organización"));
        } finally {
            setSavingTab(null);
        }
    };

    const handleSaveApplicationSettings = async () => {
        try {
            setSavingTab("application");
            const parsedIssueCreationWindowDays = Number(issueCreationWindowDays);
            if (!Number.isInteger(parsedIssueCreationWindowDays) || parsedIssueCreationWindowDays < 0) {
                toast.error("Los días para crear incidencias deben ser un número entero mayor o igual a 0");
                return;
            }

            await Promise.all([
                settingsService.setDomain(domain),
                settingsService.setIssueCreationWindowDays(parsedIssueCreationWindowDays),
            ]);
            toast.success("Configuración de la aplicación guardada correctamente");
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al guardar la configuración de la aplicación"));
        } finally {
            setSavingTab(null);
        }
    };

    const handleSaveBankSettings = async () => {
        try {
            setSavingTab("bank");
            await settingsService.setIban(iban);
            toast.success("Configuración bancaria guardada correctamente");
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al guardar la configuración bancaria"));
        } finally {
            setSavingTab(null);
        }
    };

    const handleSaveEmailSettings = async () => {
        try {
            setSavingTab("email");
            await Promise.all([
                settingsService.updateEmailConfig(emailConfig),
                settingsService.updateSmtpAdvancedConfig(smtpConfig),
            ]);
            toast.success("Configuración de email guardada correctamente");
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al guardar la configuración de email"));
        } finally {
            setSavingTab(null);
        }
    };

    const handleSaveContactSettings = async () => {
        try {
            setSavingTab("contact");
            await settingsService.updateSettingsBulk({
                "contact.email": contactEmail,
                "contact.instagram": contactInstagram,
                "contact.tiktok": contactTiktok,
            });
            toast.success("Configuración de contacto guardada correctamente");
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al guardar la configuración de contacto"));
        } finally {
            setSavingTab(null);
        }
    };

    const handleSaveUploadSettings = async () => {
        try {
            setSavingTab("upload");
            if (uploadConfig.maxFileSizeMb < 1) {
                toast.error("El tamaño máximo debe ser al menos 1 MB");
                return;
            }
            await settingsService.updateUploadConfig(uploadConfig);
            toast.success("Configuración de archivos guardada correctamente");
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al guardar la configuración de archivos"));
        } finally {
            setSavingTab(null);
        }
    };

    const handleSaveOllamaSettings = async () => {
        try {
            setSavingTab("ai");
            await settingsService.updateOllamaConfig(ollamaConfig);
            toast.success("Configuración de IA guardada correctamente");
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al guardar la configuración de IA"));
        } finally {
            setSavingTab(null);
        }
    };

    if (loading) {
        return (
            <RequirePermission permission={{ obj: "settings", action: "read" }} redirectTo="/mi-espacio">
                <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                    <LoadingSpinner message="Cargando configuración..." size="lg" />
                </main>
            </RequirePermission>
        );
    }

    if (error) {
        return (
            <RequirePermission permission={{ obj: "settings", action: "read" }} redirectTo="/mi-espacio">
                <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                    <h1 className="text-3xl font-bold mb-6">Configuración General</h1>
                    <ErrorMessage message={error} onRetry={loadSettings} />
                </main>
            </RequirePermission>
        );
    }

    return (
        <RequirePermission permission={{ obj: "settings", action: "read" }} redirectTo="/mi-espacio">
            <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                <h1 className="text-3xl font-bold mb-2">Configuración General</h1>
                <p className="text-gray-600 mb-6">Gestiona la configuración del sistema por secciones.</p>

                <section className="bg-white rounded-lg shadow p-4 mb-6">
                    <div className="flex flex-wrap gap-2">
                        <ButtonComponent
                            variant={activeTab === "organization" ? "primary" : "neutral"}
                            size="sm"
                            onClick={() => setActiveTab("organization")}
                        >
                            Organización
                        </ButtonComponent>
                        <ButtonComponent
                            variant={activeTab === "application" ? "primary" : "neutral"}
                            size="sm"
                            onClick={() => setActiveTab("application")}
                        >
                            Aplicación
                        </ButtonComponent>
                        <ButtonComponent
                            variant={activeTab === "bank" ? "primary" : "neutral"}
                            size="sm"
                            onClick={() => setActiveTab("bank")}
                        >
                            Banco
                        </ButtonComponent>
                        <ButtonComponent
                            variant={activeTab === "email" ? "primary" : "neutral"}
                            size="sm"
                            onClick={() => setActiveTab("email")}
                        >
                            Email
                        </ButtonComponent>
                        <ButtonComponent
                            variant={activeTab === "contact" ? "primary" : "neutral"}
                            size="sm"
                            onClick={() => setActiveTab("contact")}
                        >
                            Contacto
                        </ButtonComponent>
                        <ButtonComponent
                            variant={activeTab === "upload" ? "primary" : "neutral"}
                            size="sm"
                            onClick={() => setActiveTab("upload")}
                        >
                            Archivos
                        </ButtonComponent>
                        <ButtonComponent
                            variant={activeTab === "ai" ? "primary" : "neutral"}
                            size="sm"
                            onClick={() => setActiveTab("ai")}
                        >
                            IA
                        </ButtonComponent>
                    </div>
                </section>

                {activeTab === "organization" && (
                    <section className="bg-white rounded-lg shadow p-6 space-y-4">
                        <h2 className="text-xl font-semibold">Configuración de la Organización</h2>
                        <InputComponent
                            label="Nombre de la Organización"
                            type="text"
                            value={organizationName}
                            onChange={(e) => setOrganizationName(e.target.value)}
                            placeholder="Yambo"
                            required
                        />
                        <p className="text-sm text-gray-600">
                            Nombre corto que se usará en los asuntos de los correos electrónicos.
                        </p>
                        <InputComponent
                            label="Nombre Legal de la Organización"
                            type="text"
                            value={organizationLegalName}
                            onChange={(e) => setOrganizationLegalName(e.target.value)}
                            placeholder="Yambo ALCO"
                            required
                        />
                        <p className="text-sm text-gray-600">
                            Este nombre se mostrará como beneficiario en las instrucciones de pago de los pedidos.
                        </p>
                        <RequirePermission permission={{ obj: "settings", action: "update" }} redirect={false}>
                            <div className="flex justify-end">
                                <ButtonComponent
                                    onClick={handleSaveOrganizationSettings}
                                    variant="primary"
                                    disabled={savingTab !== null}
                                >
                                    {savingTab === "organization" ? "Guardando..." : "Guardar Configuración de la Organización"}
                                </ButtonComponent>
                            </div>
                        </RequirePermission>
                    </section>
                )}

                {activeTab === "application" && (
                    <section className="bg-white rounded-lg shadow p-6 space-y-4">
                        <h2 className="text-xl font-semibold">Configuración de la Aplicación</h2>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <InputComponent
                                    label="Dominio de la Aplicación"
                                    type="text"
                                    value={domain}
                                    onChange={(e) => setDomain(e.target.value)}
                                    placeholder={currentHost}
                                    required
                                />
                            </div>
                            <div className="flex items-end">
                                <ButtonComponent
                                    onClick={() => setDomain(currentHost)}
                                    variant="neutral"
                                    disabled={savingTab !== null}
                                >
                                    Usar Host Actual
                                </ButtonComponent>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600">
                            Este dominio se utilizará para generar enlaces correctos en los correos electrónicos enviados por la aplicación.
                        </p>
                        <InputComponent
                            label="Días para crear incidencias tras cerrar pedido"
                            type="number"
                            min="0"
                            step="1"
                            value={issueCreationWindowDays}
                            onChange={(e) => setIssueCreationWindowDays(e.target.value)}
                            placeholder="30"
                            required
                        />
                        <p className="text-sm text-gray-600">
                            Pasado este plazo, no se podrán crear nuevas incidencias para pedidos cerrados.
                        </p>
                        <RequirePermission permission={{ obj: "settings", action: "update" }} redirect={false}>
                            <div className="flex justify-end">
                                <ButtonComponent
                                    onClick={handleSaveApplicationSettings}
                                    variant="primary"
                                    disabled={savingTab !== null}
                                >
                                    {savingTab === "application" ? "Guardando..." : "Guardar Configuración de la Aplicación"}
                                </ButtonComponent>
                            </div>
                        </RequirePermission>
                    </section>
                )}

                {activeTab === "bank" && (
                    <section className="bg-white rounded-lg shadow p-6 space-y-4">
                        <h2 className="text-xl font-semibold">Configuración Bancaria</h2>
                        <InputComponent
                            label="IBAN"
                            type="text"
                            value={iban}
                            onChange={(e) => setIban(e.target.value)}
                            placeholder="ES00 0000 0000 0000 0000 0000"
                            required
                        />
                        <RequirePermission permission={{ obj: "settings", action: "update" }} redirect={false}>
                            <div className="flex justify-end">
                                <ButtonComponent
                                    onClick={handleSaveBankSettings}
                                    variant="primary"
                                    disabled={savingTab !== null}
                                >
                                    {savingTab === "bank" ? "Guardando..." : "Guardar Configuración Bancaria"}
                                </ButtonComponent>
                            </div>
                        </RequirePermission>
                    </section>
                )}

                {activeTab === "email" && (
                    <section className="bg-white rounded-lg shadow p-6 space-y-4">
                        <h2 className="text-xl font-semibold">Configuración de Correo Electrónico</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputComponent
                                label="Servidor SMTP"
                                type="text"
                                value={emailConfig.host}
                                onChange={(e) => setEmailConfig({ ...emailConfig, host: e.target.value })}
                                placeholder="smtp.gmail.com"
                                required
                            />
                            <InputComponent
                                label="Puerto"
                                type="text"
                                value={emailConfig.port}
                                onChange={(e) => setEmailConfig({ ...emailConfig, port: e.target.value })}
                                placeholder="587"
                                required
                            />
                        </div>
                        <InputComponent
                            label="Usuario"
                            type="text"
                            value={emailConfig.username}
                            onChange={(e) => setEmailConfig({ ...emailConfig, username: e.target.value })}
                            placeholder="usuario@ejemplo.com"
                            required
                        />
                        <InputComponent
                            label="Contraseña"
                            type="password"
                            value={emailConfig.password}
                            onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })}
                            placeholder="Dejar vacío para no modificar"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputComponent
                                label="Correo del Remitente"
                                type="email"
                                value={emailConfig.from}
                                onChange={(e) => setEmailConfig({ ...emailConfig, from: e.target.value })}
                                placeholder="noreply@yambo.es"
                                required
                            />
                            <InputComponent
                                label="Nombre del Remitente"
                                type="text"
                                value={emailConfig.fromName || ""}
                                onChange={(e) => setEmailConfig({ ...emailConfig, fromName: e.target.value })}
                                placeholder="Yambo"
                            />
                        </div>

                        <div className="border-t pt-4 mt-2">
                            <button
                                type="button"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                            >
                                <FontAwesomeIcon
                                    icon={faChevronRight}
                                    className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
                                />
                                Configuración Avanzada SMTP
                            </button>

                            {showAdvanced && (
                                <div className="mt-4 space-y-4 pl-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={smtpConfig.auth}
                                                onChange={(e) => setSmtpConfig({ ...smtpConfig, auth: e.target.checked })}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm">Autenticación SMTP</span>
                                        </label>
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={smtpConfig.starttlsEnable}
                                                onChange={(e) => setSmtpConfig({ ...smtpConfig, starttlsEnable: e.target.checked })}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm">Habilitar STARTTLS</span>
                                        </label>
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={smtpConfig.starttlsRequired}
                                                onChange={(e) => setSmtpConfig({ ...smtpConfig, starttlsRequired: e.target.checked })}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm">Requerir STARTTLS</span>
                                        </label>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <InputComponent
                                            label="Timeout de Conexión (ms)"
                                            type="number"
                                            value={String(smtpConfig.connectionTimeout)}
                                            onChange={(e) => setSmtpConfig({ ...smtpConfig, connectionTimeout: Number(e.target.value) })}
                                            placeholder="5000"
                                        />
                                        <InputComponent
                                            label="Timeout de Lectura (ms)"
                                            type="number"
                                            value={String(smtpConfig.timeout)}
                                            onChange={(e) => setSmtpConfig({ ...smtpConfig, timeout: Number(e.target.value) })}
                                            placeholder="5000"
                                        />
                                        <InputComponent
                                            label="Timeout de Escritura (ms)"
                                            type="number"
                                            value={String(smtpConfig.writeTimeout)}
                                            onChange={(e) => setSmtpConfig({ ...smtpConfig, writeTimeout: Number(e.target.value) })}
                                            placeholder="5000"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <RequirePermission permission={{ obj: "settings", action: "update" }} redirect={false}>
                            <div className="flex justify-end">
                                <ButtonComponent
                                    onClick={handleSaveEmailSettings}
                                    variant="primary"
                                    disabled={savingTab !== null}
                                >
                                    {savingTab === "email" ? "Guardando..." : "Guardar Configuración de Email"}
                                </ButtonComponent>
                            </div>
                        </RequirePermission>
                    </section>
                )}

                {activeTab === "contact" && (
                    <section className="bg-white rounded-lg shadow p-6 space-y-4">
                        <h2 className="text-xl font-semibold">Configuración de Contacto</h2>
                        <p className="text-sm text-gray-600">
                            Estos datos se mostrarán en la página pública de contacto.
                        </p>
                        <InputComponent
                            label="Correo electrónico de contacto"
                            type="email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            placeholder="info@yambo.es"
                        />
                        <InputComponent
                            label="Instagram"
                            type="text"
                            value={contactInstagram}
                            onChange={(e) => setContactInstagram(e.target.value)}
                            placeholder="@yambo o https://instagram.com/yambo"
                        />
                        <InputComponent
                            label="TikTok"
                            type="text"
                            value={contactTiktok}
                            onChange={(e) => setContactTiktok(e.target.value)}
                            placeholder="@yambo o https://tiktok.com/@yambo"
                        />
                        <RequirePermission permission={{ obj: "settings", action: "update" }} redirect={false}>
                            <div className="flex justify-end">
                                <ButtonComponent
                                    onClick={handleSaveContactSettings}
                                    variant="primary"
                                    disabled={savingTab !== null}
                                >
                                    {savingTab === "contact" ? "Guardando..." : "Guardar Configuración de Contacto"}
                                </ButtonComponent>
                            </div>
                        </RequirePermission>
                    </section>
                )}

                {activeTab === "upload" && (
                    <section className="bg-white rounded-lg shadow p-6 space-y-4">
                        <h2 className="text-xl font-semibold">Configuración de Archivos</h2>
                        <p className="text-sm text-gray-600">
                            Configura los límites y tipos de archivo permitidos para la subida de imágenes.
                        </p>
                        <InputComponent
                            label="Tamaño máximo de archivo (MB)"
                            type="number"
                            min="1"
                            step="1"
                            value={String(uploadConfig.maxFileSizeMb)}
                            onChange={(e) => setUploadConfig({ ...uploadConfig, maxFileSizeMb: Number(e.target.value) })}
                            placeholder="5"
                            required
                        />
                        <p className="text-sm text-gray-600">
                            Tamaño máximo permitido por archivo subido. Afecta a fotos de perfil, imágenes de productos y proyectos.
                        </p>
                        <InputComponent
                            label="Tipos MIME permitidos"
                            type="text"
                            value={uploadConfig.allowedTypes}
                            onChange={(e) => setUploadConfig({ ...uploadConfig, allowedTypes: e.target.value })}
                            placeholder="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                            required
                        />
                        <p className="text-sm text-gray-600">
                            Tipos de archivo permitidos separados por coma. Ejemplo: image/jpeg,image/png,image/gif
                        </p>
                        <RequirePermission permission={{ obj: "settings", action: "update" }} redirect={false}>
                            <div className="flex justify-end">
                                <ButtonComponent
                                    onClick={handleSaveUploadSettings}
                                    variant="primary"
                                    disabled={savingTab !== null}
                                >
                                    {savingTab === "upload" ? "Guardando..." : "Guardar Configuración de Archivos"}
                                </ButtonComponent>
                            </div>
                        </RequirePermission>
                    </section>
                )}

                {activeTab === "ai" && (
                    <section className="bg-white rounded-lg shadow p-6 space-y-4">
                        <h2 className="text-xl font-semibold">Configuración de IA (Ollama)</h2>
                        <p className="text-sm text-gray-600">
                            Configura la conexión con el servidor de IA Ollama utilizado para la generación automática de metadatos SEO.
                        </p>
                        <InputComponent
                            label="URL de la API de Ollama"
                            type="text"
                            value={ollamaConfig.apiUrl}
                            onChange={(e) => setOllamaConfig({ ...ollamaConfig, apiUrl: e.target.value })}
                            placeholder="http://localhost:11434"
                            required
                        />
                        <p className="text-sm text-gray-600">
                            Dirección completa del servidor Ollama, incluyendo protocolo y puerto.
                        </p>
                        <InputComponent
                            label="Modelo"
                            type="text"
                            value={ollamaConfig.model}
                            onChange={(e) => setOllamaConfig({ ...ollamaConfig, model: e.target.value })}
                            placeholder="phi3:mini"
                            required
                        />
                        <p className="text-sm text-gray-600">
                            Nombre del modelo de Ollama a utilizar. Debe estar previamente descargado en el servidor.
                        </p>
                        <RequirePermission permission={{ obj: "settings", action: "update" }} redirect={false}>
                            <div className="flex justify-end">
                                <ButtonComponent
                                    onClick={handleSaveOllamaSettings}
                                    variant="primary"
                                    disabled={savingTab !== null}
                                >
                                    {savingTab === "ai" ? "Guardando..." : "Guardar Configuración de IA"}
                                </ButtonComponent>
                            </div>
                        </RequirePermission>
                    </section>
                )}
            </main>
        </RequirePermission>
    );
}
