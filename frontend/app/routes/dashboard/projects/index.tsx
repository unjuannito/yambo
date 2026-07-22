import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { RequirePermission } from "~/components/common/RequirePermission";
import { FilterableTable } from "~/components/common/FilterableTable";
import type { FilterableColumn } from "~/components/common/FilterableTable";
import InputComponent from "~/components/common/forms/InputComponent";
import CheckboxComponent from "~/components/common/forms/CheckboxComponent";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { Modal } from "~/components/common/Modal";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { projectService, type Project, type ProjectGroup } from "~/services/projectService";
import { parentInvitationService } from "~/services/parentInvitationService";
import { useAuth } from "~/hooks/useAuth";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import FileUploader from "~/components/common/FileUploader";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCalendarDays,
    faPenToSquare,
    faTrashCan,
    faUserSlash,
    faArrowRight,
} from "@fortawesome/free-solid-svg-icons";

export function meta() {
    return [
        { title: "Yambo - Proyectos" },
        { name: "Yambo - Proyectos", content: "Yambo - Proyectos" },
    ];
}

type ProjectForm = {
    name: string;
    season: string;
    active: boolean;
    description: string;
    image: string;
    featured: boolean;
    signatureColor: string;
};

const EMPTY_FORM: ProjectForm = { name: "", season: "", active: true, description: "", image: "", featured: false, signatureColor: "" };

export default function Projects() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<ProjectForm>({ ...EMPTY_FORM });
    const [editing, setEditing] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Groups state
    const [groups, setGroups] = useState<ProjectGroup[]>([]);
    const [newGroupName, setNewGroupName] = useState("");
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editingGroupName, setEditingGroupName] = useState("");
    const [savingGroup, setSavingGroup] = useState(false);
    const [confirmDeleteProject, setConfirmDeleteProject] = useState<Project | null>(null);
    const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<{ groupId: string; groupName: string } | null>(null);
    const [confirmRevokeParents, setConfirmRevokeParents] = useState(false);

    const canCreate = hasPermission({ obj: "project", action: "create" });
    const canUpdate = hasPermission({ obj: "project", action: "update" });
    const canDelete = hasPermission({ obj: "project", action: "delete" });

    const loadProjects = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await projectService.listProjects(0, 200);
            setProjects(response.content);
        } catch (err) {
            setError(getErrorMessage(err, t("projects.loadError")));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void loadProjects();
    }, [loadProjects]);

    const resetForm = () => {
        setForm({ ...EMPTY_FORM });
        setEditing(null);
        setIsModalOpen(false);
        setSaving(false);
        setGroups([]);
        setNewGroupName("");
        setEditingGroupId(null);
        setEditingGroupName("");
    };

    const openCreateModal = () => {
        setForm({ ...EMPTY_FORM });
        setEditing(null);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error(t("projects.nameRequired"));
            return;
        }
        try {
            setSaving(true);
            if (editing) {
                await projectService.updateProject(editing, {
                    name: form.name,
                    season: form.season || null,
                    active: form.active,
                    description: form.description || null,
                    image: form.image || null,
                    featured: form.featured,
                    signatureColor: form.signatureColor || null,
                });
                toast.success(t("projects.updated"));
            } else {
                await projectService.createProject({
                    name: form.name,
                    season: form.season || null,
                    active: form.active,
                    description: form.description || null,
                    image: form.image || null,
                    featured: form.featured,
                    signatureColor: form.signatureColor || null,
                });
                toast.success(t("projects.created"));
            }
            resetForm();
            await loadProjects();
        } catch (err) {
            toast.error(getErrorMessage(err, t("projects.saveError")));
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (project: Project) => {
        setEditing(project.id);
        setForm({
            name: project.name,
            season: project.season || "",
            active: project.active,
            description: project.description || "",
            image: project.image || "",
            featured: project.featured,
            signatureColor: project.signatureColor || "",
        });
        setIsModalOpen(true);
        loadGroups(project.id);
    };

    const loadGroups = async (projectId: string) => {
        try {
            const data = await projectService.listGroups(projectId);
            setGroups(data);
        } catch (err) {
            toast.error(getErrorMessage(err, t("projects.groupsLoadError")));
        }
    };

    const handleAddGroup = async () => {
        if (!editing || !newGroupName.trim()) return;
        try {
            setSavingGroup(true);
            const created = await projectService.createGroup(editing, newGroupName.trim());
            setGroups((prev) => [...prev, created]);
            setNewGroupName("");
            toast.success(t("projects.groupCreated"));
        } catch (err) {
            toast.error(getErrorMessage(err, t("projects.groupCreateError")));
        } finally {
            setSavingGroup(false);
        }
    };

    const handleUpdateGroup = async (groupId: string) => {
        if (!editing || !editingGroupName.trim()) return;
        try {
            setSavingGroup(true);
            const updated = await projectService.updateGroup(editing, groupId, editingGroupName.trim());
            setGroups((prev) => prev.map((g) => (g.id === groupId ? updated : g)));
            setEditingGroupId(null);
            setEditingGroupName("");
            toast.success(t("projects.groupUpdated"));
        } catch (err) {
            toast.error(getErrorMessage(err, t("projects.groupUpdateError")));
        } finally {
            setSavingGroup(false);
        }
    };

    const handleDeleteGroup = (groupId: string, groupName: string) => {
        if (!editing) return;
        setConfirmDeleteGroup({ groupId, groupName });
    };

    const executeDeleteGroup = async () => {
        if (!editing || !confirmDeleteGroup) return;
        try {
            await projectService.deleteGroup(editing, confirmDeleteGroup.groupId);
            setGroups((prev) => prev.filter((g) => g.id !== confirmDeleteGroup.groupId));
            toast.success(t("projects.groupDeleted"));
        } catch (err) {
            toast.error(getErrorMessage(err, t("projects.groupDeleteError")));
        } finally {
            setConfirmDeleteGroup(null);
        }
    };

    const handleRevokeParents = () => {
        if (!editing) return;
        setConfirmRevokeParents(true);
    };

    const executeRevokeParents = async () => {
        if (!editing) return;
        try {
            const result = await parentInvitationService.revokeAllParentRolesByProject(editing);
            toast.success(result);
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al eliminar accesos de padres"));
        } finally {
            setConfirmRevokeParents(false);
        }
    };

    const handleDelete = (project: Project) => {
        setConfirmDeleteProject(project);
    };

    const executeDelete = async () => {
        if (!confirmDeleteProject) return;
        try {
            await projectService.deleteProject(confirmDeleteProject.id);
            toast.success(t("projects.deleted"));
            await loadProjects();
        } catch (err) {
            toast.error(getErrorMessage(err, t("projects.deleteError")));
        } finally {
            setConfirmDeleteProject(null);
        }
    };

    const columns: FilterableColumn<Project>[] = useMemo(() => [
        {
            key: "name",
            header: t("common.name"),
            filter: {
                enabled: true,
                type: "search",
                placeholder: t("projects.searchByName"),
            },
            render: (project) => (
                <button
                    onClick={() => navigate(`/mi-espacio/proyectos/${project.id}/equipos`)}
                    className="font-medium text-yambo-black hover:text-yambo-green-600 transition-colors text-left"
                >
                    {project.name}
                </button>
            ),
        },
        {
            key: "season",
            header: t("common.season"),
            className: "hidden sm:table-cell",
            filter: {
                enabled: true,
                type: "search",
                placeholder: t("projects.seasonFilter"),
            },
            render: (project) => (
                <span className="text-sm text-gray-400">{project.season || "-"}</span>
            ),
        },
        {
            key: "active",
            header: t("common.active"),
            className: "hidden sm:table-cell",
            filter: {
                enabled: true,
                type: "checkbox",
            },
            render: (project) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    project.active ? "bg-yambo-green-50 text-yambo-green-700" : "bg-coral/10 text-coral"
                }`}>
                    {project.active ? t("common.active") : t("common.inactive")}
                </span>
            ),
        },
        {
            key: "featured" as keyof Project,
            header: t("common.featured"),
            className: "hidden sm:table-cell",
            filter: {
                enabled: true,
                type: "checkbox",
            },
            render: (project) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    project.featured ? "bg-gold/20 text-yellow-800" : "bg-gray-100 text-gray-500"
                }`}>
                    {project.featured ? t("common.yes") : t("common.no")}
                </span>
            ),
        },
        {
            key: "id",
            header: t("common.actions"),
            render: (project) => (
                <div className="flex gap-2">
                    <ButtonComponent
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/mi-espacio/proyectos/${project.id}/equipos`)}
                    >
                        <FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5 mr-1" />
                        <span className="hidden sm:inline">Gestionar</span>
                    </ButtonComponent>
                    {canUpdate && (
                        <ButtonComponent
                            variant="neutral"
                            size="sm"
                            onClick={() => startEdit(project)}
                        >
                            <FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline ml-1">{t("common.edit")}</span>
                        </ButtonComponent>
                    )}
                    {canDelete && (
                        <ButtonComponent
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(project)}
                        >
                            <FontAwesomeIcon icon={faTrashCan} className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline ml-1">{t("common.delete")}</span>
                        </ButtonComponent>
                    )}
                </div>
            ),
        },
    ], [canDelete, canUpdate, t]);

    return (
        <RequirePermission permission={{ obj: "project", action: "read" }} redirectTo="/mi-espacio">
            <main className="flex flex-col p-4 md:p-6 w-full">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-extrabold font-display text-yambo-black">Proyectos</h1>
                    {canCreate && (
                        <ButtonComponent variant="primary" onClick={openCreateModal}>
                            + {t("projects.createNew")}
                        </ButtonComponent>
                    )}
                </div>

                <section className="bg-white rounded-2xl border border-gray-100 p-6">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <LoadingSpinner size="md" message={t("projects.loading")} />
                        </div>
                    ) : error ? (
                        <ErrorMessage message={error} onRetry={loadProjects} />
                    ) : (
                        <FilterableTable
                            columns={columns}
                            keyField="id"
                            data={projects}
                            display={{
                                emptyMessage: t("projects.noProjects"),
                                loadingMessage: t("projects.loading"),
                                renderMobileCard: (project: Project) => (
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="font-bold text-yambo-black text-sm leading-tight line-clamp-2 flex-1">{project.name}</span>
                                            <div className="flex gap-1 shrink-0">
                                                {!project.active && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-coral/10 text-coral">Inactivo</span>
                                                )}
                                                {project.featured && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gold/20 text-yellow-800">Destacado</span>
                                                )}
                                            </div>
                                        </div>
                                        {project.season && (
                                            <div className="flex items-center gap-1 text-xs text-gray-400">
                                                <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3 text-gray-400" />
                                                Temporada: {project.season}
                                            </div>
                                        )}
                                        <div className="flex gap-1.5 pt-1">
                                            <button
                                                onClick={() => navigate(`/mi-espacio/proyectos/${project.id}/equipos`)}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-yambo-green-500 text-white hover:bg-yambo-green-600 transition-colors"
                                                title="Gestionar"
                                            ><FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5" /></button>
                                            <button
                                                onClick={() => startEdit(project)}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-yambo-green-50 hover:text-yambo-green-700 transition-colors"
                                                title={t("common.edit")}
                                            ><FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5" /></button>
                                            <button
                                                onClick={() => handleDelete(project)}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                title={t("common.delete")}
                                            ><FontAwesomeIcon icon={faTrashCan} className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                ),
                            }}
                            features={{
                                enablePagination: false,
                            }}
                        />
                    )}
                </section>

                <Modal
                    isOpen={isModalOpen}
                    onClose={resetForm}
                    title={editing ? t("projects.editTitle") : t("projects.newTitle")}
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
                                {saving ? t("common.saving") : (editing ? t("common.saveChanges") : t("common.create"))}
                            </ButtonComponent>
                        </>
                    }
                >
                    <div className="grid gap-4">
                        <InputComponent
                            label={t("common.name")}
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        />
                        <InputComponent
                            label={t("common.season")}
                            value={form.season}
                            onChange={(e) => setForm((prev) => ({ ...prev, season: e.target.value }))}
                        />
                        <FileUploader
                            compact
                            multiple={false}
                            label={t("projects.image")}
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onUpload={(file) =>
                                setForm((prev) => ({ ...prev, image: file.url }))
                            }
                        />
                        {form.image && (
                            <div className="mt-2">
                                <img
                                    src={form.image}
                                    alt={t("projects.preview")}
                                    className="h-20 w-20 object-cover rounded-xl border border-gray-100"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.description")}</label>
                            <textarea
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-yambo-green-500 focus:ring-1 focus:ring-yambo-green-500/50 resize-y"
                                rows={3}
                                maxLength={1000}
                                value={form.description}
                                placeholder={t("projects.descriptionPlaceholder")}
                                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                            />
                            <p className="text-xs text-gray-400 text-right mt-1">{form.description.length}/1000</p>
                        </div>
                        <div className="flex gap-6">
                            <CheckboxComponent
                                label={t("common.active")}
                                variant="left"
                                checked={form.active}
                                onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                            />
                            <CheckboxComponent
                                label={t("projects.featuredOnHome")}
                                variant="left"
                                checked={form.featured}
                                onChange={(e) => setForm((prev) => ({ ...prev, featured: e.target.checked }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t("projects.signatureColor")}</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={form.signatureColor || "#33a35e"}
                                    onChange={(e) => setForm((prev) => ({ ...prev, signatureColor: e.target.value }))}
                                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                                />
                                <input
                                    type="text"
                                    placeholder="#33a35e"
                                    value={form.signatureColor}
                                    onChange={(e) => setForm((prev) => ({ ...prev, signatureColor: e.target.value }))}
                                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yambo-green-500 focus:ring-1 focus:ring-yambo-green-500/50"
                                    maxLength={7}
                                />
                                {form.signatureColor && (
                                    <div
                                        className="w-10 h-10 rounded-xl border border-gray-100 shrink-0"
                                        style={{ backgroundColor: form.signatureColor }}
                                    />
                                )}
                            </div>
                        </div>

                        {editing && (
                            <div className="border-t border-gray-100 pt-4 mt-2">
                                <h3 className="text-sm font-semibold text-yambo-black mb-3">{t("projects.groupsTitle")}</h3>

                                {/* Existing named groups */}
                                {groups.filter(g => g.name).length > 0 ? (
                                    <ul className="space-y-2 mb-3">
                                        {groups.filter(g => g.name).map((group) => (
                                            <li key={group.id} className="flex items-center gap-2">
                                                {editingGroupId === group.id ? (
                                                    <>
                                                        <input
                                                            type="text"
                                                            className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-yambo-green-500 focus:ring-1 focus:ring-yambo-green-500/50"
                                                            value={editingGroupName}
                                                            onChange={(e) => setEditingGroupName(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") handleUpdateGroup(group.id);
                                                                if (e.key === "Escape") { setEditingGroupId(null); setEditingGroupName(""); }
                                                            }}
                                                            autoFocus
                                                        />
                                                        <ButtonComponent
                                                            variant="primary"
                                                            size="sm"
                                                            onClick={() => handleUpdateGroup(group.id)}
                                                            disabled={savingGroup}
                                                        >
                                                            {t("common.save")}
                                                        </ButtonComponent>
                                                        <ButtonComponent
                                                            variant="neutral"
                                                            size="sm"
                                                            onClick={() => { setEditingGroupId(null); setEditingGroupName(""); }}
                                                        >
                                                            {t("common.cancel")}
                                                        </ButtonComponent>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="flex-1 px-2 py-1 bg-yambo-green-50 text-yambo-green-700 rounded-full text-sm">
                                                            {group.name}
                                                        </span>
                                                        {canUpdate && (
                                                            <ButtonComponent
                                                                variant="neutral"
                                                                size="sm"
                                                                onClick={() => { setEditingGroupId(group.id); setEditingGroupName(group.name ?? ''); }}
                                                            >
                                                                {t("common.edit")}
                                                            </ButtonComponent>
                                                        )}
                                                        {canDelete && (
                                                            <ButtonComponent
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => handleDeleteGroup(group.id, group.name ?? '')}
                                                            >
                                                                {t("common.delete")}
                                                            </ButtonComponent>
                                                        )}
                                                    </>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-400 italic mb-3">{t("projects.noGroups")}</p>
                                )}

                                {/* Add new group */}
                                {canUpdate && (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yambo-green-500 focus:ring-1 focus:ring-yambo-green-500/50"
                                            placeholder={t("projects.newGroupPlaceholder")}
                                            value={newGroupName}
                                            onChange={(e) => setNewGroupName(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === "Enter") handleAddGroup(); }}
                                        />
                                        <ButtonComponent
                                            variant="primary"
                                            size="sm"
                                            onClick={handleAddGroup}
                                            disabled={savingGroup || !newGroupName.trim()}
                                        >
                                            {t("projects.addGroup")}
                                        </ButtonComponent>
                                    </div>
                                )}
                            </div>
                        )}
                        {editing && canUpdate && (
                            <div className="border-t border-gray-100 pt-4 mt-2">
                                <h3 className="text-sm font-semibold text-yambo-black mb-3">Acceso de padres</h3>
                                <p className="text-xs text-gray-400 mb-3">
                                    Elimina todos los accesos de padres/madres de este proyecto (ej: al cambiar de temporada).
                                </p>
                                <ButtonComponent
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRevokeParents()}
                                >
                                    <FontAwesomeIcon icon={faUserSlash} className="mr-2" />
                                    Eliminar todos los padres
                                </ButtonComponent>
                            </div>
                        )}
                    </div>
                </Modal>
            </main>
            <ConfirmDialog
                isOpen={confirmDeleteProject !== null}
                onClose={() => setConfirmDeleteProject(null)}
                onConfirm={executeDelete}
                title={t("projects.confirmDeleteTitle")}
                message={confirmDeleteProject ? t("projects.confirmDelete", { name: confirmDeleteProject.name }) : ""}
                confirmLabel={t("common.delete")}
                variant="danger"
            />
            <ConfirmDialog
                isOpen={confirmDeleteGroup !== null}
                onClose={() => setConfirmDeleteGroup(null)}
                onConfirm={executeDeleteGroup}
                title={t("projects.confirmDeleteGroupTitle")}
                message={confirmDeleteGroup ? t("projects.confirmDeleteGroup", { name: confirmDeleteGroup.groupName }) : ""}
                confirmLabel={t("common.delete")}
                variant="danger"
            />
            <ConfirmDialog
                isOpen={confirmRevokeParents}
                onClose={() => setConfirmRevokeParents(false)}
                onConfirm={executeRevokeParents}
                title="Eliminar accesos de padres"
                message="¿Eliminar todos los accesos de padres de este proyecto? Los padres perderán el acceso y tendrán que usar un nuevo enlace de invitación."
                confirmLabel="Eliminar todos"
                variant="danger"
            />
        </RequirePermission>
    );
}
