import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "~/hooks/useAuth";
import { invitationService } from "~/services/invitationService";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { AuthLayout } from "~/routes/AuthLayout";
import type { Route } from "./+types/login";
import InputComponent from "~/components/common/forms/InputComponent";
import { ApiError, getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGift } from "@fortawesome/free-solid-svg-icons";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Yambo - Área Socios - Login" },
        {
            name: "description",
            content:
                "Asociación juvenil de Alcobendas: vive, aprende y crece con Yambo.",
        },
    ];
}

export default function Index() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login, isAuthenticated, reload } = useAuth();
    const [loading, setLoading] = useState(false);
    const inviteToken = searchParams.get("invite");

    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isAuthenticated()) {
            navigate("/mi-espacio", { replace: true });
        }
    }, []);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        const email = emailRef.current?.value ?? "";
        const password = passwordRef.current?.value ?? "";
        try {
            setLoading(true);
            await login(email, password);

            // If there's an invite token, accept it after login
            if (inviteToken) {
                try {
                    await invitationService.acceptInvitation(inviteToken);
                    toast.success("¡Invitación aplicada correctamente!");
                    await reload();
                } catch (err) {
                    if (err instanceof ApiError) {
                        switch (err.message) {
                            case "Invitation not found":
                                toast.error("El token de invitación no es válido.");
                                break;
                            case "Invitation expired":
                                toast.error("El token de invitación ha expirado.");
                                break;
                            case "Invitation not active yet":
                                toast.error("La invitación aún no está activa.");
                                break;
                            default:
                                toast.error("No se pudo aplicar la invitación.");
                        }
                    } else {
                        toast.error("No se pudo aplicar la invitación.");
                    }
                }
            }

            navigate("/mi-espacio", { replace: true });
        } catch (err) {
            if (err instanceof ApiError) {
                if (err.isType("AUTHENTICATION_FAILED") || err.status === 401) {
                    toast.error("Usuario o contraseña incorrectos.");
                } else if (err.status >= 500) {
                    toast.error("Error del servidor. Por favor, inténtalo más tarde.");
                } else {
                    toast.error("Error al iniciar sesión. Por favor, verifica tus credenciales.");
                }
            } else if (err instanceof Error && err.message === "Network Error") {
                toast.error("Error de conexión. Comprueba tu conexión a internet.");
            } else {
                toast.error("Error al iniciar sesión. Por favor, verifica tus credenciales.");
            }
        } finally {
            setLoading(false);
        }
    }
    const invitationBanner = inviteToken ? (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 font-medium">
                <FontAwesomeIcon icon={faGift} className="w-4 h-4 inline mr-1 align-text-bottom" /> Tienes una invitación pendiente
            </p>
            <p className="text-xs text-green-600 mt-1">
                Se aplicará automáticamente tras iniciar sesión
            </p>
        </div>
    ) : undefined;

    const footer = (
        <p className="text-xs text-center text-gray-500">
            ¿No eres socio?{" "}
            <a className="text-blue-600" href="/contacto">
                Contacta con Yambo.
            </a>
        </p>
    );

    return (
        <AuthLayout
            title="Área de Socios"
            subtitle="Inicia sesión para acceder"
            banner={invitationBanner}
            footer={footer}
        >
            <form onSubmit={handleLogin} className="space-y-4">
                <InputComponent
                    ref={emailRef}
                    name="email"
                    label="Correo electrónico"
                    type="email"
                    required
                />
                <InputComponent
                    ref={passwordRef}
                    name="password"
                    label="Contraseña"
                    type="password"
                    required
                />

                <ButtonComponent
                    type="submit"
                    variant="primary"
                    className="w-full"
                    loading={loading}
                >
                    Iniciar sesión
                </ButtonComponent>
            </form>
        </AuthLayout>
    );
}
