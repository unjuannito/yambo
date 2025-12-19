import { useState, useEffect } from "react";
import type { Route } from "./+types/invitations";
import { RequirePermission } from "~/components/common/RequirePermission";
import { DataTable } from "~/components/common/DataTable";
import type { TableColumn } from "~/components/common/DataTable";
import { invitationService } from "~/services/invitationService";
import type { Invitation, CreateInvitationRequest } from "~/services/invitationService";
import { profileService } from "~/services/profileService";
import { MultiSelect } from "~/components/common/forms/MultiSelect";
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
    const [profileOptions, setProfileOptions] = useState<{ value: string; label: string }[]>([]);
    const [formData, setFormData] = useState<CreateInvitationRequest>({
        email: "",
        name: "",
        profileIds: [],
    });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [invData, profiles] = await Promise.all([
                    invitationService.getAllInvitations(),
                    profileService.getAllProfiles(),
                ]);
                setInvitations(invData);
                const options = profiles.map(profile => ({
                    value: profile.id,
                    label: profile.name,
                }));
                setProfileOptions(options);
            } catch (error) {
                toast.error("Error al cargar los datos");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleDelete = async (id: string) => {
        if (confirm("¿Estás seguro de que quieres eliminar esta invitación?")) {
            try {
                await invitationService.deleteInvitation(id);
                setInvitations(prev => prev.filter(inv => inv.id !== id));
                toast.success("Invitación eliminada exitosamente");
            } catch (error) {
                toast.error("Error al eliminar la invitación");
            }
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const newInvitation = await invitationService.createInvitation(formData);
            setInvitations(prev => [newInvitation, ...prev]);
            setFormData({ email: "", name: "", profileIds: [] });
            toast.success("Invitación creada exitosamente");
        } catch (error) {
            if (error instanceof MailAuthenticationException) {
                toast.error("Error de autenticación de correo. Por favor, revise la configuración.");
            } else {
                toast.error("Error al crear la invitación");
            }
        } finally {
            setCreating(false);
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
            render: (invitation: Invitation) => (
                <span>{invitation.email}</span>
            ),
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
                <span>{new Date(invitation.createdAt).toLocaleDateString()}</span>
            ),
        },
        {
            key: "expiresAt",
            header: "Expira",
            render: (invitation: Invitation) => (
                <span>{new Date(invitation.expiresAt).toLocaleDateString()}</span>
            ),
        },
        {
            key: "used",
            header: "Usado",
            render: (invitation: Invitation) => (
                <span className={invitation.used ? "text-green-600" : "text-red-600"}>
                    {invitation.used ? "Sí" : "No"}
                </span>
            ),
        },
        {
            key: "actions",
            header: "Acciones",
            render: (invitation: Invitation) => (
                <button
                    onClick={() => handleDelete(invitation.id)}
                    className="text-red-600 hover:text-red-800"
                    disabled={invitation.used}
                >
                    Eliminar
                </button>
            ),
        },
    ];

    if (loading) {
        return (
            <RequirePermission permission={{ obj: "invitation", action: "read" }}>
                <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                    <h1 className="text-3xl font-bold mb-6">Invitaciones</h1>
                    <div className="text-center">Cargando...</div>
                </main>
            </RequirePermission>
        );
    }

    return (
        <RequirePermission permission={{ obj: "invitation", action: "read" }}>
            <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                <h1 className="text-3xl font-bold mb-6">Invitaciones</h1>
                <RequirePermission permission={{ obj: "invitation", action: "create" }}>
                    <form onSubmit={handleCreate} className="mb-6 p-4 border rounded-lg bg-gray-50">
                        <h2 className="text-xl font-semibold mb-4">Crear Nueva Invitación</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                        </div>
                        <div className="mb-4">
                            <MultiSelect
                                label="Perfiles"
                                value={formData.profileIds}
                                options={profileOptions}
                                onChange={(selected) => setFormData(prev => ({ ...prev, profileIds: selected }))}
                                placeholder="Seleccionar perfiles..."
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={creating}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {creating ? "Creando..." : "Crear Invitación"}
                        </button>
                    </form>
                </RequirePermission>

                <DataTable
                    columns={invitationColumns}
                    data={invitations}
                    keyField="id"
                    emptyMessage="No se encontraron invitaciones"
                />
            </main>
        </RequirePermission>
    );
}