import { useState, useCallback, useEffect } from "react";
import type { Route } from "./+types/users";
import type { User } from "~/types/userType";
import { RequirePermission } from "~/components/common/RequirePermission";
import { FilterableTable } from "~/components/common/FilterableTable";
import type { FilterableColumn, FetchDataParams } from "~/components/common/FilterableTable";
import { adminUserService } from "~/services/adminUserService";
import { profileService } from "~/services/profileService";
import toast from "react-hot-toast";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Yambo - Usuarios" },
        { name: "Yambo - Usuarios", content: "Yambo - Usuarios" },
    ];
}

export default function Users() {
    const [profileOptions, setProfileOptions] = useState<{ value: string; label: string }[]>([]);

    useEffect(() => {
        const fetchProfiles = async () => {
            try {
                const profiles = await profileService.getAllProfiles();
                const options = profiles.map(profile => ({
                    value: profile.id,
                    label: profile.name,
                }));
                setProfileOptions(options);
            } catch (error) {
                toast.error("Error al cargar los perfiles");
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
    }, []);

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
                <span className="text-sm text-gray-600">
                    {user.profiles.length > 0
                        ? user.profiles.map((p) => p.name).join(", ")
                        : "Sin perfiles"}
                </span>
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
        }
    ];

    return (
        <RequirePermission permission={{ obj: "user", action: "read" }}>
            <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                <h1 className="text-3xl font-bold mb-6">Usuarios</h1>
                <FilterableTable
                    columns={userTableColumns}
                    keyField="id"
                    emptyMessage="No se encontraron usuarios"
                    serverSide={{ fetchData: fetchUsersData }}
                />
            </main>
        </RequirePermission>
    );
}