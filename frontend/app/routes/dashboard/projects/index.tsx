import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RequirePermission } from "~/components/common/RequirePermission";
import { FilterableTable } from "~/components/common/FilterableTable";
import type { FilterableColumn } from "~/components/common/FilterableTable";
import InputComponent from "~/components/common/forms/InputComponent";
import CheckboxComponent from "~/components/common/forms/CheckboxComponent";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { Modal } from "~/components/common/Modal";
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
    faUserGroup,
    faArrowLeft,
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

    const [view, setView] = useState<"projects" | "parents">("projects");
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

    const handleDeleteGroup = async (groupId: string, groupName: string) => {
        if (!editing) return;
        if (!confirm(t("projects.confirmDeleteGroup", { name: groupName }))) return;
        try {
            await projectService.deleteGroup(editing, groupId);
            setGroups((prev) => prev.filter((g) => g.id !== groupId));
            toast.success(t("projects.groupDeleted"));
        } catch (err) {
            toast.error(getErrorMessage(err, t("projects.groupDeleteError")));
        }
    };

    const handleDelete = async (project: Project) => {
        if (!confirm(t("projects.confirmDelete", { name: project.name }))) return;
        try {
            await projectService.deleteProject(project.id);
            toast.success(t("projects.deleted"));
            await loadProjects();
        } catch (err) {
            toast.error(getErrorMessage(err, t("projects.deleteError")));
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
            render: (project) => <span className="font-medium text-yambo-black">{project.name}</span>,
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
            requiredPerms: [{ obj: "project", action: "update" }],
            render: (project) => (
                <div className="flex gap-2">
                    {canUpdate && (
                        <ButtonComponent
                            variant="primary"
                            size="sm"
                            onClick={() => startEdit(project)}
                        >
                            <span className="sm:hidden"><FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5" /></span>
                            <span className="hidden sm:inline">{t("common.edit")}</span>
                        </ButtonComponent>
                    )}
                    {canDelete && (
                        <ButtonComponent
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(project)}
                        >
                            <span className="sm:hidden"><FontAwesomeIcon icon={faTrashCan} className="w-3.5 h-3.5" /></span>
                            <span className="hidden sm:inline">{t("common.delete")}</span>
                        </ButtonComponent>
                    )}
                </div>
            ),
        },
    ], [canDelete, canUpdate, t]);

    return (
        <RequirePermission permission={{ obj: "project", action: "read" }} redirectTo="/mi-espacio">
            <main className="flex flex-col p-4 md:p-6 w-full">
                {/* View tabs */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex rounded-full border border-gray-200 overflow-hidden">
                        <button
                            onClick={() => setView("projects")}
                            className={`px-4 py-1.5 text-sm font-medium transition-all ${
                                view === "projects"
                                    ? "bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 text-white"
                                    : "bg-white text-gray-600 hover:bg-yambo-green-50/30"
                            }`}
                        >
                            Proyectos
                        </button>
                        <button
                            onClick={() => setView("parents")}
                            className={`px-4 py-1.5 text-sm font-medium transition-all ${
                                view === "parents"
                                    ? "bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 text-white"
                                    : "bg-white text-gray-600 hover:bg-yambo-green-50/30"
                            }`}
                        >
                            <FontAwesomeIcon icon={faUserGroup} className="mr-1.5" />
                            Padres
                        </button>
                    </div>
                    {view === "projects" && canCreate && (
                        <ButtonComponent variant="primary" onClick={openCreateModal}>
                            + {t("projects.createNew")}
                        </ButtonComponent>
                    )}
                </div>

                {view === "projects" && (
                <>
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
                                    onClick={async () => {
                                        if (!editing) return;
                                        if (!confirm("¿Eliminar todos los accesos de padres de este proyecto? Los padres perderán el acceso y tendrán que usar un nuevo enlace de invitación.")) return;
                                        try {
                                            const result = await parentInvitationService.revokeAllParentRolesByProject(editing);
                                            toast.success(result);
                                        } catch (err) {
                                            toast.error(getErrorMessage(err, "Error al eliminar accesos de padres"));
                                        }
                                    }}
                                >
                                    <FontAwesomeIcon icon={faUserSlash} className="mr-2" />
                                    Eliminar todos los padres
                                </ButtonComponent>
                            </div>
                        )}
                    </div>
                </Modal>
                </>
                )}

                {view === "parents" && <ParentsView />}
            </main>
        </RequirePermission>
    );
}

function ParentsView() {
    const { t } = useTranslation();
    const [projectParents, setProjectParents] = useState<{
        projectId: string;
        projectName: string;
        parents: { userId: string; name: string; email: string }[];
    }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [removing, setRemoving] = useState<string | null>(null);

    const loadParents = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await parentInvitationService.listParents();
            setProjectParents(data);
        } catch (err) {
            setError(getErrorMessage(err, "Error al cargar padres"));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void loadParents(); }, [loadParents]);

    const handleRemove = async (projectId: string, userId: string, name: string) => {
        if (!confirm(`¿Eliminar a ${name} como padre de este proyecto?`)) return;
        const key = `${projectId}:${userId}`;
        try {
            setRemoving(key);
            await parentInvitationService.removeParentRole(projectId, userId);
            toast.success(`${name} ya no tiene acceso como padre`);
            setProjectParents(prev =>
                prev.map(pp => pp.projectId === projectId
                    ? { ...pp, parents: pp.parents.filter(p => p.userId !== userId) }
                    : pp
                ).filter(pp => pp.parents.length > 0)
            );
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al eliminar padre"));
        } finally {
            setRemoving(null);
        }
    };

    const handleRemoveAll = async (projectId: string, projectName: string) => {
        if (!confirm(`¿Eliminar TODOS los padres de "${projectName}"?`)) return;
        try {
            toast.success(await parentInvitationService.revokeAllParentRolesByProject(projectId));
            setProjectParents(prev => prev.filter(pp => pp.projectId !== projectId));
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al eliminar padres"));
        }
    };

    if (loading) {
        return <div className="flex justify-center py-16"><LoadingSpinner size="md" message="Cargando padres..." /></div>;
    }

    if (error) {
        return <div className="py-8"><ErrorMessage message={error} onRetry={loadParents} /></div>;
    }

    if (projectParents.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-yambo-green-50 flex items-center justify-center">
                    <FontAwesomeIcon icon={faUserGroup} className="text-2xl text-yambo-green-400" />
                </div>
                <h2 className="text-lg font-bold text-yambo-black mb-1">No hay padres asignados</h2>
                <p className="text-sm text-gray-400">Los padres aceptan invitaciones desde el enlace que se genera en cada familia.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {projectParents.map(pp => (
                <section key={pp.projectId} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-yambo-green-50/40 to-transparent border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-yambo-green-500/10 flex items-center justify-center">
                                <FontAwesomeIcon icon={faUserGroup} className="text-sm text-yambo-green-600" />
                            </div>
                            <h3 className="font-bold text-yambo-black">{pp.projectName}</h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2.5 py-1 rounded-full">
                                {pp.parents.length} padre{pp.parents.length !== 1 ? "s" : ""}
                            </span>
                            {pp.parents.length > 1 && (
                                <button
                                    onClick={() => handleRemoveAll(pp.projectId, pp.projectName)}
                                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                                >
                                    <FontAwesomeIcon icon={faUserSlash} className="mr-1" />
                                    Quitar todos
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {pp.parents.map(parent => (
                            <div key={parent.userId} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700 shrink-0">
                                        {parent.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-yambo-black truncate">{parent.name}</p>
                                        <p className="text-xs text-gray-400 truncate">{parent.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemove(pp.projectId, parent.userId, parent.name)}
                                    disabled={removing === `${pp.projectId}:${parent.userId}`}
                                    className="text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0 ml-4 disabled:opacity-50"
                                >
                                    {removing === `${pp.projectId}:${parent.userId}` ? "Eliminando..." : "Eliminar"}
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
