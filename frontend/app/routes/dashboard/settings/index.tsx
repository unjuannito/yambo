import { useState, useEffect, useCallback } from "react";
import type { Route } from "./+types/index";
import { RequirePermission } from "~/components/common/RequirePermission";
import { PageHeader } from "~/components/common/PageHeader";
import InputComponent from "~/components/common/forms/InputComponent";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { settingsService, type EmailConfig, type UploadConfig, type OllamaConfig, type OAuthProviderConfig } from "~/services/settingsService";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight, faGear, faEye, faEyeSlash, faExternalLinkAlt, faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { useTranslation } from "react-i18next";
import { PageContainer } from "~/components/common/PageContainer";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Yambo - Configuración" },
        { name: "description", content: "Configuración general del sistema" },
    ];
}

type SettingsTab = "organization" | "application" | "bank" | "email" | "contact" | "upload" | "ai" | "oauth";

export default function Settings() {
    const { t } = useTranslation();
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
    });

    // AI settings
    const [ollamaConfig, setOllamaConfig] = useState<OllamaConfig>({
        apiUrl: "",
        model: "",
    });

    // OAuth settings (array of providers)
    const [oauthProviders, setOauthProviders] = useState<OAuthProviderConfig[]>([]);
    const [showClientSecret, setShowClientSecret] = useState<Record<string, boolean>>({});

    // SMTP settings
    const [smtpAdvancedVisible, setSmtpAdvancedVisible] = useState(false);
    const [smtpConfig, setSmtpConfig] = useState({
        auth: true,
        starttlsEnable: true,
        starttlsRequired: true,
        connectionTimeout: 5000,
        timeout: 5000,
        writeTimeout: 5000,
    });

    // ── Load all settings ──
    const loadSettings = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [allSettings, emailCfg, smtpCfg, uploadCfg, ollamaCfg, oauthProvidersData] = await Promise.all([
                settingsService.getAllSettings(),
                settingsService.getEmailConfig(),
                settingsService.getSmtpAdvancedConfig().catch(() => null),
                settingsService.getUploadConfig(),
                settingsService.getOllamaConfig(),
                settingsService.getOAuthProviders().catch(() => []),
            ]);

            const get = (key: string) => allSettings.find(s => s.key === key)?.value ?? "";

            setOrganizationName(get("organization.name"));
            setOrganizationLegalName(get("organization.legal_name"));
            setDomain(get("app.domain"));
            setIssueCreationWindowDays(get("issues.creation_window_days") || "30");
            setIban(get("bank.iban"));
            setContactEmail(get("contact.email"));
            setContactInstagram(get("contact.instagram"));
            setContactTiktok(get("contact.tiktok"));

            setEmailConfig(emailCfg);
            if (smtpCfg) setSmtpConfig(smtpCfg);
            setUploadConfig(uploadCfg);
            setOllamaConfig(ollamaCfg);

            // OAuth providers
            setOauthProviders(oauthProvidersData);
            const secretVisibility: Record<string, boolean> = {};
            oauthProvidersData.forEach(p => { secretVisibility[p.name] = false; });
            setShowClientSecret(secretVisibility);

        } catch (err) {
            setError(getErrorMessage(err, "La configuración se nos resiste"));
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Save handlers ──
    const handleSaveOrganizationSettings = async () => {
        try {
            setSavingTab("organization");
            await settingsService.updateSettingsBulk({
                "organization.name": organizationName,
                "organization.legal_name": organizationLegalName,
            });
            toast.success("Configuración de la organización guardada correctamente");
        } catch (err) {
            toast.error(getErrorMessage(err, "¡La organización no quiere guardar sus datos!"));
        } finally {
            setSavingTab(null);
        }
    };

    const handleSaveApplicationSettings = async () => {
        try {
            setSavingTab("application");
            const parsedIssueCreationWindowDays = Number(issueCreationWindowDays);
            if (!Number.isInteger(parsedIssueCreationWindowDays) || parsedIssueCreationWindowDays < 0) {
                toast.error("¡Los días deben ser un número entero de 0 en adelante!");
                return;
            }

            await Promise.all([
                settingsService.setDomain(domain),
                settingsService.setIssueCreationWindowDays(parsedIssueCreationWindowDays),
            ]);
            toast.success("Configuración de la aplicación guardada correctamente");
        } catch (err) {
            toast.error(getErrorMessage(err, "¡La app se resiste a guardar su config!"));
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
            toast.error(getErrorMessage(err, "¡Los datos bancarios no quieren guardarse!"));
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
            toast.error(getErrorMessage(err, "¡El email no quiere guardar su config!"));
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
            toast.error(getErrorMessage(err, "¡Los datos de contacto se resisten!"));
        } finally {
            setSavingTab(null);
        }
    };

    const handleSaveUploadSettings = async () => {
        try {
            setSavingTab("upload");
            if (uploadConfig.maxFileSizeMb < 1) {
                toast.error("¡Mínimo 1 MB de tamaño, que si no no cabe nada!");
                return;
            }
            await settingsService.updateUploadConfig(uploadConfig);
            toast.success("Configuración de archivos guardada correctamente");
        } catch (err) {
            toast.error(getErrorMessage(err, "¡Los archivos no quieren guardar su config!"));
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
            toast.error(getErrorMessage(err, "¡La IA no quiere guardar su config!"));
        } finally {
            setSavingTab(null);
        }
    };

    const handleSaveOAuthSettings = async () => {
        try {
            setSavingTab("oauth");
            const updates = oauthProviders.filter(p => p.enabled || p.clientId);
            if (updates.length === 0) {
                toast.success("Configuración OAuth guardada correctamente");
                return;
            }
            await Promise.all(
                updates.map(p =>
                    settingsService.updateOAuthProvider(p.name, {
                        enabled: p.enabled,
                        clientId: p.clientId,
                        clientSecret: p.clientSecret,
                    })
                )
            );
            toast.success("Configuración OAuth guardada correctamente");
        } catch (err) {
            toast.error(getErrorMessage(err, "¡La configuración OAuth se resiste!"));
        } finally {
            setSavingTab(null);
        }
    };

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const tabItems: { key: SettingsTab; label: string }[] = [
        { key: "organization", label: t('settings.tabOrganization') },
        { key: "application", label: t('settings.tabApplication') },
        { key: "bank", label: t('settings.tabBank') },
        { key: "email", label: t('settings.tabEmail') },
        { key: "contact", label: t('settings.tabContact') },
        { key: "upload", label: t('settings.tabUpload') },
        { key: "ai", label: t('settings.tabAI') },
        { key: "oauth", label: "OAuth / Inicio de Sesión" },
    ];

    if (loading) {
        return (
            <RequirePermission permission={{ obj: "settings", action: "read" }} redirectTo="/mi-espacio">
                <PageContainer>
                    <LoadingSpinner message={t('settings.loadingSettings')} size="lg" />
                </PageContainer>
            </RequirePermission>
        );
    }

    if (error) {
        return (
            <RequirePermission permission={{ obj: "settings", action: "read" }} redirectTo="/mi-espacio">
                <PageContainer>
                    <h1 className="text-3xl font-extrabold font-display text-yambo-black mb-6 flex items-center gap-2">
                        <FontAwesomeIcon icon={faGear} className="text-yambo-green-500" />
                        {t('settings.generalSettings')}
                    </h1>
                    <ErrorMessage message={error} onRetry={loadSettings} />
                </PageContainer>
            </RequirePermission>
        );
    }

    return (
        <RequirePermission permission={{ obj: "settings", action: "read" }} redirectTo="/mi-espacio">
            <PageContainer>
                <PageHeader
                    title={
                        <span className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faGear} className="text-yambo-green-500" />
                            Configuración General
                        </span>
                    }
                    description={t('settings.manageSettingsHint')}
                    wiki={{ slug: "configuracion" }}
                />

                <section className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
                    <div className="flex flex-wrap gap-2">
                        {tabItems.map((tab) => (
                            <button type="button"
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    activeTab === tab.key
                                        ? "bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 text-white shadow-lg shadow-yambo-green-500/25"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </section>

                {activeTab === "organization" && (
                    <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                        <h2 className="text-xl font-bold font-display text-yambo-black">{t('settings.sectionOrganization')}</h2>
                        <InputComponent
                            label={t('settings.orgName')}
                            type="text"
                            value={organizationName}
                            onChange={(e) => setOrganizationName(e.target.value)}
                            placeholder={t('settings.orgNamePlaceholder')}
                            required
                        />
                        <p className="text-sm text-gray-400">{t('settings.orgNameHint')}</p>
                        <InputComponent
                            label={t('settings.orgLegalName')}
                            type="text"
                            value={organizationLegalName}
                            onChange={(e) => setOrganizationLegalName(e.target.value)}
                            placeholder={t('settings.orgLegalNamePlaceholder')}
                            required
                        />
                        <p className="text-sm text-gray-400">{t('settings.orgLegalNameHint')}</p>
                        <RequirePermission permission={{ obj: "settings", action: "update" }} redirect={false}>
                            <div className="flex justify-end">
                                <ButtonComponent onClick={handleSaveOrganizationSettings} variant="primary" disabled={savingTab !== null}>
                                    {savingTab === "organization" ? t('common.saving') : t('settings.saveOrganization')}
                                </ButtonComponent>
                            </div>
                        </RequirePermission>
                    </section>
                )}

                {activeTab === "application" && (
                    <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                        <h2 className="text-xl font-bold font-display text-yambo-black">{t('settings.sectionApplication')}</h2>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <InputComponent label={t('settings.appDomain')} type="text" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder={t('settings.appDomainPlaceholder')} required />
                            </div>
                        </div>
                        <p className="text-sm text-gray-400">{t('settings.appDomainHint')}</p>
                        <InputComponent label={t('settings.issueCreationWindow')} type="number" value={issueCreationWindowDays} onChange={(e) => setIssueCreationWindowDays(e.target.value)} placeholder="30" required />
                        <p className="text-sm text-gray-400">{t('settings.issueCreationWindowDaysHint')}</p>
                        <RequirePermission permission={{ obj: "settings", action: "update" }} redirect={false}>
                            <div className="flex justify-end">
                                <ButtonComponent onClick={handleSaveApplicationSettings} variant="primary" disabled={savingTab !== null}>
                                    {savingTab === "application" ? t('common.saving') : t('settings.saveApplication')}
                                </ButtonComponent>
                            </div>
                        </RequirePermission>
                    </section>
                )}

                {activeTab === "bank" && (
                    <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                        <h2 className="text-xl font-bold font-display text-yambo-black">{t('settings.sectionBank')}</h2>
                        <InputComponent label={t('settings.bankIban')} type="text" value={iban} onChange={(e) => setIban(e.target.value)} placeholder={t('settings.bankIbanPlaceholder')} required />
                        <p className="text-sm text-gray-400">{t('settings.bankIbanHint')}</p>
                        <RequirePermission permission={{ obj: "settings", action: "update" }} redirect={false}>
                            <div className="flex justify-end">
                                <ButtonComponent onClick={handleSaveBankSettings} variant="primary" disabled={savingTab !== null}>
                                    {savingTab === "bank" ? t('common.saving') : t('settings.saveBank')}
                                </ButtonComponent>
                            </div>
                        </RequirePermission>
                    </section>
                )}

                {activeTab === "email" && (
                    <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                        <h2 className="text-xl font-bold font-display text-yambo-black">{t('settings.sectionEmail')}</h2>
                        <p className="text-sm text-gray-400">{t('settings.emailHint')}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputComponent label={t('settings.emailHost')} type="text" value={emailConfig.host} onChange={(e) => setEmailConfig({ ...emailConfig, host: e.target.value })} placeholder={t('settings.emailHostPlaceholder')} required />
                            <InputComponent label={t('settings.emailPort')} type="number" value={emailConfig.port} onChange={(e) => setEmailConfig({ ...emailConfig, port: String(e.target.value) })} placeholder="587" required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputComponent label={t('settings.emailUsername')} type="text" value={emailConfig.username} onChange={(e) => setEmailConfig({ ...emailConfig, username: e.target.value })} placeholder={t('settings.emailUsernamePlaceholder')} />
                            <InputComponent label={t('settings.emailPassword')} type="password" value={emailConfig.password} onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })} placeholder="••••••••" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputComponent label={t('settings.emailFrom')} type="email" value={emailConfig.from} onChange={(e) => setEmailConfig({ ...emailConfig, from: e.target.value })} placeholder={t('settings.emailFromPlaceholder')} required />
                            <InputComponent label={t('settings.emailFromName')} type="text" value={emailConfig.fromName || ""} onChange={(e) => setEmailConfig({ ...emailConfig, fromName: e.target.value })} placeholder={t('settings.emailFromNamePlaceholder')} />
                        </div>
                        <button type="button" onClick={() => setSmtpAdvancedVisible(!smtpAdvancedVisible)} className="flex items-center gap-2 text-sm text-yambo-green-600 hover:text-yambo-green-700 font-medium">
                            <FontAwesomeIcon icon={smtpAdvancedVisible ? faChevronUp : faChevronDown} className="w-3 h-3" />
                            {t('settings.smtpAdvanced')}
                        </button>
                        {smtpAdvancedVisible && (
                            <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <input type="checkbox" checked={smtpConfig.auth} onChange={(e) => setSmtpConfig({ ...smtpConfig, auth: e.target.checked })} className="rounded border-gray-300 text-yambo-green-600 focus:ring-yambo-green-500" />
                                        {t('settings.smtpAuth')}
                                    </label>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <input type="checkbox" checked={smtpConfig.starttlsEnable} onChange={(e) => setSmtpConfig({ ...smtpConfig, starttlsEnable: e.target.checked })} className="rounded border-gray-300 text-yambo-green-600 focus:ring-yambo-green-500" />
                                        {t('settings.smtpStartTlsEnable')}
                                    </label>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <input type="checkbox" checked={smtpConfig.starttlsRequired} onChange={(e) => setSmtpConfig({ ...smtpConfig, starttlsRequired: e.target.checked })} className="rounded border-gray-300 text-yambo-green-600 focus:ring-yambo-green-500" />
                                        {t('settings.smtpStartTlsRequired')}
                                    </label>
                                </div>
                            </div>
                        )}
                        <RequirePermission permission={{ obj: "settings", action: "update" }} redirect={false}>
                            <div className="flex justify-end">
                                <ButtonComponent onClick={handleSaveEmailSettings} variant="primary" disabled={savingTab !== null}>
                                    {savingTab === "email" ? t('common.saving') : t('settings.saveEmail')}
                                </ButtonComponent>
                            </div>
                        </RequirePermission>
                    </section>
                )}

                {activeTab === "contact" && (
                    <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                        <h2 className="text-xl font-bold font-display text-yambo-black">{t('settings.sectionContact')}</h2>
                        <p className="text-sm text-gray-400">{t('settings.contactHint')}</p>
                        <InputComponent label={t('settings.contactEmail')} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder={t('settings.contactEmailPlaceholder')} />
                        <InputComponent label={t('settings.contactInstagram')} type="text" value={contactInstagram} onChange={(e) => setContactInstagram(e.target.value)} placeholder={t('settings.contactInstagramPlaceholder')} />
                        <InputComponent label={t('settings.contactTiktok')} type="text" value={contactTiktok} onChange={(e) => setContactTiktok(e.target.value)} placeholder={t('settings.contactTiktokPlaceholder')} />
                        <RequirePermission permission={{ obj: "settings", action: "update" }} redirect={false}>
                            <div className="flex justify-end">
                                <ButtonComponent onClick={handleSaveContactSettings} variant="primary" disabled={savingTab !== null}>
                                    {savingTab === "contact" ? t('common.saving') : t('settings.saveContact')}
                                </ButtonComponent>
                            </div>
                        </RequirePermission>
                    </section>
                )}

                {activeTab === "upload" && (
                    <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                        <h2 className="text-xl font-bold font-display text-yambo-black">{t('settings.sectionUpload')}</h2>
                        <p className="text-sm text-gray-400">{t('settings.uploadHint')}</p>
                        <InputComponent label={t('settings.maxFileSize')} type="number" min="1" step="1" value={String(uploadConfig.maxFileSizeMb)} onChange={(e) => setUploadConfig({ ...uploadConfig, maxFileSizeMb: Number(e.target.value) })} placeholder="5" required />
                        <p className="text-sm text-gray-400">{t('settings.maxFileSizeHint')}</p>
                        <RequirePermission permission={{ obj: "settings", action: "update" }} redirect={false}>
                            <div className="flex justify-end">
                                <ButtonComponent onClick={handleSaveUploadSettings} variant="primary" disabled={savingTab !== null}>
                                    {savingTab === "upload" ? t('common.saving') : t('settings.saveUpload')}
                                </ButtonComponent>
                            </div>
                        </RequirePermission>
                    </section>
                )}

                {activeTab === "ai" && (
                    <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                        <h2 className="text-xl font-bold font-display text-yambo-black">{t('settings.sectionAI')}</h2>
                        <p className="text-sm text-gray-400">{t('settings.aiHint')}</p>
                        <InputComponent label={t('settings.ollamaApiUrl')} type="text" value={ollamaConfig.apiUrl} onChange={(e) => setOllamaConfig({ ...ollamaConfig, apiUrl: e.target.value })} placeholder={t('settings.ollamaApiUrlPlaceholder')} required />
                        <p className="text-sm text-gray-400">{t('settings.ollamaApiUrlHint')}</p>
                        <InputComponent label={t('settings.ollamaModel')} type="text" value={ollamaConfig.model} onChange={(e) => setOllamaConfig({ ...ollamaConfig, model: e.target.value })} placeholder={t('settings.ollamaModelPlaceholder')} required />
                        <p className="text-sm text-gray-400">{t('settings.ollamaModelHint')}</p>
                        <RequirePermission permission={{ obj: "settings", action: "update" }} redirect={false}>
                            <div className="flex justify-end">
                                <ButtonComponent onClick={handleSaveOllamaSettings} variant="primary" disabled={savingTab !== null}>
                                    {savingTab === "ai" ? t('common.saving') : t('settings.saveAI')}
                                </ButtonComponent>
                            </div>
                        </RequirePermission>
                    </section>
                )}

                {activeTab === "oauth" && (
                    <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
                        <h2 className="text-xl font-bold font-display text-yambo-black flex items-center gap-2">
                            <FontAwesomeIcon icon={faGoogle} className="text-blue-500 w-5 h-5" />
                            OAuth / Inicio de Sesión
                        </h2>
                        <p className="text-sm text-gray-400">
                            Configura los proveedores de inicio de sesión con servicios externos (Google, Apple, GitHub...).
                            Los usuarios podrán iniciar sesión con estos métodos si están activados y configurados.
                        </p>

                        {oauthProviders.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <FontAwesomeIcon icon={faGoogle} className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                                <p className="font-medium">No hay proveedores OAuth disponibles</p>
                                <p className="text-sm mt-1">Implementa un OAuthProvider en el backend para que aparezca aquí.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {oauthProviders.map((provider) => (
                                    <div key={provider.name} className="bg-gray-50 rounded-xl border border-gray-100 p-5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                                                    {provider.name === "google" ? (
                                                        <FontAwesomeIcon icon={faGoogle} className="text-blue-500 w-5 h-5" />
                                                    ) : (
                                                        <span className="text-lg font-bold text-gray-400">{provider.displayName[0]}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-yambo-black">{provider.displayName}</h3>
                                                    <p className="text-xs text-gray-400">{provider.name}</p>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={provider.enabled}
                                                    onChange={(e) => {
                                                        setOauthProviders(prev =>
                                                            prev.map(p => p.name === provider.name ? { ...p, enabled: e.target.checked } : p)
                                                        );
                                                    }}
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yambo-green-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yambo-green-500"></div>
                                            </label>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                                                <input
                                                    type="text"
                                                    value={provider.clientId}
                                                    onChange={(e) => {
                                                        setOauthProviders(prev =>
                                                            prev.map(p => p.name === provider.name ? { ...p, clientId: e.target.value } : p)
                                                        );
                                                    }}
                                                    placeholder="123456789-xxxxx.apps.googleusercontent.com"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-yambo-green-500 focus:border-transparent outline-none transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
                                                <div className="relative">
                                                    <input
                                                        type={showClientSecret[provider.name] ? "text" : "password"}
                                                        value={provider.clientSecret}
                                                        onChange={(e) => {
                                                            setOauthProviders(prev =>
                                                                prev.map(p => p.name === provider.name ? { ...p, clientSecret: e.target.value } : p)
                                                            );
                                                        }}
                                                        placeholder="GOCSPX-..."
                                                        className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-yambo-green-500 focus:border-transparent outline-none transition-all"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowClientSecret(prev => ({ ...prev, [provider.name]: !prev[provider.name] }))}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                        aria-label={showClientSecret[provider.name] ? "Ocultar Client Secret" : "Mostrar Client Secret"}
                                                    >
                                                        <FontAwesomeIcon icon={showClientSecret[provider.name] ? faEyeSlash : faEye} className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <a
                                            href="/mi-espacio/admin/guias#oauth-google"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs text-yambo-green-600 hover:text-yambo-green-700 hover:underline font-medium"
                                        >
                                            <FontAwesomeIcon icon={faExternalLinkAlt} className="w-3 h-3" />
                                            Guía paso a paso para obtener estas claves
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}

                        <RequirePermission permission={{ obj: "settings", action: "update" }} redirect={false}>
                            <div className="flex justify-end">
                                <ButtonComponent onClick={handleSaveOAuthSettings} variant="primary" disabled={savingTab !== null}>
                                    {savingTab === "oauth" ? t('common.saving') : "Guardar configuración OAuth"}
                                </ButtonComponent>
                            </div>
                        </RequirePermission>
                    </section>
                )}
            </PageContainer>
        </RequirePermission>
    );
}
