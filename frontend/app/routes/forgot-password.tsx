import { useState, useRef } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { AuthLayout } from "~/routes/AuthLayout";
import InputComponent from "~/components/common/forms/InputComponent";
import { AuthService } from "~/services/authService";
import { ApiError } from "~/types/error";
import toast from "react-hot-toast";
import type { Route } from "./+types/forgot-password";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope } from "@fortawesome/free-solid-svg-icons";

export const ssr = false;

export function meta({}: Route.MetaArgs) {
    const { t } = useTranslation();
    return [
        { title: t('forgotPassword.pageTitle') },
        {
            name: "description",
            content: t('forgotPassword.pageDesc'),
        },
    ];
}

const authService = new AuthService();

export default function ForgotPassword() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const emailRef = useRef<HTMLInputElement>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const email = emailRef.current?.value ?? "";

        if (!email) {
            toast.error(t('forgotPassword.emailRequired'));
            return;
        }

        try {
            setLoading(true);
            await authService.forgotPassword(email);
            setSent(true);
            toast.success(t('forgotPassword.successMessage'));
        } catch (err) {
            if (err instanceof ApiError && err.isType("NETWORK_ERROR")) {
                toast.error(t('forgotPassword.errorNetwork'));
            } else if (err instanceof ApiError && err.isServerError()) {
                toast.error(t('forgotPassword.errorServer'));
            } else {
                // Still show success to prevent user enumeration
                setSent(true);
                toast.success(t('forgotPassword.successMessage'));
            }
        } finally {
            setLoading(false);
        }
    }

    const footer = (
        <p className="text-xs text-center text-gray-400">
            <Link to="/login" className="text-yambo-green-600 hover:underline font-medium">
                {t('forgotPassword.backToLogin')}
            </Link>
        </p>
    );

    return (
        <AuthLayout
            title={t('forgotPassword.title')}
            subtitle={t('forgotPassword.subtitle')}
            footer={footer}
        >
            {sent ? (
                <div className="space-y-4">
                    <div className="p-4 bg-yambo-green-50 border border-yambo-green-200 rounded-2xl">
                        <p className="text-sm text-yambo-green-700 font-semibold flex items-center gap-2">
                            <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4" />
                            {t('forgotPassword.emailSentTitle')}
                        </p>
                        <p className="text-sm text-yambo-green-600 mt-1">
                            {t('forgotPassword.emailSentDesc')}
                        </p>
                    </div>
                    <ButtonComponent
                        variant="neutral"
                        className="w-full"
                        onClick={() => setSent(false)}
                    >
                        {t('forgotPassword.sendAgain')}
                    </ButtonComponent>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <InputComponent
                        ref={emailRef}
                        name="email"
                        label={t('forgotPassword.emailLabel')}
                        type="email"
                        required
                    />
                    <ButtonComponent
                        type="submit"
                        variant="primary"
                        className="w-full"
                        isLoading={loading}
                    >
                        {t('forgotPassword.sendButton')}
                    </ButtonComponent>
                </form>
            )}
        </AuthLayout>
    );
}
