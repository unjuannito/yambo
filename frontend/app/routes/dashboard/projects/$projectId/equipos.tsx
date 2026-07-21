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
import InputComponent from "~/components/common/forms/InputComponent";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faTrashCan, faPlus, faSave, faXmark, faLayerGroup } from "@fortawesome/free-solid-svg-icons";

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

    const handleDeleteGroup = async (groupId: string, groupName: string | null) => {
        if (!projectId) return;
        const label = groupName || "sin nombre";
        if (!confirm(`¿Eliminar el equipo "${label}"?`)) return;
        try {
            await projectService.deleteGroup(projectId, groupId);
            setGroups(prev => prev.filter(g => g.id !== groupId));
            toast.success("Equipo eliminado");
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al eliminar equipo"));
        }
    };

    const handleRemoveMonitor = async (userId: string, groupId: string, name: string) => {
        if (!confirm(`¿Quitar a ${name} de este equipo?`)) return;
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
                                        <button onClick={() => handleUpdateGroup(group.id)} className="text-yambo-green-600 hover:text-yambo-green-700">
                                            <FontAwesomeIcon icon={faSave} className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => { setEditingGroupId(null); setEditingGroupName(""); }} className="text-gray-400 hover:text-gray-600">
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
                                <RequirePermission permission={{ obj: "project", action: "update" }} redirect={false}>
                                    {editingGroupId !== group.id && (
                                        <>
                                            <button
                                                onClick={() => { setEditingGroupId(group.id); setEditingGroupName(group.name ?? ""); }}
                                                className="text-gray-400 hover:text-yambo-green-600 transition-colors"
                                                title="Renombrar"
                                            >
                                                <FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5" />
                                            </button>
                                            <button
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
                                                <button
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
                            <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2.5 py-1 rounded-full">
                                {defaultGroup.monitors.length} monitor{defaultGroup.monitors.length !== 1 ? "es" : ""}
                            </span>
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
                                            <button
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
        </RequirePermission>
    );
}
