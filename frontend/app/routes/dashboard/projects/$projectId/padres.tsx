import { useState, useCallback, useEffect } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { RequirePermission } from "~/components/common/RequirePermission";
import { projectRoleInvitationService, type ProjectRoleInvitation } from "~/services/projectRoleInvitationService";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { Modal } from "~/components/common/Modal";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserGroup, faUserSlash, faTrashCan, faLink, faCopy, faClockRotateLeft, faCircleCheck, faCircleXmark, faCircle } from "@fortawesome/free-solid-svg-icons";

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

    // Invite link modal state
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteUrl, setInviteUrl] = useState<string>("");
    const [inviteSaving, setInviteSaving] = useState(false);
    const [inviteCopied, setInviteCopied] = useState(false);
    const [inviteMaxUses, setInviteMaxUses] = useState<string>("");
    const [inviteExpiresAt, setInviteExpiresAt] = useState<string>("");

    // Previous invite links history
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [history, setHistory] = useState<ProjectRoleInvitation[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

    const formatDateTime = (value?: string | null) =>
        value ? new Date(value).toLocaleString() : "Sin expiración";

    const openHistory = async () => {
        if (!projectId) return;
        try {
            setHistoryLoading(true);
            setHistoryError(null);
            const data = await projectRoleInvitationService.getInvitations(projectId);
            setHistory(data);
            setIsHistoryOpen(true);
        } catch (err) {
            setHistoryError(getErrorMessage(err, "Error al cargar los enlaces"));
        } finally {
            setHistoryLoading(false);
        }
    };

    const closeHistory = () => {
        setIsHistoryOpen(false);
        setHistory([]);
        setHistoryError(null);
        setCopiedLinkId(null);
    };

    const copyHistoryLink = async (inv: ProjectRoleInvitation) => {
        try {
            await navigator.clipboard.writeText(inv.invitationLink);
            setCopiedLinkId(inv.id);
            toast.success("Enlace copiado al portapapeles");
            setTimeout(() => setCopiedLinkId(null), 2000);
        } catch {
            toast.error("No se pudo copiar el enlace");
        }
    };

    const loadParents = useCallback(async () => {
        if (!projectId) return;
        try {
            setLoading(true);
            setError(null);
            const data = await projectRoleInvitationService.listParents();
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
            await projectRoleInvitationService.removeParentRole(projectId, removeTarget.userId);
            toast.success(`${removeTarget.name} ya no tiene acceso como padre`);
            setParents(prev => prev.filter(p => p.userId !== removeTarget.userId));
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al eliminar padre"));
        } finally {
            setRemoving(null);
        }
    };

    const [showRemoveAll, setShowRemoveAll] = useState(false);

    const openInvite = () => {
        setInviteUrl("");
        setInviteCopied(false);
        setInviteMaxUses("");
        setInviteExpiresAt("");
        setIsInviteOpen(true);
    };

    const closeInvite = () => {
        setIsInviteOpen(false);
        setInviteUrl("");
        setInviteCopied(false);
        setInviteMaxUses("");
        setInviteExpiresAt("");
    };

    const generateInvite = async () => {
        if (!projectId) return;
        try {
            setInviteSaving(true);
            const result = await projectRoleInvitationService.createInvitation({
                projectId,
                role: "PARENT",
                maxUses: inviteMaxUses ? Number(inviteMaxUses) : undefined,
                expiresAt: inviteExpiresAt ? new Date(inviteExpiresAt).toISOString() : undefined,
            });
            setInviteUrl(result.invitationLink);
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al generar el enlace"));
        } finally {
            setInviteSaving(false);
        }
    };

    const copyInvite = async () => {
        if (!inviteUrl) return;
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setInviteCopied(true);
            toast.success("Enlace copiado al portapapeles");
            setTimeout(() => setInviteCopied(false), 3000);
        } catch {
            toast.error("No se pudo copiar el enlace");
        }
    };

    const handleRemoveAllConfirm = async () => {
        if (!projectId) return;
        try {
            setShowRemoveAll(false);
            toast.success(await projectRoleInvitationService.revokeAllParentRolesByProject(projectId));
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
                    <p className="text-sm text-gray-400 mb-4">Los padres aceptan acceso a través de un enlace de invitación.</p>
                    <RequirePermission permission={{ obj: "invitation", action: "create" }} redirect={false}>
                        <ButtonComponent variant="primary" onClick={openInvite}>
                            <FontAwesomeIcon icon={faLink} className="mr-2" />
                            Generar enlace de invitación
                        </ButtonComponent>
                    </RequirePermission>
                    <RequirePermission permission={{ obj: "invitation", action: "read" }} redirect={false}>
                        <ButtonComponent variant="neutral" onClick={openHistory}>
                            <FontAwesomeIcon icon={faClockRotateLeft} className="mr-2" />
                            Ver enlaces anteriores
                        </ButtonComponent>
                    </RequirePermission>
                </div>
                {renderInviteModal()}
                {renderHistoryModal()}
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
                            <RequirePermission permission={{ obj: "invitation", action: "create" }} redirect={false}>
                                <button type="button"
                                    onClick={openInvite}
                                    className="text-xs text-yambo-green-600 hover:text-yambo-green-700 transition-colors"
                                >
                                    <FontAwesomeIcon icon={faLink} className="mr-1" />
                                    Generar enlace
                                </button>
                            </RequirePermission>
                            <RequirePermission permission={{ obj: "invitation", action: "read" }} redirect={false}>
                                <button type="button"
                                    onClick={openHistory}
                                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    <FontAwesomeIcon icon={faClockRotateLeft} className="mr-1" />
                                    Enlaces anteriores
                                </button>
                            </RequirePermission>
                            {parents.length > 1 && (
                                <RequirePermission permission={{ obj: "invitation", action: "delete" }} redirect={false}>
                                    <button type="button"
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
                                <button type="button"
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

            {renderInviteModal()}
            {renderHistoryModal()}
        </RequirePermission>
    );

    function renderHistoryModal() {
        return (
            <Modal
                isOpen={isHistoryOpen}
                onClose={closeHistory}
                title={`Enlaces de invitación anteriores — ${projectName || ""}`}
                size="lg"
            >
                {historyLoading ? (
                    <LoadingSpinner size="md" message="Cargando enlaces..." />
                ) : historyError ? (
                    <ErrorMessage message={historyError} onRetry={openHistory} />
                ) : history.length === 0 ? (
                    <p className="text-sm text-gray-400 italic text-center py-8">
                        No hay enlaces anteriores para este proyecto.
                    </p>
                ) : (
                    <div className="flex flex-col divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
                        {history.map(inv => {
                            const statusIcon = inv.used
                                ? { icon: faCircleCheck, cls: "text-yambo-green-600", label: "Usado" }
                                : inv.expired || inv.disabled
                                    ? { icon: faCircleXmark, cls: "text-red-400", label: inv.expired ? "Expirado" : "Deshabilitado" }
                                    : { icon: faCircle, cls: "text-blue-400", label: "Activo" };
                            return (
                                <div key={inv.id} className="py-3">
                                    <div className="flex items-center justify-between gap-3 mb-1.5">
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span className="inline-flex items-center gap-1 font-medium">
                                                <FontAwesomeIcon icon={statusIcon.icon} className={statusIcon.cls} />
                                                {statusIcon.label}
                                            </span>
                                            <span>· Creado {formatDateTime(inv.createdAt)}</span>
                                            <span>· Expira {formatDateTime(inv.expiresAt)}</span>
                                            <span>· Usos: {inv.usageCount}{inv.maxUses ? `/${inv.maxUses}` : ""}</span>
                                        </div>
                                        <ButtonComponent
                                            variant="base"
                                            onClick={() => copyHistoryLink(inv)}
                                            className="text-xs shrink-0"
                                        >
                                            <FontAwesomeIcon icon={faCopy} className="mr-1" />
                                            {copiedLinkId === inv.id ? "¡Copiado!" : "Copiar"}
                                        </ButtonComponent>
                                    </div>
                                    <p className="text-xs text-yambo-green-700 break-all font-mono bg-yambo-green-50 border border-yambo-green-100 rounded-lg px-2.5 py-1.5">
                                        {inv.invitationLink}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Modal>
        );
    }

    function renderInviteModal() {
        return (
            <Modal
                isOpen={isInviteOpen}
                onClose={closeInvite}
                title="Invitación para padres"
                size="sm"
            >
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-gray-600">
                        Genera un enlace para que padres/madres del proyecto {projectName || ""} puedan registrarse y acceder a los drops disponibles para este proyecto.
                    </p>
                    {!inviteUrl ? (
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <InputComponent
                                    type="number"
                                    min={1}
                                    label="Máximo de usos (opcional)"
                                    value={inviteMaxUses}
                                    onChange={(e) => setInviteMaxUses(e.target.value)}
                                    placeholder="Sin límite"
                                />
                                <InputComponent
                                    type="datetime-local"
                                    label="Fecha de expiración (opcional)"
                                    value={inviteExpiresAt}
                                    onChange={(e) => setInviteExpiresAt(e.target.value)}
                                />
                            </div>
                            <ButtonComponent
                                variant="primary"
                                onClick={generateInvite}
                                isLoading={inviteSaving}
                                disabled={inviteSaving}
                                className="w-full"
                            >
                                <FontAwesomeIcon icon={faLink} className="mr-2" />
                                Generar enlace de invitación
                            </ButtonComponent>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="bg-yambo-green-50 border border-yambo-green-200 rounded-xl p-3">
                                <p className="text-xs text-yambo-green-600 font-medium mb-1">Enlace de invitación</p>
                                <p className="text-sm text-yambo-green-800 break-all font-mono">
                                    {inviteUrl}
                                </p>
                            </div>
                            <ButtonComponent variant="primary" onClick={copyInvite} className="w-full">
                                <FontAwesomeIcon icon={faCopy} className="mr-2" />
                                {inviteCopied ? "¡Copiado!" : "Copiar enlace"}
                            </ButtonComponent>
                            <p className="text-xs text-gray-400 text-center">
                                Comparte este enlace con los padres para que puedan registrarse.
                            </p>
                        </div>
                    )}
                </div>
            </Modal>
        );
    }
}
