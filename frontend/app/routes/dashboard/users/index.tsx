import { useState, useCallback, useEffect } from "react";
import type { Route } from "./+types/users";
import type { User } from "~/types/userType";
import { RequirePermission } from "~/components/common/RequirePermission";
import { FilterableTable } from "~/components/common/FilterableTable";
import type { FilterableColumn, FetchDataParams } from "~/components/common/FilterableTable";
import { adminUserService } from "~/services/adminUserService";
import { profileService } from "~/services/profileService";
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
}

const EMPTY_FORM: UserForm = {
    userId: "",
    name: "",
    email: "",
    profileIds: [],
};

export default function Users() {
    const [profileOptions, setProfileOptions] = useState<{ value: string; label: string }[]>([]);
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
        fetchProfiles();
    }, []);

    const fetchUsersData = useCallback(async ({ page, size, filters }: FetchDataParams) => {
        return await adminUserService.listUsers({
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
                toast.success("Perfiles del usuario actualizados correctamente");
            }
            resetForm();
            setRefreshKey(prev => prev + 1);
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al actualizar los perfiles del usuario"));
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
            render: (user: User) => (
                <span className="font-mono text-xs">{user.id}</span>
            ),
        },
        {
            key: "name",
            header: "Nombre",
            filter: {
                enabled: true,
                type: "text",
                placeholder: "Buscar por nombre...",
            },
            render: (user: User) => (
                <span className="font-medium">{user.name}</span>
            ),
        },
        {
            key: "email",
            header: "Correo Electrónico",
            filter: {
                enabled: true,
                type: "text",
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
                    <RequirePermission permission={{ obj: "user", action: "delete" }} redirect={false}>
                        <ButtonComponent
                            onClick={() => handleDelete(user.id, user.name)}
                            variant="destructive"
                            size="sm"
                        >
                            Eliminar
                        </ButtonComponent>
                    </RequirePermission>
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
                    title="Editar Perfiles del Usuario"
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
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="space-y-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nombre</label>
                                    <p className="mt-1 text-sm text-gray-900">{form.name}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email</label>
                                    <p className="mt-1 text-sm text-gray-900">{form.email}</p>
                                </div>
                            </div>
                        </div>
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
                    </div>
                </Modal>
            </main>
        </RequirePermission>
    );
}