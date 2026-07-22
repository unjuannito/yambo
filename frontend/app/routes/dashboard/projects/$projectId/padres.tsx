import { useState, useCallback, useEffect } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { RequirePermission } from "~/components/common/RequirePermission";
import { parentInvitationService } from "~/services/parentInvitationService";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserGroup, faUserSlash, faTrashCan } from "@fortawesome/free-solid-svg-icons";

interface ParentInfo {
    userId: string;
    name: string;
    email: string;
}

export default function ProjectPadres() {
    const { t } = useTranslation();
    const { projectId } = useParams();
    const [projectName, setProjectName] = useState<string>("");
    const [parents, setParents] = useState<ParentInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [removing, setRemoving] = useState<string | null>(null);
    const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string } | null>(null);

    const loadParents = useCallback(async () => {
        if (!projectId) return;
        try {
            setLoading(true);
            setError(null);
            const data = await parentInvitationService.listParents();
            const thisProject = data.find(p => p.projectId === projectId);
            if (thisProject) {
                setProjectName(thisProject.projectName);
                setParents(thisProject.parents);
            } else {
                setProjectName("");
                setParents([]);
            }
        } catch (err) {
            setError(getErrorMessage(err, "Error al cargar padres"));
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { void loadParents(); }, [loadParents]);

    const handleRemoveConfirm = async () => {
        if (!projectId || !removeTarget) return;
        try {
            setRemoving(removeTarget.userId);
            setRemoveTarget(null);
            await parentInvitationService.removeParentRole(projectId, removeTarget.userId);
            toast.success(`${removeTarget.name} ya no tiene acceso como padre`);
            setParents(prev => prev.filter(p => p.userId !== removeTarget.userId));
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al eliminar padre"));
        } finally {
            setRemoving(null);
        }
    };

    const [showRemoveAll, setShowRemoveAll] = useState(false);

    const handleRemoveAllConfirm = async () => {
        if (!projectId) return;
        try {
            setShowRemoveAll(false);
            toast.success(await parentInvitationService.revokeAllParentRolesByProject(projectId));
            setParents([]);
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al eliminar padres"));
        }
    };

    if (loading) {
        return <LoadingSpinner size="md" message="Cargando padres..." />;
    }

    if (error) {
        return <ErrorMessage message={error} onRetry={loadParents} />;
    }

    if (parents.length === 0) {
        return (
            <RequirePermission permission={{ obj: "project", action: "read" }} redirect={false}>
                <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-yambo-green-50 flex items-center justify-center">
                        <FontAwesomeIcon icon={faUserGroup} className="text-2xl text-yambo-green-400" />
                    </div>
                    <h2 className="text-lg font-bold text-yambo-black mb-1">No hay padres asignados</h2>
                    <p className="text-sm text-gray-400">Los padres aceptan invitaciones desde el enlace que se genera en cada familia.</p>
                </div>
            </RequirePermission>
        );
    }

    return (
        <RequirePermission permission={{ obj: "project", action: "read" }} redirect={false}>
            <div className="space-y-4">
                <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-yambo-green-50/40 to-transparent border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-yambo-green-500/10 flex items-center justify-center">
                                <FontAwesomeIcon icon={faUserGroup} className="text-sm text-yambo-green-600" />
                            </div>
                            <h3 className="font-bold text-yambo-black">Padres del Proyecto</h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2.5 py-1 rounded-full">
                                {parents.length} padre{parents.length !== 1 ? "s" : ""}
                            </span>
                            {parents.length > 1 && (
                                <RequirePermission permission={{ obj: "invitation", action: "delete" }} redirect={false}>
                                    <button
                                        onClick={() => setShowRemoveAll(true)}
                                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
                                    >
                                        <FontAwesomeIcon icon={faTrashCan} className="mr-1" />
                                        Quitar todos
                                    </button>
                                </RequirePermission>
                            )}
                        </div>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {parents.map(parent => (
                            <div key={parent.userId} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700 shrink-0">
                                        {parent.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <Link
                                            to={`/mi-espacio/admin/usuarios/${parent.userId}/perfil`}
                                            className="text-sm font-medium text-yambo-black truncate hover:text-yambo-green-600 transition-colors"
                                        >
                                            {parent.name}
                                        </Link>
                                        <p className="text-xs text-gray-400 truncate">{parent.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setRemoveTarget({ userId: parent.userId, name: parent.name })}
                                    disabled={removing === parent.userId}
                                    className="text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0 ml-4 disabled:opacity-50"
                                >
                                    {removing === parent.userId ? "Eliminando..." : "Eliminar"}
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <ConfirmDialog
                isOpen={removeTarget !== null}
                onClose={() => setRemoveTarget(null)}
                onConfirm={handleRemoveConfirm}
                title="Eliminar padre"
                message={`¿Eliminar a ${removeTarget?.name} como padre de este proyecto?`}
                confirmLabel="Eliminar"
                variant="danger"
                isLoading={removing !== null}
            />

            <ConfirmDialog
                isOpen={showRemoveAll}
                onClose={() => setShowRemoveAll(false)}
                onConfirm={handleRemoveAllConfirm}
                title="Eliminar todos los padres"
                message={`¿Eliminar TODOS los padres de "${projectName}"?`}
                confirmLabel="Eliminar todos"
                variant="danger"
            />
        </RequirePermission>
    );
}
