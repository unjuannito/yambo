import { Button } from "~/components/common/forms/Button";
import { RequirePermission } from "~/components/RequirePermission";
import { DataTable } from "./DataTable";
import type { UsersTableProps, TableColumn } from "./types";

export function UsersTable({ users, currentUser, onEdit, onDelete }: UsersTableProps) {
    const columns: TableColumn[] = [
        {
            key: 'id',
            header: 'ID',
        },
        {
            key: 'name',
            header: 'Nombre',
        },
        {
            key: 'email',
            header: 'Email',
        },
        {
            key: 'profiles',
            header: 'Perfiles',
            render: (user: any) => (
                <div className="flex flex-wrap gap-1">
                    {user.profiles.map((profile: any) => (
                        <span key={profile.id} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            {profile.name}
                        </span>
                    ))}
                </div>
            ),
        },
        {
            key: 'enabled',
            header: 'Estado',
            render: (user: any) => (
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                    {user.enabled ? 'Activo' : 'Inactivo'}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Acciones',
            render: (user: any) => (
                <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                    <div className="flex space-x-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(user)}
                        >
                            Editar
                        </Button>
                        {currentUser && user.email !== currentUser.email && (
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => onDelete(user.id)}
                            >
                                Eliminar
                            </Button>
                        )}
                    </div>
                </RequirePermission>
            ),
        },
    ];

    return <DataTable data={users.content} columns={columns} keyField="id" />;
}