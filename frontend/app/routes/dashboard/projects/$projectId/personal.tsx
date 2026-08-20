import { useState, useCallback, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { RequirePermission } from "~/components/common/RequirePermission";
import { projectService } from "~/services/projectService";
import { adminUserService } from "~/services/adminUserService";
import type { User } from "~/types/userType";
import type { GroupRole } from "~/types/role";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import { Modal } from "~/components/common/Modal";
import { projectRoleInvitationService } from "~/services/projectRoleInvitationService";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserPlus, faMagnifyingGlass, faCrown, faUserTie, faLink, faCopy } from "@fortawesome/free-solid-svg-icons";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";

export default function ProjectPersonal() {
    const { t } = useTranslation();
    const { projectId } = useParams();
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Add modal
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [addRole, setAddRole] = useState<GroupRole>("MONITOR");
    const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string; role: GroupRole } | null>(null);
    const [removing, setRemoving] = useState(false);

    // Invite link mode
    const [addMode, setAddMode] = useState<"existing" | "invite">("existing");
    const [inviteUrl, setInviteUrl] = useState<string>("");
    const [inviteSaving, setInviteSaving] = useState(false);
    const [inviteCopied, setInviteCopied] = useState(false);
    const [inviteMaxUses, setInviteMaxUses] = useState<string>("");
    const [inviteExpiresAt, setInviteExpiresAt] = useState<string>("");

    const loadData = useCallback(async () => {
        if (!projectId) return;
        try {
            setLoading(true);
            setError(null);
            const res = await adminUserService.listUsers({ role: "ANY", page: 0, size: 500 });
            setAllUsers(res.content);
        } catch (err) {
            setError(getErrorMessage(err, "Error al cargar personal"));
        } finally {
            setLoading(false);
        }
    }, [projectId, refreshKey]);

    useEffect(() => { void loadData(); }, [loadData]);

    // Filter users by this project
    const coordinators = useMemo(() =>
        allUsers.filter(u => u.groupRoles?.some(gr => gr.role === "COORDINATOR" && gr.projectId === projectId) ?? false),
        [allUsers, projectId]
    );

    const monitors = useMemo(() =>
        allUsers.filter(u => u.groupRoles?.some(gr => gr.role === "MONITOR" && gr.projectId === projectId) ?? false),
        [allUsers, projectId]
    );

    // Search users for adding
    useEffect(() => {
        const trimmed = searchQuery.trim();
        if (!trimmed) { setSearchResults([]); return; }
        setSearching(true);
        const timer = setTimeout(async () => {
            try {
                const res = await adminUserService.listUsers({ query: trimmed, page: 0, size: 10 });
                setSearchResults(res.content);
            } catch (err) {
                toast.error(getErrorMessage(err, "Error al buscar usuarios"));
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Get the default project group ID for this project (for COORDINATOR assignment)
    const getDefaultGroupId = useCallback(async (): Promise<string> => {
        if (!projectId) throw new Error("No project ID");
        const groups = await projectService.listGroups(projectId);
        const defaultGroup = groups.find(g => !g.name);
        if (defaultGroup) return defaultGroup.id;
        // Create it if it doesn't exist
        const created = await projectService.createGroup(projectId, null);
        return created.id;
    }, [projectId]);

    const handleRemove = (userId: string, name: string, role: GroupRole) => {
        if (!projectId) return;
        setRemoveTarget({ userId, name, role });
    };

    const handleRemoveConfirm = async () => {
        if (!projectId || !removeTarget) return;
        const { userId, name, role } = removeTarget;
        const roleLabel = role === "COORDINATOR" ? "coordinador" : "monitor";
        setRemoving(true);
        setRemoveTarget(null);
        try {
            // Find the group ID for this role
            const groups = await projectService.listGroups(projectId);
            // For COORDINATOR: always the default (unnamed) group
            // For MONITOR: find the specific group
            let groupId: string | null = null;
            const user = allUsers.find(u => u.id === userId);
            if (user) {
                const matching = user.groupRoles?.find(gr =>
                    gr.role === role && gr.projectId === projectId
                );
                if (matching) groupId = matching.groupId;
            }
            if (!groupId) {
                // Fallback: use default group
                const defaultGrp = groups.find(g => !g.name);
                if (defaultGrp) groupId = defaultGrp.id;
            }
            if (!groupId) throw new Error("No se encontró el grupo");
            await adminUserService.removeGroupRole(userId, groupId, role);
            setAllUsers(prev => prev.map(u =>
                u.id === userId
                    ? { ...u, groupRoles: u.groupRoles?.filter(gr => !(gr.groupId === groupId && gr.role === role)) }
                    : u
            ));
            toast.success(`${name} ya no es ${roleLabel}`);
        } catch (err) {
            toast.error(getErrorMessage(err, `Error al quitar ${roleLabel}`));
        } finally {
            setRemoving(false);
        }
    };

    const handleAdd = async () => {
        if (!selectedUser || !projectId) return;
        try {
            const groupId = await getDefaultGroupId();
            await adminUserService.assignGroupRole(selectedUser.id, groupId, addRole);
            const roleLabel = addRole === "COORDINATOR" ? "Coordinador" : "Monitor";
            toast.success(`${selectedUser.name} añadido como ${roleLabel}`);
            resetAdd();
            setRefreshKey(k => k + 1);
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al añadir personal"));
        }
    };

    const resetAdd = () => {
        setIsAddOpen(false);
        setSearchQuery("");
        setSearchResults([]);
        setSelectedUser(null);
        setAddRole("MONITOR");
        setAddMode("existing");
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
                role: addRole,
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

    if (loading) {
        return <LoadingSpinner size="md" message="Cargando personal..." />;
    }

    if (error) {
        return <ErrorMessage message={error} onRetry={loadData} />;
    }

    return (
        <RequirePermission permission={{ obj: "project", action: "read" }} redirect={false}>
            <div className="space-y-6">
                {/* Coordinators */}
                <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-yambo-purple-50/60 to-transparent border-b border-gray-100">
                        <div className="w-8 h-8 rounded-lg bg-yambo-purple-500/10 flex items-center justify-center">
                            <FontAwesomeIcon icon={faCrown} className="text-sm text-yambo-purple-600" />
                        </div>
                        <h2 className="font-bold text-yambo-black">Coordinadores</h2>
                        <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2.5 py-1 rounded-full ml-auto">
                            {coordinators.length}
                        </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {coordinators.length > 0 ? coordinators.map(user => (
                            <div key={user.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-full bg-yambo-purple-100 flex items-center justify-center text-sm font-bold text-yambo-purple-700 shrink-0">
                                        {user.photo
                                            ? <img src={user.photo} alt={user.name} className="w-full h-full rounded-full object-cover" />
                                            : user.name.charAt(0).toUpperCase()
                                        }
                                    </div>
                                    <div className="min-w-0">
                                        <Link
                                            to={`/mi-espacio/admin/usuarios/${user.id}/perfil`}
                                            className="text-sm font-medium text-yambo-black truncate hover:text-yambo-green-600 transition-colors"
                                        >
                                            {user.name}
                                        </Link>
                                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                    </div>
                                </div>
                                <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                                    <button
                                        onClick={() => handleRemove(user.id, user.name, "COORDINATOR")}
                                        className="text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0 ml-4"
                                    >
                                        Quitar
                                    </button>
                                </RequirePermission>
                            </div>
                        )) : (
                            <p className="text-sm text-gray-400 italic px-5 py-4">Sin coordinadores asignados</p>
                        )}
                    </div>
                </section>

                {/* Monitors */}
                <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-yambo-green-50/60 to-transparent border-b border-gray-100">
                        <div className="w-8 h-8 rounded-lg bg-yambo-green-500/10 flex items-center justify-center">
                            <FontAwesomeIcon icon={faUserTie} className="text-sm text-yambo-green-600" />
                        </div>
                        <h2 className="font-bold text-yambo-black">Monitores</h2>
                        <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2.5 py-1 rounded-full ml-auto">
                            {monitors.length}
                        </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {monitors.length > 0 ? monitors.map(user => (
                            <div key={user.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-full bg-yambo-green-100 flex items-center justify-center text-sm font-bold text-yambo-green-700 shrink-0">
                                        {user.photo
                                            ? <img src={user.photo} alt={user.name} className="w-full h-full rounded-full object-cover" />
                                            : user.name.charAt(0).toUpperCase()
                                        }
                                    </div>
                                    <div className="min-w-0">
                                        <Link
                                            to={`/mi-espacio/admin/usuarios/${user.id}/perfil`}
                                            className="text-sm font-medium text-yambo-black truncate hover:text-yambo-green-600 transition-colors"
                                        >
                                            {user.name}
                                        </Link>
                                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                    </div>
                                </div>
                                <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                                    <button
                                        onClick={() => handleRemove(user.id, user.name, "MONITOR")}
                                        className="text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0 ml-4"
                                    >
                                        Quitar
                                    </button>
                                </RequirePermission>
                            </div>
                        )) : (
                            <p className="text-sm text-gray-400 italic px-5 py-4">Sin monitores asignados</p>
                        )}
                    </div>
                </section>

                {/* Empty state for both */}
                {coordinators.length === 0 && monitors.length === 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-yambo-green-50 flex items-center justify-center">
                            <FontAwesomeIcon icon={faUserTie} className="text-xl text-yambo-green-400" />
                        </div>
                        <h2 className="text-lg font-bold text-yambo-black mb-1">Este proyecto no tiene personal</h2>
                        <p className="text-sm text-gray-400">Añade coordinadores y monitores al proyecto</p>
                    </div>
                )}

                {/* Add button */}
                <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                    <div className="flex justify-center">
                        <ButtonComponent variant="primary" onClick={() => setIsAddOpen(true)}>
                            <FontAwesomeIcon icon={faUserPlus} className="w-4 h-4 mr-1.5" />
                            Añadir Personal
                        </ButtonComponent>
                    </div>
                </RequirePermission>

                {/* Add Modal */}
                <Modal
                    isOpen={isAddOpen}
                    onClose={resetAdd}
                    title="Añadir Personal"
                    size="md"
                    footer={
                        addMode === "existing" ? (
                            <>
                                <ButtonComponent onClick={resetAdd} variant="neutral">
                                    Cancelar
                                </ButtonComponent>
                                <ButtonComponent onClick={handleAdd} variant="primary" disabled={!selectedUser}>
                                    Añadir
                                </ButtonComponent>
                            </>
                        ) : (
                            <ButtonComponent onClick={resetAdd} variant="neutral">
                                Cerrar
                            </ButtonComponent>
                        )
                    }
                >
                    <div className="flex flex-col gap-4">
                        {/* Mode toggle */}
                        <div className="flex gap-2 border-b border-gray-100 pb-3">
                            <button
                                onClick={() => setAddMode("existing")}
                                className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${addMode === "existing" ? "bg-yambo-green-50 text-yambo-green-700" : "text-gray-400 hover:text-gray-600"}`}
                            >
                                Añadir existente
                            </button>
                            <button
                                onClick={() => setAddMode("invite")}
                                className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${addMode === "invite" ? "bg-yambo-green-50 text-yambo-green-700" : "text-gray-400 hover:text-gray-600"}`}
                            >
                                Generar enlace de invitación
                            </button>
                        </div>

                        {addMode === "existing" ? (
                        <>
                        {/* Search */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar usuario</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Escriba para buscar..."
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 focus:border-yambo-green-500"
                                />
                                <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Buscando...</span>}
                            </div>
                        </div>

                        {/* Results */}
                        {searchResults.length > 0 && (
                            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl divide-y">
                                {searchResults.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => setSelectedUser(user)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-yambo-green-50/30 transition-colors ${selectedUser?.id === user.id ? "bg-yambo-green-50" : ""}`}
                                    >
                                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                                            {user.photo ? <img src={user.photo} alt={user.name} className="w-full h-full rounded-full object-cover" /> : user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium">{user.name}</span>
                                        <span className="text-gray-400 text-xs ml-auto">{user.email}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Selected user */}
                        {selectedUser && (
                            <div className="bg-yambo-green-50 border border-yambo-green-200 rounded-xl px-3 py-2 text-sm flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-yambo-green-200 flex items-center justify-center text-xs font-bold text-yambo-green-700 shrink-0">
                                    {selectedUser.name.charAt(0).toUpperCase()}
                                </div>
                                <strong>{selectedUser.name}</strong>
                                <span className="text-gray-400">({selectedUser.email})</span>
                            </div>
                        )}

                        {/* Role selector */}
                        {selectedUser && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                                <select
                                    value={addRole}
                                    onChange={e => setAddRole(e.target.value as GroupRole)}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 focus:border-yambo-green-500"
                                >
                                    <option value="MONITOR">Monitor</option>
                                    <option value="COORDINATOR">Coordinador</option>
                                </select>
                            </div>
                        )}
                        </>
                        ) : (
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                                <select
                                    value={addRole}
                                    onChange={e => setAddRole(e.target.value as GroupRole)}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 focus:border-yambo-green-500"
                                >
                                    <option value="MONITOR">Monitor</option>
                                    <option value="COORDINATOR">Coordinador</option>
                                </select>
                            </div>
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
                                </div>
                            )}
                        </div>
                        )}
                    </div>
                </Modal>
            </div>

            <ConfirmDialog
                isOpen={removeTarget !== null}
                onClose={() => setRemoveTarget(null)}
                onConfirm={handleRemoveConfirm}
                title="Quitar personal"
                message={`¿Quitar a ${removeTarget?.name} como ${removeTarget?.role === "COORDINATOR" ? "coordinador" : "monitor"}?`}
                confirmLabel="Quitar"
                variant="danger"
                isLoading={removing}
            />
        </RequirePermission>
    );
}
