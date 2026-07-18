import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router";
import { useTranslation } from "react-i18next";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { AuthLayout } from "~/routes/AuthLayout";
import InputComponent from "~/components/common/forms/InputComponent";
import { AuthService } from "~/services/authService";
import { ApiError } from "~/types/error";
import toast from "react-hot-toast";
import type { Route } from "./+types/reset-password";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

export const ssr = false;

export function meta({}: Route.MetaArgs) {
    const { t } = useTranslation();
    return [
        { title: t('resetPassword.pageTitle') },
        {
            name: "description",
            content: t('resetPassword.pageDesc'),
        },
    ];
}

const authService = new AuthService();

export default function ResetPassword() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get("token");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const confirmRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!token) {
            setError(t('resetPassword.noToken'));
        }
    }, [token, t]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const password = passwordRef.current?.value ?? "";
        const confirm = confirmRef.current?.value ?? "";

        if (password.length < 6) {
            toast.error(t('resetPassword.passwordTooShort'));
            return;
        }

        if (password !== confirm) {
            toast.error(t('resetPassword.passwordMismatch'));
            return;
        }

        try {
            setLoading(true);
            await authService.resetPassword(token!, password);
            toast.success(t('resetPassword.success'));
            navigate("/login", { replace: true });
        } catch (err) {
            if (err instanceof ApiError) {
                const msg = err.message;
                if (err.isType("NETWORK_ERROR")) {
                    toast.error(t('resetPassword.errorNetwork'));
                } else if (msg.includes("expirado")) {
                    setError(t('resetPassword.errorExpired'));
                } else if (msg.includes("utilizado")) {
                    setError(t('resetPassword.errorAlreadyUsed'));
                } else if (msg.includes("inválido") || msg.includes("Token")) {
                    setError(t('resetPassword.errorInvalid'));
                } else if (err.isServerError()) {
                    toast.error(t('resetPassword.errorServer'));
                } else {
                    toast.error(msg || t('resetPassword.errorGeneric'));
                }
            } else {
                toast.error(t('resetPassword.errorGeneric'));
            }
        } finally {
            setLoading(false);
        }
    }

    const footer = (
        <p className="text-xs text-center text-gray-400">
            <Link to="/login" className="text-yambo-green-600 hover:underline font-medium">
                {t('resetPassword.backToLogin')}
            </Link>
        </p>
    );

    if (error) {
        return (
            <AuthLayout
                title={t('resetPassword.title')}
                subtitle={t('resetPassword.errorSubtitle')}
                footer={footer}
            >
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                        <p className="text-sm text-red-700 font-semibold flex items-center gap-2">
                            <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4" />
                            {error}
                        </p>
                    </div>
                    <Link to="/forgot-password">
                        <ButtonComponent
                            variant="primary"
                            className="w-full"
                        >
                            {t('resetPassword.requestNewLink')}
                        </ButtonComponent>
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title={t('resetPassword.title')}
            subtitle={t('resetPassword.subtitle')}
            footer={footer}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <InputComponent
                    ref={passwordRef}
                    name="password"
                    label={t('resetPassword.passwordLabel')}
                    type="password"
                    required
                />
                <InputComponent
                    ref={confirmRef}
                    name="confirmPassword"
                    label={t('resetPassword.confirmPasswordLabel')}
                    type="password"
                    required
                />
                <ButtonComponent
                    type="submit"
                    variant="primary"
                    className="w-full"
                    isLoading={loading}
                >
                    {t('resetPassword.resetButton')}
                </ButtonComponent>
            </form>
        </AuthLayout>
    );
}
