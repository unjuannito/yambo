import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext, useNavigate } from "react-router";
import { adminUserService, type GroupRoleResponse } from "~/services/adminUserService";
import { projectService } from "~/services/projectService";
import type { User } from "~/types/userType";
import type { GroupRole } from "~/types/role";
import { RequirePermission } from "~/components/common/RequirePermission";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { Modal } from "~/components/common/Modal";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { getErrorMessage } from "~/types/error";
import { loadAssignableGroupOptions } from "~/utils/groupOptions";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCrown, faUserTie, faUserSlash, faPlus, faArrowRight, faFolderOpen } from "@fortawesome/free-solid-svg-icons";

type OutletContext = {
    user: User;
    refreshUser: () => Promise<void>;
    userId: string | undefined;
};

export default function UserProyectos() {
    const { t } = useTranslation();
    const { user, refreshUser, userId } = useOutletContext<OutletContext>();
    const navigate = useNavigate();
    const [groupOptions, setGroupOptions] = useState<{ value: string; label: string }[]>([]);
    const [loading, setLoading] = useState(true);

    // Add modal
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [addGroupId, setAddGroupId] = useState("");
    const [addRole, setAddRole] = useState<GroupRole>("MONITOR");
    const [saving, setSaving] = useState(false);

    // Refresh key for roles
    const [roles, setRoles] = useState<GroupRoleResponse[]>([]);
    const [confirmRemove, setConfirmRemove] = useState<{ groupId: string; role: GroupRole; projectName: string; groupName: string | null } | null>(null);

    useEffect(() => {
        const fetch = async () => {
            try {
                setLoading(true);
                const [opts, currentRoles] = await Promise.all([
                    loadAssignableGroupOptions(),
                    userId ? adminUserService.getUserGroupRoles(userId) : Promise.resolve([]),
                ]);
                setGroupOptions(opts);
                setRoles(currentRoles);
            } catch (err) {
                toast.error(getErrorMessage(err, "Error al cargar datos"));
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [userId]);

    const handleRemove = (groupId: string, role: GroupRole, projectName: string, groupName: string | null) => {
        if (!userId) return;
        setConfirmRemove({ groupId, role, projectName, groupName });
    };

    const executeRemove = async () => {
        if (!userId || !confirmRemove) return;
        const roleLabel = confirmRemove.role === "COORDINATOR" ? "coordinador" : confirmRemove.role === "PARENT" ? "padre/madre" : "monitor";
        try {
            await adminUserService.removeGroupRole(userId, confirmRemove.groupId, confirmRemove.role);
            setRoles(prev => prev.filter(r => !(r.groupId === confirmRemove.groupId && r.role === confirmRemove.role)));
            toast.success(`Rol de ${roleLabel} eliminado`);
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al quitar rol"));
        } finally {
            setConfirmRemove(null);
        }
    };

    const handleAdd = async () => {
        if (!userId || !addGroupId) return;
        try {
            setSaving(true);
            await adminUserService.assignGroupRole(userId, addGroupId, addRole);
            toast.success("Rol asignado correctamente");
            setIsAddOpen(false);
            setAddGroupId("");
            setAddRole("MONITOR");
            // Refresh roles
            const currentRoles = await adminUserService.getUserGroupRoles(userId);
            setRoles(currentRoles);
            await refreshUser();
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al asignar rol"));
        } finally {
            setSaving(false);
        }
    };

    // Group roles by project
    const byProject = new Map<string, { projectName: string; roles: GroupRoleResponse[] }>();
    for (const role of roles) {
        if (!byProject.has(role.projectId)) {
            byProject.set(role.projectId, { projectName: role.projectName, roles: [] });
        }
        byProject.get(role.projectId)!.roles.push(role);
    }

    if (loading) {
        return <LoadingSpinner size="md" message="Cargando roles..." />;
    }

    return (
        <div className="max-w-2xl space-y-4">
            {byProject.size > 0 ? (
                Array.from(byProject.entries()).map(([projectId, { projectName, roles }]) => {
                    const coordRoles = roles.filter(r => r.role === "COORDINATOR");
                    const monRoles = roles.filter(r => r.role === "MONITOR");
                    const parentRoles = roles.filter(r => r.role === "PARENT");
                    return (
                        <section key={projectId} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-yambo-green-50/40 to-transparent border-b border-gray-100">
                                <button
                                    onClick={() => navigate(`/mi-espacio/proyectos/${projectId}/personal`)}
                                    className="font-bold text-yambo-black hover:text-yambo-green-600 transition-colors text-left flex items-center gap-2"
                                >
                                    {projectName}
                                    <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3 text-gray-400" />
                                </button>
                                <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2.5 py-1 rounded-full">
                                    {roles.length} rol{roles.length !== 1 ? "es" : ""}
                                </span>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {coordRoles.length > 0 && (
                                    <div className="px-5 py-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <FontAwesomeIcon icon={faCrown} className="w-4 h-4 text-yambo-purple-500" />
                                            <span className="text-sm font-semibold text-yambo-purple-700">Coordinador</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 ml-6">
                                            {coordRoles.map(r => (
                                                <div key={`${r.groupId}:${r.role}`} className="flex items-center gap-2 px-3 py-1.5 bg-yambo-purple-50 border border-yambo-purple-200 rounded-full text-sm">
                                                    <span className="text-yambo-purple-700">{r.groupName || "(nivel proyecto)"}</span>
                                                    <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                                                        <button
                                                            onClick={() => handleRemove(r.groupId, "COORDINATOR", projectName, r.groupName)}
                                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <FontAwesomeIcon icon={faUserSlash} className="w-3 h-3" />
                                                        </button>
                                                    </RequirePermission>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {monRoles.length > 0 && (
                                    <div className="px-5 py-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <FontAwesomeIcon icon={faUserTie} className="w-4 h-4 text-yambo-green-500" />
                                            <span className="text-sm font-semibold text-yambo-green-700">Monitor</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 ml-6">
                                            {monRoles.map(r => (
                                                <div key={`${r.groupId}:${r.role}`} className="flex items-center gap-2 px-3 py-1.5 bg-yambo-green-50 border border-yambo-green-200 rounded-full text-sm">
                                                    <span className="text-yambo-green-700">{r.groupName || "(nivel proyecto)"}</span>
                                                    <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                                                        <button
                                                            onClick={() => handleRemove(r.groupId, "MONITOR", projectName, r.groupName)}
                                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <FontAwesomeIcon icon={faUserSlash} className="w-3 h-3" />
                                                        </button>
                                                    </RequirePermission>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {parentRoles.length > 0 && (
                                    <div className="px-5 py-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-700">P</span>
                                            <span className="text-sm font-semibold text-amber-700">Padre</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 ml-6">
                                            {parentRoles.map(r => (
                                                <div key={`${r.groupId}:${r.role}`} className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-sm">
                                                    <span className="text-amber-700">{r.groupName || "(nivel proyecto)"}</span>
                                                    <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                                                        <button
                                                            onClick={() => handleRemove(r.groupId, "PARENT", projectName, r.groupName)}
                                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <FontAwesomeIcon icon={faUserSlash} className="w-3 h-3" />
                                                        </button>
                                                    </RequirePermission>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    );
                })
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-yambo-green-50 flex items-center justify-center">
                        <FontAwesomeIcon icon={faFolderOpen} className="text-xl text-yambo-green-400" />
                    </div>
                    <h2 className="text-lg font-bold text-yambo-black mb-1">Sin proyectos asignados</h2>
                    <p className="text-sm text-gray-400">Este usuario no tiene roles en ningún proyecto</p>
                </div>
            )}

            {/* Add role button */}
            <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                <div className="flex justify-center">
                    <ButtonComponent variant="primary" onClick={() => setIsAddOpen(true)}>
                        <FontAwesomeIcon icon={faPlus} className="w-4 h-4 mr-1.5" />
                        Añadir rol en proyecto
                    </ButtonComponent>
                </div>
            </RequirePermission>

            {/* Add modal */}
            <Modal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                title="Añadir rol en proyecto"
                size="md"
                footer={
                    <>
                        <ButtonComponent onClick={() => setIsAddOpen(false)} variant="neutral">
                            Cancelar
                        </ButtonComponent>
                        <ButtonComponent onClick={handleAdd} variant="primary" disabled={saving || !addGroupId}>
                            {saving ? "Asignando..." : "Asignar"}
                        </ButtonComponent>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Grupo *</label>
                        <select
                            value={addGroupId}
                            onChange={e => setAddGroupId(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 focus:border-yambo-green-500"
                        >
                            <option value="">Seleccionar grupo...</option>
                            {groupOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
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
                </div>
            </Modal>
            <ConfirmDialog
                isOpen={confirmRemove !== null}
                onClose={() => setConfirmRemove(null)}
                onConfirm={executeRemove}
                title="Quitar rol"
                message={confirmRemove ? `¿Quitar a ${user.name} como ${confirmRemove.role === "COORDINATOR" ? "coordinador" : confirmRemove.role === "PARENT" ? "padre/madre" : "monitor"} de "${confirmRemove.groupName ? `${confirmRemove.projectName} / ${confirmRemove.groupName}` : confirmRemove.projectName}"?` : ""}
                confirmLabel="Quitar rol"
                variant="danger"
            />
        </div>
    );
}
