import { useState, useCallback, useEffect } from "react";
import type { Route } from "./+types/users";
import type { User } from "~/types/userType";
import { RequirePermission } from "~/components/common/RequirePermission";
import { FilterableTable } from "~/components/common/FilterableTable";
import type { FilterableColumn, FetchDataParams } from "~/components/common/FilterableTable";
import { adminUserService } from "~/services/adminUserService";
import { profileService } from "~/services/profileService";
import { projectService } from "~/services/projectService";
import type { Project, ProjectGroup } from "~/services/projectService";
import { Modal } from "~/components/common/Modal";
import InputComponent from "~/components/common/forms/InputComponent";
import MultiSelectComponent from "~/components/common/forms/MultiSelectComponent";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Yambo - Usuarios" },
        { name: "Yambo - Usuarios", content: "Yambo - Usuarios" },
    ];
}

interface UserForm {
    userId: string;
    name: string;
    email: string;
    profileIds: string[];
    groupIds: string[];
    photo: string;
    bio: string;
}

const EMPTY_FORM: UserForm = {
    userId: "",
    name: "",
    email: "",
    profileIds: [],
    groupIds: [],
    photo: "",
    bio: "",
};

export default function Users() {
    const [profileOptions, setProfileOptions] = useState<{ value: string; label: string }[]>([]);
    const [groupOptions, setGroupOptions] = useState<{ value: string; label: string }[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<string | null>(null);
    const [form, setForm] = useState<UserForm>({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const fetchProfiles = async () => {
            try {
                const profiles = await profileService.getAllProfiles();
                const options = profiles.map(profile => ({
                    value: profile.id,
                    label: profile.name,
                }));
                setProfileOptions(options);
            } catch (err) {
                toast.error(getErrorMessage(err, "Error al cargar los perfiles"));
            }
        };
        const fetchGroups = async () => {
            try {
                const projectsRes = await projectService.listProjects(0, 100, undefined, true);
                const allOptions: { value: string; label: string }[] = [];
                for (const project of projectsRes.content) {
                    const groups = await projectService.listGroups(project.id);
                    const namedGroups = groups.filter(g => g.name);
                    const defaultGroup = groups.find(g => !g.name);

                    if (namedGroups.length === 0) {
                        // Project has no named groups — show project-level entry
                        const value = defaultGroup ? defaultGroup.id : `project:${project.id}`;
                        allOptions.push({ value, label: project.name });
                    } else {
                        // Show project-level entry (no group) + each named group
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
        fetchProfiles();
        fetchGroups();
    }, []);

    const fetchUsersData = useCallback(async ({ page, size, filters }: FetchDataParams) => {
        return await adminUserService.listUsers({
            id: filters.id,
            name: filters.name,
            email: filters.email,
            profiles: filters.profiles,
            page,
            size,
        });
    }, [refreshKey]);

    const startEdit = (user: User) => {
        setEditing(user.id);
        setForm({
            userId: user.id,
            name: user.name,
            email: user.email,
            profileIds: user.profiles.map(p => p.id),
            groupIds: user.groups?.map(g => g.id) || [],
            photo: user.photo || "",
            bio: user.bio || "",
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setForm({ ...EMPTY_FORM });
        setEditing(null);
        setIsModalOpen(false);
        setSaving(false);
    };

    const handleSave = async () => {
        if (form.profileIds.length === 0) {
            toast.error("Debe seleccionar al menos un perfil");
            return;
        }

        try {
            setSaving(true);
            if (editing) {
                await adminUserService.updateUserProfiles(editing, form.profileIds);
                await adminUserService.updateUserDetails({
                    id: editing,
                    name: form.name,
                    email: form.email,
                    photo: form.photo || undefined,
                    bio: form.bio || undefined,
                });

                // Resolve project:ID placeholders into real default group IDs
                const resolvedGroupIds: string[] = [];
                for (const gid of form.groupIds) {
                    if (gid.startsWith("project:")) {
                        const projectId = gid.replace("project:", "");
                        const created = await projectService.createGroup(projectId);
                        resolvedGroupIds.push(created.id);
                    } else {
                        resolvedGroupIds.push(gid);
                    }
                }
                await adminUserService.updateUserGroups(editing, resolvedGroupIds);
                toast.success("Usuario actualizado correctamente");
            }
            resetForm();
            setRefreshKey(prev => prev + 1);
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al actualizar el usuario"));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (userId: string, userName: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar al usuario "${userName}"?`)) {
            return;
        }

        try {
            await adminUserService.deleteUser(userId);
            toast.success("Usuario eliminado correctamente");
            setRefreshKey(prev => prev + 1);
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al eliminar el usuario"));
        }
    };

    const userTableColumns : FilterableColumn<User>[] = [
        {
            key: "id",
            header: "ID",
            filter: {
                enabled: true,
                type: "search",
                placeholder: "Buscar por ID...",
            },
            render: (user: User) => (
                <span className="font-mono text-xs">{user.id}</span>
            ),
        },
        {
            key: "name",
            header: "Nombre",
            filter: {
                enabled: true,
                type: "search",
                placeholder: "Buscar por nombre...",
            },
            render: (user: User) => (
                <span className="font-medium">
                    {user.name}
                    {user.system && (
                        <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-normal">
                            Sistema
                        </span>
                    )}
                </span>
            ),
        },
        {
            key: "email",
            header: "Correo Electrónico",
            filter: {
                enabled: true,
                type: "search",
                placeholder: "Buscar por email...",
            },
        },
        {
            key: "profiles",
            header: "Perfiles",
            filter: {
                enabled: true,
                type: "multi-select",
                placeholder: "Seleccionar perfiles...",
                options: profileOptions,
            },
            render: (user: User) => (
                <div className="flex flex-wrap gap-1">
                        {user.profiles.length > 0 ? (
                            user.profiles
                                .slice(0, 3)
                                .map((profile) => (
                                    <span
                                        key={profile.id}
                                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                                    >
                                        {profile.name}
                                    </span>
                                ))
                        ) : (
                            <span className="text-gray-500 text-xs italic">
                                Sin permisos
                            </span>
                        )}
                        {user.profiles.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                +{user.profiles.length - 3} más
                            </span>
                        )}
                    </div>
            ),
        },
        {
            key: "groups",
            header: "Grupos",
            render: (user: User) => (
                <div className="flex flex-wrap gap-1">
                    {user.groups && user.groups.length > 0 ? (
                        user.groups.slice(0, 3).map((group) => (
                            <span
                                key={group.id}
                                className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs"
                                title={group.projectName}
                            >
                                {group.name || group.projectName}
                            </span>
                        ))
                    ) : (
                        <span className="text-gray-500 text-xs italic">Sin grupos</span>
                    )}
                    {user.groups && user.groups.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            +{user.groups.length - 3} más
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: "createdAt",
            header: "Creado El",
            render: (user: User) => (
                <span>{new Date(user.createdAt).toLocaleDateString()}</span>
            ),
        },
        {
            key: "enabled",
            header: "Habilitado",
            filter: {
                enabled: true,
                type: "checkbox",
            },
            render: (user: User) => (
                <input
                    type="checkbox"
                    checked={user.enabled}
                    disabled
                />
            ),
        },
        {
            key: "actions",
            header: "Acciones",
            render: (user: User) => (
                <div className="flex gap-2">
                    <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                        <ButtonComponent
                            onClick={() => startEdit(user)}
                            variant="primary"
                            size="sm"
                        >
                            Editar
                        </ButtonComponent>
                    </RequirePermission>
                    {!user.system && (
                        <RequirePermission permission={{ obj: "user", action: "delete" }} redirect={false}>
                            <ButtonComponent
                                onClick={() => handleDelete(user.id, user.name)}
                                variant="destructive"
                                size="sm"
                            >
                                Eliminar
                            </ButtonComponent>
                        </RequirePermission>
                    )}
                </div>
            ),
        }
    ];

    return (
        <RequirePermission permission={{ obj: "user", action: "read" }} redirectTo="/mi-espacio">
            <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                <h1 className="text-3xl font-bold mb-6">Usuarios</h1>
                <FilterableTable
                    columns={userTableColumns}
                    keyField="id"
                    display={{
                        emptyMessage: "No se encontraron usuarios",
                        loadingMessage: "Cargando usuarios...",
                    }}
                    serverSide={{ fetchData: fetchUsersData }}
                />

                <Modal
                    isOpen={isModalOpen}
                    onClose={resetForm}
                    title="Editar Usuario"
                    size="md"
                    footer={
                        <>
                            <ButtonComponent
                                onClick={resetForm}
                                variant="neutral"
                                disabled={saving}
                            >
                                Cancelar
                            </ButtonComponent>
                            <ButtonComponent
                                onClick={handleSave}
                                variant="primary"
                                disabled={saving}
                            >
                                {saving ? "Guardando..." : "Guardar"}
                            </ButtonComponent>
                        </>
                    }
                >
                    <div className="flex flex-col gap-4">
                        <InputComponent
                            label="Nombre"
                            name="name"
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                            minLength={2}
                            maxLength={100}
                        />
                        <InputComponent
                            label="Email"
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            required
                        />
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Perfiles *
                            </label>
                            <MultiSelectComponent
                                options={profileOptions}
                                value={form.profileIds}
                                placeholder="Seleccionar perfiles..."
                                required
                                name="profileIds"
                                onChange={(e) => {
                                    const selectedValues = Array.from(
                                        (e.target as HTMLSelectElement).selectedOptions,
                                        option => option.value
                                    );
                                    setForm({ ...form, profileIds: selectedValues });
                                }}
                            />
                        </div>
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Grupos
                            </label>
                            <MultiSelectComponent
                                options={groupOptions}
                                value={form.groupIds}
                                placeholder="Seleccionar grupos..."
                                name="groupIds"
                                onChange={(e) => {
                                    const selectedValues = Array.from(
                                        (e.target as HTMLSelectElement).selectedOptions,
                                        option => option.value
                                    );
                                    setForm({ ...form, groupIds: selectedValues });
                                }}
                            />
                        </div>
                        <InputComponent
                            label="Foto (URL)"
                            name="photo"
                            type="url"
                            value={form.photo}
                            onChange={(e) => setForm({ ...form, photo: e.target.value })}
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Biografía</label>
                            <textarea
                                name="bio"
                                value={form.bio}
                                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                                placeholder="Biografía del usuario..."
                                rows={3}
                                maxLength={500}
                                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                        </div>
                    </div>
                </Modal>
            </main>
        </RequirePermission>
    );
}