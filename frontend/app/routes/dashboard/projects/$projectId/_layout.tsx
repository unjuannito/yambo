import { useEffect, useState } from "react";
import { Outlet, NavLink, useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { projectService, type Project } from "~/services/projectService";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { PageContainer } from "~/components/common/PageContainer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faLayerGroup, faUserGear, faPeopleGroup } from "@fortawesome/free-solid-svg-icons";

const TABS = [
    { key: "equipos", label: "Equipos", icon: faLayerGroup, href: "equipos" },
    { key: "personal", label: "Personal", icon: faUserGear, href: "personal" },
    { key: "padres", label: "Padres", icon: faPeopleGroup, href: "padres" },
] as const;

export default function ProjectLayout() {
    const { t } = useTranslation();
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        projectService.getProject(projectId)
            .then(setProject)
            .catch(err => setError(err.message || "Error al cargar el proyecto"))
            .finally(() => setLoading(false));
    }, [projectId]);

    if (loading) {
        return (
            <PageContainer>
                <LoadingSpinner size="md" message="Cargando proyecto..." />
            </PageContainer>
        );
    }

    if (error || !project) {
        return (
            <PageContainer>
                <ErrorMessage message={error || "Proyecto no encontrado"} onRetry={() => navigate("/mi-espacio/proyectos")} />
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <button type="button"
                    onClick={() => navigate("/mi-espacio/proyectos")}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-yambo-green-50 hover:text-yambo-green-700 transition-colors"
                >
                    <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
                </button>
                <div>
                    <span className="text-xs text-gray-400 font-medium">Proyecto</span>
                    <h1 className="text-2xl font-extrabold font-display text-yambo-black">{project.name}</h1>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 mt-4 bg-gray-100/80 rounded-xl p-1 w-fit">
                {TABS.map(tab => (
                    <NavLink
                        key={tab.key}
                        to={tab.href}
                        end
                        className={({ isActive }) =>
                            `flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
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

            {/* Page content */}
            <Outlet />
        </PageContainer>
    );
}
