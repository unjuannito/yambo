import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Modal } from "~/components/common/Modal";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import { adminUserService } from "~/services/adminUserService";
import { getErrorMessage } from "~/types/error";
import type { User } from "~/types/userType";

interface GiveAccessModalProps {
    /** Persona sin cuenta a la que se le envía el enlace; `null` cierra el diálogo. */
    user: User | null;
    onClose: () => void;
    onDone: () => void;
}

export function GiveAccessModal({ user, onClose, onDone }: GiveAccessModalProps) {
    const { t } = useTranslation();
    const [email, setEmail] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setEmail(user?.email ?? "");
    }, [user]);

    const handleSend = async () => {
        if (!user) return;
        try {
            setSaving(true);
            await adminUserService.giveAccountAccess(user.id, email.trim());
            toast.success(t("staff.accessSent", { email: email.trim() }));
            onDone();
            onClose();
        } catch (err) {
            toast.error(getErrorMessage(err, t("staff.accessError")));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={user !== null}
            onClose={onClose}
            title={t("staff.giveAccessTitle", { name: user?.name ?? "" })}
            size="sm"
            footer={
                <>
                    <ButtonComponent onClick={onClose} variant="secondary" disabled={saving}>
                        {t("common.cancel")}
                    </ButtonComponent>
                    <ButtonComponent onClick={handleSend} variant="primary" disabled={saving || !email.trim()}>
                        {saving ? t("staff.sending") : t("staff.sendAccess")}
                    </ButtonComponent>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                <p className="text-sm text-gray-500">{t("staff.giveAccessHint")}</p>
                <InputComponent
                    label={t("users.email")}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre@correo.com"
                    required
                />
            </div>
        </Modal>
    );
}
