import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { invitationService } from "~/services/invitationService";
import { promotionInvitationService } from "~/services/promotionInvitationService";
import toast from "react-hot-toast";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import { AuthLayout } from "~/routes/AuthLayout";
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
    const { reload, login: authLogin, isAuthenticated } = useAuth();
    const invitationToken = searchParams.get("invitation");
    const promotionToken = searchParams.get("promotion");
    const hasRedirected = useRef(false);
    const hasAppliedPromotion = useRef(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        passwordConfirm: "",
        name: "",
    });
    const [loading, setLoading] = useState(false);
    const isPromotion = !!promotionToken;

    useEffect(() => {
        if (!invitationToken && !promotionToken && !hasRedirected.current) {
            hasRedirected.current = true;
            toast.error("No se proporcionó un token de invitación válido.");
            navigate("/login", { replace: true });
        }
    }, [invitationToken, promotionToken, navigate]);

    useEffect(() => {
        const applyPromotionIfLoggedIn = async () => {
            if (!promotionToken || !isAuthenticated() || hasAppliedPromotion.current) {
                return;
            }

            hasAppliedPromotion.current = true;
            setLoading(true);
            try {
                await promotionInvitationService.acceptPromotionInvitation(
                    promotionToken,
                );
                toast.success("Promoción aplicada correctamente.");
                await reload();
                navigate("/mi-espacio", { replace: true });
            } catch (error: any) {
                switch (error.response?.data?.message) {
                    case "Promotion invitation not found":
                        toast.error("El token de promoción no es válido.");
                        break;
                    case "Promotion invitation expired":
                        toast.error("El token de promoción ha expirado.");
                        break;
                    default:
                        toast.error("Error al aplicar la promoción.");
                }
            } finally {
                setLoading(false);
            }
        };

        void applyPromotionIfLoggedIn();
    }, [isAuthenticated, navigate, promotionToken, reload]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

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

    // Guard: redirect if no token present
    if (!invitationToken && !promotionToken) {
        return null;
    }

    const promotionBanner = isPromotion ? (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
                Registro con promoción por perfil
            </p>
        </div>
    ) : undefined;

    const footer = isPromotion ? (
        <>
            <p className="text-sm text-center text-gray-600 mb-3">
                ¿Ya tienes una cuenta?
            </p>
            <ButtonComponent
                variant="neutral"
                className="w-full"
                onClick={() => {
                    navigate(`/login?promotion=${promotionToken}`);
                }}
                disabled={loading}
            >
                Iniciar sesión y aplicar promoción
            </ButtonComponent>
        </>
    ) : undefined;

    return (
        <AuthLayout
            title="Registro"
            subtitle="Completa tu registro para acceder a la plataforma."
            banner={promotionBanner}
            footer={footer}
        >
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
        </AuthLayout>
    );
}
