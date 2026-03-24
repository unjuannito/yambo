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
            setError("¡Aquí falta algo! No encontramos un token válido");
        }
    }, [token]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const password = passwordRef.current?.value ?? "";
        const confirm = confirmRef.current?.value ?? "";

        if (password.length < 6) {
            toast.error("Tu contraseña es muy cortita, ¡ponle al menos 6 caracteres!");
            return;
        }

        if (password !== confirm) {
            toast.error("¡Las contraseñas no se ponen de acuerdo! Deben coincidir");
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
                if (err.isType("NETWORK_ERROR")) {
                    toast.error("Parece que internet se fue de vacaciones. ¡Revisa tu conexión!");
                } else if (msg.includes("expirado")) {
                    setError("¡El enlace se nos caducó! Solicita uno nuevecito");
                } else if (msg.includes("utilizado")) {
                    setError("Este enlace ya cumplió su misión. Pide uno nuevo");
                } else if (msg.includes("inválido") || msg.includes("Token")) {
                    setError("¡Ese enlace no nos convence! Solicita uno nuevo");
                } else if (err.isServerError()) {
                    toast.error("Nuestro servidor necesita un respiro. Vuelve en un ratito");
                } else {
                    toast.error(msg || "¡Vaya! No pudimos restablecer la contraseña");
                }
            } else {
                toast.error("¡Vaya! No pudimos restablecer la contraseña");
            }
        } finally {
            setLoading(false);
        }
    }

    const footer = (
        <p className="text-xs text-center text-gray-400">
            <Link to="/login" className="text-yambo-green-600 hover:underline font-medium">
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
                    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                        <p className="text-sm text-red-700 font-semibold">
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
                    isLoading={loading}
                >
                    Restablecer contraseña
                </ButtonComponent>
            </form>
        </AuthLayout>
    );
}
