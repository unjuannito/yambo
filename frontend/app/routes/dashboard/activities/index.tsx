import { useState } from "react";
import { useEffect } from "react";
import ActivityForm from "~/components/dashboard/activities/ActivityForm";
import MarkdownEditor from "~/components/common/forms/MarkdownEditor";
import LabelComponent from "~/components/common/forms/LabelComponent";
import { activityService } from "~/services/activityService";
import type { Activity } from "~/types/activity";
import {
    FilterableTable,
    type FetchDataParams,
    type FilterableColumn,
} from "~/components/common/FilterableTable";
import { Modal } from "~/components/common/Modal";
import { projectService } from "~/services/projectService";
import { adminUserService } from "~/services/adminUserService";
import ButtonComponent from "~/components/common/forms/ButtonComponent";

export default function ActivitiesAdminPage() {
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
        null,
    );
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editing, setEditing] = useState<string | null>(null);

    // Form state for create/edit
    const [form, setForm] = useState({
        name: "",
        description: "",
        date: "",
        status: "",
        public: false,
        projectId: "",
        managerId: "",
    });

    // Project and manager options
    const [projectOptions, setProjectOptions] = useState<
        { value: string; label: string }[]
    >([]);
    const [managerOptions, setManagerOptions] = useState<
        { value: string; label: string }[]
    >([]);

    // Fetch projects and managers for select fields
    useEffect(() => {
        async function fetchProjects() {
            const { content } = await projectService.listProjects(0, 50);
            setProjectOptions(
                content.map((p: any) => ({ value: p.id, label: p.name })),
            );
        }
        async function fetchManagers() {
            const { content } = await adminUserService.listUsers({
                page: 0,
                size: 50,
            });
            setManagerOptions(
                content.map((u: any) => ({ value: u.id, label: u.name })),
            );
        }
        fetchProjects();
        fetchManagers();
    }, []);

    // Columns definition
    const columns: FilterableColumn<Activity>[] = [
        {
            key: "name",
            header: "Nombre",
            filter: {
                enabled: true,
                type: "text" as const,
                placeholder: "Buscar nombre",
            },
            render: (a: Activity) => (
                <span className="font-semibold">{a.name}</span>
            ),
        },
        {
            key: "date",
            header: "Fecha",
            filter: {
                enabled: true,
                type: "text" as const,
                placeholder: "Buscar fecha",
            },
            render: (a: Activity) => (
                <span>
                    {a.date ? new Date(a.date).toLocaleDateString() : "-"}
                </span>
            ),
        },
        {
            key: "manager",
            header: "Responsable",
            filter: {
                enabled: true,
                type: "text" as const,
                placeholder: "Buscar responsable",
            },
            render: (a: Activity) => (
                <span>{a.manager ? a.manager.name : "-"}</span>
            ),
        },
        {
            key: "status",
            header: "Estado",
            filter: {
                enabled: false,
                type: "text" as const,
                placeholder: "Buscar estado",
            },
            render: (a: Activity) =>
                a.status ? (
                    <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: a.status.color }}
                    >
                        {a.status.label}
                    </span>
                ) : (
                    <span className="text-gray-400">-</span>
                ),
        },
        {
            key: "public",
            header: "Pública",
            filter: {
                enabled: false,
                type: "select" as const,
                options: [
                    { value: "true", label: "Sí" },
                    { value: "false", label: "No" },
                ],
            },
            render: (a: Activity) => <span>{a.public ? "Sí" : "No"}</span>,
        },
        {
            key: "actions",
            header: "Acciones",
            render: (a: Activity) => (
                <div className="flex gap-2">
                    <ButtonComponent
                        variant="primary"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(a);
                        }}
                    >
                        Editar
                    </ButtonComponent>
                    <ButtonComponent
                        variant="neutral"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedActivity(a);
                            setDetailsModalOpen(true);
                        }}
                    >
                        Detalles
                    </ButtonComponent>
                </div>
            ),
        },
    ];

    // Fetch activities from backend
    const fetchData = async ({
        page,
        size,
        filters,
    }: FetchDataParams): Promise<{
        content: Activity[];
        page: {
            number: number;
            size: number;
            totalElements: number;
            totalPages: number;
        };
    }> => {
        const result = await activityService.getActivities(page, size);
        return {
            content: result.content,
            page: {
                number: page,
                size: size,
                totalElements: result.totalElements,
                totalPages: result.totalPages,
            },
        };
    };

    // Handle edit click
    const handleEditClick = (activity: Activity) => {
        setSelectedActivity(activity);
        setEditing(activity.id);
        setForm({
            name: activity.name,
            description: activity.description || "",
            date: activity.date || "",
            status: activity.status?.value || "",
            public: activity.public,
            projectId: activity.project?.id || "",
            managerId: activity.manager?.id || "",
        });
        setFormModalOpen(true);
    };

    // Handle create click
    const handleCreateClick = () => {
        setSelectedActivity(null);
        setEditing(null);
        setForm({
            name: "",
            description: "",
            date: "",
            status: "",
            public: false,
            projectId: "",
            managerId: "",
        });
        setFormModalOpen(true);
    };

    // Handle form changes
    const handleFormChange = (field: string, value: any) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    // Handle form submit (create or edit)
    const handleFormSubmit = async () => {
        if (editing) {
            await activityService.updateActivity(editing, form);
        } else {
            await activityService.createActivity(form);
        }
        setFormModalOpen(false);
        window.location.reload();
    };

    return (
        <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
            <h1 className="text-3xl font-bold mb-6">Panel de actividades</h1>
            <div className="mb-4">
                <ButtonComponent variant="success" onClick={handleCreateClick}>
                    Crear actividad
                </ButtonComponent>
            </div>
            <FilterableTable
                columns={columns}
                keyField="id"
                serverSide={{ fetchData }}
                features={{ enableFilters: true, enablePagination: true }}
                className="bg-white rounded-lg shadow p-4"
            />
            {/* Detalles modal */}
            <Modal
                isOpen={detailsModalOpen}
                onClose={() => setDetailsModalOpen(false)}
                title={selectedActivity?.name || "Detalles de actividad"}
                size="xl"
            >
                {selectedActivity && (
                    <div className="flex flex-col gap-4">
                        <LabelComponent label="Descripción">
                            <MarkdownEditor
                                value={selectedActivity.description || "-"}
                                readOnly
                                className="border rounded"
                            />
                        </LabelComponent>
                        <LabelComponent label="Fecha">
                            <span className="px-2">
                                {selectedActivity.date
                                    ? new Date(
                                          selectedActivity.date,
                                      ).toLocaleString()
                                    : "-"}
                            </span>
                        </LabelComponent>
                        <LabelComponent label="Responsable">
                            <span className="px-2">
                                {selectedActivity.manager?.name || "-"}
                            </span>
                        </LabelComponent>
                        <LabelComponent label="Estado">
                            {selectedActivity.status ? (
                                <span
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ml-2"
                                    style={{ backgroundColor: selectedActivity.status.color }}
                                >
                                    {selectedActivity.status.label}
                                </span>
                            ) : (
                                <span className="px-2 text-gray-400">-</span>
                            )}
                        </LabelComponent>
                        <LabelComponent label="Pública">
                            <span className="px-2">
                                {selectedActivity.public ? "Sí" : "No"}
                            </span>
                        </LabelComponent>
                        <LabelComponent label="Proyecto">
                            <span className="px-2">
                                {selectedActivity.project?.name || "-"}
                            </span>
                        </LabelComponent>
                    </div>
                )}
            </Modal>
            {/* Crear / Editar modal */}
            <Modal
                isOpen={formModalOpen}
                onClose={() => setFormModalOpen(false)}
                title={editing ? "Editar actividad" : "Crear actividad"}
                size="xl"
                footer={null}
            >
                <ActivityForm
                    form={form}
                    projectOptions={projectOptions}
                    managerOptions={managerOptions}
                    onChange={handleFormChange}
                    onSubmit={handleFormSubmit}
                    submitLabel={editing ? "Guardar" : "Crear"}
                />
            </Modal>
        </main>
    );
}
