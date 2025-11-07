import { use, useCallback, useEffect, useMemo, useState } from "react";
import type { Route } from "./+types/users";
import { useAuth } from "~/hooks/useAuth";
import type { User } from "~/types/userType";
import { RequirePermission } from "~/components/RequirePermission";
import { Button } from "~/components/common/forms/Button";
import { Input } from "~/components/common/forms/Input";
import { Checkbox } from "~/components/common/forms/Checkbox";
import { Modal } from "~/components/common/Modal";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { useApiMutation } from "~/hooks/useApiMutation";
import { useModal } from "~/hooks/useModal";
import { AdminUserService, type PagedUsers } from "~/services/adminUserService";
import { useDataFetch } from "~/hooks/useDataFetch";
import { useProfiles } from "~/hooks/useProfiles";
import { FiltersSection, UsersTable, Pagination, type Filters } from "~/components/users";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Yambo - Usuarios" },
    { name: "Yambo - Usuarios", content: "Yambo - Usuarios" },
  ];
}

export default function Users() {
  return (
    <RequirePermission permission={{ obj: "user", action: "read" }} redirectTo="../">
      <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
        <h1>Usuarios</h1>
        <section>
      <AdminUsuariosContent />
        </section>
      </main>
    </RequirePermission>
  );
}

function AdminUsuariosContent() {
    const { user: currentUser } = useAuth();
    const { data: availableProfiles } = useProfiles();
    
    // State management
    const [page, setPage] = useState(0);
    const [size] = useState(20);
    
    // Filters
    const [filters, setFilters] = useState<Filters>({
        name: '',
        email: '',
        enabled: undefined,
        profiles: '',
    });

    // Filter fields configuration
    const filterFields = useMemo(() => [
        {
            key: 'name',
            label: 'Nombre',
            type: 'text' as const,
            placeholder: 'Nombre',
        },
        {
            key: 'email',
            label: 'Email',
            type: 'text' as const,
            placeholder: 'Email',
        },
        {
            key: 'profiles',
            label: 'Perfiles',
            type: 'text' as const,
            placeholder: 'Perfiles (separados por coma)',
        },
        {
            key: 'enabled',
            label: 'Estado',
            type: 'select' as const,
            options: [
                { value: '', label: 'Todos los estados' },
                { value: 'true', label: 'Activos' },
                { value: 'false', label: 'Inactivos' },
            ],
        },
    ], []);

    // Services
    const adminUserService = useMemo(() => new AdminUserService(), []);
    
    // Data fetching with pagination and filters
    const { data: users, loading, error, refetch } = useDataFetch<PagedUsers>({
        fetchFn: () => adminUserService.listUsers({ ...filters, page, size }),
        dependencies: [page, size, filters],
    });
    
    // Modals
    const editModal = useModal();
    const deleteModal = useModal();
    
    // Edit state
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState({ name: '', email: '' });
    const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
    const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
    
    // Computed values
    const isEditingSelf = useMemo(
        () => !!(editingUser && currentUser && editingUser.email === currentUser.email),
        [editingUser, currentUser]
    );

    // Mutations
    const { mutate: updateProfile, isLoading: isUpdatingProfile } = useApiMutation({
        mutationFn: ({ id, name, email }: { id: string; name: string; email: string }) =>
            adminUserService.updateUserProfile({ id, name, email }),
        successMessage: 'Perfil actualizado exitosamente',
        onSuccess: () => {
            editModal.close();
            refetch();
        },
    });

    const { mutate: updateProfiles, isLoading: isUpdatingProfiles } = useApiMutation({
        mutationFn: ({ id, profiles }: { id: string; profiles: string[] }) =>
            adminUserService.updateUserProfiles(id, profiles),
        successMessage: 'Perfiles actualizados exitosamente',
        onSuccess: () => {
            editModal.close();
            refetch();
        },
    });

    const { mutate: deleteUser } = useApiMutation({
        mutationFn: (id: string) => adminUserService.deleteUser(id),
        successMessage: 'Usuario eliminado exitosamente',
        onSuccess: () => {
            deleteModal.close();
            refetch();
        },
    });

    // Handlers
    const handleSearch = useCallback(() => {
        setPage(0);
    }, []);

    const handleEdit = useCallback((user: User) => {
        setEditingUser(user);
        setEditForm({ name: user.name, email: user.email });
        setSelectedProfiles(user.profiles.map(p => p.id));
        editModal.open();
    }, [editModal]);

    const handleDeleteClick = useCallback((userId: string) => {
        setDeleteUserId(userId);
        deleteModal.open();
    }, [deleteModal]);

    const handleSaveProfile = useCallback(() => {
        if (!editingUser) return;
        updateProfile({ id: editingUser.id, ...editForm });
    }, [editingUser, editForm, updateProfile]);

    const handleSaveProfiles = useCallback(() => {
        if (!editingUser || isEditingSelf) return;
        updateProfiles({ id: editingUser.id, profiles: selectedProfiles });
    }, [editingUser, selectedProfiles, isEditingSelf, updateProfiles]);

    const toggleProfile = useCallback((profileId: string) => {
        setSelectedProfiles(prev => 
            prev.includes(profileId) 
                ? prev.filter(r => r !== profileId)
                : [...prev, profileId]
        );
    }, []);

    // Loading state
    if (loading && !users) {
        return <LoadingSpinner fullScreen message="Cargando usuarios..." />;
    }

    return (
        <div className="container mx-auto p-6">

            {/* Filters */}
            <FiltersSection
                filters={filters}
                fields={filterFields}
                onFiltersChange={(newFilters) => setFilters(newFilters as Filters)}
                onSearch={handleSearch}
            />            {/* Error */}
            {error && <ErrorMessage message={error} onRetry={refetch} className="mb-4" />}

            {/* Users Table */}
            {users && (
                <>
                    <UsersTable 
                        users={users} 
                        currentUser={currentUser}
                        onEdit={handleEdit}
                        onDelete={handleDeleteClick}
                    />

                    {/* Pagination */}
                    <Pagination 
                        page={page}
                        totalPages={users.page.totalPages}
                        totalElements={users.page.totalElements}
                        size={users.page.size}
                        onPageChange={setPage}
                    />
                </>
            )}

            {/* Edit Modal */}
            {editingUser && (
                <Modal
                    isOpen={editModal.isOpen}
                    onClose={editModal.close}
                    title="Editar Usuario"
                    size="lg"
                >
                    <div className="space-y-6">
                        {/* Profile Section */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3">Información del Perfil</h3>
                            <div className="space-y-4">
                                <Input
                                    label="Nombre"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Email"
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    required
                                />
                                <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                                    <Button 
                                        onClick={handleSaveProfile}
                                        isLoading={isUpdatingProfile}
                                    >
                                        Guardar Perfil
                                    </Button>
                                </RequirePermission>
                            </div>
                        </div>

                        {/* Profiles Section */}
                        <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                            <div className="pt-6 border-t">
                                <h3 className="text-lg font-semibold mb-3">Perfiles</h3>
                                {isEditingSelf && (
                                    <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
                                        No puedes modificar tus propios roles
                                    </div>
                                )}
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {availableProfiles && availableProfiles.length > 0 ? (
                                        availableProfiles.map((profile) => (
                                            <Checkbox
                                                key={profile.id}
                                                label={profile.name}
                                                checked={selectedProfiles.includes(profile.id)}
                                                onChange={() => toggleProfile(profile.id)}
                                                disabled={isEditingSelf}
                                            />
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500">No hay roles disponibles</p>
                                    )}
                                </div>
                                <Button 
                                    onClick={handleSaveProfiles}
                                    disabled={isEditingSelf}
                                    isLoading={isUpdatingProfiles}
                                    className="mt-4"
                                >
                                    Guardar Perfiles
                                </Button>
                            </div>
                        </RequirePermission>

                        {/* Footer */}
                        <div className="flex justify-end pt-4 border-t">
                            <Button variant="secondary" onClick={editModal.close}>
                                Cerrar
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteModal.isOpen}
                onClose={deleteModal.close}
                onConfirm={() => deleteUserId && deleteUser(deleteUserId)}
                title="Confirmar Eliminación"
                message="¿Está seguro de eliminar este usuario?"
                variant="danger"
                confirmLabel="Eliminar"
            />
        </div>
    );
}
