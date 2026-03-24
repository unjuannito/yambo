import { useState, useRef } from "react";
import { Link } from "react-router";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { AuthLayout } from "~/routes/AuthLayout";
import InputComponent from "~/components/common/forms/InputComponent";
import { AuthService } from "~/services/authService";
import { ApiError } from "~/types/error";
import toast from "react-hot-toast";
import type { Route } from "./+types/forgot-password";

export const ssr = false;

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Yambo - Restablecer contraseña" },
        {
            name: "description",
            content: "Solicita un enlace para restablecer tu contraseña.",
        },
    ];
}

const authService = new AuthService();

export default function ForgotPassword() {
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const emailRef = useRef<HTMLInputElement>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const email = emailRef.current?.value ?? "";

        if (!email) {
            toast.error("¡Eh, que se te olvida el email!");
            return;
        }

        try {
            setLoading(true);
            await authService.forgotPassword(email);
            setSent(true);
            toast.success("Si el email existe, recibirás un enlace para restablecer tu contraseña.");
        } catch (err) {
            if (err instanceof ApiError && err.isType("NETWORK_ERROR")) {
                toast.error("Parece que internet se fue de vacaciones. ¡Revisa tu conexión!");
            } else if (err instanceof ApiError && err.isServerError()) {
                toast.error("Nuestro servidor necesita un respiro. Vuelve en un ratito");
            } else {
                // Still show success to prevent user enumeration
                setSent(true);
                toast.success("Si el email existe, recibirás un enlace para restablecer tu contraseña.");
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

    return (
        <AuthLayout
            title="Restablecer contraseña"
            subtitle="Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña"
            footer={footer}
        >
            {sent ? (
                <div className="space-y-4">
                    <div className="p-4 bg-yambo-green-50 border border-yambo-green-200 rounded-2xl">
                        <p className="text-sm text-yambo-green-700 font-semibold">
                            📧 Correo enviado
                        </p>
                        <p className="text-sm text-yambo-green-600 mt-1">
                            Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña.
                            Revisa también la carpeta de spam.
                        </p>
                    </div>
                    <ButtonComponent
                        variant="neutral"
                        className="w-full"
                        onClick={() => setSent(false)}
                    >
                        Enviar de nuevo
                    </ButtonComponent>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <InputComponent
                        ref={emailRef}
                        name="email"
                        label="Correo electrónico"
                        type="email"
                        required
                    />
                    <ButtonComponent
                        type="submit"
                        variant="primary"
                        className="w-full"
                        isLoading={loading}
                    >
                        Enviar enlace
                    </ButtonComponent>
                </form>
            )}
        </AuthLayout>
    );
}
