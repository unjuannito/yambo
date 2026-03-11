import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { RequirePermission } from "~/components/common/RequirePermission";
import { DataTable, type TableColumn } from "~/components/common/DataTable";
import type { User, CurrentUser } from "~/types/userType";
import type { PagedUsers } from "~/services/adminUserService";

export interface UsersTableProps {
    users: PagedUsers;
    currentUser: CurrentUser | null;
    onEdit: (user: User) => void;
    onDelete: (userId: string) => void;
}

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
            render: (user: User) => (
                <div className="flex flex-wrap gap-1">
                    {user.profiles.map((profile) => (
                        <span key={profile.id} className="inline-block bg-yambo-green-50 text-yambo-green-700 text-xs px-2.5 py-1 rounded-full font-semibold">
                            {profile.name}
                        </span>
                    ))}
                </div>
            ),
        },
        {
            key: 'enabled',
            header: 'Estado',
            render: (user: User) => (
                <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.enabled ? 'bg-yambo-green-100 text-yambo-green-700' : 'bg-red-100 text-red-700'
                }`}>
                    {user.enabled ? 'Activo' : 'Inactivo'}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Acciones',
            render: (user: User) => (
                <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                    <div className="flex space-x-2">
                        <ButtonComponent
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(user)}
                        >
                            Editar
                        </ButtonComponent>
                        {currentUser && user.email !== currentUser.email && (
                            <ButtonComponent
                                variant="danger"
                                size="sm"
                                onClick={() => onDelete(user.id)}
                            >
                                Eliminar
                            </ButtonComponent>
                        )}
                    </div>
                </RequirePermission>
            ),
        },
    ];

    return <DataTable data={users.content} columns={columns} keyField="id" />;
}
