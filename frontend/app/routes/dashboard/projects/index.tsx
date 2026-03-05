import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useAuth } from "~/hooks/useAuth";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import FileUploader from "~/components/common/FileUploader";

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
};

const EMPTY_FORM: ProjectForm = { name: "", season: "", active: true, description: "", image: "", featured: false };

export default function Projects() {
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
            setError(getErrorMessage(err, "Error al cargar los proyectos"));
        } finally {
            setLoading(false);
        }
    }, []);

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
            toast.error("El nombre es obligatorio");
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
                });
                toast.success("Proyecto actualizado correctamente");
            } else {
                await projectService.createProject({
                    name: form.name,
                    season: form.season || null,
                    active: form.active,
                    description: form.description || null,
                    image: form.image || null,
                    featured: form.featured,
                });
                toast.success("Proyecto creado correctamente");
            }
            resetForm();
            await loadProjects();
        } catch (err) {
            toast.error(getErrorMessage(err, "No se pudo guardar el proyecto"));
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
        });
        setIsModalOpen(true);
        loadGroups(project.id);
    };

    const loadGroups = async (projectId: string) => {
        try {
            const data = await projectService.listGroups(projectId);
            setGroups(data);
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al cargar los grupos"));
        }
    };

    const handleAddGroup = async () => {
        if (!editing || !newGroupName.trim()) return;
        try {
            setSavingGroup(true);
            const created = await projectService.createGroup(editing, newGroupName.trim());
            setGroups((prev) => [...prev, created]);
            setNewGroupName("");
            toast.success("Grupo creado");
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al crear el grupo"));
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
            toast.success("Grupo actualizado");
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al actualizar el grupo"));
        } finally {
            setSavingGroup(false);
        }
    };

    const handleDeleteGroup = async (groupId: string, groupName: string) => {
        if (!editing) return;
        if (!confirm(`¿Eliminar el grupo "${groupName}"?`)) return;
        try {
            await projectService.deleteGroup(editing, groupId);
            setGroups((prev) => prev.filter((g) => g.id !== groupId));
            toast.success("Grupo eliminado");
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al eliminar el grupo"));
        }
    };

    const handleDelete = async (project: Project) => {
        if (!confirm(`¿Eliminar el proyecto "${project.name}"?`)) return;
        try {
            await projectService.deleteProject(project.id);
            toast.success("Proyecto eliminado correctamente");
            await loadProjects();
        } catch (err) {
            toast.error(getErrorMessage(err, "No se pudo eliminar el proyecto"));
        }
    };

    const columns: FilterableColumn<Project>[] = useMemo(() => [
        {
            key: "name",
            header: "Nombre",
            filter: {
                enabled: true,
                type: "search",
                placeholder: "Buscar por nombre...",
            },
            render: (project) => <span className="font-medium">{project.name}</span>,
        },
        {
            key: "season",
            header: "Temporada",
            filter: {
                enabled: true,
                type: "search",
                placeholder: "Temporada...",
            },
            render: (project) => (
                <span className="text-sm text-gray-600">{project.season || "-"}</span>
            ),
        },
        {
            key: "active",
            header: "Activo",
            filter: {
                enabled: true,
                type: "checkbox",
            },
            render: (project) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    project.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}>
                    {project.active ? "Activo" : "Inactivo"}
                </span>
            ),
        },
        {
            key: "featured" as keyof Project,
            header: "Destacado",
            filter: {
                enabled: true,
                type: "checkbox",
            },
            render: (project) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    project.featured ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600"
                }`}>
                    {project.featured ? "Sí" : "No"}
                </span>
            ),
        },
        {
            key: "id",
            header: "Acciones",
            render: (project) => (
                <div className="flex gap-2">
                    {canUpdate && (
                        <ButtonComponent
                            variant="primary"
                            size="sm"
                            onClick={() => startEdit(project)}
                        >
                            Editar
                        </ButtonComponent>
                    )}
                    {canDelete && (
                        <ButtonComponent
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(project)}
                        >
                            Eliminar
                        </ButtonComponent>
                    )}
                </div>
            ),
        },
    ], [canDelete, canUpdate]);

    return (
        <RequirePermission permission={{ obj: "project", action: "read" }} redirectTo="/mi-espacio">
            <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Proyectos</h1>
                    {canCreate && (
                        <ButtonComponent variant="primary" onClick={openCreateModal}>
                            + Nuevo Proyecto
                        </ButtonComponent>
                    )}
                </div>

                <section className="bg-white rounded-lg shadow p-6">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <LoadingSpinner size="md" message="Cargando proyectos..." />
                        </div>
                    ) : error ? (
                        <ErrorMessage message={error} onRetry={loadProjects} />
                    ) : (
                        <FilterableTable
                            columns={columns}
                            keyField="id"
                            data={projects}
                            display={{
                                emptyMessage: "No se encontraron proyectos",
                                loadingMessage: "Cargando proyectos...",
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
                    title={editing ? "Editar Proyecto" : "Nuevo Proyecto"}
                    footer={
                        <>
                            <ButtonComponent
                                onClick={resetForm}
                                variant="neutral"
                                disabled={saving}
                            >
                                Cancelar
                            </ButtonComponent>
                            <ButtonComponent
                                onClick={handleSave}
                                variant="primary"
                                disabled={saving}
                            >
                                {saving ? "Guardando..." : (editing ? "Guardar Cambios" : "Crear")}
                            </ButtonComponent>
                        </>
                    }
                >
                    <div className="grid gap-4">
                        <InputComponent
                            label="Nombre"
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        />
                        <InputComponent
                            label="Temporada"
                            value={form.season}
                            onChange={(e) => setForm((prev) => ({ ...prev, season: e.target.value }))}
                        />
                        <FileUploader
                            compact
                            multiple={false}
                            label="Imagen del proyecto"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onUpload={(file) =>
                                setForm((prev) => ({ ...prev, image: file.url }))
                            }
                        />
                        {form.image && (
                            <div className="mt-2">
                                <img
                                    src={form.image}
                                    alt="Vista previa"
                                    className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                            <textarea
                                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                                rows={3}
                                maxLength={1000}
                                value={form.description}
                                placeholder="Descripción del proyecto..."
                                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                            />
                            <p className="text-xs text-gray-400 text-right mt-1">{form.description.length}/1000</p>
                        </div>
                        <div className="flex gap-6">
                            <CheckboxComponent
                                label="Activo"
                                variant="left"
                                checked={form.active}
                                onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                            />
                            <CheckboxComponent
                                label="Destacado en la página principal"
                                variant="left"
                                checked={form.featured}
                                onChange={(e) => setForm((prev) => ({ ...prev, featured: e.target.checked }))}
                            />
                        </div>

                        {editing && (
                            <div className="border-t pt-4 mt-2">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Grupos del proyecto</h3>

                                {/* Existing named groups */}
                                {groups.filter(g => g.name).length > 0 ? (
                                    <ul className="space-y-2 mb-3">
                                        {groups.filter(g => g.name).map((group) => (
                                            <li key={group.id} className="flex items-center gap-2">
                                                {editingGroupId === group.id ? (
                                                    <>
                                                        <input
                                                            type="text"
                                                            className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                                            ✓
                                                        </ButtonComponent>
                                                        <ButtonComponent
                                                            variant="neutral"
                                                            size="sm"
                                                            onClick={() => { setEditingGroupId(null); setEditingGroupName(""); }}
                                                        >
                                                            ✗
                                                        </ButtonComponent>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="flex-1 px-2 py-1 bg-green-50 text-green-800 rounded text-sm">
                                                            {group.name}
                                                        </span>
                                                        {canUpdate && (
                                                            <ButtonComponent
                                                                variant="neutral"
                                                                size="sm"
                                                                onClick={() => { setEditingGroupId(group.id); setEditingGroupName(group.name ?? ''); }}
                                                            >
                                                                Editar
                                                            </ButtonComponent>
                                                        )}
                                                        {canDelete && (
                                                            <ButtonComponent
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => handleDeleteGroup(group.id, group.name ?? '')}
                                                            >
                                                                Eliminar
                                                            </ButtonComponent>
                                                        )}
                                                    </>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-400 italic mb-3">Sin grupos</p>
                                )}

                                {/* Add new group */}
                                {canUpdate && (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Nombre del nuevo grupo..."
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
                                            + Añadir
                                        </ButtonComponent>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Modal>
            </main>
        </RequirePermission>
    );
}
