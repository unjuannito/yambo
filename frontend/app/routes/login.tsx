import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
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
import { fireRainbow } from "~/utils/confetti";
import { getSafeReturnTo } from "~/utils/auth";

// Easter egg: gag passwords
const GAG_PASSWORDS: Record<string, { message: string; rainbow?: boolean }> = {
    "1234": { message: "🔒 ¡Esa contraseña no la usa ni tu abuela!" },
    "12345": { message: "🔒 ¡Esa contraseña no la usa ni tu abuela!" },
    "123456": { message: "🔒 Venga, que puedes hacerlo mejor..." },
    "password": { message: "🤦 En serio... ¿'password'?" },
    "contraseña": { message: "🤦 Puntos por intentarlo en español..." },
    "yambo": { message: "🎉 ¡Nos encantas! Pero esa no es tu contraseña 😄", rainbow: true },
    "admin": { message: "👀 Buen intento..." },
    "qwerty": { message: "⌨️ ¿Has mirado tu teclado, verdad?" },
};

export const ssr = false;

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
    const [rainbowMode, setRainbowMode] = useState(false);
    const inviteToken = searchParams.get("invite");
    const returnTo = getSafeReturnTo(searchParams.get("returnTo")) ?? "/mi-espacio";

    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isAuthenticated()) {
            navigate(returnTo, { replace: true });
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
                                toast.error("¡Ese token de invitación no nos suena! Revisa el enlace");
                                break;
                            case "Invitation expired":
                                toast.error("¡Llegaste tarde! El token de invitación ha caducado");
                                break;
                            case "Invitation not active yet":
                                toast.error("¡Calma, calma! La invitación aún no está activa");
                                break;
                            default:
                                toast.error("¡Vaya! La invitación se nos resiste");
                        }
                    } else {
                        toast.error("¡Vaya! La invitación se nos resiste");
                    }
                }
            }

            navigate(returnTo, { replace: true });
        } catch (err) {
            // Easter egg: show gag message instead of generic error for known passwords
            const gag = GAG_PASSWORDS[password.toLowerCase()];
            if (gag) {
                toast(gag.message, {
                    duration: 3000,
                    style: gag.rainbow
                        ? { background: "#906bac", color: "white", fontWeight: 600 }
                        : undefined,
                });
                if (gag.rainbow) {
                    setRainbowMode(true);
                    fireRainbow();
                    setTimeout(() => setRainbowMode(false), 3500);
                }
            } else if (err instanceof ApiError) {
                if (err.isType("AUTHENTICATION_FAILED") || err.status === 401) {
                    toast.error("¡Nope! Usuario o contraseña incorrectos. ¿Lo intentamos otra vez?");
                } else if (err.isType("NETWORK_ERROR")) {
                    toast.error("Parece que internet se fue de vacaciones. ¡Revisa tu conexión!");
                } else if (err.isServerError()) {
                    toast.error("Nuestro servidor necesita un respiro. Vuelve en un ratito");
                } else {
                    toast.error("¡Ups! No pudimos iniciar sesión. Revisa tus credenciales");
                }
            } else {
                toast.error("¡Ups! No pudimos iniciar sesión. Revisa tus credenciales");
            }
        } finally {
            setLoading(false);
        }
    }

    const invitationBanner = inviteToken ? (
        <div className="p-3 bg-yambo-green-50 border border-yambo-green-200 rounded-2xl">
            <p className="text-sm text-yambo-green-700 font-medium">
                <FontAwesomeIcon icon={faGift} className="w-4 h-4 inline mr-1 align-text-bottom" /> Tienes una invitación pendiente
            </p>
            <p className="text-xs text-yambo-green-600 mt-1">
                Se aplicará automáticamente tras iniciar sesión
            </p>
        </div>
    ) : undefined;

    const footer = (
        <p className="text-xs text-center text-gray-400">
            ¿No eres socio?{" "}
            <a className="text-yambo-green-600 hover:underline font-semibold" href="/contacto">
                Contacta con Yambo.
            </a>
        </p>
    );

    return (
        <div className={rainbowMode ? "ee-login-rainbow min-h-screen" : ""}>
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

                <div className="text-right">
                    <Link
                        to="/forgot-password"
                        className="text-sm text-yambo-green-600 hover:underline font-medium"
                    >
                        ¿Olvidaste tu contraseña?
                    </Link>
                </div>

                <ButtonComponent
                    type="submit"
                    variant="primary"
                    className="w-full"
                    isLoading={loading}
                >
                    Iniciar sesión
                </ButtonComponent>
            </form>
        </AuthLayout>
        </div>
    );
}
