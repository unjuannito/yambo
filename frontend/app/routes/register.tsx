import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { nominativeInvitationService } from "~/services/nominativeInvitationService";
import { invitationService } from "~/services/invitationService";
import { ApiError, getErrorMessage } from "~/types/error";
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
    const inviteToken = searchParams.get("invite");
    const hasRedirected = useRef(false);
    const hasAppliedInvitation = useRef(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        passwordConfirm: "",
        name: "",
    });
    const [loading, setLoading] = useState(false);
    const isInvite = !!inviteToken;

    useEffect(() => {
        if (!invitationToken && !inviteToken && !hasRedirected.current) {
            hasRedirected.current = true;
            toast.error("¡Alto ahí! No tenemos un token de invitación válido");
            navigate("/login", { replace: true });
        }
    }, [invitationToken, inviteToken, navigate]);

    useEffect(() => {
        const applyInvitationIfLoggedIn = async () => {
            if (!inviteToken || !isAuthenticated() || hasAppliedInvitation.current) {
                return;
            }

            hasAppliedInvitation.current = true;
            setLoading(true);
            try {
                await invitationService.acceptInvitation(inviteToken);
                toast.success("Invitación aplicada correctamente.");
                await reload();
                navigate("/mi-espacio", { replace: true });
            } catch (err) {
                if (err instanceof ApiError) {
                    switch (err.message) {
                        case "Invitation not found":
                            toast.error("¡Ese token de invitación no nos suena!");
                            break;
                        case "Invitation expired":
                            toast.error("¡Llegaste tarde! El token ha caducado");
                            break;
                        default:
                            toast.error("¡Vaya! La invitación se nos resiste");
                    }
                } else {
                    toast.error("¡Vaya! La invitación se nos resiste");
                }
            } finally {
                setLoading(false);
            }
        };

        void applyInvitationIfLoggedIn();
    }, [isAuthenticated, navigate, inviteToken, reload]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error("¡Oye, necesitamos saber cómo te llamas!");
            return;
        }

        if (isInvite && !formData.email.trim()) {
            toast.error("Sin email no hay paraíso... ¡escríbelo!");
            return;
        }

        if (!formData.password.trim()) {
            toast.error("¡La contraseña no se va a escribir sola!");
            return;
        }

        if (formData.password.length < 6) {
            toast.error("Tu contraseña es muy cortita, ¡ponle al menos 6 caracteres!");
            return;
        }

        if (formData.password !== formData.passwordConfirm) {
            toast.error("¡Las contraseñas no se ponen de acuerdo! Deben coincidir");
            return;
        }

        setLoading(true);
        try {
            if (isInvite) {
                await invitationService.acceptInvitation(
                    inviteToken!,
                    {
                        email: formData.email,
                        password: formData.password,
                        name: formData.name,
                    }
                );
                toast.success("Registro exitoso. Iniciando sesión...");
                await authLogin(formData.email, formData.password);
                navigate("/mi-espacio", { replace: true });
            } else {
                await nominativeInvitationService.register(
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
        } catch (err) {
            if (err instanceof ApiError) {
                switch (err.message) {
                    case "Invitation already used":
                        toast.error("¡Ese token ya dio su último baile! Ya fue utilizado");
                        break;
                    case "Invitation expired":
                        toast.error("¡Llegaste tarde! El token ha caducado");
                        break;
                    case "Email already registered":
                        toast.error("Ese email ya tiene dueño. ¿Ya tienes cuenta?");
                        break;
                    case "Invitation not found":
                        toast.error("¡Ese token de invitación no nos suena!");
                        break;
                    default:
                        toast.error("¡Vaya! El registro se nos complicó");
                }
            } else {
                toast.error("¡Vaya! El registro se nos complicó");
            }
        } finally {
            setLoading(false);
        }
    }

    if (!invitationToken && !inviteToken) {
        return null;
    }

    const invitationBanner = isInvite ? (
        <div className="p-3 bg-yambo-purple-50 border border-yambo-purple-200 rounded-2xl">
            <p className="text-xs text-yambo-purple-700 font-medium">
                ✨ Registro con invitación
            </p>
        </div>
    ) : undefined;

    const footer = isInvite ? (
        <>
            <p className="text-sm text-center text-gray-500 mb-3">
                ¿Ya tienes una cuenta?
            </p>
            <ButtonComponent
                variant="neutral"
                className="w-full"
                onClick={() => {
                    navigate(`/login?invite=${inviteToken}`);
                }}
                disabled={loading}
            >
                Iniciar sesión y aplicar invitación
            </ButtonComponent>
        </>
    ) : undefined;

    return (
        <AuthLayout
            title="Registro"
            subtitle="Completa tu registro para acceder a la plataforma."
            banner={invitationBanner}
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
                {isInvite && (
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
                    isLoading={loading}
                    disabled={
                        loading ||
                        !formData.name.trim() ||
                        (isInvite && !formData.email.trim()) ||
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
