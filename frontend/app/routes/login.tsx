import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "~/hooks/useAuth";
import { promotionInvitationService } from "~/services/promotionInvitationService";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { AuthLayout } from "~/routes/AuthLayout";
import type { Route } from "./+types/login";
import InputComponent from "~/components/common/forms/InputComponent";
import toast from "react-hot-toast";

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
    const promotionToken = searchParams.get("promotion");

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

            // If there's a promotion token, accept it after login
            if (promotionToken) {
                try {
                    await promotionInvitationService.acceptPromotionInvitation(promotionToken);
                    toast.success("¡Promoción aplicada correctamente!");
                    await reload();
                } catch (err: unknown) {
                    const axiosError = err as {
                        response?: {
                            data?: { message?: string };
                            status?: number;
                        };
                    };
                    const errorMessage = axiosError.response?.data?.message;

                    if (errorMessage === "Promotion invitation not found") {
                        toast.error("El token de promoción no es válido.");
                    } else if (errorMessage === "Promotion invitation expired") {
                        toast.error("El token de promoción ha expirado.");
                    } else if (errorMessage === "Promotion invitation not active yet") {
                        toast.error("La promoción aún no está activa.");
                    } else {
                        toast.error("No se pudo aplicar la promoción.");
                    }
                }
            }

            navigate("/mi-espacio", { replace: true });
        } catch (err: unknown) {
            const axiosError = err as {
                response?: {
                    data?: { type?: string; message?: string };
                    status?: number;
                };
            };
            const errorType = axiosError.response?.data?.type;
            const statusCode = axiosError.response?.status;

            if (errorType === "AUTHENTICATION_FAILED" || statusCode === 401) {
                toast.error("Usuario o contraseña incorrectos.");
            } else if (statusCode && statusCode >= 500) {
                toast.error(
                    "Error del servidor. Por favor, inténtalo más tarde.",
                );
            } else if (!axiosError.response) {
                toast.error(
                    "Error de conexión. Comprueba tu conexión a internet.",
                );
            } else {
                toast.error(
                    "Error al iniciar sesión. Por favor, verifica tus credenciales.",
                );
            }
        } finally {
            setLoading(false);
        }
    }
    const promotionBanner = promotionToken ? (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 font-medium">
                🎉 Tienes una promoción pendiente
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
            banner={promotionBanner}
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
