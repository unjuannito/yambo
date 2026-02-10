import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { invitationService } from "~/services/invitationService";
import { promotionInvitationService } from "~/services/promotionInvitationService";
import toast from "react-hot-toast";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import { useAuth } from "~/hooks/useAuth";

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
    const { reload, login: authLogin } = useAuth();
    const invitationToken = searchParams.get("invitation");
    const promotionToken = searchParams.get("promotion");
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        passwordConfirm: "",
        name: "",
    });
    const [loading, setLoading] = useState(false);
    const isPromotion = !!promotionToken;

    useEffect(() => {
        if (!invitationToken && !promotionToken) {
            toast.error("No se proporcionó un token de invitación válido.");
        }
    }, [invitationToken, promotionToken]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const token = invitationToken || promotionToken;
        if (!token) {
            toast.error("No se proporcionó un token de invitación válido.");
            return;
        }

        if (!formData.name.trim()) {
            toast.error("Por favor, ingresa tu nombre completo.");
            return;
        }

        if (isPromotion && !formData.email.trim()) {
            toast.error("Por favor, ingresa tu correo electrónico.");
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

        if (formData.password !== formData.passwordConfirm) {
            toast.error("Las contraseñas no coinciden.");
            return;
        }

        setLoading(true);
        try {
            if (isPromotion) {
                // Promotion invitation flow
                await promotionInvitationService.acceptPromotionInvitation(
                    promotionToken!,
                    {
                        email: formData.email,
                        password: formData.password,
                        name: formData.name,
                    }
                );
                toast.success("Registro exitoso. Iniciando sesión...");
                // Login after registration
                await authLogin(formData.email, formData.password);
                navigate("/mi-espacio", { replace: true });
            } else {
                // Regular invitation flow
                await invitationService.register(
                    invitationToken!,
                    {
                        password: formData.password,
                        name: formData.name,
                    }
                );
                toast.success("Registro exitoso. Iniciando sesión...");
                await reload();
                navigate("/mi-espacio", { replace: true });
            }
        } catch (error: any) {
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
                case "Promotion invitation not found":
                    toast.error("El token de promoción no es válido.");
                    break;
                case "Promotion invitation expired":
                    toast.error("El token de promoción ha expirado.");
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
                    {isPromotion && (
                        <InputComponent
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                                setFormData({ ...formData, email: e.target.value })
                            }
                            label="Correo Electrónico"
                            required
                            disabled={loading}
                        />
                    )}
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
                            (isPromotion && !formData.email.trim()) ||
                            !formData.password.trim() ||
                            !formData.passwordConfirm.trim() ||
                            formData.password !== formData.passwordConfirm
                        }
                        suppressHydrationWarning
                    >
                        Registrarse
                    </ButtonComponent>
                </form>

                {isPromotion && (
                    <div className="border-t pt-4">
                        <p className="text-sm text-center text-gray-600 mb-3">
                            ¿Ya tienes una cuenta? <a className="text-blue-600" href={`/login?promotion=${promotionToken}`}>Inicia sesión aquí.</a>
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
