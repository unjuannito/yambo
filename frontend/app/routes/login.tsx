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
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { fireRainbow } from "~/utils/confetti";
import { getSafeReturnTo } from "~/utils/auth";
import { AuthService } from "~/services/authService";

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
    const [oauthLoading, setOauthLoading] = useState(false);
    const [rainbowMode, setRainbowMode] = useState(false);
    const [oauthEnabled, setOauthEnabled] = useState(false);
    const inviteToken = searchParams.get("invite");
    // Handle both new (oauth_token) and old (google_token) params
    const oauthToken = searchParams.get("oauth_token") || searchParams.get("google_token");
    const oauthProvider = searchParams.get("oauth_provider") || "google";
    const errorParam = searchParams.get("error");
    const returnTo = getSafeReturnTo(searchParams.get("returnTo")) ?? "/mi-espacio";

    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    // Check OAuth config on mount
    useEffect(() => {
        const authService = new AuthService();
        authService.getOAuth2Config().then(config => {
            setOauthEnabled(config.providers.length > 0);
        }).catch(() => {
            setOauthEnabled(false);
        });
    }, []);

    // Handle OAuth redirect (oauth_token in URL)
    useEffect(() => {
        if (oauthToken) {
            const authService = new AuthService();
            authService.setToken(oauthToken);
            // Reload user context
            reload().then(() => {
                // Clean URL
                const params = new URLSearchParams(searchParams);
                params.delete("oauth_token");
                params.delete("oauth_provider");
                params.delete("google_token");
                const newUrl = params.toString()
                    ? `${window.location.pathname}?${params}`
                    : window.location.pathname;
                window.history.replaceState({}, "", newUrl);
                navigate(returnTo, { replace: true });
            }).catch(() => {
                toast.error(t('login.googleError'));
            });
        }
    }, [oauthToken]);

    // Handle OAuth error
    useEffect(() => {
        if (errorParam === "oauth_auth_failed" || errorParam === "google_auth_failed") {
            toast.error(t('login.googleError'));
            const params = new URLSearchParams(searchParams);
            params.delete("error");
            params.delete("provider");
            const newUrl = params.toString()
                ? `${window.location.pathname}?${params}`
                : window.location.pathname;
            window.history.replaceState({}, "", newUrl);
        }
    }, [errorParam]);

    useEffect(() => {
        if (isAuthenticated() && !oauthToken) {
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

    async function handleGoogleLogin() {
        try {
            setOauthLoading(true);
            // Redirect to backend Google OAuth endpoint
            window.location.href = `${window.location.origin}/api/auth/oauth2/google`;
        } catch (err) {
            toast.error(t('login.googleError'));
            setOauthLoading(false);
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

            {/* Separator */}
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 text-gray-400 font-medium">
                        {t('login.orContinueWith')}
                    </span>
                </div>
            </div>

            {/* Google Login Button — only show if OAuth is enabled */}
            {oauthEnabled && (
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={oauthLoading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    {oauthLoading ? (
                        <span className="w-5 h-5 border-2 border-gray-300 border-t-yambo-green-600 rounded-full animate-spin" />
                    ) : (
                        <FontAwesomeIcon icon={faGoogle} className="w-5 h-5 text-[#4285F4]" />
                    )}
                    {t('login.googleLogin')}
                </button>
            )}
        </AuthLayout>
        </div>
    );
}
