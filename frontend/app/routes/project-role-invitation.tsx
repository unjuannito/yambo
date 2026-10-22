import { useCallback, useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import type { Route } from "./+types/project-role-invitation";
import { getProjectRoleInvitationInfo } from "~/services/publicService.server";
import { getSiteUrl } from "~/utils/env.server";
import { buildMeta } from "~/utils/seo";
import { shareImagePaths } from "~/utils/shareCards";
import { useTranslation } from "react-i18next";
import { useAuth } from "~/hooks/useAuth";
import { projectRoleInvitationService } from "~/services/projectRoleInvitationService";
import type { GroupRole } from "~/types/role";
import { getErrorMessage } from "~/types/error";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faUserCheck,
    faUserPlus,
    faLinkSlash,
    faCheck,
    faRightToBracket,
    faBan,
    faClock,
    faUsers,
} from "@fortawesome/free-solid-svg-icons";

interface InvitationInfo {
    id: string;
    projectId: string;
    projectName: string;
    role: GroupRole;
    used: boolean;
    expired: boolean;
    disabled: boolean;
    email: string | null;
    maxUses: number | null;
    usageCount: number;
}

const ROLE_LABELS: Record<GroupRole, string> = {
    PARENT: "padre/madre",
    COORDINATOR: "coordinador/a",
    MONITOR: "monitor/a",
};

/**
 * Solo para la vista previa del enlace (WhatsApp, correo…): la página carga la
 * invitación en el navegador. No se devuelve el correo ni nada que no salga en la tarjeta.
 */
export async function loader({ params }: Route.LoaderArgs) {
    const info = await getProjectRoleInvitationInfo(params.token).catch(() => null);
    return {
        siteUrl: getSiteUrl(),
        invitation: info ? { projectName: info.projectName, role: info.role } : null,
    };
}

export function meta({ data, params }: Route.MetaArgs) {
    const invitation = data?.invitation;
    const title = invitation ? `Invitación a ${invitation.projectName} | Yambo` : "Invitación | Yambo";
    const description = invitation
        ? `Te invitan a unirte a ${invitation.projectName} como ${ROLE_LABELS[invitation.role] ?? "miembro"}. Acepta la invitación desde este enlace.`
        : "Acepta la invitación para unirte a un proyecto de Yambo.";
    return buildMeta({
        siteUrl: data?.siteUrl ?? "",
        path: `/project-role-invitation/${params.token}`,
        title,
        description,
        image: shareImagePaths.projectInvitation(params.token),
        imageAlt: title,
        index: false,
    });
}

export default function ProjectRoleInvitationAccept() {
    const { token } = useParams();
    const { t } = useTranslation();
    const { user, login } = useAuth();
    const navigate = useNavigate();

    const [info, setInfo] = useState<InvitationInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accepting, setAccepting] = useState(false);
    const [accepted, setAccepted] = useState(false);

    // Registration form (new users arriving via the link)
    const [registerMode, setRegisterMode] = useState(false);
    const [regForm, setRegForm] = useState({ name: "", email: "", password: "" });
    const [regError, setRegError] = useState<string | null>(null);
    const [registering, setRegistering] = useState(false);

    const fetchInfo = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            setError(null);
            const data = await projectRoleInvitationService.getInvitationInfo(token);
            setInfo(data);
        } catch (err) {
            setError(getErrorMessage(err, "No se pudo cargar la invitación"));
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        void fetchInfo();
    }, [fetchInfo]);

    const handleAccept = async () => {
        if (!token) return;
        try {
            setAccepting(true);
            setRegError(null);
            await projectRoleInvitationService.acceptInvitation(token);
            setAccepted(true);
        } catch (err) {
            setRegError(getErrorMessage(err, "No se pudo aceptar la invitación"));
        } finally {
            setAccepting(false);
        }
    };

    const handleRegisterAndAccept = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        if (!regForm.name.trim() || !regForm.email.trim() || regForm.password.length < 6) {
            setRegError("Rellena todos los campos (contraseña mínima 6 caracteres)");
            return;
        }
        try {
            setRegistering(true);
            setRegError(null);
            await projectRoleInvitationService.registerAndAccept(token, {
                email: regForm.email,
                password: regForm.password,
                name: regForm.name,
            });
            // Login with the new account so the user lands authenticated
            try {
                await login(regForm.email, regForm.password);
            } catch {
                // Non-fatal: session will be picked up on next login
            }
            setAccepted(true);
        } catch (err) {
            setRegError(getErrorMessage(err, "No se pudo completar el registro"));
        } finally {
            setRegistering(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yambo-green-50 to-white">
                <LoadingSpinner size="lg" message="Cargando invitación..." />
            </div>
        );
    }

    // ── Shared wrapper for status/error screens ──────────────────────
    const StatusCard = ({ icon, tone, title, children }: {
        icon: React.ReactNode;
        tone: "red" | "amber" | "green";
        title: string;
        children: React.ReactNode;
    }) => {
        const tones = {
            red: "bg-red-100 text-red-500",
            amber: "bg-amber-100 text-amber-500",
            green: "bg-yambo-green-100 text-yambo-green-600",
        };
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yambo-green-50 to-white px-4">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 max-w-md w-full text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${tones[tone]}`}>
                        {icon}
                    </div>
                    <h1 className="text-2xl font-bold font-display text-yambo-black mb-2">{title}</h1>
                    {children}
                </div>
            </div>
        );
    };

    if (error || !info) {
        return (
            <StatusCard
                icon={<FontAwesomeIcon icon={faLinkSlash} className="text-2xl" />}
                tone="red"
                title="Invitación no válida"
            >
                <p className="text-gray-500 mb-6">{error || "Esta invitación no existe o ha expirado."}</p>
                <Link to="/login" className="text-yambo-green-600 hover:text-yambo-green-700 font-medium">
                    Volver al inicio
                </Link>
            </StatusCard>
        );
    }

    const roleLabel = ROLE_LABELS[info.role] ?? info.role;
    const remaining = info.maxUses != null
        ? Math.max(0, info.maxUses - info.usageCount)
        : null;

    if (info.disabled) {
        return (
            <StatusCard
                icon={<FontAwesomeIcon icon={faBan} className="text-2xl" />}
                tone="amber"
                title="Invitación deshabilitada"
            >
                <p className="text-gray-500 mb-6">
                    Este enlace ha sido deshabilitado por el administrador. Solicita un nuevo enlace.
                </p>
                <Link to="/login" className="text-yambo-green-600 hover:text-yambo-green-700 font-medium">
                    Volver al inicio
                </Link>
            </StatusCard>
        );
    }

    if (info.expired) {
        return (
            <StatusCard
                icon={<FontAwesomeIcon icon={faClock} className="text-2xl" />}
                tone="amber"
                title="Invitación expirada"
            >
                <p className="text-gray-500 mb-6">
                    El plazo para aceptar esta invitación ha terminado. Solicita un nuevo enlace.
                </p>
                <Link to="/login" className="text-yambo-green-600 hover:text-yambo-green-700 font-medium">
                    Volver al inicio
                </Link>
            </StatusCard>
        );
    }

    if (info.used) {
        return (
            <StatusCard
                icon={<FontAwesomeIcon icon={faUsers} className="text-2xl" />}
                tone="amber"
                title="Invitación agotada"
            >
                <p className="text-gray-500 mb-6">
                    Este enlace ya ha alcanzado su número máximo de usos.
                    {info.maxUses != null && ` (${info.maxUses} de ${info.maxUses})`}
                </p>
                <Link to="/login" className="text-yambo-green-600 hover:text-yambo-green-700 font-medium">
                    Volver al inicio
                </Link>
            </StatusCard>
        );
    }

    if (accepted) {
        return (
            <StatusCard
                icon={<FontAwesomeIcon icon={faCheck} className="text-2xl" />}
                tone="green"
                title="¡Invitación aceptada!"
            >
                <p className="text-gray-500 mb-2">
                    Ya tienes acceso como {roleLabel} en <strong>{info.projectName}</strong>.
                </p>
                <p className="text-gray-400 text-sm mb-6">
                    Ya puedes acceder a los contenidos disponibles para este proyecto.
                </p>
                <ButtonComponent variant="primary" onClick={() => navigate("/mi-espacio")}>
                    Ir a mi espacio
                </ButtonComponent>
            </StatusCard>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yambo-green-50 to-white px-4 py-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 max-w-md w-full">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 bg-yambo-green-100 rounded-full flex items-center justify-center">
                        <FontAwesomeIcon icon={faUserPlus} className="text-yambo-green-600 text-2xl" />
                    </div>
                    <h1 className="text-2xl font-bold font-display text-yambo-black mb-2">
                        Invitación de proyecto
                    </h1>
                    <p className="text-gray-500">
                        Has sido invitado como {roleLabel} para el proyecto:
                    </p>
                </div>

                <div className="bg-yambo-green-50 border border-yambo-green-200 rounded-xl p-4 mb-4">
                    <p className="text-lg font-bold text-yambo-green-800 text-center">
                        {info.projectName}
                    </p>
                    {info.email && (
                        <p className="text-sm text-yambo-green-600 text-center mt-1">
                            Invitación para: {info.email}
                        </p>
                    )}
                    {remaining != null && (
                        <p className="text-xs text-yambo-green-600/80 text-center mt-2">
                            Usos disponibles: {remaining} de {info.maxUses}
                        </p>
                    )}
                </div>

                {!user ? (
                    <div className="space-y-3">
                        {!registerMode ? (
                            <>
                                <p className="text-sm text-gray-500 text-center mb-4">
                                    Inicia sesión o regístrate para aceptar la invitación.
                                </p>
                                <Link
                                    to={`/login?returnTo=${encodeURIComponent(`/project-role-invitation/${token}`)}`}
                                    className="block"
                                >
                                    <ButtonComponent variant="primary" className="w-full">
                                        <FontAwesomeIcon icon={faRightToBracket} className="mr-2" />
                                        Iniciar sesión
                                    </ButtonComponent>
                                </Link>
                                <ButtonComponent
                                    variant="neutral"
                                    className="w-full"
                                    onClick={() => setRegisterMode(true)}
                                >
                                    <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
                                    Crear cuenta nueva
                                </ButtonComponent>
                            </>
                        ) : (
                            <form onSubmit={handleRegisterAndAccept} className="space-y-3">
                                <p className="text-sm text-gray-500 text-center">
                                    Crea tu cuenta y se te asignará el rol automáticamente.
                                </p>
                                {regError && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
                                        {regError}
                                    </div>
                                )}
                                <InputComponent
                                    type="text"
                                    label="Nombre"
                                    value={regForm.name}
                                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                                    required
                                    disabled={registering}
                                />
                                <InputComponent
                                    type="email"
                                    label="Email"
                                    value={regForm.email}
                                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                                    required
                                    disabled={registering}
                                />
                                <InputComponent
                                    type="password"
                                    label="Contraseña"
                                    value={regForm.password}
                                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                                    required
                                    disabled={registering}
                                />
                                <ButtonComponent
                                    type="submit"
                                    variant="primary"
                                    className="w-full"
                                    isLoading={registering}
                                    disabled={registering}
                                >
                                    {registering ? "Creando cuenta..." : "Registrarme y aceptar"}
                                </ButtonComponent>
                                <button
                                    type="button"
                                    onClick={() => setRegisterMode(false)}
                                    className="w-full text-sm text-gray-400 hover:text-gray-600"
                                    disabled={registering}
                                >
                                    ← Volver
                                </button>
                            </form>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {regError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
                                {regError}
                            </div>
                        )}
                        <p className="text-sm text-gray-500 text-center mb-2">
                            Conectado como <strong>{user.name}</strong> ({user.email})
                        </p>
                        <ButtonComponent
                            variant="primary"
                            className="w-full"
                            onClick={handleAccept}
                            isLoading={accepting}
                            disabled={accepting}
                        >
                            <FontAwesomeIcon icon={faUserCheck} className="mr-2" />
                            {accepting ? "Aceptando..." : "Aceptar invitación"}
                        </ButtonComponent>
                    </div>
                )}
            </div>
        </div>
    );
}
