import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { AuthLayout } from "~/routes/AuthLayout";
import InputComponent from "~/components/common/forms/InputComponent";
import { AuthService } from "~/services/authService";
import { ApiError } from "~/types/error";
import toast from "react-hot-toast";
import type { Route } from "./+types/reset-password";

export const ssr = false;

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Yambo - Nueva contraseña" },
        {
            name: "description",
            content: "Establece una nueva contraseña para tu cuenta.",
        },
    ];
}

const authService = new AuthService();

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get("token");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const confirmRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!token) {
            setError("No se ha proporcionado un token válido.");
        }
    }, [token]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const password = passwordRef.current?.value ?? "";
        const confirm = confirmRef.current?.value ?? "";

        if (password.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        if (password !== confirm) {
            toast.error("Las contraseñas no coinciden.");
            return;
        }

        try {
            setLoading(true);
            await authService.resetPassword(token!, password);
            toast.success("Contraseña actualizada correctamente.");
            navigate("/login", { replace: true });
        } catch (err) {
            if (err instanceof ApiError) {
                const msg = err.message;
                if (msg.includes("expirado")) {
                    setError("El enlace ha expirado. Solicita uno nuevo.");
                } else if (msg.includes("utilizado")) {
                    setError("Este enlace ya fue utilizado. Solicita uno nuevo.");
                } else if (msg.includes("inválido") || msg.includes("Token")) {
                    setError("El enlace no es válido. Solicita uno nuevo.");
                } else if (err.status >= 500) {
                    toast.error("Error del servidor. Por favor, inténtalo más tarde.");
                } else {
                    toast.error(msg || "Error al restablecer la contraseña.");
                }
            } else if (err instanceof Error && err.message === "Network Error") {
                toast.error("Error de conexión. Comprueba tu conexión a internet.");
            } else {
                toast.error("Error al restablecer la contraseña.");
            }
        } finally {
            setLoading(false);
        }
    }

    const footer = (
        <p className="text-xs text-center text-gray-500">
            <Link to="/login" className="text-blue-600 hover:underline">
                Volver al inicio de sesión
            </Link>
        </p>
    );

    if (error) {
        return (
            <AuthLayout
                title="Restablecer contraseña"
                subtitle="Ha ocurrido un problema"
                footer={footer}
            >
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700 font-medium">
                            ⚠️ {error}
                        </p>
                    </div>
                    <Link to="/forgot-password">
                        <ButtonComponent
                            variant="primary"
                            className="w-full"
                        >
                            Solicitar nuevo enlace
                        </ButtonComponent>
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="Nueva contraseña"
            subtitle="Introduce tu nueva contraseña"
            footer={footer}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <InputComponent
                    ref={passwordRef}
                    name="password"
                    label="Nueva contraseña"
                    type="password"
                    required
                />
                <InputComponent
                    ref={confirmRef}
                    name="confirmPassword"
                    label="Confirmar contraseña"
                    type="password"
                    required
                />
                <ButtonComponent
                    type="submit"
                    variant="primary"
                    className="w-full"
                    loading={loading}
                >
                    Restablecer contraseña
                </ButtonComponent>
            </form>
        </AuthLayout>
    );
}
