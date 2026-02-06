import { useState, useEffect, useMemo, useCallback } from "react";
import type { Route } from "./+types/profiles";
import { RequirePermission } from "~/components/common/RequirePermission";
import { FilterableTable } from "~/components/common/FilterableTable";
import type {
    FilterableColumn,
    FetchDataParams,
} from "~/components/common/FilterableTable";
import { Modal } from "~/components/common/Modal";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import {
    profileService,
    type Profile,
    type Permission,
} from "~/services/profileService";
import toast from "react-hot-toast";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Yambo - Perfiles" },
        { name: "description", content: "Gestión de perfiles de usuario" },
    ];
}

interface ProfileForm {
    name: string;
    permissionIds: string[];
}

const EMPTY_FORM: ProfileForm = {
    name: "",
    permissionIds: [],
};

export default function Profiles() {
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
    const [editing, setEditing] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadPermissions();
    }, []);

    const loadPermissions = async () => {
        try {
            setLoading(true);
            const permissionsData = await profileService.getAllPermissions();
            setAllPermissions(permissionsData);
        } catch (error: any) {
            console.error("Error loading permissions:", error);
            toast.error("Error al cargar los permisos");
        } finally {
            setLoading(false);
        }
    };

    const fetchProfilesData = useCallback(
        async ({ page, size, filters }: FetchDataParams) => {
            return await profileService.listProfiles({
                id: filters.name,
                permissions: filters.permissions,
                page,
                size,
            });
        },
        [],
    );

    const openCreateModal = () => {
        setForm({ ...EMPTY_FORM });
        setEditing(null);
        setIsModalOpen(true);
    };

    const startEdit = (profile: Profile) => {
        setForm({
            name: profile.name,
            permissionIds: profile.permissions.map((p) => p.id),
        });
        setEditing(profile.id);
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setForm({ ...EMPTY_FORM });
        setEditing(null);
        setIsModalOpen(false);
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error("El nombre del perfil es obligatorio");
            return;
        }

        try {
            setSaving(true);
            if (editing) {
                await profileService.updateProfile(
                    editing,
                    form.name,
                    form.permissionIds,
                );
                toast.success("Perfil actualizado correctamente");
            } else {
                await profileService.createProfile({
                    name: form.name,
                    permissionIds: form.permissionIds,
                });
                toast.success("Perfil creado correctamente");
            }
            // Trigger table refresh by not needing to reload - FilterableTable will handle it
            resetForm();
        } catch (error: any) {
            console.error("Error saving profile:", error);
            toast.error(
                error.response?.data?.message || "Error al guardar el perfil",
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (profileId: string) => {
        if (!confirm(`¿Estás seguro de eliminar el perfil "${profileId}"?`)) {
            return;
        }

        try {
            await profileService.deleteProfile(profileId);
            toast.success("Perfil eliminado correctamente");
            // Table will auto-refresh
        } catch (error: any) {
            console.error("Error deleting profile:", error);
            toast.error(
                error.response?.data?.message || "Error al eliminar el perfil",
            );
        }
    };

    const togglePermission = (permissionId: string) => {
        setForm((prev) => ({
            ...prev,
            permissionIds: prev.permissionIds.includes(permissionId)
                ? prev.permissionIds.filter((id) => id !== permissionId)
                : [...prev.permissionIds, permissionId],
        }));
    };

    const permissionOptions = useMemo(
        () =>
            allPermissions.map((permission) => ({
                value: permission.id,
                label: permission.description || permission.id,
            })),
        [allPermissions],
    );

    const columns: FilterableColumn<Profile>[] = useMemo(
        () => [
            {
                key: "name",
                header: "Nombre",
                filter: {
                    enabled: true,
                    type: "text",
                    placeholder: "Buscar por nombre...",
                },
                render: (profile) => (
                    <span className="font-medium text-gray-900">
                        {profile.name}
                    </span>
                ),
            },
            {
                key: "permissions",
                header: "Permisos",
                filter: {
                    enabled: true,
                    type: "multi-select",
                    placeholder: "Seleccionar permisos...",
                    options: permissionOptions,
                },
                render: (profile) => (
                    <div className="flex flex-wrap gap-1">
                        {profile.permissions.length > 0 ? (
                            profile.permissions
                                .slice(0, 3)
                                .map((permission) => (
                                    <span
                                        key={permission.id}
                                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                                    >
                                        {permission.description}
                                    </span>
                                ))
                        ) : (
                            <span className="text-gray-500 text-xs italic">
                                Sin permisos
                            </span>
                        )}
                        {profile.permissions.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                +{profile.permissions.length - 3} más
                            </span>
                        )}
                    </div>
                ),
            },
            {
                key: "actions",
                header: "Acciones",
                render: (profile) => (
                    <div className="flex gap-2">
                        <ButtonComponent
                            variant="primary"
                            size="sm"
                            onClick={() => startEdit(profile)}
                        >
                            Editar
                        </ButtonComponent>
                        <ButtonComponent
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(profile.id)}
                        >
                            Eliminar
                        </ButtonComponent>
                    </div>
                ),
            },
        ],
        [permissionOptions],
    );

    if (loading) {
        return (
            <RequirePermission permission={{ obj: "profile", action: "read" }}>
                <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                    <h1 className="text-3xl font-bold mb-6">Perfiles</h1>
                    <div className="flex justify-center py-12">
                        <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            <p className="mt-4 text-gray-600">
                                Cargando perfiles...
                            </p>
                        </div>
                    </div>
                </main>
            </RequirePermission>
        );
    }

    return (
        <RequirePermission permission={{ obj: "profile", action: "read" }} redirectTo="/mi-espacio">
            <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Perfiles</h1>
                    <RequirePermission
                        permission={{ obj: "profile", action: "create" }}
                    >
                        <ButtonComponent
                            variant="primary"
                            onClick={openCreateModal}
                        >
                            + Nuevo Perfil
                        </ButtonComponent>
                    </RequirePermission>
                </div>

                <FilterableTable
                    columns={columns}
                    keyField="id"
                    display={{
                        emptyMessage: "No se encontraron perfiles",
                        loadingMessage: "Cargando perfiles...",
                    }}
                    serverSide={{ fetchData: fetchProfilesData }}
                />

                <Modal
                    isOpen={isModalOpen}
                    onClose={resetForm}
                    title={editing ? "Editar Perfil" : "Nuevo Perfil"}
                    size="lg"
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
                    <div className="grid gap-6">
                        <InputComponent
                            label="Nombre del Perfil"
                            value={form.name}
                            onChange={(e) =>
                                setForm({ ...form, name: e.target.value })
                            }
                            placeholder="Ej: Administrador, Usuario, Gerente..."
                            required
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Permisos ({form.permissionIds.length}{" "}
                                seleccionado(s))
                            </label>
                            <div className="border border-gray-300 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                                {allPermissions.length === 0 ? (
                                    <p className="text-gray-500 text-sm p-4">
                                        No hay permisos disponibles
                                    </p>
                                ) : (
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="w-12 px-4 py-3 text-left">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            form.permissionIds
                                                                .length ===
                                                                allPermissions.length &&
                                                            allPermissions.length >
                                                                0
                                                        }
                                                        onChange={(e) => {
                                                            if (
                                                                e.target.checked
                                                            ) {
                                                                setForm(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        permissionIds:
                                                                            allPermissions.map(
                                                                                (
                                                                                    p,
                                                                                ) =>
                                                                                    p.id,
                                                                            ),
                                                                    }),
                                                                );
                                                            } else {
                                                                setForm(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        permissionIds:
                                                                            [],
                                                                    }),
                                                                );
                                                            }
                                                        }}
                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Descripción
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    ID
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {allPermissions.map(
                                                (permission) => (
                                                    <tr
                                                        key={permission.id}
                                                        onClick={() =>
                                                            togglePermission(
                                                                permission.id,
                                                            )
                                                        }
                                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                                    >
                                                        <td
                                                            className="w-12 px-4 py-3"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={form.permissionIds.includes(
                                                                    permission.id,
                                                                )}
                                                                onChange={() =>
                                                                    togglePermission(
                                                                        permission.id,
                                                                    )
                                                                }
                                                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-900">
                                                            {
                                                                permission.description
                                                            }
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                                                            {permission.id}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </Modal>
            </main>
        </RequirePermission>
    );
}
