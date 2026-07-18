import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "~/hooks/useAuth";
import { invitationService } from "~/services/invitationService";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { AuthLayout } from "~/routes/AuthLayout";
import type { Route } from "./+types/login";
import InputComponent from "~/components/common/forms/InputComponent";
import { ApiError } from "~/types/error";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGift } from "@fortawesome/free-solid-svg-icons";
import { fireRainbow } from "~/utils/confetti";
import { getSafeReturnTo } from "~/utils/auth";

// Easter egg: gag passwords
const GAG_PASSWORDS: Record<string, { key: string; rainbow?: boolean }> = {
    "1234": { key: "login.gag1234" },
    "12345": { key: "login.gag1234" },
    "123456": { key: "login.gag123456" },
    "password": { key: "login.gagPassword" },
    "contraseña": { key: "login.gagContrasena" },
    "yambo": { key: "login.gagYambo", rainbow: true },
    "admin": { key: "login.gagAdmin" },
    "qwerty": { key: "login.gagQwerty" },
};

export const ssr = false;

export function meta({}: Route.MetaArgs) {
    const { t } = useTranslation();
    return [
        { title: t('login.pageTitle') },
        {
            name: "description",
            content: t('login.pageDesc'),
        },
    ];
}

async function acceptInviteToken(inviteToken: string, t: (key: string) => string, reload: () => Promise<void>) {
    try {
        await invitationService.acceptInvitation(inviteToken);
        toast.success(t('login.invitationSuccess'));
        await reload();
    } catch (err) {
        if (err instanceof ApiError) {
            switch (err.message) {
                case "Invitation not found":
                    toast.error(t('login.invitationNotFound'));
                    break;
                case "Invitation expired":
                    toast.error(t('login.invitationExpired'));
                    break;
                case "Invitation not active yet":
                    toast.error(t('login.invitationNotActive'));
                    break;
                default:
                    toast.error(t('login.invitationError'));
            }
        } else {
            toast.error(t('login.invitationError'));
        }
    }
}

function handleGagPassword(password: string, setRainbowMode: (v: boolean) => void) {
    const { t } = useTranslation();
    const gag = GAG_PASSWORDS[password.toLowerCase()];
    if (!gag) return false;

    toast(t(gag.key), {
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
    return true;
}

function handleLoginError(err: unknown, t: (key: string) => string) {
    if (err instanceof ApiError) {
        if (err.isType("AUTHENTICATION_FAILED") || err.status === 401) {
            toast.error(t('login.errorInvalidCredentials'));
        } else if (err.isType("NETWORK_ERROR")) {
            toast.error(t('login.errorNetwork'));
        } else if (err.isServerError()) {
            toast.error(t('login.errorServer'));
        } else {
            toast.error(t('login.errorGeneric'));
        }
    } else {
        toast.error(t('login.errorGeneric'));
    }
}

export default function Index() {
    const { t } = useTranslation();
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
                await acceptInviteToken(inviteToken, t, reload);
            }

            navigate(returnTo, { replace: true });
        } catch (err) {
            // Easter egg: show gag message instead of generic error for known passwords
            if (handleGagPassword(password, setRainbowMode)) return;
            handleLoginError(err, t);
        } finally {
            setLoading(false);
        }
    }

    const invitationBanner = inviteToken ? (
        <div className="p-3 bg-yambo-green-50 border border-yambo-green-200 rounded-2xl">
            <p className="text-sm text-yambo-green-700 font-medium">
                <FontAwesomeIcon icon={faGift} className="w-4 h-4 inline mr-1 align-text-bottom" /> {t('login.invitationPending')}
            </p>
            <p className="text-xs text-yambo-green-600 mt-1">
                {t('login.invitationAutoApply')}
            </p>
        </div>
    ) : undefined;

    const footer = (
        <p className="text-xs text-center text-gray-400">
            {t('login.notMember')}{" "}
            <a className="text-yambo-green-600 hover:underline font-semibold" href="/contacto">
                {t('login.contactUs')}
            </a>
        </p>
    );

    return (
        <div className={rainbowMode ? "ee-login-rainbow min-h-screen" : ""}>
        <AuthLayout
            title={t('login.title')}
            subtitle={t('login.subtitle')}
            banner={invitationBanner}
            footer={footer}
        >
            <form onSubmit={handleLogin} className="space-y-4">
                <InputComponent
                    ref={emailRef}
                    name="email"
                    label={t('login.emailLabel')}
                    type="email"
                    required
                />
                <InputComponent
                    ref={passwordRef}
                    name="password"
                    label={t('login.passwordLabel')}
                    type="password"
                    required
                />

                <div className="text-right">
                    <Link
                        to="/forgot-password"
                        className="text-sm text-yambo-green-600 hover:underline font-medium"
                    >
                        {t('login.forgotPassword')}
                    </Link>
                </div>

                <ButtonComponent
                    type="submit"
                    variant="primary"
                    className="w-full"
                    isLoading={loading}
                >
                    {t('login.loginButton')}
                </ButtonComponent>
            </form>
        </AuthLayout>
        </div>
    );
}
