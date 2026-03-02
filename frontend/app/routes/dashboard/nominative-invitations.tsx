import { useState, useEffect, useCallback, useMemo } from "react";
import type { Route } from "./+types/nominative-invitations";
import { RequirePermission } from "~/components/common/RequirePermission";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { FilterableTable } from "~/components/common/FilterableTable";
import type { FilterableColumn } from "~/components/common/FilterableTable";
import { Modal } from "~/components/common/Modal";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import { nominativeInvitationService } from "~/services/nominativeInvitationService";
import type {
    NominativeInvitation,
    CreateNominativeInvitationRequest,
} from "~/services/nominativeInvitationService";
import { profileService } from "~/services/profileService";
import MultiSelectComponent from "~/components/common/forms/MultiSelectComponent";
import { getErrorMessage } from "~/types/error";
import { ViewTabs, useViewTab } from "~/components/common/ViewTabs";
import { getSixMonthsAgoISO } from "~/utils/dateFilters";
import toast from "react-hot-toast";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Yambo - Invitaciones Nominativas" },
        { name: "Yambo - Invitaciones Nominativas", content: "Yambo - Invitaciones Nominativas" },
    ];
}

export default function NominativeInvitations() {
    const [invitations, setInvitations] = useState<NominativeInvitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [profileOptions, setProfileOptions] = useState<
        { value: string; label: string }[]
    >([]);
    const { activeTab, setActiveTab } = useViewTab("actual");
    const [form, setForm] = useState<CreateNominativeInvitationRequest>({
        email: "",
        name: "",
        profileIds: [],
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const startDate = activeTab === "actual" ? getSixMonthsAgoISO() : undefined;
            const [invData, profiles] = await Promise.all([
                nominativeInvitationService.getAllInvitations(startDate),
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
    }, [activeTab]);

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
                await nominativeInvitationService.deleteInvitation(id);
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
            const newInvitation = await nominativeInvitationService.createInvitation(form);
            setInvitations((prev) => [newInvitation, ...prev]);
            toast.success("Invitación creada correctamente");
            resetForm();
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al crear la invitación"));
        } finally {
            setSaving(false);
        }
    };

    const invitationColumns: FilterableColumn<NominativeInvitation & { usedLabel: string }>[] = [
        {
            key: "id",
            header: "ID",
            render: (invitation) => (
                <span className="font-mono text-xs">{invitation.id}</span>
            ),
        },
        {
            key: "email",
            header: "Email",
            filter: {
                enabled: true,
                type: "text",
                placeholder: "Buscar email...",
            },
            render: (invitation) => <span>{invitation.email}</span>,
        },
        {
            key: "invitedByUser" as any,
            header: "Invitado por",
            render: (invitation) => (
                <span>{invitation.invitedByUser?.name || "N/A"}</span>
            ),
        },
        {
            key: "createdAt",
            header: "Creado",
            render: (invitation) => (
                <span>
                    {new Date(invitation.createdAt).toLocaleDateString()}
                </span>
            ),
        },
        {
            key: "expiresAt",
            header: "Expira",
            render: (invitation) => (
                <span>
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                </span>
            ),
        },
        {
            key: "usedLabel",
            header: "Usado",
            filter: {
                enabled: true,
                type: "select",
                placeholder: "Todos",
                options: [
                    { value: "", label: "Todos" },
                    { value: "Sí", label: "Sí" },
                    { value: "No", label: "No" },
                ],
            },
            render: (invitation) => (
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
            key: "actions" as any,
            header: "Acciones",
            render: (invitation) => (
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

    const enrichedInvitations = useMemo(
        () => invitations.map((inv) => ({ ...inv, usedLabel: inv.used ? "Sí" : "No" })),
        [invitations],
    );

    return (
        <RequirePermission
            permission={{ obj: "invitation", action: "read" }}
            redirectTo="/mi-espacio"
        >
            <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Invitaciones Nominativas</h1>
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

                <ViewTabs activeTab={activeTab} onTabChange={setActiveTab} />

                <section className="bg-white rounded-lg shadow p-6">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <LoadingSpinner size="md" message="Cargando invitaciones..." />
                        </div>
                    ) : error ? (
                        <ErrorMessage message={error} onRetry={fetchData} />
                    ) : (
                        <FilterableTable
                            columns={invitationColumns}
                            data={enrichedInvitations}
                            keyField="id"
                            display={{
                                emptyMessage: "No hay invitaciones que coincidan con los filtros",
                            }}
                            features={{
                                enableFilters: true,
                                enablePagination: true,
                            }}
                        />
                    )}
                </section>

                <Modal
                    isOpen={isModalOpen}
                    onClose={resetForm}
                    title="Nueva Invitación Nominativa"
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
