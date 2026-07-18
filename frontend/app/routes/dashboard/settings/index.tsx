import { useState, useEffect } from "react";
import type { Route } from "./+types/index";
import { RequirePermission } from "~/components/common/RequirePermission";
import InputComponent from "~/components/common/forms/InputComponent";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { settingsService, type EmailConfig, type UploadConfig, type OllamaConfig } from "~/services/settingsService";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight, faGear } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Yambo - Configuración" },
        { name: "description", content: "Configuración general del sistema" },
    ];
}

type SettingsTab = "organization" | "application" | "bank" | "email" | "contact" | "upload" | "ai";

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
            setError(getErrorMessage(err, "La configuración se nos resiste"));
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

    const tabItems: { key: SettingsTab; label: string }[] = [
        { key: "organization", label: t('settings.tabOrganization') },
        { key: "application", label: t('settings.tabApplication') },
        { key: "bank", label: t('settings.tabBank') },
        { key: "email", label: t('settings.tabEmail') },
        { key: "contact", label: t('settings.tabContact') },
        { key: "upload", label: t('settings.tabUpload') },
        { key: "ai", label: t('settings.tabAI') },
    ];

    if (loading) {
        return (
            <RequirePermission permission={{ obj: "settings", action: "read" }} redirectTo="/mi-espacio">
                <main className="flex flex-col p-4 md:p-6 w-full">
                    <LoadingSpinner message={t('settings.loadingSettings')} size="lg" />
                </main>
            </RequirePermission>
        );
    }

    if (error) {
        return (
            <RequirePermission permission={{ obj: "settings", action: "read" }} redirectTo="/mi-espacio">
                <main className="flex flex-col p-4 md:p-6 w-full">
                    <h1 className="text-3xl font-extrabold font-display text-yambo-black mb-6 flex items-center gap-2">
                        <FontAwesomeIcon icon={faGear} className="text-yambo-green-500" />
                        {t('settings.generalSettings')}
                    </h1>
                    <ErrorMessage message={error} onRetry={loadSettings} />
                </main>
            </RequirePermission>
        );
    }

    return (
        <RequirePermission permission={{ obj: "settings", action: "read" }} redirectTo="/mi-espacio">
            <main className="flex flex-col p-4 md:p-6 w-full">
                <h1 className="text-3xl font-extrabold font-display text-yambo-black mb-2 flex items-center gap-2">
                    <FontAwesomeIcon icon={faGear} className="text-yambo-green-500" />
                    Configuración General
                </h1>
                <p className="text-gray-400 mb-6">{t('settings.manageSettingsHint')}</p>

                <section className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
                    <div className="flex flex-wrap gap-2">
                        {tabItems.map((tab) => (
                            <button
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
                        <p className="text-sm text-gray-400">
                            {t('settings.orgNameHint')}
                        </p>
                        <InputComponent
                            label={t('settings.orgLegalName')}
                            type="text"
                            value={organizationLegalName}
                            onChange={(e) => setOrganizationLegalName(e.target.value)}
                            placeholder={t('settings.orgLegalNamePlaceholder')}
                            required
                        />
                        <p className="text-sm text-gray-400">
                            {t('settings.orgLegalNameHint')}
                        </p>
                        <RequirePermission permission={{ obj: "settings", action: "update" }} redirect={false}>
                            <div className="flex justify-end">
                                <ButtonComponent
                                    onClick={handleSaveOrganizationSettings}
                                    variant="primary"
                                    disabled={savingTab !== null}
                                >
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
                                <InputComponent
                                    label={t('settings.appDomain')}
                                    type="text"
                                    value={domain}
                                    onChange={(e) => setDomain(e.target.value)}
                                    placeholder={t('settings.appDomainPlaceholder')}
                                    required
                                />
                            </div>
                            <div className="flex items-end">
                                <ButtonComponent
                                    onClick={() => setDomain(currentHost)}
                                    variant="neutral"
                                    disabled={savingTab !== null}
                                >
                                    {t('settings.useCurrentHost')}
                                </ButtonComponent>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400">
                            {t('settings.appDomainHint')}
                        </p>
                        <InputComponent
                            label={t('settings.issueCreationWindow')}
                            type="number"
                            min="0"
                            step="1"
                            value={issueCreationWindowDays}
                            onChange={(e) => setIssueCreationWindowDays(e.target.value)}
                            placeholder="30"
                            required
                        />
                        <p className="text-sm text-gray-400">
                            {t('settings.issueCreationWindowHint')}
                        </p>
                        <RequirePermission permission={{ obj: "settings", action: "update" }} redirect={false}>
                            <div className="flex justify-end">
                                <ButtonComponent
                                    onClick={handleSaveApplicationSettings}
                                    variant="primary"
                                    disabled={savingTab !== null}
                                >
                                    {savingTab === "application" ? t('common.saving') : t('settings.saveApplication')}
                                </ButtonComponent>
                            </div>
                        </RequirePermission>
                    </section>
                )}

                {activeTab === "bank" && (
                    <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                        <h2 className="text-xl font-bold font-display text-yambo-black">{t('settings.sectionBank')}</h2>
                        <InputComponent
                            label={t('settings.iban')}
                            type="text"
                            value={iban}
                            onChange={(e) => setIban(e.target.value)}
                            placeholder={t('settings.ibanPlaceholder')}
                            required
                        />
                        <RequirePermission permission={{ obj: "settings", action: "update" }} redirect={false}>
                            <div className="flex justify-end">
                                <ButtonComponent
                                    onClick={handleSaveBankSettings}
                                    variant="primary"
                                    disabled={savingTab !== null}
                                >
                                    {savingTab === "bank" ? t('common.saving') : t('settings.saveBank')}
                                </ButtonComponent>
                            </div>
                        </RequirePermission>
                    </section>
                )}

                {activeTab === "email" && (
                    <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                        <h2 className="text-xl font-bold font-display text-yambo-black">{t('settings.sectionEmail')}</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputComponent
                                label={t('settings.smtpServer')}
                                type="text"
                                value={emailConfig.host}
                                onChange={(e) => setEmailConfig({ ...emailConfig, host: e.target.value })}
                                placeholder={t('settings.smtpServerPlaceholder')}
                                required
                            />
                            <InputComponent
                                label={t('settings.smtpPort')}
                                type="text"
                                value={emailConfig.port}
                                onChange={(e) => setEmailConfig({ ...emailConfig, port: e.target.value })}
                                placeholder={t('settings.smtpPortPlaceholder')}
                                required
                            />
                        </div>
                        <InputComponent
                            label={t('settings.smtpUser')}
                            type="text"
                            value={emailConfig.username}
                            onChange={(e) => setEmailConfig({ ...emailConfig, username: e.target.value })}
                            placeholder={t('settings.smtpUserPlaceholder')}
                            required
                        />
                        <InputComponent
                            label={t('settings.smtpPassword')}
                            type="password"
                            value={emailConfig.password}
                            onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })}
                            placeholder={t('settings.smtpPasswordPlaceholder')}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputComponent
                                label={t('settings.senderEmail')}
                                type="email"
                                value={emailConfig.from}
                                onChange={(e) => setEmailConfig({ ...emailConfig, from: e.target.value })}
                                placeholder={t('settings.senderEmailPlaceholder')}
                                required
                            />
                            <InputComponent
                                label={t('settings.senderName')}
                                type="text"
                                value={emailConfig.fromName || ""}
                                onChange={(e) => setEmailConfig({ ...emailConfig, fromName: e.target.value })}
                                placeholder={t('settings.senderNamePlaceholder')}
                            />
                        </div>

                        <div className="border-t border-gray-100 pt-4 mt-2">
                            <button
                                type="button"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-yambo-black transition-colors"
                            >
                                <FontAwesomeIcon
                                    icon={faChevronRight}
                                    className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
                                />
                                {t('settings.advancedSmtp')}
                            </button>

                            {showAdvanced && (
                                <div className="mt-4 space-y-4 pl-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={smtpConfig.auth}
                                                onChange={(e) => setSmtpConfig({ ...smtpConfig, auth: e.target.checked })}
                                                className="rounded border-gray-300 text-yambo-green-600 focus:ring-yambo-green-500/50"
                                            />
                                            <span className="text-sm">{t('settings.smtpAuth')}</span>
                                        </label>
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={smtpConfig.starttlsEnable}
                                                onChange={(e) => setSmtpConfig({ ...smtpConfig, starttlsEnable: e.target.checked })}
                                                className="rounded border-gray-300 text-yambo-green-600 focus:ring-yambo-green-500/50"
                                            />
                                            <span className="text-sm">{t('settings.smtpStarttlsEnable')}</span>
                                        </label>
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={smtpConfig.starttlsRequired}
                                                onChange={(e) => setSmtpConfig({ ...smtpConfig, starttlsRequired: e.target.checked })}
                                                className="rounded border-gray-300 text-yambo-green-600 focus:ring-yambo-green-500/50"
                                            />
                                            <span className="text-sm">{t('settings.smtpStarttlsRequired')}</span>
                                        </label>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <InputComponent
                                            label={t('settings.connectionTimeout')}
                                            type="number"
                                            value={String(smtpConfig.connectionTimeout)}
                                            onChange={(e) => setSmtpConfig({ ...smtpConfig, connectionTimeout: Number(e.target.value) })}
                                            placeholder="5000"
                                        />
                                        <InputComponent
                                            label={t('settings.readTimeout')}
                                            type="number"
                                            value={String(smtpConfig.timeout)}
                                            onChange={(e) => setSmtpConfig({ ...smtpConfig, timeout: Number(e.target.value) })}
                                            placeholder="5000"
                                        />
                                        <InputComponent
                                            label={t('settings.writeTimeout')}
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
                                    {savingTab === "email" ? t('common.saving') : t('settings.saveEmail')}
                                </ButtonComponent>
                            </div>
                        </RequirePermission>
                    </section>
                )}

                {activeTab === "contact" && (
                    <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                        <h2 className="text-xl font-bold font-display text-yambo-black">{t('settings.sectionContact')}</h2>
                        <p className="text-sm text-gray-400">
                            {t('settings.contactHint')}
                        </p>
                        <InputComponent
                            label={t('settings.contactEmail')}
                            type="email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            placeholder={t('settings.contactEmailPlaceholder')}
                        />
                        <InputComponent
                            label={t('settings.contactInstagram')}
                            type="text"
                            value={contactInstagram}
                            onChange={(e) => setContactInstagram(e.target.value)}
                            placeholder={t('settings.contactInstagramPlaceholder')}
                        />
                        <InputComponent
                            label={t('settings.contactTiktok')}
                            type="text"
                            value={contactTiktok}
                            onChange={(e) => setContactTiktok(e.target.value)}
                            placeholder={t('settings.contactTiktokPlaceholder')}
                        />
                        <RequirePermission permission={{ obj: "settings", action: "update" }} redirect={false}>
                            <div className="flex justify-end">
                                <ButtonComponent
                                    onClick={handleSaveContactSettings}
                                    variant="primary"
                                    disabled={savingTab !== null}
                                >
                                    {savingTab === "contact" ? t('common.saving') : t('settings.saveContact')}
                                </ButtonComponent>
                            </div>
                        </RequirePermission>
                    </section>
                )}

                {activeTab === "upload" && (
                    <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                        <h2 className="text-xl font-bold font-display text-yambo-black">{t('settings.sectionUpload')}</h2>
                        <p className="text-sm text-gray-400">
                            {t('settings.uploadHint')}
                        </p>
                        <InputComponent
                            label={t('settings.maxFileSize')}
                            type="number"
                            min="1"
                            step="1"
                            value={String(uploadConfig.maxFileSizeMb)}
                            onChange={(e) => setUploadConfig({ ...uploadConfig, maxFileSizeMb: Number(e.target.value) })}
                            placeholder="5"
                            required
                        />
                        <p className="text-sm text-gray-400">
                            {t('settings.maxFileSizeHint')}
                        </p>
                        <RequirePermission permission={{ obj: "settings", action: "update" }} redirect={false}>
                            <div className="flex justify-end">
                                <ButtonComponent
                                    onClick={handleSaveUploadSettings}
                                    variant="primary"
                                    disabled={savingTab !== null}
                                >
                                    {savingTab === "upload" ? t('common.saving') : t('settings.saveUpload')}
                                </ButtonComponent>
                            </div>
                        </RequirePermission>
                    </section>
                )}

                {activeTab === "ai" && (
                    <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                        <h2 className="text-xl font-bold font-display text-yambo-black">{t('settings.sectionAI')}</h2>
                        <p className="text-sm text-gray-400">
                            {t('settings.aiHint')}
                        </p>
                        <InputComponent
                            label={t('settings.ollamaApiUrl')}
                            type="text"
                            value={ollamaConfig.apiUrl}
                            onChange={(e) => setOllamaConfig({ ...ollamaConfig, apiUrl: e.target.value })}
                            placeholder={t('settings.ollamaApiUrlPlaceholder')}
                            required
                        />
                        <p className="text-sm text-gray-400">
                            {t('settings.ollamaApiUrlHint')}
                        </p>
                        <InputComponent
                            label={t('settings.ollamaModel')}
                            type="text"
                            value={ollamaConfig.model}
                            onChange={(e) => setOllamaConfig({ ...ollamaConfig, model: e.target.value })}
                            placeholder={t('settings.ollamaModelPlaceholder')}
                            required
                        />
                        <p className="text-sm text-gray-400">
                            {t('settings.ollamaModelHint')}
                        </p>
                        <RequirePermission permission={{ obj: "settings", action: "update" }} redirect={false}>
                            <div className="flex justify-end">
                                <ButtonComponent
                                    onClick={handleSaveOllamaSettings}
                                    variant="primary"
                                    disabled={savingTab !== null}
                                >
                                    {savingTab === "ai" ? t('common.saving') : t('settings.saveAI')}
                                </ButtonComponent>
                            </div>
                        </RequirePermission>
                    </section>
                )}
            </main>
        </RequirePermission>
    );
}
