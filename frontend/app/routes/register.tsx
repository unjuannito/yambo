import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { nominativeInvitationService } from "~/services/nominativeInvitationService";
import { invitationService } from "~/services/invitationService";
import { ApiError, getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import { AuthLayout } from "~/routes/AuthLayout";
import { useAuth } from "~/hooks/useAuth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope } from "@fortawesome/free-solid-svg-icons";
import type { Route } from "./+types/register";
import { getSiteUrl } from "~/utils/env.server";
import { buildMeta } from "~/utils/seo";
import { shareImagePaths } from "~/utils/shareCards";

export const ssr = false;

export function loader() {
    return { siteUrl: getSiteUrl() };
}

/** Al registro solo se llega con una invitación: la vista previa del enlace lo cuenta así. */
export function meta({ data }: Route.MetaArgs) {
    const { t } = useTranslation();
    return buildMeta({
        siteUrl: data?.siteUrl ?? "",
        path: "/register",
        title: t('register.pageTitle'),
        description: t('register.pageDesc'),
        image: shareImagePaths.invitation(),
        imageAlt: "Te han invitado a Yambo",
        index: false,
    });
}

export default function Register() {
    const { t } = useTranslation();
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
            toast.error(t('register.noToken'));
            navigate("/login", { replace: true });
        }
    }, [invitationToken, inviteToken, navigate, t]);

    useEffect(() => {
        const applyInvitationIfLoggedIn = async () => {
            if (!inviteToken || !isAuthenticated() || hasAppliedInvitation.current) {
                return;
            }

            hasAppliedInvitation.current = true;
            setLoading(true);
            try {
                await invitationService.acceptInvitation(inviteToken);
                toast.success(t('register.inviteSuccess'));
                await reload();
                navigate("/mi-espacio", { replace: true });
            } catch (err) {
                if (err instanceof ApiError) {
                    switch (err.message) {
                        case "Invitation not found":
                            toast.error(t('register.inviteNotFound'));
                            break;
                        case "Invitation expired":
                            toast.error(t('register.inviteExpired'));
                            break;
                        default:
                            toast.error(t('register.inviteError'));
                    }
                } else {
                    toast.error(t('register.inviteError'));
                }
            } finally {
                setLoading(false);
            }
        };

        void applyInvitationIfLoggedIn();
    }, [isAuthenticated, navigate, inviteToken, reload, t]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error(t('register.nameRequired'));
            return;
        }

        if (isInvite && !formData.email.trim()) {
            toast.error(t('register.emailRequired'));
            return;
        }

        if (!formData.password.trim()) {
            toast.error(t('register.passwordRequired'));
            return;
        }

        if (formData.password.length < 6) {
            toast.error(t('register.passwordTooShort'));
            return;
        }

        if (formData.password !== formData.passwordConfirm) {
            toast.error(t('register.passwordMismatch'));
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
                toast.success(t('register.success'));
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
                toast.success(t('register.success'));
                await reload();
                navigate("/mi-espacio", { replace: true });
            }
        } catch (err) {
            if (err instanceof ApiError) {
                switch (err.message) {
                    case "Invitation already used":
                        toast.error(t('register.tokenAlreadyUsed'));
                        break;
                    case "Invitation expired":
                        toast.error(t('register.inviteExpired'));
                        break;
                    case "Email already registered":
                        toast.error(t('register.emailAlreadyRegistered'));
                        break;
                    case "Invitation not found":
                        toast.error(t('register.inviteNotFound'));
                        break;
                    default:
                        toast.error(t('register.registerError'));
                }
            } else {
                toast.error(t('register.registerError'));
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
            <p className="text-xs text-yambo-purple-700 font-medium flex items-center gap-1.5">
                <FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" />
                {t('register.withInvitation')}
            </p>
        </div>
    ) : undefined;

    const footer = isInvite ? (
        <>
            <p className="text-sm text-center text-gray-500 mb-3">
                {t('register.alreadyHaveAccount')}
            </p>
            <ButtonComponent
                variant="neutral"
                className="w-full"
                onClick={() => {
                    navigate(`/login?invite=${inviteToken}`);
                }}
                disabled={loading}
            >
                {t('register.loginAndApply')}
            </ButtonComponent>
        </>
    ) : undefined;

    return (
        <AuthLayout
            title={t('register.title')}
            subtitle={t('register.subtitle')}
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
                    label={t('register.nameLabel')}
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
                        label={t('register.emailLabel')}
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
                    label={t('register.passwordLabel')}
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
                    label={t('register.confirmPasswordLabel')}
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
                    {t('register.registerButton')}
                </ButtonComponent>
            </form>
        </AuthLayout>
    );
}
