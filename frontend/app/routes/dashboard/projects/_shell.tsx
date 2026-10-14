import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPeopleGroup, faPlus } from "@fortawesome/free-solid-svg-icons";
import { RequirePermission } from "~/components/common/RequirePermission";
import { PageContainer } from "~/components/common/PageContainer";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { Modal } from "~/components/common/Modal";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import {
    EMPTY_PROJECT_FORM,
    ProjectFormFields,
    isValidCoordinationEmail,
    toProjectRequest,
    type ProjectFormValues,
} from "~/components/dashboard/team/ProjectFormFields";
import { projectService, type Project } from "~/services/projectService";
import { useAuth } from "~/hooks/useAuth";
import { ApiError, getErrorMessage } from "~/types/error";
import { projectColor } from "~/utils/projectColor";

export function meta() {
    return [{ title: "Yambo - Proyectos y equipo" }];
}

export interface ProjectsShellContext {
    projects: Project[];
    reloadProjects: () => Promise<void>;
}

const railItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 shrink-0 px-3 py-2 rounded-xl text-sm whitespace-nowrap lg:whitespace-normal transition-all ${
        isActive
            ? "bg-white text-yambo-green-700 font-semibold shadow-sm ring-1 ring-yambo-green-100"
            : "text-gray-600 hover:bg-white/70 hover:text-yambo-green-700"
    }`;

/**
 * Sección única de proyectos y equipo: a la izquierda se elige «Todo el equipo»
 * o un proyecto, y a la derecha se gestiona lo elegido.
 */
export default function ProjectsShell() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [form, setForm] = useState<ProjectFormValues>({ ...EMPTY_PROJECT_FORM });
    const [emailError, setEmailError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const reloadProjects = useCallback(async () => {
        try {
            setError(null);
            const response = await projectService.listProjects(0, 200);
            // Los activos primero; dentro de cada bloque, por nombre
            setProjects(
                [...response.content].sort(
                    (a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "es"),
                ),
            );
        } catch (err) {
            setError(getErrorMessage(err, t("projects.loadError")));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void reloadProjects();
    }, [reloadProjects]);

    const openCreate = () => {
        setForm({ ...EMPTY_PROJECT_FORM });
        setEmailError(null);
        setIsCreateOpen(true);
    };

    const handleCreate = async () => {
        if (!form.name.trim()) {
            toast.error(t("projects.nameRequired"));
            return;
        }
        if (!isValidCoordinationEmail(form.coordinationEmail)) {
            setEmailError(t("projects.coordinationEmailInvalid"));
            return;
        }
        try {
            setSaving(true);
            const created = await projectService.createProject({
                ...toProjectRequest(form),
                coordinationEmail: form.coordinationEmail.trim() || null,
            });
            toast.success(t("projects.created"));
            setIsCreateOpen(false);
            await reloadProjects();
            navigate(`/mi-espacio/proyectos/${created.id}/equipo`);
        } catch (err) {
            if (err instanceof ApiError && err.message === "Invalid coordination email") {
                setEmailError(t("projects.coordinationEmailInvalid"));
                return;
            }
            toast.error(getErrorMessage(err, t("projects.saveError")));
        } finally {
            setSaving(false);
        }
    };

    const context: ProjectsShellContext = { projects, reloadProjects };

    return (
        <RequirePermission permission={{ obj: "project", action: "read" }} redirectTo="/mi-espacio">
            <PageContainer>
                <div className="mb-5">
                    <h1 className="text-3xl font-extrabold font-display text-yambo-black">{t("team.title")}</h1>
                    <p className="text-gray-500 mt-1">{t("team.subtitle")}</p>
                </div>

                {loading ? (
                    <LoadingSpinner size="md" message={t("projects.loading")} />
                ) : error ? (
                    <ErrorMessage message={error} onRetry={reloadProjects} />
                ) : (
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
                        <nav
                            aria-label={t("team.title")}
                            className="lg:w-60 lg:shrink-0 lg:sticky lg:top-20 rounded-2xl bg-gray-100/70 p-1.5 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible"
                        >
                            {hasPermission({ obj: "user", action: "read" }) && (
                                <NavLink to="/mi-espacio/proyectos" end className={railItemClass}>
                                    <FontAwesomeIcon icon={faPeopleGroup} className="w-4 h-4 text-yambo-purple-600" />
                                    {t("team.everyone")}
                                </NavLink>
                            )}
                            {projects.length > 0 && (
                                <span className="hidden lg:block px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                    {t("projects.title")}
                                </span>
                            )}
                            {projects.map((project) => (
                                <NavLink key={project.id} to={`/mi-espacio/proyectos/${project.id}`} className={railItemClass}>
                                    <span
                                        className="w-2.5 h-2.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: projectColor(project.name, project.signatureColor).text }}
                                    />
                                    <span className={`min-w-0 lg:truncate ${project.active ? "" : "text-gray-400"}`}>{project.name}</span>
                                    {!project.active && (
                                        <span className="ml-auto text-[10px] font-medium px-1.5 py-px rounded-full bg-gray-200 text-gray-500">
                                            {t("common.inactive")}
                                        </span>
                                    )}
                                </NavLink>
                            ))}
                            {hasPermission({ obj: "project", action: "create" }) && (
                                <button
                                    type="button"
                                    onClick={openCreate}
                                    className="flex items-center gap-2 shrink-0 px-3 py-2 lg:mt-1 rounded-xl text-sm font-semibold whitespace-nowrap text-yambo-green-600 hover:bg-white/70 transition-all"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
                                    {t("projects.newTitle")}
                                </button>
                            )}
                        </nav>

                        <div className="min-w-0 flex-1">
                            <Outlet context={context} />
                        </div>
                    </div>
                )}

                <Modal
                    isOpen={isCreateOpen}
                    onClose={() => setIsCreateOpen(false)}
                    title={t("projects.newTitle")}
                    footer={
                        <>
                            <ButtonComponent onClick={() => setIsCreateOpen(false)} variant="neutral" disabled={saving}>
                                {t("common.cancel")}
                            </ButtonComponent>
                            <ButtonComponent onClick={handleCreate} variant="primary" disabled={saving}>
                                {saving ? t("common.saving") : t("common.create")}
                            </ButtonComponent>
                        </>
                    }
                >
                    <ProjectFormFields
                        form={form}
                        onChange={setForm}
                        coordinationEmailError={emailError}
                        onCoordinationEmailErrorClear={() => setEmailError(null)}
                    />
                </Modal>
            </PageContainer>
        </RequirePermission>
    );
}
