import { useCallback, useEffect, useMemo, useState } from "react";
import { RequirePermission } from "~/components/common/RequirePermission";
import { FilterableTable } from "~/components/common/FilterableTable";
import type { FilterableColumn } from "~/components/common/FilterableTable";
import InputComponent from "~/components/common/forms/InputComponent";
import CheckboxComponent from "~/components/common/forms/CheckboxComponent";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { Modal } from "~/components/common/Modal";
import { projectService, type Project } from "~/services/projectService";
import { useAuth } from "~/hooks/useAuth";
import toast from "react-hot-toast";

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
};

const EMPTY_FORM: ProjectForm = { name: "", season: "", active: true };

export default function Projects() {
    const { hasPermission } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<ProjectForm>({ ...EMPTY_FORM });
    const [editing, setEditing] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const canCreate = hasPermission({ obj: "project", action: "create" });
    const canUpdate = hasPermission({ obj: "project", action: "update" });
    const canDelete = hasPermission({ obj: "project", action: "delete" });

    const loadProjects = useCallback(async () => {
        try {
            setLoading(true);
            const response = await projectService.listProjects(0, 200);
            setProjects(response.content);
        } catch (error) {
            toast.error("Error al cargar los proyectos");
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
                });
                toast.success("Proyecto actualizado correctamente");
            } else {
                await projectService.createProject({
                    name: form.name,
                    season: form.season || null,
                    active: form.active,
                });
                toast.success("Proyecto creado correctamente");
            }
            resetForm();
            await loadProjects();
        } catch (error: any) {
            toast.error(error.message || "No se pudo guardar el proyecto");
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
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (project: Project) => {
        if (!confirm(`¿Eliminar el proyecto "${project.name}"?`)) return;
        try {
            await projectService.deleteProject(project.id);
            toast.success("Proyecto eliminado correctamente");
            await loadProjects();
        } catch (error: any) {
            toast.error(error.message || "No se pudo eliminar el proyecto");
        }
    };

    const columns: FilterableColumn<Project>[] = useMemo(() => [
        {
            key: "name",
            header: "Nombre",
            filter: {
                enabled: true,
                type: "text",
                placeholder: "Buscar por nombre...",
            },
            render: (project) => <span className="font-medium">{project.name}</span>,
        },
        {
            key: "season",
            header: "Temporada",
            filter: {
                enabled: true,
                type: "text",
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
                        <CheckboxComponent
                            label="Activo"
                            variant="left"
                            checked={form.active}
                            onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                        />
                    </div>
                </Modal>
            </main>
        </RequirePermission>
    );
}
