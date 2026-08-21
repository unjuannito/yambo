import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { RequirePermission } from "~/components/common/RequirePermission";
import { PageHeader } from "~/components/common/PageHeader";
import { FilterableTable } from "~/components/common/FilterableTable";
import type {
    FilterableColumn,
    FetchDataParams,
} from "~/components/common/FilterableTable";
import { Modal } from "~/components/common/Modal";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import InputComponent from "~/components/common/forms/InputComponent";
import LabelComponent from "~/components/common/forms/LabelComponent";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { seoService } from "~/services/seoService";
import type {
    SeoMetadataAdmin,
    SeoMetadataUpdateRequest,
} from "~/services/seoService";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faWandMagicSparkles,
    faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";

export function meta() {
    return [
        { title: "Yambo - SEO" },
        { name: "description", content: "Gestión de metadatos SEO" },
    ];
}

interface EditForm {
    metaDescription: string;
    keywords: string;
    ogDescription: string;
    slug: string;
}

const EMPTY_FORM: EditForm = {
    metaDescription: "",
    keywords: "",
    ogDescription: "",
    slug: "",
};

export default function SeoAdmin() {
    const { t } = useTranslation();
    const [refreshKey, setRefreshKey] = useState(0);

    // Edit modal
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<SeoMetadataAdmin | null>(null);
    const [form, setForm] = useState<EditForm>({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);

    // Confirm dialogs
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
    const [actionEntry, setActionEntry] = useState<SeoMetadataAdmin | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Bulk generate
    const [bulkLoading, setBulkLoading] = useState(false);

    // ── Data fetching (server-side via FilterableTable) ──
    const fetchSeoData = useCallback(
        async ({ page, size, filters }: FetchDataParams) => {
            return await seoService.list(
                page,
                size,
                filters.entityType || undefined,
            );
        },
        [refreshKey],
    );

    // ── Edit handlers ──
    const openEdit = (entry: SeoMetadataAdmin) => {
        setEditingEntry(entry);
        let keywordsDisplay = "";
        try {
            const parsed = JSON.parse(entry.keywords || "[]");
            if (Array.isArray(parsed)) {
                keywordsDisplay = parsed.join(", ");
            } else {
                keywordsDisplay = entry.keywords || "";
            }
        } catch {
            keywordsDisplay = entry.keywords || "";
        }
        setForm({
            metaDescription: entry.metaDescription || "",
            keywords: keywordsDisplay,
            ogDescription: entry.ogDescription || "",
            slug: entry.slug || "",
        });
        setEditModalOpen(true);
    };

    const handleSave = async () => {
        if (!editingEntry) return;
        setSaving(true);
        try {
            const keywordsArray = form.keywords
                .split(",")
                .map((k) => k.trim())
                .filter((k) => k.length > 0);

            const request: SeoMetadataUpdateRequest = {
                metaDescription: form.metaDescription || null,
                keywords: JSON.stringify(keywordsArray),
                ogDescription: form.ogDescription || null,
                slug: form.slug || null,
            };

            await seoService.update(editingEntry.id, request);
            toast.success(t("seo.updated"));
            setEditModalOpen(false);
            setEditingEntry(null);
            setRefreshKey((prev) => prev + 1);
        } catch (err) {
            toast.error(
                getErrorMessage(err, t("seo.saveError")),
            );
        } finally {
            setSaving(false);
        }
    };

    // ── Delete handlers ──
    const openDelete = (entry: SeoMetadataAdmin) => {
        setActionEntry(entry);
        setDeleteConfirmOpen(true);
    };

    const handleDelete = async () => {
        if (!actionEntry) return;
        setActionLoading(true);
        try {
            await seoService.remove(actionEntry.id);
            toast.success(t("seo.deleted"));
            setDeleteConfirmOpen(false);
            setActionEntry(null);
            setRefreshKey((prev) => prev + 1);
        } catch (err) {
            toast.error(
                getErrorMessage(err, t("seo.deleteError")),
            );
        } finally {
            setActionLoading(false);
        }
    };

    // ── Regenerate handlers ──
    const openRegenerate = (entry: SeoMetadataAdmin) => {
        setActionEntry(entry);
        setRegenerateConfirmOpen(true);
    };

    const handleRegenerate = async () => {
        if (!actionEntry) return;
        setActionLoading(true);
        try {
            await seoService.regenerate(
                actionEntry.entityType,
                actionEntry.entityId,
            );
            toast.success(
                t("seo.regenerateStarted"),
            );
            setRegenerateConfirmOpen(false);
            setActionEntry(null);
            setTimeout(() => setRefreshKey((prev) => prev + 1), 3000);
        } catch (err) {
            toast.error(
                getErrorMessage(err, t("seo.regenerateError")),
            );
        } finally {
            setActionLoading(false);
        }
    };

    // ── Bulk generate handler ──
    const handleBulkGenerate = async () => {
        setBulkLoading(true);
        try {
            await seoService.bulkGenerate();
            toast.success(
                t("seo.bulkGenerateStarted"),
            );
        } catch (err) {
            toast.error(
                getErrorMessage(
                    err,
                    t("seo.bulkGenerateError"),
                ),
            );
        } finally {
            setBulkLoading(false);
        }
    };

    // ── Helpers ──
    const parseKeywords = (keywords: string | null): string[] => {
        if (!keywords) return [];
        try {
            const parsed = JSON.parse(keywords);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    const truncate = (text: string | null, maxLen: number): string => {
        if (!text) return "—";
        return text.length > maxLen ? text.substring(0, maxLen) + "…" : text;
    };

    const formatDate = (dateStr: string): string => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // ── Column definitions ──
    const columns: FilterableColumn<SeoMetadataAdmin>[] = useMemo(
        () => [
            {
                key: "entityType",
                header: t("seo.entityType"),
                filter: {
                    enabled: true,
                    type: "select" as const,
                    placeholder: t("seo.filterAllTypes"),
                    options: [{ value: "PROJECT", label: t("seo.filterProjects") }],
                },
                render: (entry: SeoMetadataAdmin) => (
                    <div className="flex flex-col">
                        <span className="font-medium text-yambo-black">
                            {entry.entityName}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                            {entry.entityType}
                        </span>
                    </div>
                ),
            },
            {
                key: "slug",
                header: t("seo.slug"),
                className: "hidden sm:table-cell",
                render: (entry: SeoMetadataAdmin) => (
                    <span className="text-sm text-yambo-green-600 font-mono">
                        {truncate(entry.slug, 30)}
                    </span>
                ),
            },
            {
                key: "metaDescription",
                header: t("seo.metaDescription"),
                className: "hidden md:table-cell",
                render: (entry: SeoMetadataAdmin) => (
                    <span className="text-sm text-gray-400">
                        {truncate(entry.metaDescription, 50)}
                    </span>
                ),
            },
            {
                key: "keywords",
                header: t("seo.keywords"),
                className: "hidden md:table-cell",
                render: (entry: SeoMetadataAdmin) => {
                    const kws = parseKeywords(entry.keywords);
                    return (
                        <div className="flex flex-wrap gap-1">
                            {kws.slice(0, 3).map((kw, i) => (
                                <span
                                    key={`kw-${kw}-${i}`}
                                    className="px-2 py-0.5 rounded-full text-xs font-medium bg-yambo-green-50 text-yambo-green-700"
                                >
                                    {kw}
                                </span>
                            ))}
                            {kws.length > 3 && (
                                <span className="text-xs text-gray-400">
                                    +{kws.length - 3}
                                </span>
                            )}
                        </div>
                    );
                },
            },
            {
                key: "updatedAt",
                header: t("seo.updatedAtCol"),
                className: "hidden sm:table-cell",
                render: (entry: SeoMetadataAdmin) => (
                    <span className="text-sm text-gray-400">
                        {formatDate(entry.updatedAt)}
                    </span>
                ),
            },
            {
                key: "actions",
                header: t("common.actions"),
                requiredPerms: [{ obj: "seo_metadata", action: "update" }],
                render: (entry: SeoMetadataAdmin) => (
                    <div className="flex gap-2">
                        <RequirePermission
                            permission={{ obj: "seo_metadata", action: "update" }}
                            redirect={false}
                        >
                            <ButtonComponent
                                variant="primary"
                                size="sm"
                                onClick={() => openEdit(entry)}
                            >
                                {t("common.edit")}
                            </ButtonComponent>
                            <ButtonComponent
                                variant="neutral"
                                size="sm"
                                onClick={() => openRegenerate(entry)}
                            >
                                <FontAwesomeIcon
                                    icon={faWandMagicSparkles}
                                    className="mr-1"
                                />
                                {t("seo.aiRegenerate")}
                            </ButtonComponent>
                        </RequirePermission>
                        <RequirePermission
                            permission={{ obj: "seo_metadata", action: "delete" }}
                            redirect={false}
                        >
                            <ButtonComponent
                                variant="destructive"
                                size="sm"
                                onClick={() => openDelete(entry)}
                            >
                                {t("common.delete")}
                            </ButtonComponent>
                        </RequirePermission>
                    </div>
                ),
            },
        ],
        [t],
    );

    // ── Render ──
    return (
        <RequirePermission
            permission={{ obj: "seo_metadata", action: "read" }}
            redirectTo="/mi-espacio"
        >
            <main className="flex flex-col p-4 md:p-6 w-full">
                <PageHeader
                    title={
                        <span className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faMagnifyingGlass} className="text-yambo-green-500" />
                            {t("seo.title")}
                        </span>
                    }
                    description={t("seo.description")}
                    actions={
                        <RequirePermission
                            permission={{ obj: "seo_metadata", action: "create" }}
                            redirect={false}
                        >
                            <ButtonComponent
                                variant="primary"
                                onClick={handleBulkGenerate}
                                isLoading={bulkLoading}
                                disabled={bulkLoading}
                            >
                                <FontAwesomeIcon
                                    icon={faWandMagicSparkles}
                                    className="mr-2"
                                />
                                {t("seo.generateMissing")}
                            </ButtonComponent>
                        </RequirePermission>
                    }
                />

                <FilterableTable
                    columns={columns}
                    keyField="id"
                    display={{
                        emptyMessage: t("seo.noMetadata"),
                        loadingMessage: t("seo.loading"),
                        renderMobileCard: (entry: SeoMetadataAdmin) => {
                            const kws = parseKeywords(entry.keywords);
                            return (
                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-medium text-yambo-black truncate">
                                                {entry.entityName}
                                            </p>
                                            <p className="text-xs text-gray-400 font-mono">
                                                {entry.entityType}
                                            </p>
                                        </div>
                                        <span className="text-xs text-gray-400 shrink-0">
                                            {formatDate(entry.updatedAt)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-yambo-green-600 font-mono truncate">
                                        {truncate(entry.slug, 40)}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {truncate(entry.metaDescription, 80)}
                                    </p>
                                    {kws.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {kws.slice(0, 3).map((kw, i) => (
                                                <span
                                                    key={`kw-${kw}-${i}`}
                                                    className="px-2 py-0.5 rounded-full text-xs font-medium bg-yambo-green-50 text-yambo-green-700"
                                                >
                                                    {kw}
                                                </span>
                                            ))}
                                            {kws.length > 3 && (
                                                <span className="text-xs text-gray-400">
                                                    +{kws.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex gap-2 pt-1 flex-wrap">
                                        <RequirePermission
                                            permission={{ obj: "seo_metadata", action: "update" }}
                                            redirect={false}
                                        >
                                            <ButtonComponent
                                                variant="primary"
                                                size="sm"
                                                onClick={() => openEdit(entry)}
                                            >
                                                {t("common.edit")}
                                            </ButtonComponent>
                                            <ButtonComponent
                                                variant="neutral"
                                                size="sm"
                                                onClick={() => openRegenerate(entry)}
                                            >
                                                <FontAwesomeIcon
                                                    icon={faWandMagicSparkles}
                                                    className="mr-1"
                                                />
                                                {t("seo.aiRegenerate")}
                                            </ButtonComponent>
                                        </RequirePermission>
                                        <RequirePermission
                                            permission={{ obj: "seo_metadata", action: "delete" }}
                                            redirect={false}
                                        >
                                            <ButtonComponent
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => openDelete(entry)}
                                            >
                                                {t("common.delete")}
                                            </ButtonComponent>
                                        </RequirePermission>
                                    </div>
                                </div>
                            );
                        },
                    }}
                    serverSide={{ fetchData: fetchSeoData }}
                />

                {/* Edit Modal */}
                <Modal
                    isOpen={editModalOpen}
                    onClose={() => {
                        setEditModalOpen(false);
                        setEditingEntry(null);
                    }}
                    title={t("seo.editTitle", { name: editingEntry?.entityName || "" })}
                    size="lg"
                    footer={
                        <>
                            <ButtonComponent
                                variant="neutral"
                                onClick={() => {
                                    setEditModalOpen(false);
                                    setEditingEntry(null);
                                }}
                                disabled={saving}
                            >
                                {t("common.cancel")}
                            </ButtonComponent>
                            <ButtonComponent
                                variant="primary"
                                onClick={handleSave}
                                isLoading={saving}
                                disabled={saving}
                            >
                                {t("common.save")}
                            </ButtonComponent>
                        </>
                    }
                >
                    <div className="grid gap-6">
                        {/* Slug */}
                        <div>
                            <InputComponent
                                label={t("seo.slug")}
                                value={form.slug}
                                onChange={(e) =>
                                    setForm({ ...form, slug: e.target.value })
                                }
                                placeholder={t("seo.slugPlaceholder")}
                                maxLength={200}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                {t("seo.slugHelper", { count: form.slug.length })}
                            </p>
                        </div>

                        {/* Meta Description */}
                        <LabelComponent label={t("seo.metaDescription")}>
                            <textarea
                                value={form.metaDescription}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        metaDescription: e.target.value,
                                    })
                                }
                                maxLength={200}
                                rows={3}
                                className="w-full border border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:border-yambo-green-500 focus:ring-1 focus:ring-yambo-green-500/50"
                                placeholder={t("seo.metaDescriptionPlaceholder")}
                            />
                            <p
                                className={`text-xs mt-1 ${form.metaDescription.length > 155 ? "text-amber-600" : "text-gray-400"}`}
                            >
                                {t("seo.metaDescriptionHelper", { count: form.metaDescription.length })}
                                {form.metaDescription.length > 155 &&
                                    t("seo.metaDescriptionRecommended")}
                            </p>
                        </LabelComponent>

                        {/* OG Description */}
                        <LabelComponent label={t("seo.keywords")}>
                            <textarea
                                value={form.ogDescription}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        ogDescription: e.target.value,
                                    })
                                }
                                maxLength={300}
                                rows={3}
                                className="w-full border border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:border-yambo-green-500 focus:ring-1 focus:ring-yambo-green-500/50"
                                placeholder={t("seo.ogDescriptionPlaceholder")}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                {t("seo.ogDescriptionHelper", { count: form.ogDescription.length })}
                            </p>
                        </LabelComponent>

                        {/* Keywords */}
                        <LabelComponent label={t("seo.keywords")}>
                            <textarea
                                value={form.keywords}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        keywords: e.target.value,
                                    })
                                }
                                rows={2}
                                className="w-full border border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:border-yambo-green-500 focus:ring-1 focus:ring-yambo-green-500/50"
                                placeholder={t("seo.keywordsPlaceholder")}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                {t("seo.keywordsHelper", {
                                    count: form.keywords
                                        .split(",")
                                        .filter((k) => k.trim()).length,
                                })}
                            </p>
                        </LabelComponent>
                    </div>
                </Modal>

                {/* Delete Confirm */}
                <ConfirmDialog
                    isOpen={deleteConfirmOpen}
                    onClose={() => {
                        setDeleteConfirmOpen(false);
                        setActionEntry(null);
                    }}
                    onConfirm={handleDelete}
                    title={t("seo.confirmDeleteTitle")}
                    message={t("seo.confirmDeleteMessage", { name: actionEntry?.entityName })}
                    confirmLabel={t("common.delete")}
                    variant="danger"
                    isLoading={actionLoading}
                />

                {/* Regenerate Confirm */}
                <ConfirmDialog
                    isOpen={regenerateConfirmOpen}
                    onClose={() => {
                        setRegenerateConfirmOpen(false);
                        setActionEntry(null);
                    }}
                    onConfirm={handleRegenerate}
                    title={t("seo.regenerateTitle")}
                    message={t("seo.regenerateMessage", { name: actionEntry?.entityName })}
                    confirmLabel={t("seo.regenerateLabel")}
                    variant="warning"
                    isLoading={actionLoading}
                />
            </main>
        </RequirePermission>
    );
}
