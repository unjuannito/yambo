import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { RequirePermission } from "~/components/common/RequirePermission";
import { adminLegalPageService, type LegalPageAdmin, type LegalPageUpdateRequest } from "~/services/adminLegalPageService";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGavel } from "@fortawesome/free-solid-svg-icons";

export default function LegalAdmin() {
    const { t } = useTranslation();
    const [pages, setPages] = useState<LegalPageAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<LegalPageUpdateRequest>({
        title: "",
        content: "",
        published: true,
    });
    const [saving, setSaving] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const fetchPages = useCallback(async () => {
        try {
            setLoading(true);
            const data = await adminLegalPageService.listAll();
            setPages(data);
        } catch (err) {
            toast.error(getErrorMessage(err, t("legal.loadError")));
        } finally {
            setLoading(false);
        }
    }, [refreshKey, t]);

    useEffect(() => {
        fetchPages();
    }, [fetchPages]);

    const startEdit = (page: LegalPageAdmin) => {
        setEditingId(page.id);
        setForm({
            title: page.title,
            content: page.content,
            published: page.published,
        });
    };

    const resetEdit = () => {
        setEditingId(null);
        setForm({ title: "", content: "", published: true });
    };

    const handleSave = async () => {
        if (!editingId) return;
        try {
            setSaving(true);
            await adminLegalPageService.update(editingId, form);
            toast.success(t("legal.updated"));
            resetEdit();
            setRefreshKey(prev => prev + 1);
        } catch (err) {
            toast.error(getErrorMessage(err, t("legal.saveError")));
        } finally {
            setSaving(false);
        }
    };

    const typeLabels: Record<string, string> = useMemo(() => ({
        AVISO_LEGAL: t("legal.typeAvisoLegal"),
        PRIVACIDAD: t("legal.typePrivacidad"),
        COOKIES: t("legal.typeCookies"),
        TERMINOS: t("legal.typeTerminos"),
        PROTECCION_DATOS: t("legal.typeProteccionDatos"),
    }), [t]);

    const typeOrder = ["AVISO_LEGAL", "PRIVACIDAD", "COOKIES", "TERMINOS", "PROTECCION_DATOS"];

    return (
        <RequirePermission permission={{ obj: "legal_page", action: "read" }} redirectTo="/mi-espacio">
            <main className="flex flex-col p-4 md:p-6 w-full">
                <h1 className="text-3xl font-extrabold font-display text-yambo-black mb-6 flex items-center gap-2">
                    <FontAwesomeIcon icon={faGavel} className="text-yambo-green-500" />
                    {t("legal.pageTitle")}
                </h1>

                {loading ? (
                    <p className="text-gray-500">{t("legal.loadingText")}</p>
                ) : (
                    <div className="space-y-6">
                        {typeOrder.map(type => {
                            const page = pages.find(p => p.type === type);
                            if (!page) return null;
                            const isEditing = editingId === page.id;

                            return (
                                <div key={page.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                        <div>
                                            <h2 className="font-semibold text-yambo-black">
                                                {typeLabels[type] || type}
                                            </h2>
                                            <span className="text-xs text-gray-400">
                                                v{page.version} · {page.published ? (
                                                    <span className="text-green-600">{t("legal.published")}</span>
                                                ) : (
                                                    <span className="text-amber-600">{t("legal.unpublished")}</span>
                                                )}
                                                {page.publishedAt && (
                                                    <> · {t("legal.publishedOn")} {new Date(page.publishedAt).toLocaleDateString("es-ES")}</>
                                                )}
                                            </span>
                                        </div>
                                        <RequirePermission permission={{ obj: "legal_page", action: "update" }} redirect={false}>
                                            {!isEditing && (
                                                <ButtonComponent
                                                    onClick={() => startEdit(page)}
                                                    variant="primary"
                                                    size="sm"
                                                >
                                                    {t("common.edit")}
                                                </ButtonComponent>
                                            )}
                                        </RequirePermission>
                                    </div>

                                    {isEditing ? (
                                        <div className="p-6 space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">{t("legal.titleLabel")}</label>
                                                <input
                                                    type="text"
                                                    value={form.title}
                                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                                    className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-yambo-green-500 focus:ring-1 focus:ring-yambo-green-500/50"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    {t("legal.contentHtml")}
                                                </label>
                                                <textarea
                                                    value={form.content}
                                                    onChange={e => setForm({ ...form, content: e.target.value })}
                                                    rows={20}
                                                    className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm font-mono focus:outline-none focus:border-yambo-green-500 focus:ring-1 focus:ring-yambo-green-500/50"
                                                    required
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="published"
                                                    checked={form.published}
                                                    onChange={e => setForm({ ...form, published: e.target.checked })}
                                                    className="rounded border-gray-300 text-yambo-green-600"
                                                />
                                                <label htmlFor="published" className="text-sm text-gray-700">
                                                    {t("legal.publishedCheckbox")}
                                                </label>
                                            </div>
                                            <div className="flex gap-2">
                                                <ButtonComponent
                                                    onClick={handleSave}
                                                    variant="primary"
                                                    disabled={saving}
                                                >
                                                    {saving ? t("common.saving") : t("common.save")}
                                                </ButtonComponent>
                                                <ButtonComponent
                                                    onClick={resetEdit}
                                                    variant="neutral"
                                                    disabled={saving}
                                                >
                                                    {t("common.cancel")}
                                                </ButtonComponent>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-6">
                                            <div
                                                className="prose prose-yambo max-w-none text-gray-600 text-sm leading-relaxed line-clamp-6"
                                                dangerouslySetInnerHTML={{ __html: page.content }}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </RequirePermission>
    );
}
