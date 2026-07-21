import { useCallback, useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "~/hooks/useAuth";
import { parentInvitationService } from "~/services/parentInvitationService";
import { getErrorMessage } from "~/types/error";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCheck, faUserPlus, faLinkSlash, faCheck, faRightToBracket } from "@fortawesome/free-solid-svg-icons";

interface InvitationInfo {
    familyProductId: string;
    familyProductName: string;
    used: boolean;
    expired: boolean;
    email: string | null;
}

export default function ParentInvitationAccept() {
    const { token } = useParams();
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [info, setInfo] = useState<InvitationInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accepting, setAccepting] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [acceptError, setAcceptError] = useState<string | null>(null);

    const fetchInfo = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            setError(null);
            const data = await parentInvitationService.getInvitationInfo(token);
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
            setAcceptError(null);
            await parentInvitationService.acceptInvitation(token);
            setAccepted(true);
        } catch (err) {
            setAcceptError(getErrorMessage(err, "No se pudo aceptar la invitación"));
        } finally {
            setAccepting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yambo-green-50 to-white">
                <LoadingSpinner size="lg" message="Cargando invitación..." />
            </div>
        );
    }

    if (error || !info) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yambo-green-50 to-white">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md w-full mx-4 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                        <FontAwesomeIcon icon={faLinkSlash} className="text-red-500 text-2xl" />
                    </div>
                    <h1 className="text-2xl font-bold font-display text-yambo-black mb-2">
                        Invitación no válida
                    </h1>
                    <p className="text-gray-500 mb-6">{error || "Esta invitación no existe o ha expirado."}</p>
                    <Link to="/login" className="text-yambo-green-600 hover:text-yambo-green-700 font-medium">
                        Volver al inicio
                    </Link>
                </div>
            </div>
        );
    }

    if (info.used || info.expired) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yambo-green-50 to-white">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md w-full mx-4 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
                        <FontAwesomeIcon icon={faLinkSlash} className="text-amber-500 text-2xl" />
                    </div>
                    <h1 className="text-2xl font-bold font-display text-yambo-black mb-2">
                        {info.used ? "Invitación ya utilizada" : "Invitación expirada"}
                    </h1>
                    <p className="text-gray-500 mb-6">
                        {info.used
                            ? "Esta invitación ya ha sido aceptada. Si crees que es un error, contacta con el administrador."
                            : "El plazo para aceptar esta invitación ha terminado. Solicita un nuevo enlace."}
                    </p>
                    <Link to="/login" className="text-yambo-green-600 hover:text-yambo-green-700 font-medium">
                        Volver al inicio
                    </Link>
                </div>
            </div>
        );
    }

    if (accepted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yambo-green-50 to-white">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md w-full mx-4 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-yambo-green-100 rounded-full flex items-center justify-center">
                        <FontAwesomeIcon icon={faCheck} className="text-yambo-green-600 text-2xl" />
                    </div>
                    <h1 className="text-2xl font-bold font-display text-yambo-black mb-2">
                        ¡Invitación aceptada!
                    </h1>
                    <p className="text-gray-500 mb-2">
                        Ya tienes acceso como padre/madre a <strong>{info.familyProductName}</strong>.
                    </p>
                    <p className="text-gray-400 text-sm mb-6">
                        Ya puedes pedir merchandising para tus hijos.
                    </p>
                    <ButtonComponent variant="primary" onClick={() => navigate("/mi-espacio")}>
                        Ir a mi espacio
                    </ButtonComponent>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yambo-green-50 to-white">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md w-full mx-4">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 bg-yambo-green-100 rounded-full flex items-center justify-center">
                        <FontAwesomeIcon icon={faUserPlus} className="text-yambo-green-600 text-2xl" />
                    </div>
                    <h1 className="text-2xl font-bold font-display text-yambo-black mb-2">
                        Invitación para padres
                    </h1>
                    <p className="text-gray-500">
                        Has sido invitado como padre/madre para acceder a:
                    </p>
                </div>

                <div className="bg-yambo-green-50 border border-yambo-green-200 rounded-xl p-4 mb-6">
                    <p className="text-lg font-bold text-yambo-green-800 text-center">
                        {info.familyProductName}
                    </p>
                    {info.email && (
                        <p className="text-sm text-yambo-green-600 text-center mt-1">
                            Invitación para: {info.email}
                        </p>
                    )}
                </div>

                {!user ? (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-500 text-center mb-4">
                            Inicia sesión o regístrate para aceptar la invitación.
                        </p>
                        <Link to={`/login?redirect=/parent-invitation/${token}`}>
                            <ButtonComponent variant="primary" className="w-full">
                                <FontAwesomeIcon icon={faRightToBracket} className="mr-2" />
                                Iniciar sesión
                            </ButtonComponent>
                        </Link>
                        <Link to={`/register?redirect=/parent-invitation/${token}`}>
                            <ButtonComponent variant="neutral" className="w-full">
                                <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
                                Registrarse
                            </ButtonComponent>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {acceptError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
                                {acceptError}
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
