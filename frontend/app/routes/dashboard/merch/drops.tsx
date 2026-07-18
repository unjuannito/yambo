import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "~/i18n/config";
import { RequirePermission } from "~/components/common/RequirePermission";
import { useAuth } from "~/hooks/useAuth";
import { FilterableTable } from "~/components/common/FilterableTable";
import type { FilterableColumn } from "~/components/common/FilterableTable";
import { Modal } from "~/components/common/Modal";
import { WatcherManager } from "~/components/common/WatcherManager";
import InputComponent from "~/components/common/forms/InputComponent";
import MultiSelectComponent from "~/components/common/forms/MultiSelectComponent";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import ListPageShell from "~/components/common/ListPageShell";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { familyProductService, type FamilyProduct } from "~/services/familyProductService";
import { projectService, type Project } from "~/services/projectService";
import { getErrorMessage } from "~/types/error";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell } from "@fortawesome/free-solid-svg-icons";
import type { DropWatcher } from "~/types/issueType";
import { FamilyProductStatus, FAMILY_PRODUCT_STATUS_CONFIG, FAMILY_PRODUCT_WORKFLOW_TRANSITIONS } from "~/constants/orderStatus";
import { StatusWorkflow } from "~/components/common/StatusWorkflow";
import toast from "react-hot-toast";

export function meta() {
    return [
        { title: i18n.t("merch.dropMetaTitle") },
        { name: "description", content: i18n.t("merch.dropMetaTitle") },
    ];
}

type DropForm = {
    name: string;
    startTms: string;
    endTms: string;
    projectIds: string[];
};

const EMPTY_FORM: DropForm = {
    name: "",
    startTms: "",
    endTms: "",
    projectIds: [],
};

export default function MerchFamilies() {
    const { t } = useTranslation();
    const { hasPermission } = useAuth();
    const canUpdate = hasPermission({ obj: "family_product", action: "update" });
    const canDelete = hasPermission({ obj: "family_product", action: "delete" });

    const [drops, setDrops] = useState<FamilyProduct[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState<DropForm>({ ...EMPTY_FORM });
    const [editing, setEditing] = useState<string | null>(null);

    // Watchers modal state
    const [watchersDrop, setWatchersDrop] = useState<FamilyProduct | null>(null);
    const [watchers, setWatchers] = useState<DropWatcher[]>([]);
    const [watchersLoading, setWatchersLoading] = useState(false);

    const openWatchers = async (drop: FamilyProduct) => {
        setWatchersDrop(drop);
        setWatchersLoading(true);
        try {
            const list = await familyProductService.getDropWatchers(drop.id);
            setWatchers(list);
        } catch {
            setWatchers([]);
        } finally {
            setWatchersLoading(false);
        }
    };

    const closeWatchers = () => {
        setWatchersDrop(null);
        setWatchers([]);
    };

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [dropsResponse, projectsResponse] = await Promise.all([
                familyProductService.listFamilyProducts(0, 200),
                projectService.listProjects(0, 200),
            ]);
            setDrops(dropsResponse.content);
            setProjects(projectsResponse.content);
        } catch (err) {
            setError(getErrorMessage(err, t("merch.collectionDataError")));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const resetForm = () => {
        setForm({ ...EMPTY_FORM });
        setEditing(null);
        setIsModalOpen(false);
        setSaving(false);
    };

    const openCreateModal = () => {
        setForm({ ...EMPTY_FORM });
        setEditing(null);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error(t("merch.collectionNameRequired"));
            return;
        }
        if (!form.endTms) {
            toast.error(t("merch.collectionEndRequired"));
            return;
        }
        if (!form.startTms) {
            toast.error(t("merch.collectionStartRequired"));
            return;
        }

        try {
            setSaving(true);
            if (editing) {
                await familyProductService.updateFamilyProduct(editing, {
                    name: form.name,
                    startTms: form.startTms,
                    endTms: form.endTms,
                    projectIds: form.projectIds,
                });
                toast.success(t("merch.collectionUpdated"));
            } else {
                await familyProductService.createFamilyProduct({
                    name: form.name,
                    startTms: form.startTms,
                    endTms: form.endTms,
                    projectIds: form.projectIds,
                });
                toast.success(t("merch.collectionCreated"));
            }
            resetForm();
            await loadData();
        } catch (err) {
            toast.error(getErrorMessage(err, t("merch.collectionCreateError")));
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (drop: FamilyProduct) => {
        setEditing(drop.id);
        setForm({
            name: drop.name,
            startTms: drop.startTms?.slice(0, 16) || "",
            endTms: drop.endTms?.slice(0, 16) || "",
            projectIds: drop.projectIds ?? [],
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (drop: FamilyProduct) => {
        if (!confirm(`${t("common.delete")} "${drop.name}"?`)) return;
        try {
            await familyProductService.deleteFamilyProduct(drop.id);
            toast.success(t("merch.collectionDeleted"));
            await loadData();
        } catch (err) {
            toast.error(getErrorMessage(err, t("merch.collectionDeleteError")));
        }
    };

    const handleStatusChange = async (drop: FamilyProduct, newStatus: string) => {
        try {
            await familyProductService.updateFamilyProductStatus(drop.id, newStatus);
            toast.success(t("merch.collectionUpdatedStatus"));
            await loadData();
        } catch (err) {
            toast.error(getErrorMessage(err, t("merch.collectionStatusError")));
        }
    };

    const projectOptions = useMemo(() => projects.map((project) => ({
        value: project.id,
        label: project.name,
    })), [projects]);

    const columns: FilterableColumn<FamilyProduct>[] = useMemo(() => [
        {
            key: "name",
            header: t("merch.collectionName"),
            filter: {
                enabled: true,
                type: "search",
                placeholder: t("merch.searchByName"),
            },
            render: (drop) => <span className="font-medium text-yambo-black">{drop.name}</span>,
        },
        {
            key: "endTms",
            header: t("merch.collectionEnd"),
            render: (drop) => (
                <span className="text-sm text-gray-400">
                    {drop.endTms ? new Date(drop.endTms).toLocaleString() : "-"}
                </span>
            ),
        },
        {
            key: "startTms",
            header: t("merch.collectionStart"),
            render: (drop) => (
                <span className="text-sm text-gray-400">
                    {drop.startTms ? new Date(drop.startTms).toLocaleString() : "-"}
                </span>
            ),
        },
        {
            key: "projectIds",
            header: t("merch.collectionProjects"),
            render: (drop) => {
                const names = (drop.projectIds ?? [])
                    .map((id) => projects.find((p) => p.id === id)?.name || id)
                    .join(", ");
                return (
                    <span className="text-sm text-gray-400">
                        {names || "-"}
                    </span>
                );
            },
        },
        {
            key: "status",
            header: t("merch.collectionStatus"),
            render: (drop) => {
                const statusKey = drop.status as keyof typeof FAMILY_PRODUCT_STATUS_CONFIG;
                const statusConfig = statusKey ? FAMILY_PRODUCT_STATUS_CONFIG[statusKey] : null;
                if (!canUpdate) {
                    return statusConfig ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.className}`}>
                            {statusConfig.label}
                        </span>
                    ) : <span className="text-sm text-gray-400">{drop.status || "-"}</span>;
                }
                const transitions = FAMILY_PRODUCT_WORKFLOW_TRANSITIONS[(drop.status || "OPEN") as FamilyProductStatus] || [];
                if (transitions.length === 0) {
                    return statusConfig ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.className}`}>
                            {statusConfig.label}
                        </span>
                    ) : <span className="text-sm text-gray-400">{drop.status || "-"}</span>;
                }
                return (
                    <select
                        value={drop.status || "OPEN"}
                        onChange={(e) => handleStatusChange(drop, e.target.value)}
                        className={`text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer ${statusConfig?.className || "bg-gray-100 text-gray-800"}`}
                    >
                        <option value={drop.status || "OPEN"}>{statusConfig?.label || drop.status}</option>
                        {transitions.map((status) => {
                            const cfg = FAMILY_PRODUCT_STATUS_CONFIG[status as keyof typeof FAMILY_PRODUCT_STATUS_CONFIG];
                            return <option key={status} value={status}>{cfg?.label || status}</option>;
                        })}
                    </select>
                );
            },
        },
        {
            key: "id",
            header: t("merch.actions"),
            requiredPerms: [{ obj: "family_product", action: "update" }],
            render: (drop) => (
                <div className="flex gap-2">
                    {canUpdate && (
                        <ButtonComponent
                            variant="neutral"
                            size="sm"
                            onClick={() => openWatchers(drop)}
                            title={t("merch.manageWatchers")}
                            aria-label={t("merch.manageWatchers")}
                        >
                            <FontAwesomeIcon icon={faBell} className="w-4 h-4" />
                        </ButtonComponent>
                    )}
                    {canUpdate && (
                        <ButtonComponent
                            variant="primary"
                            size="sm"
                            onClick={() => startEdit(drop)}
                        >
                            {t("common.edit")}
                        </ButtonComponent>
                    )}
                    {canDelete && (
                        <ButtonComponent
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(drop)}
                        >
                            {t("common.delete")}
                        </ButtonComponent>
                    )}
                </div>
            ),
        },
    ], [projects, canUpdate, canDelete, t]);

    return (
        <RequirePermission permission={{ obj: "family_product", action: "read" }} redirectTo="/mi-espacio/articulos">
            <ListPageShell<FamilyProduct>
                title={t("merch.collectionsTitle")}
                actions={
                    <RequirePermission permission={{ obj: "family_product", action: "create" }} redirect={false}>
                        <ButtonComponent variant="primary" onClick={openCreateModal}>
                            {t("merch.createCollection")}
                        </ButtonComponent>
                    </RequirePermission>
                }
                columns={columns}
                keyField="id"
                data={drops}
                display={{
                    emptyMessage: t("merch.noCollections"),
                    loadingMessage: t("merch.loadingCollections"),
                }}
                features={{
                    enablePagination: false,
                }}
            >
                <StatusWorkflow
                    title={t("merch.workflowTitle")}
                    config={FAMILY_PRODUCT_STATUS_CONFIG}
                    transitions={FAMILY_PRODUCT_WORKFLOW_TRANSITIONS}
                />
                {loading && (
                    <div className="flex justify-center py-8">
                        <LoadingSpinner size="md" message={t("merch.loadingCollections")} />
                    </div>
                )}
                {error && (
                    <ErrorMessage message={error} onRetry={loadData} />
                )}
            </ListPageShell>

            <Modal
                    isOpen={isModalOpen}
                    onClose={resetForm}
                    title={editing ? t("merch.editCollection") : t("merch.newCollection")}
                    size="lg"
                    footer={
                        <>
                            <ButtonComponent
                                onClick={resetForm}
                                variant="neutral"
                                disabled={saving}
                            >
                                {t("common.cancel")}
                            </ButtonComponent>
                            <ButtonComponent
                                onClick={handleSave}
                                variant="primary"
                                disabled={saving}
                            >
                                {saving ? t("merch.saving") : (editing ? t("merch.saveChanges") : t("common.create"))}
                            </ButtonComponent>
                        </>
                    }
                >
                    <div className="flex flex-col gap-4">
                        <InputComponent
                            label={t("merch.collectionName")}
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder={t("merch.collectionNamePlaceholder")}
                            required
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputComponent
                                label={t("merch.collectionStartLabel")}
                                type="datetime-local"
                                value={form.startTms}
                                onChange={(e) => setForm((prev) => ({ ...prev, startTms: e.target.value }))}
                                required
                            />
                            <InputComponent
                                label={t("merch.collectionEndLabel")}
                                type="datetime-local"
                                value={form.endTms}
                                onChange={(e) => setForm((prev) => ({ ...prev, endTms: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                                {t("merch.collectionProjectsLabel")}
                            </label>
                            <MultiSelectComponent
                                value={form.projectIds}
                                options={projectOptions}
                                placeholder={t("merch.selectProjects")}
                                name="projectIds"
                                onChange={(e) => {
                                    const selected = Array.from(
                                        (e.target as HTMLSelectElement).selectedOptions,
                                        option => option.value
                                    );
                                    setForm((prev) => ({ ...prev, projectIds: selected }));
                                }}
                            />
                        </div>
                    </div>
                </Modal>

                {/* Watchers modal */}
                <Modal
                    isOpen={!!watchersDrop}
                    onClose={closeWatchers}
                    title={watchersDrop ? t("merch.watchersTitle", { name: watchersDrop.name }) : t("merch.watchersGenericTitle")}
                    size="sm"
                >
                    {watchersDrop && (
                        <WatcherManager
                            watchers={watchers}
                            loading={watchersLoading}
                            onAdd={async (email, userId) => {
                                const created = await familyProductService.addDropWatcher(watchersDrop.id, email, userId);
                                setWatchers((prev) => [...prev, created]);
                            }}
                            onRemove={async (email) => {
                                await familyProductService.removeDropWatcher(watchersDrop.id, email);
                                setWatchers((prev) => prev.filter((w) => w.email !== email));
                            }}
                        />
                    )}
                </Modal>
        </RequirePermission>
    );
}