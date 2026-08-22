import { useState, useCallback, useMemo } from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import ActivityForm from "~/components/dashboard/activities/ActivityForm";
import { activityService } from "~/services/activityService";
import type { Activity } from "~/types/activity";
import { ACTIVITY_STATUS_OPTIONS } from "~/types/activity";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCalendarDays,
    faFolder,
    faUser,
    faCopy,
    faPenToSquare,
    faEye,
    faBell,
} from "@fortawesome/free-solid-svg-icons";
import {
    FilterableTable,
    type FetchDataParams,
    type FilterableColumn,
} from "~/components/common/FilterableTable";
import { PageHeader } from "~/components/common/PageHeader";
import { Modal } from "~/components/common/Modal";
import { projectService } from "~/services/projectService";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import toast from "react-hot-toast";
import { getErrorMessage } from "~/types/error";

export default function ActivitiesAdminPage() {
    const { t } = useTranslation();
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editing, setEditing] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: "",
        description: "",
        image: "",
        location: "",
        price: "",
        date: "",
        endDate: "",
        status: "",
        public: false,
        projectId: "",
        managerId: "",
    });

    const [projectOptions, setProjectOptions] = useState<
        { value: string; label: string }[]
    >([]);
    const [managerOptions, setManagerOptions] = useState<
        { value: string; label: string }[]
    >([]);

    useEffect(() => {
        async function fetchProjects() {
            const { content } = await projectService.listProjects(0, 50);
            setProjectOptions(
                content.map((p: any) => ({ value: p.id, label: p.name })),
            );
        }
        fetchProjects();
    }, []);

    // Load all project staff (monitors/coordinators) as manager filter options
    const [allManagerOptions, setAllManagerOptions] = useState<
        { value: string; label: string }[]
    >([]);

    useEffect(() => {
        async function fetchAllStaff() {
            try {
                const staff = await activityService.getAllStaff();
                setAllManagerOptions(
                    staff.map((u) => ({ value: u.id, label: u.name })),
                );
            } catch {
                // Filter will just have no options
            }
        }
        fetchAllStaff();
    }, []);

    useEffect(() => {
        if (!formModalOpen || !form.projectId) {
            setManagerOptions([]);
            return;
        }

        let isMounted = true;
        async function fetchProjectStaff() {
            try {
                const staff = await activityService.getProjectStaff(form.projectId);
                if (!isMounted) return;

                const options = staff.map((u) => ({ value: u.id, label: u.name }));
                setManagerOptions(options);

                if (form.managerId && !options.some((o) => o.value === form.managerId)) {
                    setForm((prev) => ({ ...prev, managerId: "" }));
                }
            } catch {
                if (!isMounted) return;
                setManagerOptions([]);
                if (form.managerId) {
                    setForm((prev) => ({ ...prev, managerId: "" }));
                }
            }
        }

        fetchProjectStaff();

        return () => {
            isMounted = false;
        };
    }, [formModalOpen, form.projectId, form.managerId]);

    const columns = useMemo((): FilterableColumn<Activity>[] => [
        {
            key: "name",
            header: t("common.name"),
            filter: {
                enabled: true,
                type: "search" as const,
                placeholder: t("activities.searchByName"),
            },
            render: (a: Activity) => (
                <span className="font-semibold text-yambo-black">{a.name}</span>
            ),
        },
        {
            key: "dateRange",
            header: t("common.date"),
            className: "hidden sm:table-cell",
            filter: {
                enabled: true,
                type: "date-range" as const,
            },
            render: (a: Activity) => (
                <span className="text-gray-500">
                    {a.date ? new Date(a.date).toLocaleDateString() : "-"}
                    {a.endDate && (
                        <> — {new Date(a.endDate).toLocaleDateString()}</>
                    )}
                </span>
            ),
        },
        {
            key: "manager",
            header: t("activities.manager"),
            className: "hidden md:table-cell",
            filter: {
                enabled: true,
                type: "select" as const,
                options: [
                    { value: "", label: t("common.all") },
                    ...allManagerOptions,
                ],
            },
            render: (a: Activity) => (
                <span>{a.manager ? a.manager.name : "-"}</span>
            ),
        },
        {
            key: "status",
            header: t("activities.status"),
            filter: {
                enabled: true,
                type: "select" as const,
                options: [
                    { value: "", label: t("common.all") },
                    ...ACTIVITY_STATUS_OPTIONS,
                ],
            },
            render: (a: Activity) =>
                a.status ? (
                    <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: a.status.color }}
                    >
                        {a.status.label}
                    </span>
                ) : (
                    <span className="text-gray-400">-</span>
                ),
        },
        {
            key: "waitlistCount",
            header: t("activities.waitlist"),
            className: "hidden sm:table-cell",
            render: (a: Activity) => (
                <span className="inline-flex items-center gap-1 text-gray-600">
                    <FontAwesomeIcon icon={faBell} className="text-yambo-purple-500" />
                    {a.waitlistCount ?? 0}
                </span>
            ),
        },
        {
            key: "project",
            header: t("activities.project"),
            className: "hidden md:table-cell",
            filter: {
                enabled: true,
                type: "select" as const,
                options: [
                    { value: "", label: t("common.all") },
                    ...projectOptions,
                ],
            },
            render: (a: Activity) => (
                <span>{a.project ? a.project.name : "-"}</span>
            ),
        },
        {
            key: "public",
            header: t("activities.public"),
            className: "hidden sm:table-cell",
            filter: {
                enabled: true,
                type: "toggle" as const,
            },
            render: (a: Activity) => (
                <span className={a.public ? "text-yambo-green-600 font-medium" : "text-gray-400"}>
                    {a.public ? t("common.yes") : t("common.no")}
                </span>
            ),
        },
        {
            key: "actions",
            header: t("common.actions"),
            requiredPerms: [{ obj: "activity", action: "update" }],
            render: (a: Activity) => (
                <div className="flex gap-1 sm:gap-2">
                    <ButtonComponent
                        variant="success"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCloneClick(a);
                        }}
                    >
                        <span className="sm:hidden"><FontAwesomeIcon icon={faCopy} className="w-3.5 h-3.5" /></span>
                        <span className="hidden sm:inline">{t("activities.clone")}</span>
                    </ButtonComponent>
                    <ButtonComponent
                        variant="primary"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(a);
                        }}
                    >
                        <span className="sm:hidden"><FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5" /></span>
                        <span className="hidden sm:inline">{t("common.edit")}</span>
                    </ButtonComponent>
                    <Link
                        to={`/actividades/${a.id}`}
                        className="inline-flex items-center px-2 sm:px-4 py-2 rounded-xl text-sm font-bold text-white bg-yambo-green-600 hover:bg-yambo-green-700 transition-all shadow-sm hover:shadow-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <span className="sm:hidden"><FontAwesomeIcon icon={faEye} className="w-3.5 h-3.5" /></span>
                        <span className="hidden sm:inline">{t("activities.details")}</span>
                    </Link>
                </div>
            ),
        },
    ], [allManagerOptions, projectOptions, t]);

    const features = useMemo(() => ({ enableFilters: true, enablePagination: true }), []);

    const fetchData = useCallback(async ({
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
        const dateRange = filters.dateRange as { startDate?: string; endDate?: string } | undefined;
        const startDate = dateRange?.startDate
            ? new Date(dateRange.startDate).toISOString()
            : undefined;
        const endDate = dateRange?.endDate
            ? new Date(dateRange.endDate + "T23:59:59").toISOString()
            : undefined;

        const result = await activityService.getActivities(
            page,
            size,
            filters.name || undefined,
            filters.status || undefined,
            filters.public === true ? true : undefined,
            filters.project || undefined,
            filters.manager || undefined,
            startDate,
            endDate,
        );
        return {
            content: result.content,
            page: {
                number: page,
                size: size,
                totalElements: result.totalElements,
                totalPages: result.totalPages,
            },
        };
    }, []);

    const handleEditClick = (activity: Activity) => {
        setEditing(activity.id);
        setForm({
            name: activity.name,
            description: activity.description || "",
            image: activity.image || "",
            location: activity.location || "",
            price: activity.price != null ? String(activity.price) : "",
            date: activity.date || "",
            endDate: activity.endDate || "",
            status: activity.status?.value || "",
            public: activity.public,
            projectId: activity.project?.id || "",
            managerId: activity.manager?.id || "",
        });
        setFormModalOpen(true);
    };

    const handleCloneClick = (activity: Activity) => {
        setEditing(null);
        setForm({
            name: activity.name,
            description: activity.description || "",
            image: activity.image || "",
            location: activity.location || "",
            price: activity.price != null ? String(activity.price) : "",
            date: activity.date || "",
            endDate: activity.endDate || "",
            status: activity.status?.value || "",
            public: activity.public,
            projectId: activity.project?.id || "",
            managerId: activity.manager?.id || "",
        });
        setFormModalOpen(true);
    };

    const handleCreateClick = () => {
        setEditing(null);
        setManagerOptions([]);
        setForm({
            name: "",
            description: "",
            image: "",
            location: "",
            price: "",
            date: "",
            endDate: "",
            status: "",
            public: false,
            projectId: "",
            managerId: "",
        });
        setFormModalOpen(true);
    };

    const handleFormChange = (field: string, value: any) => {
        setForm((prev) => {
            if (field === "projectId") {
                return { ...prev, projectId: value, managerId: "" };
            }
            return { ...prev, [field]: value };
        });
    };

    const buildActivityPayload = () => {
        const trimmedName = form.name.trim();
        const trimmedDescription = form.description.trim();
        const trimmedImage = form.image.trim();
        const trimmedLocation = form.location.trim();
        const trimmedProjectId = form.projectId.trim();
        const trimmedManagerId = form.managerId.trim();

        return {
            name: trimmedName,
            description: trimmedDescription || undefined,
            image: trimmedImage || undefined,
            location: trimmedLocation || undefined,
            price: form.price !== "" ? Number(form.price) : undefined,
            date: form.date || undefined,
            endDate: form.endDate || undefined,
            status: form.status || undefined,
            isPublic: form.public,
            projectId: trimmedProjectId,
            managerId: trimmedManagerId || undefined,
        };
    };

    const handleFormSubmit = async () => {
        try {
            const payload = buildActivityPayload();

            if (!payload.projectId) {
                toast.error(t("activities.selectProjectError"));
                return;
            }

            if (editing) {
                await activityService.updateActivity(editing, payload);
            } else {
                await activityService.createActivity(payload);
            }
            setFormModalOpen(false);
            window.location.reload();
        } catch (err) {
            toast.error(getErrorMessage(err, t("activities.saveError")));
        }
    };

    return (
        <main className="flex flex-col p-4 md:p-6 w-full">
            <PageHeader
                title={t("activities.panelTitle")}
                wiki={{ slug: "flujos-de-trabajo", hash: "actividades" }}
            />
            <div className="mb-4">
                <ButtonComponent variant="success" onClick={handleCreateClick}>
                    {t("activities.createNew")}
                </ButtonComponent>
            </div>
            <FilterableTable
                columns={columns}
                keyField="id"
                serverSide={{ fetchData }}
                features={features}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
                display={{
                    renderMobileCard: (a: Activity) => (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <span className="font-bold text-yambo-black text-sm leading-tight line-clamp-2 flex-1">{a.name}</span>
                                {a.status && (
                                    <span
                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-white shrink-0"
                                        style={{ backgroundColor: a.status.color }}
                                    >
                                        {a.status.label}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                                {a.date && (
                                    <span className="flex items-center gap-1">
                                        <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3 text-gray-400" />
                                        {new Date(a.date).toLocaleDateString()}{a.endDate ? ` — ${new Date(a.endDate).toLocaleDateString()}` : ''}
                                    </span>
                                )}
                                {a.project && (
                                    <span className="flex items-center gap-1">
                                        <FontAwesomeIcon icon={faFolder} className="w-3 h-3 text-gray-400" />
                                        {a.project.name}
                                    </span>
                                )}
                                {a.manager && (
                                    <span className="flex items-center gap-1">
                                        <FontAwesomeIcon icon={faUser} className="w-3 h-3 text-gray-400" />
                                        {a.manager.name}
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-1.5 pt-1">
                                <button type="button"
                                    onClick={(e) => { e.stopPropagation(); handleCloneClick(a); }}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-yambo-green-50 hover:text-yambo-green-700 transition-colors"
                                    title={t("activities.clone")}
                                ><FontAwesomeIcon icon={faCopy} className="w-3.5 h-3.5" /></button>
                                <button type="button"
                                    onClick={(e) => { e.stopPropagation(); handleEditClick(a); }}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-yambo-green-50 hover:text-yambo-green-700 transition-colors"
                                    title={t("common.edit")}
                                ><FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5" /></button>
                                <a
                                    href={`/actividades/${a.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-yambo-green-600 text-white hover:bg-yambo-green-700 transition-colors ml-auto"
                                    title={t("activities.details")}
                                ><FontAwesomeIcon icon={faEye} className="w-3.5 h-3.5" /></a>
                            </div>
                        </div>
                    ),
                }}
            />
            {/* Crear / Editar modal */}
            <Modal
                isOpen={formModalOpen}
                onClose={() => setFormModalOpen(false)}
                title={editing ? t("activities.editTitle") : t("activities.createTitle")}
                size="xl"
                footer={null}
            >
                <ActivityForm
                    form={form}
                    projectOptions={projectOptions}
                    managerOptions={managerOptions}
                    onChange={handleFormChange}
                    onSubmit={handleFormSubmit}
                    submitLabel={editing ? t("common.save") : t("common.create")}
                />
            </Modal>
        </main>
    );
}
