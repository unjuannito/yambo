import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, NavLink, useOutletContext, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear, faPeopleGroup, faUsers } from "@fortawesome/free-solid-svg-icons";
import { projectService, type Project, type ProjectGroup } from "~/services/projectService";
import { adminUserService } from "~/services/adminUserService";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { useAuth } from "~/hooks/useAuth";
import { getErrorMessage } from "~/types/error";
import { toAssignTarget, type AssignTarget } from "~/utils/groupOptions";
import { projectColor } from "~/utils/projectColor";
import type { User } from "~/types/userType";
import type { ProjectsShellContext } from "../_shell";

export interface ProjectContext extends ProjectsShellContext {
    project: Project;
    groups: ProjectGroup[];
    /** Coordinadores y monitores de este proyecto. */
    members: User[];
    /** `null` si el proyecto aún no tiene grupo de proyecto y no se pudo crear. */
    target: AssignTarget | null;
    reload: () => Promise<void>;
}

export default function ProjectLayout() {
    const { t } = useTranslation();
    const { projectId } = useParams();
    const shell = useOutletContext<ProjectsShellContext>();
    const { hasPermission } = useAuth();
    const canReadUsers = hasPermission({ obj: "user", action: "read" });
    const canUpdateProject = hasPermission({ obj: "project", action: "update" });

    const project = shell.projects.find((p) => p.id === projectId);
    const [groups, setGroups] = useState<ProjectGroup[]>([]);
    const [staff, setStaff] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        if (!projectId) return;
        try {
            setError(null);
            const [groupsData, usersData] = await Promise.all([
                projectService.listGroups(projectId),
                canReadUsers ? adminUserService.listUsers({ staff: true, page: 0, size: 500 }) : null,
            ]);
            // Older projects may not have a project-level group; create it on demand.
            if (!groupsData.some((g) => !g.name) && canUpdateProject) {
                groupsData.push(await projectService.createGroup(projectId, null));
            }
            setGroups(groupsData);
            setStaff(usersData?.content ?? []);
        } catch (err) {
            setError(getErrorMessage(err, t("team.loadError")));
        } finally {
            setLoading(false);
        }
    }, [projectId, canReadUsers, canUpdateProject, t]);

    useEffect(() => {
        setLoading(true);
        void reload();
    }, [reload]);

    const members = useMemo(
        () =>
            staff.filter((u) =>
                u.groupRoles?.some((gr) => gr.projectId === projectId && (gr.role === "MONITOR" || gr.role === "COORDINATOR")),
            ),
        [staff, projectId],
    );

    if (!project) {
        return <ErrorMessage message={t("team.projectNotFound")} />;
    }

    const defaultGroup = groups.find((g) => !g.name);
    const context: ProjectContext = {
        ...shell,
        project,
        groups,
        members,
        target: defaultGroup ? toAssignTarget(project, groups, defaultGroup.id) : null,
        reload,
    };

    const tabs = [
        { href: "equipo", label: t("team.tabs.team"), icon: faPeopleGroup },
        { href: "padres", label: t("team.tabs.parents"), icon: faUsers },
        ...(canUpdateProject ? [{ href: "ajustes", label: t("team.tabs.settings"), icon: faGear }] : []),
    ];

    return (
        <section className="rounded-3xl bg-white border border-gray-100 shadow-sm p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <span
                    className="w-3 h-10 rounded-full"
                    style={{ backgroundColor: projectColor(project.name, project.signatureColor).text }}
                />
                <div className="min-w-0">
                    <h2 className="text-2xl font-extrabold font-display text-yambo-black truncate">{project.name}</h2>
                    <p className="text-xs text-gray-400 font-medium">
                        {[project.season, project.active ? null : t("common.inactive")].filter(Boolean).join(" · ") || t("team.project")}
                    </p>
                </div>
            </div>

            <div className="mb-6 bg-gray-100/80 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
                <div className="flex gap-1 w-max">
                    {tabs.map((tab) => (
                        <NavLink
                            key={tab.href}
                            to={tab.href}
                            end
                            className={({ isActive }) =>
                                `flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                                    isActive
                                        ? "bg-white text-yambo-green-700 shadow-sm"
                                        : "text-gray-500 hover:text-yambo-green-600 hover:bg-white/50"
                                }`
                            }
                        >
                            <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
                            {tab.label}
                        </NavLink>
                    ))}
                </div>
            </div>

            {loading ? (
                <LoadingSpinner size="md" message={t("staff.loading")} />
            ) : error ? (
                <ErrorMessage message={error} onRetry={reload} />
            ) : (
                <Outlet context={context} />
            )}
        </section>
    );
}
