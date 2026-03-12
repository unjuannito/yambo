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
import MultiSelectComponent from "~/components/common/forms/MultiSelectComponent";
import {
    profileService,
    type Profile,
    type Permission,
} from "~/services/profileService";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { getErrorMessage } from "~/types/error";
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
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al cargar los permisos"));
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
            resetForm();
        } catch (err) {
            toast.error(
                getErrorMessage(err, "Error al guardar el perfil"),
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
        } catch (err) {
            toast.error(
                getErrorMessage(err, "Error al eliminar el perfil"),
            );
        }
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
                    type: "search",
                    placeholder: "Buscar por nombre...",
                },
                render: (profile) => (
                    <span className="font-medium text-yambo-black">
                        {profile.name}
                        {profile.system && (
                            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-normal">
                                Sistema
                            </span>
                        )}
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
                                        className="px-2 py-1 bg-yambo-green-50 text-yambo-green-700 rounded-full text-xs"
                                    >
                                        {permission.description}
                                    </span>
                                ))
                        ) : (
                            <span className="text-gray-400 text-xs italic">
                                Sin permisos
                            </span>
                        )}
                        {profile.permissions.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
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
                        {!profile.system && (
                            <>
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
                            </>
                        )}
                    </div>
                ),
            },
        ],
        [permissionOptions],
    );

    if (loading) {
        return (
            <RequirePermission permission={{ obj: "profile", action: "read" }} redirectTo="/mi-espacio">
                <main className="flex flex-col p-6 md:p-8 w-full md:w-[calc(100vw-16rem)]">
                    <h1 className="text-3xl font-extrabold font-display text-yambo-black mb-6">Perfiles</h1>
                    <div className="flex justify-center py-12">
                        <LoadingSpinner size="lg" message="Cargando perfiles..." />
                    </div>
                </main>
            </RequirePermission>
        );
    }

    return (
        <RequirePermission permission={{ obj: "profile", action: "read" }} redirectTo="/mi-espacio">
            <main className="flex flex-col p-6 md:p-8 w-full md:w-[calc(100vw-16rem)]">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-extrabold font-display text-yambo-black">Perfiles</h1>
                    <RequirePermission
                        permission={{ obj: "profile", action: "create" }}
                        redirect={false}
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

                        <MultiSelectComponent
                            label="Permisos"
                            name="permissionIds"
                            value={form.permissionIds}
                            options={permissionOptions}
                            placeholder="Seleccionar permisos..."
                            onChange={(e) => {
                                const selected = Array.from(
                                    (e.target as HTMLSelectElement).selectedOptions,
                                    (option) => option.value,
                                );
                                setForm((prev) => ({
                                    ...prev,
                                    permissionIds: selected,
                                }));
                            }}
                        />
                    </div>
                </Modal>
            </main>
        </RequirePermission>
    );
}
