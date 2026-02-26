import { useCallback, useEffect, useMemo, useState } from "react";
import { RequirePermission } from "~/components/common/RequirePermission";
import MultiSelectComponent from "~/components/common/forms/MultiSelectComponent";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { DataTable } from "~/components/common/DataTable";
import type { TableColumn } from "~/components/common/DataTable";
import { Modal } from "~/components/common/Modal";
import { profileService } from "~/services/profileService";
import {
    invitationService,
    type Invitation,
} from "~/services/invitationService";
import type { Profile } from "~/types/userType";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";

export function meta() {
    return [
        { title: "Yambo - Invitaciones" },
        {
            name: "Yambo - Invitaciones",
            content: "Yambo - Invitaciones",
        },
    ];
}

export default function Invitations() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
    const [startTms, setStartTms] = useState("");
    const [endTms, setEndTms] = useState("");
    const [creating, setCreating] = useState(false);
    const [lastInvitation, setLastInvitation] =
        useState<Invitation | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const loadProfiles = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [profilesResponse, invitationsResponse] = await Promise.all([
                profileService.getAllProfiles(),
                invitationService.listInvitations(),
            ]);
            setProfiles(profilesResponse);
            setInvitations(invitationsResponse);
        } catch (err) {
            setError(getErrorMessage(err, "No se pudieron cargar los perfiles"));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadProfiles();
    }, [loadProfiles]);

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const formatDateTime = (value?: string | null) =>
        value ? new Date(value).toLocaleString() : "Sin fin";

    const isExpired = (invitation: Invitation) =>
        invitation.expiresAt
            ? new Date(invitation.expiresAt) < new Date()
            : false;

    const profileOptions = useMemo(
        () =>
            profiles.map((profile) => ({
                value: profile.id,
                label: `${profile.name} (${profile.id})`,
            })),
        [profiles],
    );

    const invitationLink = useMemo(() => {
        if (!lastInvitation) return "";
        return `${baseUrl}/register?invite=${lastInvitation.token}`;
    }, [baseUrl, lastInvitation]);

    const handleCreate = async () => {
        if (selectedProfiles.length === 0) {
            toast.error("Selecciona al menos un perfil");
            return;
        }

        try {
            setCreating(true);
            const invitation =
                await invitationService.createInvitation({
                    profileIds: selectedProfiles,
                    startTms: startTms || undefined,
                    endTms: endTms || undefined,
                });
            setLastInvitation(invitation);
            setSelectedProfiles([]);
            setStartTms("");
            setEndTms("");
            setIsModalOpen(false);
            toast.success("Invitación creada correctamente");
            const updated =
                await invitationService.listInvitations();
            setInvitations(updated);
        } catch (err) {
            toast.error(getErrorMessage(err, "No se pudo crear la invitación"));
        } finally {
            setCreating(false);
        }
    };

    const columns: TableColumn<Invitation>[] = useMemo(
        () => [
            {
                key: "token",
                header: "Token",
                render: (invitation) => (
                    <span className="font-mono text-xs break-all">
                        {invitation.token}
                    </span>
                ),
            },
            {
                key: "invitationLink",
                header: "Link de registro",
                render: (invitation) => {
                    const link = `${baseUrl}/register?invite=${invitation.token}`;
                    const expired = isExpired(invitation);
                    return (
                        <ButtonComponent
                            variant={expired ? "neutral" : "primary"}
                            className={
                                expired
                                    ? "cursor-not-allowed opacity-50 text-xs"
                                    : "text-xs"
                            }
                            onClick={async () => {
                                if (!link || expired) return;
                                try {
                                    await navigator.clipboard.writeText(link);
                                    toast.success(
                                        "Link copiado al portapapeles",
                                    );
                                } catch (err) {
                                    toast.error("No se pudo copiar el link");
                                }
                            }}
                        >
                            Copiar link
                        </ButtonComponent>
                    );
                },
            },
            {
                key: "startTms",
                header: "Inicio",
                render: (invitation) => (
                    <span className="text-sm text-gray-600">
                        {new Date(invitation.startTms).toLocaleString()}
                    </span>
                ),
            },
            {
                key: "expiresAt",
                header: "Fin",
                render: (invitation) => (
                    <span className="text-sm text-gray-600">
                        {formatDateTime(invitation.expiresAt)}
                    </span>
                ),
            },
            {
                key: "profileIds",
                header: "Perfiles",
                render: (invitation) => {
                    const names = invitation.profileIds
                        .map(
                            (id) =>
                                profiles.find((profile) => profile.id === id)
                                    ?.name || id,
                        )
                        .join(", ");
                    return (
                        <span className="text-sm text-gray-600">
                            {names || "-"}
                        </span>
                    );
                },
            },
            {
                key: "createdAt",
                header: "Estado",
                render: (invitation) => {
                    const now = new Date();
                    const start = new Date(invitation.startTms);
                    const end = invitation.expiresAt
                        ? new Date(invitation.expiresAt)
                        : null;
                    let label = "Activa";
                    let cls = "bg-green-100 text-green-700";
                    if (now < start) {
                        label = "Pendiente";
                        cls = "bg-yellow-100 text-yellow-700";
                    } else if (end && now > end) {
                        label = "Expirada";
                        cls = "bg-gray-100 text-gray-700";
                    }
                    return (
                        <span
                            className={`px-2 py-1 text-xs rounded-full ${cls}`}
                        >
                            {label}
                        </span>
                    );
                },
            },
            {
                key: "id",
                header: "Acciones",
                render: (invitation) => (
                    <ButtonComponent
                        variant={`${isExpired(invitation) ? "destructive-text" : "destructive"}`}
                        className={`${isExpired(invitation) ? "cursor-not-allowed opacity-50 text-xs" : "text-xs"}`}
                        onClick={async () => {
                            if (isExpired(invitation)) return;
                            try {
                                await invitationService.disableInvitation(
                                    invitation.id,
                                );
                                const updated =
                                    await invitationService.listInvitations();
                                setInvitations(updated);
                                toast.success("Invitación deshabilitada");
                            } catch (err) {
                                toast.error(
                                    getErrorMessage(err, "No se pudo deshabilitar la invitación"),
                                );
                            }
                        }}
                    >
                        Deshabilitar
                    </ButtonComponent>
                ),
            },
        ],
        [profiles],
    );

    return (
        <RequirePermission
            permission={{ obj: "invitation", action: "read" }}
            redirectTo="/mi-espacio"
        >
            <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">
                        Invitaciones
                    </h1>
                    {!loading && !error && (
                        <RequirePermission
                            permission={{ obj: "invitation", action: "create" }}
                            redirect={false}
                        >
                            <ButtonComponent
                                variant="primary"
                                onClick={() => setIsModalOpen(true)}
                            >
                                + Nueva Invitación
                            </ButtonComponent>
                        </RequirePermission>
                    )}
                </div>

                {loading && (
                    <div className="flex justify-center py-8">
                        <LoadingSpinner
                            size="md"
                            message="Cargando perfiles..."
                        />
                    </div>
                )}

                {error && (
                    <div className="mb-6">
                        <ErrorMessage message={error} onRetry={loadProfiles} />
                    </div>
                )}

                {!loading && !error && (
                    <section className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold mb-4">
                            Invitaciones creadas
                        </h2>
                        {invitations.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                No hay invitaciones todavía
                            </p>
                        ) : (
                            <DataTable
                                columns={columns}
                                data={invitations}
                                keyField="id"
                            />
                        )}
                    </section>
                )}

                {lastInvitation && (
                    <section className="bg-white rounded-lg shadow p-6 mt-6">
                        <h2 className="text-lg font-semibold mb-4">
                            Última invitación creada
                        </h2>
                        <div className="grid gap-4">
                            <InputComponent
                                label="Token"
                                value={lastInvitation.token}
                                readOnly
                            />
                            <InputComponent
                                label="Inicio"
                                value={formatDateTime(lastInvitation.startTms)}
                                readOnly
                            />
                            <InputComponent
                                label="Fin"
                                value={formatDateTime(lastInvitation.expiresAt)}
                                readOnly
                            />
                            <InputComponent
                                label="Link de registro"
                                value={invitationLink}
                                readOnly
                            />
                            <ButtonComponent
                                variant="neutral"
                                onClick={async () => {
                                    if (!invitationLink) return;
                                    try {
                                        await navigator.clipboard.writeText(
                                            invitationLink,
                                        );
                                        toast.success(
                                            "Link copiado al portapapeles",
                                        );
                                    } catch (err) {
                                        toast.error(
                                            "No se pudo copiar el link",
                                        );
                                    }
                                }}
                            >
                                Copiar link
                            </ButtonComponent>
                        </div>
                    </section>
                )}

                <Modal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedProfiles([]);
                        setStartTms("");
                        setEndTms("");
                    }}
                    title="Crear link de invitación"
                    footer={
                        <>
                            <ButtonComponent
                                variant="neutral"
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setSelectedProfiles([]);
                                    setStartTms("");
                                    setEndTms("");
                                }}
                            >
                                Cancelar
                            </ButtonComponent>
                            <ButtonComponent
                                variant="primary"
                                onClick={handleCreate}
                                disabled={creating}
                            >
                                {creating ? "Creando..." : "Crear"}
                            </ButtonComponent>
                        </>
                    }
                >
                    <div className="grid gap-4">
                        <MultiSelectComponent
                            label="Perfiles"
                            options={profileOptions}
                            value={selectedProfiles}
                            placeholder="Selecciona los perfiles"
                            onChange={(e) => {
                                const selected = Array.from(
                                    e.target.selectedOptions,
                                ).map((opt) => opt.value);
                                setSelectedProfiles(selected);
                            }}
                        />
                        <InputComponent
                            label="Inicio (opcional)"
                            type="datetime-local"
                            value={startTms}
                            onChange={(e) => setStartTms(e.target.value)}
                        />
                        <InputComponent
                            label="Fin (opcional)"
                            type="datetime-local"
                            value={endTms}
                            onChange={(e) => setEndTms(e.target.value)}
                        />
                    </div>
                </Modal>
            </main>
        </RequirePermission>
    );
}
