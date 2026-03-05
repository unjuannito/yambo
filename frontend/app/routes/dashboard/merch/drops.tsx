import { useCallback, useEffect, useMemo, useState } from "react";
import { RequirePermission } from "~/components/common/RequirePermission";
import { useAuth } from "~/hooks/useAuth";
import { FilterableTable } from "~/components/common/FilterableTable";
import type { FilterableColumn } from "~/components/common/FilterableTable";
import { Modal } from "~/components/common/Modal";
import InputComponent from "~/components/common/forms/InputComponent";
import MultiSelectComponent from "~/components/common/forms/MultiSelectComponent";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { familyProductService, type FamilyProduct } from "~/services/familyProductService";
import { projectService, type Project } from "~/services/projectService";
import { getErrorMessage } from "~/types/error";
import { FAMILY_PRODUCT_STATUS_CONFIG, FAMILY_PRODUCT_WORKFLOW_TRANSITIONS } from "~/constants/orderStatus";
import { StatusWorkflow } from "~/components/common/StatusWorkflow";
import toast from "react-hot-toast";

export function meta() {
    return [
        { title: "Yambo - Drops" },
        { name: "Yambo - Drops", content: "Yambo - Drops" },
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
            setError(getErrorMessage(err, "Error al cargar los drops de productos"));
        } finally {
            setLoading(false);
        }
    }, []);

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
            toast.error("El nombre es obligatorio");
            return;
        }
        if (!form.endTms) {
            toast.error("La fecha de fin es obligatoria");
            return;
        }
        if (!form.startTms) {
            toast.error("La fecha de inicio es obligatoria");
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
                toast.success("Drop actualizado correctamente");
            } else {
                await familyProductService.createFamilyProduct({
                    name: form.name,
                    startTms: form.startTms,
                    endTms: form.endTms,
                    projectIds: form.projectIds,
                });
                toast.success("Drop creado correctamente");
            }
            resetForm();
            await loadData();
        } catch (err) {
            toast.error(getErrorMessage(err, "No se pudo guardar el drop"));
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
        if (!confirm(`¿Eliminar el drop "${drop.name}"?`)) return;
        try {
            await familyProductService.deleteFamilyProduct(drop.id);
            toast.success("Drop eliminado correctamente");
            await loadData();
        } catch (err) {
            toast.error(getErrorMessage(err, "No se pudo eliminar el drop"));
        }
    };

    const handleStatusChange = async (drop: FamilyProduct, newStatus: string) => {
        try {
            await familyProductService.updateFamilyProductStatus(drop.id, newStatus);
            toast.success("Estado del drop actualizado");
            await loadData();
        } catch (err) {
            toast.error(getErrorMessage(err, "No se pudo actualizar el estado"));
        }
    };

    const projectOptions = useMemo(() => projects.map((project) => ({
        value: project.id,
        label: project.name,
    })), [projects]);

    const columns: FilterableColumn<FamilyProduct>[] = useMemo(() => [
        {
            key: "name",
            header: "Nombre",
            filter: {
                enabled: true,
                type: "search",
                placeholder: "Buscar por nombre...",
            },
            render: (drop) => <span className="font-medium">{drop.name}</span>,
        },
        {
            key: "endTms",
            header: "Fin",
            render: (drop) => (
                <span className="text-sm text-gray-600">
                    {drop.endTms ? new Date(drop.endTms).toLocaleString() : "-"}
                </span>
            ),
        },
        {
            key: "startTms",
            header: "Inicio",
            render: (drop) => (
                <span className="text-sm text-gray-600">
                    {drop.startTms ? new Date(drop.startTms).toLocaleString() : "-"}
                </span>
            ),
        },
        {
            key: "projectIds",
            header: "Proyectos",
            render: (drop) => {
                const names = (drop.projectIds ?? [])
                    .map((id) => projects.find((p) => p.id === id)?.name || id)
                    .join(", ");
                return (
                    <span className="text-sm text-gray-600">
                        {names || "-"}
                    </span>
                );
            },
        },
        {
            key: "status",
            header: "Estado",
            render: (drop) => {
                const statusKey = drop.status as keyof typeof FAMILY_PRODUCT_STATUS_CONFIG;
                const statusConfig = statusKey ? FAMILY_PRODUCT_STATUS_CONFIG[statusKey] : null;
                if (!canUpdate) {
                    return statusConfig ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.className}`}>
                            {statusConfig.label}
                        </span>
                    ) : <span className="text-sm text-gray-500">{drop.status || "-"}</span>;
                }
                return (
                    <select
                        value={drop.status || "OPEN"}
                        onChange={(e) => handleStatusChange(drop, e.target.value)}
                        className={`text-xs font-medium rounded-full px-2.5 py-0.5 border-0 cursor-pointer ${statusConfig?.className || "bg-gray-100 text-gray-800"}`}
                    >
                        {Object.entries(FAMILY_PRODUCT_STATUS_CONFIG).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                        ))}
                    </select>
                );
            },
        },
        {
            key: "id",
            header: "Acciones",
            render: (drop) => (
                <div className="flex gap-2">
                    {canUpdate && (
                        <ButtonComponent
                            variant="primary"
                            size="sm"
                            onClick={() => startEdit(drop)}
                        >
                            Editar
                        </ButtonComponent>
                    )}
                    {canDelete && (
                        <ButtonComponent
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(drop)}
                        >
                            Eliminar
                        </ButtonComponent>
                    )}
                </div>
            ),
        },
    ], [projects, canUpdate, canDelete]);

    return (
        <RequirePermission permission={{ obj: "family_product", action: "read" }} redirectTo="/mi-espacio/merch">
            <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Drops de Merch</h1>
                    <RequirePermission permission={{ obj: "family_product", action: "create" }} redirect={false}>
                        <ButtonComponent
                            variant="primary"
                            onClick={openCreateModal}
                        >
                            Crear Drop
                        </ButtonComponent>
                    </RequirePermission>
                </div>

                <StatusWorkflow
                    title="Flujo de estados del drop"
                    config={FAMILY_PRODUCT_STATUS_CONFIG}
                    transitions={FAMILY_PRODUCT_WORKFLOW_TRANSITIONS}
                />

                <section className="bg-white rounded-lg shadow p-6">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <LoadingSpinner size="md" message="Cargando drops..." />
                        </div>
                    ) : error ? (
                        <ErrorMessage message={error} onRetry={loadData} />
                    ) : (
                        <FilterableTable
                            columns={columns}
                            keyField="id"
                            data={drops}
                            display={{
                                emptyMessage: "No se encontraron drops",
                                loadingMessage: "Cargando drops...",
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
                    title={editing ? "Editar Drop" : "Crear Drop"}
                    size="lg"
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
                    <div className="flex flex-col gap-4">
                        <InputComponent
                            label="Nombre"
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="Nombre del drop"
                            required
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputComponent
                                label="Inicio del drop"
                                type="datetime-local"
                                value={form.startTms}
                                onChange={(e) => setForm((prev) => ({ ...prev, startTms: e.target.value }))}
                                required
                            />
                            <InputComponent
                                label="Fin del drop"
                                type="datetime-local"
                                value={form.endTms}
                                onChange={(e) => setForm((prev) => ({ ...prev, endTms: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Proyectos
                            </label>
                            <MultiSelectComponent
                                value={form.projectIds}
                                options={projectOptions}
                                placeholder="Seleccionar proyectos..."
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
            </main>
        </RequirePermission>
    );
}
