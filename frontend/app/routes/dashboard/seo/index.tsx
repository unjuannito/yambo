import { useState, useCallback, useMemo } from "react";
import { RequirePermission } from "~/components/common/RequirePermission";
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
            toast.success("Metadatos SEO actualizados");
            setEditModalOpen(false);
            setEditingEntry(null);
            setRefreshKey((prev) => prev + 1);
        } catch (err) {
            toast.error(
                getErrorMessage(err, "¡Los metadatos SEO se nos resisten!"),
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
            toast.success("Metadatos SEO eliminados");
            setDeleteConfirmOpen(false);
            setActionEntry(null);
            setRefreshKey((prev) => prev + 1);
        } catch (err) {
            toast.error(
                getErrorMessage(err, "¡Los metadatos SEO se aferran a la vida!"),
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
                "Regeneración SEO iniciada. Los cambios pueden tardar unos segundos.",
            );
            setRegenerateConfirmOpen(false);
            setActionEntry(null);
            setTimeout(() => setRefreshKey((prev) => prev + 1), 3000);
        } catch (err) {
            toast.error(
                getErrorMessage(err, "¡Los metadatos SEO no quieren regenerarse!"),
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
                "Generación masiva iniciada. Verás el progreso en tiempo real.",
            );
        } catch (err) {
            toast.error(
                getErrorMessage(
                    err,
                    "¡La generación masiva SEO no quiere arrancar!",
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
                header: "Entidad",
                filter: {
                    enabled: true,
                    type: "select" as const,
                    placeholder: "Todos los tipos",
                    options: [{ value: "PROJECT", label: "Proyectos" }],
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
                header: "Slug",
                render: (entry: SeoMetadataAdmin) => (
                    <span className="text-sm text-yambo-green-600 font-mono">
                        {truncate(entry.slug, 30)}
                    </span>
                ),
            },
            {
                key: "metaDescription",
                header: "Meta Description",
                render: (entry: SeoMetadataAdmin) => (
                    <span className="text-sm text-gray-400">
                        {truncate(entry.metaDescription, 50)}
                    </span>
                ),
            },
            {
                key: "keywords",
                header: "Keywords",
                render: (entry: SeoMetadataAdmin) => {
                    const kws = parseKeywords(entry.keywords);
                    return (
                        <div className="flex flex-wrap gap-1">
                            {kws.slice(0, 3).map((kw, i) => (
                                <span
                                    key={i}
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
                header: "Actualizado",
                render: (entry: SeoMetadataAdmin) => (
                    <span className="text-sm text-gray-400">
                        {formatDate(entry.updatedAt)}
                    </span>
                ),
            },
            {
                key: "actions",
                header: "Acciones",
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
                                Editar
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
                                IA
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
                                Eliminar
                            </ButtonComponent>
                        </RequirePermission>
                    </div>
                ),
            },
        ],
        [],
    );

    // ── Render ──
    return (
        <RequirePermission
            permission={{ obj: "seo_metadata", action: "read" }}
            redirectTo="/mi-espacio"
        >
            <main className="flex flex-col p-6 md:p-8 w-full md:w-[calc(100vw-16rem)]">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-extrabold font-display text-yambo-black">SEO 🔍</h1>
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
                            Generar faltantes
                        </ButtonComponent>
                    </RequirePermission>
                </div>

                <FilterableTable
                    columns={columns}
                    keyField="id"
                    display={{
                        emptyMessage: "No se encontraron metadatos SEO",
                        loadingMessage: "Cargando metadatos SEO...",
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
                    title={`Editar SEO — ${editingEntry?.entityName || ""}`}
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
                                Cancelar
                            </ButtonComponent>
                            <ButtonComponent
                                variant="primary"
                                onClick={handleSave}
                                isLoading={saving}
                                disabled={saving}
                            >
                                Guardar
                            </ButtonComponent>
                        </>
                    }
                >
                    <div className="grid gap-6">
                        {/* Slug */}
                        <div>
                            <InputComponent
                                label="Slug"
                                value={form.slug}
                                onChange={(e) =>
                                    setForm({ ...form, slug: e.target.value })
                                }
                                placeholder="proyectos/mi-proyecto-2025"
                                maxLength={200}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                URL amigable para SEO ({form.slug.length}/200)
                            </p>
                        </div>

                        {/* Meta Description */}
                        <LabelComponent label="Meta Description">
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
                                placeholder="Descripción para motores de búsqueda..."
                            />
                            <p
                                className={`text-xs mt-1 ${form.metaDescription.length > 155 ? "text-amber-600" : "text-gray-400"}`}
                            >
                                {form.metaDescription.length}/200 caracteres
                                {form.metaDescription.length > 155 &&
                                    " (recomendado: ≤155)"}
                            </p>
                        </LabelComponent>

                        {/* OG Description */}
                        <LabelComponent label="OG Description">
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
                                placeholder="Descripción para Open Graph (redes sociales)..."
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                {form.ogDescription.length}/300 caracteres
                            </p>
                        </LabelComponent>

                        {/* Keywords */}
                        <LabelComponent label="Keywords">
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
                                placeholder="palabra1, palabra2, palabra3..."
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Separadas por comas (
                                {
                                    form.keywords
                                        .split(",")
                                        .filter((k) => k.trim()).length
                                }{" "}
                                keywords)
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
                    title="Eliminar metadatos SEO"
                    message={`¿Estás seguro de que deseas eliminar los metadatos SEO de "${actionEntry?.entityName}"? Esta acción no se puede deshacer.`}
                    confirmLabel="Eliminar"
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
                    title="Regenerar SEO con IA"
                    message={`¿Regenerar los metadatos SEO de "${actionEntry?.entityName}" usando inteligencia artificial? Los valores actuales serán reemplazados.`}
                    confirmLabel="Regenerar"
                    variant="warning"
                    isLoading={actionLoading}
                />
            </main>
        </RequirePermission>
    );
}
