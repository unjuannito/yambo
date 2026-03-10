import { useState, useCallback, useEffect, useMemo } from "react";
import type { User, UserGroupRole } from "~/types/userType";
import { RequirePermission } from "~/components/common/RequirePermission";
import { FilterableTable } from "~/components/common/FilterableTable";
import type { FilterableColumn, FetchDataParams } from "~/components/common/FilterableTable";
import { adminUserService } from "~/services/adminUserService";
import type { GroupRoleResponse } from "~/services/adminUserService";
import { projectService } from "~/services/projectService";
import { Modal } from "~/components/common/Modal";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";

interface GroupRoleEntry {
    groupId: string;
    role: 'MONITOR' | 'COORDINATOR';
}

interface EditForm {
    userId: string;
    name: string;
    groupRoles: GroupRoleEntry[];
    bio: string;
    funFact: string;
}

const EMPTY_EDIT_FORM: EditForm = {
    userId: "",
    name: "",
    groupRoles: [],
    bio: "",
    funFact: "",
};

interface ProjectCrewGroup {
    projectId: string;
    projectName: string;
    coordinators: User[];
    monitors: { groupId: string; groupName: string | null; members: User[] }[];
}

export default function Crew() {
    const [groupOptions, setGroupOptions] = useState<{ value: string; label: string }[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);

    // View toggle
    const [view, setView] = useState<"table" | "grouped">("table");

    // Edit modal
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editForm, setEditForm] = useState<EditForm>({ ...EMPTY_EDIT_FORM });
    const [saving, setSaving] = useState(false);

    // Add modal
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [addGroupId, setAddGroupId] = useState("");
    const [addRole, setAddRole] = useState<'MONITOR' | 'COORDINATOR'>("MONITOR");

    // Grouped view data
    const [allCrew, setAllCrew] = useState<User[]>([]);
    const [loadingGrouped, setLoadingGrouped] = useState(false);

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const projectsRes = await projectService.listProjects(0, 100, undefined, true);
                const allOptions: { value: string; label: string }[] = [];
                for (const project of projectsRes.content) {
                    const groups = await projectService.listGroups(project.id);
                    const namedGroups = groups.filter(g => g.name);
                    const defaultGroup = groups.find(g => !g.name);

                    if (namedGroups.length === 0) {
                        const value = defaultGroup ? defaultGroup.id : `project:${project.id}`;
                        allOptions.push({ value, label: project.name });
                    } else {
                        const projectValue = defaultGroup ? defaultGroup.id : `project:${project.id}`;
                        allOptions.push({ value: projectValue, label: `${project.name} (sin grupo)` });
                        for (const g of namedGroups) {
                            allOptions.push({ value: g.id, label: `${g.name} (${project.name})` });
                        }
                    }
                }
                setGroupOptions(allOptions);
            } catch (err) {
                toast.error(getErrorMessage(err, "Error al cargar los grupos"));
            }
        };
        fetchGroups();
    }, []);

    // Fetch crew for table view
    const fetchCrewData = useCallback(async ({ page, size, filters }: FetchDataParams) => {
        return await adminUserService.listUsers({
            name: filters.name,
            email: filters.email,
            role: "ANY",
            page,
            size,
        });
    }, [refreshKey]);

    // Fetch all crew for grouped view
    useEffect(() => {
        if (view !== "grouped") return;
        const fetchAll = async () => {
            setLoadingGrouped(true);
            try {
                const res = await adminUserService.listUsers({
                    role: "ANY",
                    page: 0,
                    size: 500,
                });
                setAllCrew(res.content);
            } catch (err) {
                toast.error(getErrorMessage(err, "Error al cargar el equipo"));
            } finally {
                setLoadingGrouped(false);
            }
        };
        fetchAll();
    }, [view, refreshKey]);

    // Build project-grouped structure
    const projectGroups = useMemo((): ProjectCrewGroup[] => {
        const projectMap = new Map<string, ProjectCrewGroup>();

        for (const user of allCrew) {
            if (!user.groupRoles) continue;
            for (const gr of user.groupRoles) {
                if (!projectMap.has(gr.projectId)) {
                    projectMap.set(gr.projectId, {
                        projectId: gr.projectId,
                        projectName: gr.projectName,
                        coordinators: [],
                        monitors: [],
                    });
                }
                const pg = projectMap.get(gr.projectId)!;

                if (gr.role === "COORDINATOR") {
                    if (!pg.coordinators.some(u => u.id === user.id)) {
                        pg.coordinators.push(user);
                    }
                } else {
                    let monitorGroup = pg.monitors.find(mg => mg.groupId === gr.groupId);
                    if (!monitorGroup) {
                        monitorGroup = { groupId: gr.groupId, groupName: gr.groupName, members: [] };
                        pg.monitors.push(monitorGroup);
                    }
                    if (!monitorGroup.members.some(u => u.id === user.id)) {
                        monitorGroup.members.push(user);
                    }
                }
            }
        }

        return Array.from(projectMap.values()).sort((a, b) => a.projectName.localeCompare(b.projectName));
    }, [allCrew]);

    // Edit handlers
    const startEdit = (user: User) => {
        setEditForm({
            userId: user.id,
            name: user.name,
            groupRoles: user.groupRoles?.map(gr => ({ groupId: gr.groupId, role: gr.role })) || [],
            bio: user.bio || "",
            funFact: user.funFact || "",
        });
        setIsEditOpen(true);
    };

    const resetEdit = () => {
        setEditForm({ ...EMPTY_EDIT_FORM });
        setIsEditOpen(false);
        setSaving(false);
    };

    const handleEditSave = async () => {
        if (editForm.groupRoles.length === 0) {
            toast.error("Debe tener al menos un rol asignado");
            return;
        }
        try {
            setSaving(true);
            const userId = editForm.userId;

            await adminUserService.updateUserDetails({
                id: userId,
                name: editForm.name,
                email: "", // Not changing email here
                bio: editForm.bio || undefined,
                funFact: editForm.funFact || undefined,
            });

            // Sync group roles
            const currentRoles = await adminUserService.getUserGroupRoles(userId);
            const currentKey = (gr: { groupId: string; role: string }) => `${gr.groupId}:${gr.role}`;
            const currentSet = new Set(currentRoles.map(currentKey));
            const desiredSet = new Set(editForm.groupRoles.map(gr => `${gr.groupId}:${gr.role}`));

            for (const cr of currentRoles) {
                if (!desiredSet.has(currentKey(cr))) {
                    await adminUserService.removeGroupRole(userId, cr.groupId, cr.role as 'MONITOR' | 'COORDINATOR');
                }
            }
            for (const gr of editForm.groupRoles) {
                if (!currentSet.has(`${gr.groupId}:${gr.role}`)) {
                    await adminUserService.assignGroupRole(userId, gr.groupId, gr.role);
                }
            }

            toast.success("Miembro actualizado correctamente");
            resetEdit();
            setRefreshKey(prev => prev + 1);
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al actualizar el miembro"));
        } finally {
            setSaving(false);
        }
    };

    // Add handlers
    const resetAdd = () => {
        setIsAddOpen(false);
        setSearchQuery("");
        setSearchResults([]);
        setSelectedUser(null);
        setAddGroupId("");
        setAddRole("MONITOR");
    };

    // Live search with debounce
    useEffect(() => {
        const trimmed = searchQuery.trim();
        if (!trimmed) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        const timer = setTimeout(async () => {
            try {
                const res = await adminUserService.listUsers({
                    name: trimmed,
                    page: 0,
                    size: 10,
                });
                setSearchResults(res.content);
            } catch (err) {
                toast.error(getErrorMessage(err, "Error al buscar usuarios"));
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleAddSave = async () => {
        if (!selectedUser || !addGroupId) {
            toast.error("Seleccione un usuario y un grupo");
            return;
        }
        try {
            setSaving(true);
            await adminUserService.assignGroupRole(selectedUser.id, addGroupId, addRole);
            toast.success(`${selectedUser.name} añadido al equipo como ${addRole === 'COORDINATOR' ? 'Coordinador' : 'Monitor'}`);
            resetAdd();
            setRefreshKey(prev => prev + 1);
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al añadir al equipo"));
        } finally {
            setSaving(false);
        }
    };

    // Table columns
    const tableColumns: FilterableColumn<User>[] = [
        {
            key: "name",
            header: "Nombre",
            filter: { enabled: true, type: "search", placeholder: "Buscar por nombre..." },
            render: (user: User) => (
                <div className="flex items-center gap-2">
                    {user.photo && (
                        <img src={user.photo} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                    )}
                    <span className="font-medium">{user.name}</span>
                </div>
            ),
        },
        {
            key: "email",
            header: "Correo Electrónico",
            filter: { enabled: true, type: "search", placeholder: "Buscar por email..." },
        },
        {
            key: "groupRoles",
            header: "Roles",
            render: (user: User) => (
                <div className="flex flex-wrap gap-1">
                    {user.groupRoles && user.groupRoles.length > 0 ? (
                        user.groupRoles.slice(0, 4).map((gr) => (
                            <span
                                key={`${gr.groupId}:${gr.role}`}
                                className={`px-2 py-1 rounded text-xs ${
                                    gr.role === 'COORDINATOR'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-green-100 text-green-800'
                                }`}
                                title={`${gr.role === 'COORDINATOR' ? 'Coordinador' : 'Monitor'} - ${gr.projectName}${gr.groupName ? ` / ${gr.groupName}` : ''}`}
                            >
                                {gr.role === 'COORDINATOR' ? 'C' : 'M'}: {gr.groupName || gr.projectName}
                            </span>
                        ))
                    ) : (
                        <span className="text-gray-500 text-xs italic">Sin roles</span>
                    )}
                    {user.groupRoles && user.groupRoles.length > 4 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            +{user.groupRoles.length - 4} más
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: "actions",
            header: "Acciones",
            render: (user: User) => (
                <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                    <ButtonComponent onClick={() => startEdit(user)} variant="primary" size="sm">
                        Editar
                    </ButtonComponent>
                </RequirePermission>
            ),
        },
    ];

    return (
        <RequirePermission permission={{ obj: "user", action: "read" }} redirectTo="/mi-espacio">
            <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Equipo</h1>
                    <div className="flex gap-2">
                        {/* View toggle */}
                        <div className="flex rounded-lg border overflow-hidden">
                            <button
                                onClick={() => setView("table")}
                                className={`px-3 py-1.5 text-sm ${view === "table" ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                            >
                                Tabla
                            </button>
                            <button
                                onClick={() => setView("grouped")}
                                className={`px-3 py-1.5 text-sm ${view === "grouped" ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                            >
                                Por Proyecto
                            </button>
                        </div>
                        <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                            <ButtonComponent variant="primary" onClick={() => setIsAddOpen(true)}>
                                + Añadir al Equipo
                            </ButtonComponent>
                        </RequirePermission>
                    </div>
                </div>

                {/* Table View */}
                {view === "table" && (
                    <FilterableTable
                        columns={tableColumns}
                        keyField="id"
                        display={{
                            emptyMessage: "No se encontraron miembros del equipo",
                            loadingMessage: "Cargando equipo...",
                        }}
                        serverSide={{ fetchData: fetchCrewData }}
                    />
                )}

                {/* Project-Grouped View */}
                {view === "grouped" && (
                    <div className="space-y-6">
                        {loadingGrouped ? (
                            <p className="text-gray-500">Cargando equipo...</p>
                        ) : projectGroups.length === 0 ? (
                            <p className="text-gray-500">No se encontraron miembros del equipo</p>
                        ) : (
                            projectGroups.map(pg => (
                                <div key={pg.projectId} className="border rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-3 border-b">
                                        <h2 className="text-lg font-semibold">{pg.projectName}</h2>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        {/* Coordinators */}
                                        {pg.coordinators.length > 0 && (
                                            <div>
                                                <h3 className="text-sm font-medium text-purple-700 mb-2">Coordinadores</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {pg.coordinators.map(user => (
                                                        <button
                                                            key={user.id}
                                                            onClick={() => startEdit(user)}
                                                            className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-left"
                                                        >
                                                            {user.photo && (
                                                                <img src={user.photo} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
                                                            )}
                                                            <span className="text-sm font-medium text-purple-800">{user.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Monitors by group */}
                                        {pg.monitors.length > 0 && (
                                            <div>
                                                <h3 className="text-sm font-medium text-green-700 mb-2">Monitores</h3>
                                                {pg.monitors.map(mg => (
                                                    <div key={mg.groupId} className="mb-3">
                                                        {mg.groupName && (
                                                            <p className="text-xs text-gray-500 mb-1 ml-1">{mg.groupName}</p>
                                                        )}
                                                        <div className="flex flex-wrap gap-2">
                                                            {mg.members.map(user => (
                                                                <button
                                                                    key={user.id}
                                                                    onClick={() => startEdit(user)}
                                                                    className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-left"
                                                                >
                                                                    {user.photo && (
                                                                        <img src={user.photo} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
                                                                    )}
                                                                    <span className="text-sm font-medium text-green-800">{user.name}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Edit Modal */}
                <Modal
                    isOpen={isEditOpen}
                    onClose={resetEdit}
                    title={`Editar - ${editForm.name}`}
                    size="md"
                    footer={
                        <>
                            <ButtonComponent onClick={resetEdit} variant="neutral" disabled={saving}>
                                Cancelar
                            </ButtonComponent>
                            <ButtonComponent onClick={handleEditSave} variant="primary" disabled={saving}>
                                {saving ? "Guardando..." : "Guardar"}
                            </ButtonComponent>
                        </>
                    }
                >
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Roles en Grupos *
                            </label>
                            {editForm.groupRoles.map((gr, idx) => (
                                <div key={idx} className="flex gap-2 mb-2 items-center">
                                    <select
                                        value={gr.groupId}
                                        onChange={(e) => {
                                            const updated = [...editForm.groupRoles];
                                            updated[idx] = { ...updated[idx], groupId: e.target.value };
                                            setEditForm({ ...editForm, groupRoles: updated });
                                        }}
                                        className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Seleccionar grupo...</option>
                                        {groupOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={gr.role}
                                        onChange={(e) => {
                                            const updated = [...editForm.groupRoles];
                                            updated[idx] = { ...updated[idx], role: e.target.value as 'MONITOR' | 'COORDINATOR' };
                                            setEditForm({ ...editForm, groupRoles: updated });
                                        }}
                                        className="w-36 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="MONITOR">Monitor</option>
                                        <option value="COORDINATOR">Coordinador</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const updated = editForm.groupRoles.filter((_, i) => i !== idx);
                                            setEditForm({ ...editForm, groupRoles: updated });
                                        }}
                                        className="text-red-500 hover:text-red-700 text-sm px-2"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => setEditForm({
                                    ...editForm,
                                    groupRoles: [...editForm.groupRoles, { groupId: "", role: "MONITOR" }]
                                })}
                                className="text-sm text-blue-600 hover:underline mt-1"
                            >
                                + Añadir rol en grupo
                            </button>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Biografía</label>
                            <textarea
                                value={editForm.bio}
                                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                                placeholder="Biografía del miembro..."
                                rows={3}
                                maxLength={500}
                                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dato curioso</label>
                            <input
                                type="text"
                                value={editForm.funFact}
                                onChange={(e) => setEditForm({ ...editForm, funFact: e.target.value })}
                                placeholder="Un dato curioso..."
                                maxLength={100}
                                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </Modal>

                {/* Add to Crew Modal */}
                <Modal
                    isOpen={isAddOpen}
                    onClose={resetAdd}
                    title="Añadir al Equipo"
                    size="md"
                    footer={
                        <>
                            <ButtonComponent onClick={resetAdd} variant="neutral" disabled={saving}>
                                Cancelar
                            </ButtonComponent>
                            <ButtonComponent
                                onClick={handleAddSave}
                                variant="primary"
                                disabled={saving || !selectedUser || !addGroupId}
                            >
                                {saving ? "Añadiendo..." : "Añadir"}
                            </ButtonComponent>
                        </>
                    }
                >
                    <div className="flex flex-col gap-4">
                        {/* User search */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar usuario</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Escriba para buscar por nombre..."
                                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {searching && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Buscando...</span>
                                )}
                            </div>
                        </div>

                        {/* Search results */}
                        {searchResults.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar usuario</label>
                                <div className="max-h-40 overflow-y-auto border rounded divide-y">
                                    {searchResults.map(user => (
                                        <button
                                            key={user.id}
                                            onClick={() => setSelectedUser(user)}
                                            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors ${
                                                selectedUser?.id === user.id ? "bg-blue-100" : ""
                                            }`}
                                        >
                                            {user.photo && (
                                                <img src={user.photo} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
                                            )}
                                            <span className="font-medium">{user.name}</span>
                                            <span className="text-gray-500 text-xs ml-auto">{user.email}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedUser && (
                            <>
                                <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm">
                                    Seleccionado: <strong>{selectedUser.name}</strong> ({selectedUser.email})
                                </div>

                                {/* Group selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Grupo *</label>
                                    <select
                                        value={addGroupId}
                                        onChange={(e) => setAddGroupId(e.target.value)}
                                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Seleccionar grupo...</option>
                                        {groupOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Role selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                                    <select
                                        value={addRole}
                                        onChange={(e) => setAddRole(e.target.value as 'MONITOR' | 'COORDINATOR')}
                                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="MONITOR">Monitor</option>
                                        <option value="COORDINATOR">Coordinador</option>
                                    </select>
                                </div>
                            </>
                        )}
                    </div>
                </Modal>
            </main>
        </RequirePermission>
    );
}
