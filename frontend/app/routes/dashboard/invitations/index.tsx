import { useState, useEffect, useCallback } from "react";
import type { Route } from "./+types/invitations";
import { RequirePermission } from "~/components/common/RequirePermission";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { DataTable } from "~/components/common/DataTable";
import type { TableColumn } from "~/components/common/DataTable";
import { Modal } from "~/components/common/Modal";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import { invitationService } from "~/services/invitationService";
import type {
    Invitation,
    CreateInvitationRequest,
} from "~/services/invitationService";
import { profileService } from "~/services/profileService";
import MultiSelectComponent from "~/components/common/forms/MultiSelectComponent";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Yambo - Invitaciones" },
        { name: "Yambo - Invitaciones", content: "Yambo - Invitaciones" },
    ];
}

export default function Invitations() {
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [profileOptions, setProfileOptions] = useState<
        { value: string; label: string }[]
    >([]);
    const [form, setForm] = useState<CreateInvitationRequest>({
        email: "",
        name: "",
        profileIds: [],
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [invData, profiles] = await Promise.all([
                invitationService.getAllInvitations(),
                profileService.getAllProfiles(),
            ]);
            setInvitations(invData);
            const options = profiles.map((profile) => ({
                value: profile.id,
                label: profile.name,
            }));
            setProfileOptions(options);
        } catch (err) {
            setError(getErrorMessage(err, "Error al cargar los datos"));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const resetForm = () => {
        setForm({ email: "", name: "", profileIds: [] });
        setIsModalOpen(false);
        setSaving(false);
    };

    const openCreateModal = () => {
        setForm({ email: "", name: "", profileIds: [] });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("¿Estás seguro de que quieres eliminar esta invitación?")) {
            try {
                await invitationService.deleteInvitation(id);
                setInvitations((prev) => prev.filter((inv) => inv.id !== id));
                toast.success("Invitación eliminada correctamente");
            } catch (err) {
                toast.error(getErrorMessage(err, "Error al eliminar la invitación"));
            }
        }
    };

    const handleSave = async () => {
        if (!form.email.trim()) {
            toast.error("El email es obligatorio");
            return;
        }

        try {
            setSaving(true);
            const newInvitation = await invitationService.createInvitation(form);
            setInvitations((prev) => [newInvitation, ...prev]);
            toast.success("Invitación creada correctamente");
            resetForm();
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al crear la invitación"));
        } finally {
            setSaving(false);
        }
    };

    const invitationColumns: TableColumn<Invitation>[] = [
        {
            key: "id",
            header: "ID",
            render: (invitation: Invitation) => (
                <span className="font-mono text-xs">{invitation.id}</span>
            ),
        },
        {
            key: "email",
            header: "Email",
            render: (invitation: Invitation) => <span>{invitation.email}</span>,
        },
        {
            key: "invitedByUser",
            header: "Invitado por",
            render: (invitation: Invitation) => (
                <span>{invitation.invitedByUser?.name || "N/A"}</span>
            ),
        },
        {
            key: "createdAt",
            header: "Creado",
            render: (invitation: Invitation) => (
                <span>
                    {new Date(invitation.createdAt).toLocaleDateString()}
                </span>
            ),
        },
        {
            key: "expiresAt",
            header: "Expira",
            render: (invitation: Invitation) => (
                <span>
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                </span>
            ),
        },
        {
            key: "used",
            header: "Usado",
            render: (invitation: Invitation) => (
                <span
                    className={
                        invitation.used ? "text-green-600" : "text-red-600"
                    }
                >
                    {invitation.used ? "Sí" : "No"}
                </span>
            ),
        },
        {
            key: "actions",
            header: "Acciones",
            render: (invitation: Invitation) => (
                <ButtonComponent
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(invitation.id)}
                    disabled={invitation.used}
                >
                    Eliminar
                </ButtonComponent>
            ),
        },
    ];

    return (
        <RequirePermission
            permission={{ obj: "invitation", action: "read" }}
            redirectTo="/mi-espacio"
        >
            <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Invitaciones</h1>
                    <RequirePermission
                        permission={{ obj: "invitation", action: "create" }}
                        redirect={false}
                    >
                        <ButtonComponent
                            variant="primary"
                            onClick={openCreateModal}
                        >
                            + Nueva Invitación
                        </ButtonComponent>
                    </RequirePermission>
                </div>

                <section className="bg-white rounded-lg shadow p-6">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <LoadingSpinner size="md" message="Cargando invitaciones..." />
                        </div>
                    ) : error ? (
                        <ErrorMessage message={error} onRetry={fetchData} />
                    ) : (
                        <DataTable
                            columns={invitationColumns}
                            data={invitations}
                            keyField="id"
                            emptyMessage="No se encontraron invitaciones"
                        />
                    )}
                </section>

                <Modal
                    isOpen={isModalOpen}
                    onClose={resetForm}
                    title="Nueva Invitación"
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
                                {saving ? "Guardando..." : "Crear"}
                            </ButtonComponent>
                        </>
                    }
                >
                    <div className="flex flex-col gap-4">
                        <InputComponent
                            label="Email"
                            type="email"
                            value={form.email}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    email: e.target.value,
                                }))
                            }
                            required
                        />
                        <MultiSelectComponent
                            label="Perfiles"
                            name="profileIds"
                            value={form.profileIds}
                            options={profileOptions}
                            onChange={(e) => {
                                const selected = Array.from(
                                    (e.target as HTMLSelectElement).selectedOptions,
                                    option => option.value
                                );
                                setForm((prev) => ({
                                    ...prev,
                                    profileIds: selected,
                                }));
                            }}
                            placeholder="Seleccionar perfiles..."
                        />
                    </div>
                </Modal>
            </main>
        </RequirePermission>
    );
}
