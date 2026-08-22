import { useState, useCallback, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { RequirePermission } from "~/components/common/RequirePermission";
import { projectService, type ProjectGroup } from "~/services/projectService";
import { adminUserService } from "~/services/adminUserService";
import type { User, UserGroupRole } from "~/types/userType";
import type { GroupRole } from "~/types/role";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { Modal } from "~/components/common/Modal";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faTrashCan, faPlus, faSave, faXmark, faLayerGroup, faUserPlus, faMagnifyingGlass, faArrowRightArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";

interface GroupWithMonitors {
    group: ProjectGroup;
    monitors: User[];
}

export default function ProjectEquipos() {
    const { t } = useTranslation();
    const { projectId } = useParams();
    const [groups, setGroups] = useState<ProjectGroup[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // New group
    const [newGroupName, setNewGroupName] = useState("");
    const [savingGroup, setSavingGroup] = useState(false);

    // Edit group
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editingGroupName, setEditingGroupName] = useState("");

    type ConfirmAction =
        | { type: "deleteGroup"; groupId: string; groupName: string | null }
        | { type: "removeMonitor"; userId: string; groupId: string; name: string }
        | null;

    const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
    const [confirmLoading, setConfirmLoading] = useState(false);

    // Add monitor to a team
    const [addTargetGroup, setAddTargetGroup] = useState<{
        id: string;
        name: string | null;
    } | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [addingMonitor, setAddingMonitor] = useState(false);

    // Move monitor between teams
    const [moveTarget, setMoveTarget] = useState<{
        userId: string;
        name: string;
        fromGroupId: string;
        fromGroupName: string | null;
    } | null>(null);
    const [moving, setMoving] = useState(false);

    const loadData = useCallback(async () => {
        if (!projectId) return;
        try {
            setLoading(true);
            setError(null);
            const [groupsData, usersData] = await Promise.all([
                projectService.listGroups(projectId),
                adminUserService.listUsers({ role: "ANY", page: 0, size: 500 }),
            ]);
            setGroups(groupsData);
            setAllUsers(usersData.content);
        } catch (err) {
            setError(getErrorMessage(err, "Error al cargar equipos"));
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { void loadData(); }, [loadData]);

    // Search users for adding to a team
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

    // Filter monitors per group — only users with MONITOR role in this project
    const groupsWithMonitors = useMemo((): GroupWithMonitors[] => {
        return groups.map(group => ({
            group,
            monitors: allUsers.filter(user =>
                user.groupRoles?.some(gr =>
                    gr.groupId === group.id && gr.role === "MONITOR"
                ) ?? false
            ),
        }));
    }, [groups, allUsers]);

    const handleAddGroup = async () => {
        if (!projectId || !newGroupName.trim()) return;
        try {
            setSavingGroup(true);
            const created = await projectService.createGroup(projectId, newGroupName.trim());
            setGroups(prev => [...prev, created]);
            setNewGroupName("");
            toast.success("Equipo creado");
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al crear equipo"));
        } finally {
            setSavingGroup(false);
        }
    };

    const handleUpdateGroup = async (groupId: string) => {
        if (!projectId || !editingGroupName.trim()) return;
        try {
            setSavingGroup(true);
            const updated = await projectService.updateGroup(projectId, groupId, editingGroupName.trim());
            setGroups(prev => prev.map(g => g.id === groupId ? updated : g));
            setEditingGroupId(null);
            setEditingGroupName("");
            toast.success("Equipo renombrado");
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al renombrar equipo"));
        } finally {
            setSavingGroup(false);
        }
    };

    const handleDeleteGroup = (groupId: string, groupName: string | null) => {
        if (!projectId) return;
        setConfirmAction({ type: "deleteGroup", groupId, groupName });
    };

    const handleDeleteGroupConfirm = async () => {
        if (!projectId || !confirmAction || confirmAction.type !== "deleteGroup") return;
        const { groupId, groupName } = confirmAction;
        setConfirmLoading(true);
        setConfirmAction(null);
        try {
            await projectService.deleteGroup(projectId, groupId);
            setGroups(prev => prev.filter(g => g.id !== groupId));
            toast.success("Equipo eliminado");
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al eliminar equipo"));
        } finally {
            setConfirmLoading(false);
        }
    };

    const handleRemoveMonitor = (userId: string, groupId: string, name: string) => {
        setConfirmAction({ type: "removeMonitor", userId, groupId, name });
    };

    const handleRemoveMonitorConfirm = async () => {
        if (!projectId || !confirmAction || confirmAction.type !== "removeMonitor") return;
        const { userId, groupId, name } = confirmAction;
        setConfirmLoading(true);
        setConfirmAction(null);
        try {
            await adminUserService.removeGroupRole(userId, groupId, "MONITOR");
            setAllUsers(prev =>
                prev.map(u => u.id === userId
                    ? { ...u, groupRoles: u.groupRoles?.filter(gr => !(gr.groupId === groupId && gr.role === "MONITOR")) }
                    : u
                )
            );
            toast.success(`${name} ya no es monitor de este equipo`);
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al quitar monitor"));
        } finally {
            setConfirmLoading(false);
        }
    };

    // ── Add monitor to a team ──
    const openAddMonitor = (groupId: string, groupName: string | null) => {
        setAddTargetGroup({ id: groupId, name: groupName });
        setSearchQuery("");
        setSearchResults([]);
        setSelectedUser(null);
    };

    const resetAddMonitor = () => {
        setAddTargetGroup(null);
        setSearchQuery("");
        setSearchResults([]);
        setSelectedUser(null);
        setAddingMonitor(false);
    };

    const handleAddMonitorConfirm = async () => {
        if (!addTargetGroup || !selectedUser) return;
        try {
            setAddingMonitor(true);
            await adminUserService.assignGroupRole(selectedUser.id, addTargetGroup.id, "MONITOR");
            toast.success(`${selectedUser.name} añadido como monitor de ${addTargetGroup.name || "este equipo"}`);
            resetAddMonitor();
            await loadData();
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al añadir monitor"));
            setAddingMonitor(false);
        }
    };

    // ── Move monitor between teams ──
    const openMoveMonitor = (
        userId: string,
        name: string,
        fromGroupId: string,
        fromGroupName: string | null,
    ) => {
        setMoveTarget({ userId, name, fromGroupId, fromGroupName });
    };

    const moveOptions = useMemo(() => {
        if (!moveTarget) return [];
        return groups.filter(g => g.id !== moveTarget.fromGroupId);
    }, [groups, moveTarget]);

    const handleMoveMonitorConfirm = async (targetGroup: ProjectGroup) => {
        if (!moveTarget) return;
        try {
            setMoving(true);
            await adminUserService.removeGroupRole(moveTarget.userId, moveTarget.fromGroupId, "MONITOR");
            await adminUserService.assignGroupRole(moveTarget.userId, targetGroup.id, "MONITOR");
            toast.success(`${moveTarget.name} movido a ${targetGroup.name || "Sin equipo"}`);
            setMoveTarget(null);
            setMoving(false);
            await loadData();
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al mover monitor"));
            setMoving(false);
        }
    };

    if (loading) {
        return <LoadingSpinner size="md" message="Cargando equipos..." />;
    }

    if (error) {
        return <ErrorMessage message={error} onRetry={loadData} />;
    }

    // Separate default group (name=null) from named groups
    const defaultGroup = groupsWithMonitors.find(g => !g.group.name);
    const namedGroups = groupsWithMonitors.filter(g => g.group.name);

    return (
        <RequirePermission permission={{ obj: "project", action: "read" }} redirect={false}>
            <div className="space-y-4">
                {/* Named groups */}
                {namedGroups.map(({ group, monitors }) => (
                    <div key={group.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-yambo-green-50/40 to-transparent border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-yambo-green-500/10 flex items-center justify-center">
                                    <span className="text-sm font-bold text-yambo-green-600">{group.name?.charAt(0).toUpperCase()}</span>
                                </div>
                                {editingGroupId === group.id ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={editingGroupName}
                                            onChange={e => setEditingGroupName(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === "Enter") handleUpdateGroup(group.id);
                                                if (e.key === "Escape") { setEditingGroupId(null); setEditingGroupName(""); }
                                            }}
                                            className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-yambo-green-500"
                                            autoFocus
                                        />
                                        <button type="button" onClick={() => handleUpdateGroup(group.id)} className="text-yambo-green-600 hover:text-yambo-green-700">
                                            <FontAwesomeIcon icon={faSave} className="w-3.5 h-3.5" />
                                        </button>
                                        <button type="button" onClick={() => { setEditingGroupId(null); setEditingGroupName(""); }} className="text-gray-400 hover:text-gray-600">
                                            <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <h3 className="font-bold text-yambo-black">{group.name}</h3>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2.5 py-1 rounded-full">
                                    {monitors.length} monitor{monitors.length !== 1 ? "es" : ""}
                                </span>
                                <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                                    <button type="button"
                                        onClick={() => openAddMonitor(group.id, group.name)}
                                        className="text-gray-400 hover:text-yambo-green-600 transition-colors"
                                        title="Añadir monitor"
                                    >
                                        <FontAwesomeIcon icon={faUserPlus} className="w-3.5 h-3.5" />
                                    </button>
                                </RequirePermission>
                                <RequirePermission permission={{ obj: "project", action: "update" }} redirect={false}>
                                    {editingGroupId !== group.id && (
                                        <>
                                            <button type="button"
                                                onClick={() => { setEditingGroupId(group.id); setEditingGroupName(group.name ?? ""); }}
                                                className="text-gray-400 hover:text-yambo-green-600 transition-colors"
                                                title="Renombrar"
                                            >
                                                <FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5" />
                                            </button>
                                            <button type="button"
                                                onClick={() => handleDeleteGroup(group.id, group.name)}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                                title="Eliminar equipo"
                                            >
                                                <FontAwesomeIcon icon={faTrashCan} className="w-3.5 h-3.5" />
                                            </button>
                                        </>
                                    )}
                                </RequirePermission>
                            </div>
                        </div>
                        <div className="px-5 py-3">
                            {monitors.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {monitors.map(monitor => (
                                        <div key={monitor.id} className="flex items-center gap-2 px-3 py-1.5 bg-yambo-green-50 border border-yambo-green-200 rounded-full text-sm">
                                            {monitor.photo && (
                                                <img src={monitor.photo} alt={monitor.name} className="w-5 h-5 rounded-full object-cover" />
                                            )}
                                            <Link
                                            to={`/mi-espacio/admin/usuarios/${monitor.id}/perfil`}
                                            className="text-yambo-green-700 font-medium hover:text-yambo-green-800 hover:underline"
                                        >
                                            {monitor.name}
                                        </Link>
                                            <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                                                <button type="button"
                                                    onClick={() => openMoveMonitor(monitor.id, monitor.name, group.id, group.name)}
                                                    className="text-gray-400 hover:text-yambo-green-600 transition-colors"
                                                    title="Mover a otro equipo"
                                                >
                                                    <FontAwesomeIcon icon={faArrowRightArrowLeft} className="w-3 h-3" />
                                                </button>
                                                <button type="button"
                                                    onClick={() => handleRemoveMonitor(monitor.id, group.id, monitor.name)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors ml-1"
                                                    title="Quitar monitor"
                                                >
                                                    <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
                                                </button>
                                            </RequirePermission>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic">Sin monitores asignados</p>
                            )}
                        </div>
                    </div>
                ))}

                {/* Default group (unnamed — project-level) */}
                {defaultGroup && defaultGroup.monitors.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-gray-50 to-transparent border-b border-gray-100">
                            <h3 className="font-bold text-gray-500 text-sm">Sin equipo asignado</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2.5 py-1 rounded-full">
                                    {defaultGroup.monitors.length} monitor{defaultGroup.monitors.length !== 1 ? "es" : ""}
                                </span>
                                <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                                    <button type="button"
                                        onClick={() => openAddMonitor(defaultGroup.group.id, defaultGroup.group.name)}
                                        className="text-gray-400 hover:text-yambo-green-600 transition-colors"
                                        title="Añadir monitor"
                                    >
                                        <FontAwesomeIcon icon={faUserPlus} className="w-3.5 h-3.5" />
                                    </button>
                                </RequirePermission>
                            </div>
                        </div>
                        <div className="px-5 py-3">
                            <div className="flex flex-wrap gap-2">
                                {defaultGroup.monitors.map(monitor => (
                                    <div key={monitor.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm">
                                        {monitor.photo && (
                                            <img src={monitor.photo} alt={monitor.name} className="w-5 h-5 rounded-full object-cover" />
                                        )}
                                        <Link
                                            to={`/mi-espacio/admin/usuarios/${monitor.id}/perfil`}
                                            className="text-gray-600 font-medium hover:text-yambo-green-600 hover:underline"
                                        >
                                            {monitor.name}
                                        </Link>
                                        <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                                            <button type="button"
                                                onClick={() => openMoveMonitor(monitor.id, monitor.name, defaultGroup.group.id, defaultGroup.group.name)}
                                                className="text-gray-400 hover:text-yambo-green-600 transition-colors"
                                                title="Mover a otro equipo"
                                            >
                                                <FontAwesomeIcon icon={faArrowRightArrowLeft} className="w-3 h-3" />
                                            </button>
                                            <button type="button"
                                                onClick={() => handleRemoveMonitor(monitor.id, defaultGroup.group.id, monitor.name)}
                                                className="text-gray-400 hover:text-red-500 transition-colors ml-1"
                                                title="Quitar monitor"
                                            >
                                                <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
                                            </button>
                                        </RequirePermission>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {namedGroups.length === 0 && (!defaultGroup || defaultGroup.monitors.length === 0) && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-yambo-green-50 flex items-center justify-center">
                            <FontAwesomeIcon icon={faLayerGroup as any} className="text-xl text-yambo-green-400" />
                        </div>
                        <h2 className="text-lg font-bold text-yambo-black mb-1">No hay equipos</h2>
                        <p className="text-sm text-gray-400">Crea equipos para organizar a los monitores</p>
                    </div>
                )}

                {/* Add new group */}
                <RequirePermission permission={{ obj: "project", action: "update" }} redirect={false}>
                    <div className="flex gap-2 bg-white rounded-2xl border border-gray-100 p-4">
                        <input
                            type="text"
                            className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 focus:border-yambo-green-500"
                            placeholder="Nombre del nuevo equipo..."
                            value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleAddGroup(); }}
                        />
                        <ButtonComponent variant="primary" onClick={handleAddGroup} disabled={savingGroup || !newGroupName.trim()}>
                            <FontAwesomeIcon icon={faPlus} className="w-4 h-4 mr-1.5" />
                            Añadir equipo
                        </ButtonComponent>
                    </div>
                </RequirePermission>
            </div>

            <ConfirmDialog
                isOpen={confirmAction?.type === "deleteGroup"}
                onClose={() => setConfirmAction(null)}
                onConfirm={handleDeleteGroupConfirm}
                title="Eliminar equipo"
                message={`¿Eliminar el equipo "${confirmAction?.type === "deleteGroup" ? (confirmAction.groupName || "sin nombre") : ""}"?`}
                confirmLabel="Eliminar"
                variant="danger"
                isLoading={confirmLoading}
            />

            <ConfirmDialog
                isOpen={confirmAction?.type === "removeMonitor"}
                onClose={() => setConfirmAction(null)}
                onConfirm={handleRemoveMonitorConfirm}
                title="Quitar monitor"
                message={`¿Quitar a ${confirmAction?.type === "removeMonitor" ? confirmAction.name : ""} de este equipo?`}
                confirmLabel="Quitar"
                variant="danger"
                isLoading={confirmLoading}
            />

            {/* Add monitor modal */}
            <Modal
                isOpen={!!addTargetGroup}
                onClose={resetAddMonitor}
                title={addTargetGroup?.name ? `Añadir monitor a «${addTargetGroup.name}»` : "Añadir monitor"}
                size="md"
                footer={
                    <>
                        <ButtonComponent onClick={resetAddMonitor} variant="neutral">
                            Cancelar
                        </ButtonComponent>
                        <ButtonComponent
                            onClick={handleAddMonitorConfirm}
                            variant="primary"
                            disabled={!selectedUser || addingMonitor}
                            isLoading={addingMonitor}
                        >
                            Añadir
                        </ButtonComponent>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
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

                    {searchResults.length > 0 && (
                        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-50">
                            {searchResults.map(user => {
                                const alreadyMonitor = user.groupRoles?.some(
                                    gr => gr.groupId === addTargetGroup?.id && gr.role === "MONITOR"
                                ) ?? false;
                                return (
                                    <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => !alreadyMonitor && setSelectedUser(user)}
                                        disabled={alreadyMonitor}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                                            alreadyMonitor
                                                ? "opacity-50 cursor-not-allowed"
                                                : "hover:bg-yambo-green-50/30"
                                        } ${selectedUser?.id === user.id ? "bg-yambo-green-50" : ""}`}
                                    >
                                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                                            {user.photo
                                                ? <img src={user.photo} alt={user.name} className="w-full h-full rounded-full object-cover" />
                                                : user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium truncate">{user.name}</span>
                                        <span className="text-gray-400 text-xs ml-auto truncate max-w-[140px]">{user.email}</span>
                                        {alreadyMonitor && <span className="text-[10px] text-yambo-green-600 shrink-0">Ya es monitor</span>}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {selectedUser && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-yambo-green-50 rounded-xl text-sm">
                            <span className="text-gray-500">Seleccionado:</span>
                            <span className="font-medium text-yambo-green-700 truncate">{selectedUser.name}</span>
                            <span className="text-gray-400 text-xs ml-auto truncate max-w-[160px]">{selectedUser.email}</span>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Move monitor modal */}
            <Modal
                isOpen={!!moveTarget}
                onClose={() => setMoveTarget(null)}
                title={moveTarget ? `Mover a ${moveTarget.name}` : "Mover monitor"}
                size="sm"
            >
                <div className="space-y-2">
                    <p className="text-sm text-gray-500">
                        Elige el equipo de destino para <strong className="text-yambo-black">{moveTarget?.name}</strong>.
                    </p>
                    {moveOptions.length === 0 ? (
                        <p className="text-sm text-gray-400 py-4 text-center">No hay otros equipos disponibles</p>
                    ) : (
                        moveOptions.map(group => (
                            <button
                                key={group.id}
                                type="button"
                                onClick={() => handleMoveMonitorConfirm(group)}
                                disabled={moving}
                                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-yambo-green-50 transition-colors text-left disabled:opacity-50"
                            >
                                <span className="flex items-center gap-3 min-w-0">
                                    <span className="w-8 h-8 rounded-lg bg-yambo-green-500/10 flex items-center justify-center shrink-0">
                                        <span className="text-sm font-bold text-yambo-green-600">
                                            {(group.name || "S").charAt(0).toUpperCase()}
                                        </span>
                                    </span>
                                    <span className="text-sm font-medium text-yambo-black truncate">
                                        {group.name || "Sin equipo"}
                                    </span>
                                </span>
                                <span className="text-xs text-gray-400 shrink-0">Mover aquí</span>
                            </button>
                        ))
                    )}
                </div>
            </Modal>
        </RequirePermission>
    );
}
