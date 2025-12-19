import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { invitationService } from "~/services/invitationService";
import toast from "react-hot-toast";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import { useAuth } from "~/hooks/useAuth";
import { ApiService } from "~/services/apiService";

export const ssr = false;

export function meta() {
    return [
        { title: "Yambo - Registro de usuario" },
        {
            name: "description",
            content: "Completa tu registro para acceder a la plataforma Yambo.",
        },
    ];
}

export default function Register() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { reload } = useAuth();
    const invitationToken = searchParams.get("invitation");
    const [formData, setFormData] = useState({
        password: "",
        passwordConfirm: "",
        name: "",
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!invitationToken) {
            toast.error("No se proporcionó un token de invitación válido.");
        }
    }, [invitationToken]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!invitationToken) {
            toast.error("No se proporcionó un token de invitación válido.");
            return;
        }

        if (!formData.name.trim()) {
            toast.error("Por favor, ingresa tu nombre completo.");
            return;
        }

        if (!formData.password.trim()) {
            toast.error("Por favor, ingresa una contraseña.");
            return;
        }

        if (formData.password.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        setLoading(true);
        try {
            const { token } = await invitationService.register(
                invitationToken,
                formData
            );
            toast.success("Registro exitoso. Iniciando sesión...");
            ApiService.setToken(token);
            await reload();
            navigate("/mi-espacio", { replace: true });
        } catch (error: any) {
            console.log(error);
            switch (error.response?.data?.message) {
                case "Invitation already used":
                    toast.error("El token de invitación ya fue utilizado.");
                    break;
                case "Invitation expired":
                    toast.error("El token de invitación ha expirado.");
                    break;
                case "Email already registered":
                    toast.error("El correo electrónico ya está registrado.");
                    break;
                default:
                    toast.error("Error al registrar el usuario.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center min-h-[calc(100vh-4rem)] bg-gradient-to-br from-yellow-100 via-orange-100 to-pink-100">
            <div className="bg-white shadow-xl rounded-2xl px-8 py-10 max-w-md w-full space-y-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-800">
                        Registro
                    </h1>
                    <p className="text-sm text-gray-500">
                        Completa tu registro para acceder a la plataforma.
                    </p>
                </div>
                <form
                    onSubmit={handleSubmit}
                    method="post"
                    noValidate
                    className="space-y-4"
                >
                    <InputComponent
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                        }
                        label="Nombre Completo"
                        required
                        disabled={loading}
                    />
                    <InputComponent
                        type="password"
                        value={formData.password}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                password: e.target.value,
                            })
                        }
                        label="Contraseña"
                        required
                        disabled={loading}
                    />
                    <InputComponent
                        type="password"
                        value={formData.passwordConfirm}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                passwordConfirm: e.target.value,
                            })
                        }
                        label="Confirmar Contraseña"
                        required
                        disabled={loading}
                    />
                    <ButtonComponent
                        type="submit"
                        className="w-full"
                        variant="primary"
                        loading={loading}
                        disabled={
                            loading ||
                            !formData.name.trim() ||
                            !formData.password.trim() ||
                            !formData.passwordConfirm.trim() ||
                            formData.password !== formData.passwordConfirm
                        }
                        suppressHydrationWarning
                    >
                        Registrarse
                    </ButtonComponent>
                </form>
            </div>
        </main>
    );
}
