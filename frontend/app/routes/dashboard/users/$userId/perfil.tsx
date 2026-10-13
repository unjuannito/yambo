import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useParams, useOutletContext } from "react-router";
import { adminUserService } from "~/services/adminUserService";
import type { User } from "~/types/userType";
import { RequirePermission } from "~/components/common/RequirePermission";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import CheckboxComponent from "~/components/common/forms/CheckboxComponent";
import { StaffPhotoField } from "~/components/StaffPhotoField";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faEnvelope, faTrashCan, faCircleUser, faCircleCheck, faCircleXmark, faUsers } from "@fortawesome/free-solid-svg-icons";
import { isStaff } from "~/utils/roleHelpers";
import { useAuth } from "~/hooks/useAuth";

type OutletContext = {
    user: User;
    refreshUser: () => Promise<void>;
    userId: string | undefined;
};

export default function UserPerfil() {
    const { t } = useTranslation();
    const { userId } = useParams();
    const { user, refreshUser } = useOutletContext<OutletContext>();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: user.name,
        email: user.email ?? "",
    });
    const [dirty, setDirty] = useState(false);
    const [givingAccess, setGivingAccess] = useState(false);
    const [savingStaff, setSavingStaff] = useState(false);
    const [staffForm, setStaffForm] = useState({
        photo: user.staff?.photo || "",
        photoOriginal: user.staff?.photoOriginal ?? null,
        photoEdit: user.staff?.photoEdit ?? null,
        bio: user.staff?.bio || "",
        funFact: user.staff?.funFact || "",
        nickname: user.staff?.nickname || "",
        instagramUrl: user.staff?.instagramUrl || "",
        photoConsent: user.staff?.photoConsent ?? false,
    });
    const [staffDirty, setStaffDirty] = useState(false);
    const [togglingManual, setTogglingManual] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmDeleteStaff, setConfirmDeleteStaff] = useState(false);
    const userIsStaff = isStaff(user);
    const isManualStaff = user.staff?.manual ?? false;
    const hasStaffRole = isStaff({ groupRoles: user.groupRoles });
    // Mostrar la foto lo decide cada persona: un admin puede retirar el permiso de otro, pero no darlo
    const { user: currentUser } = useAuth();
    const canConsent = currentUser?.id === user.id || (user.staff?.photoConsent ?? false);

    const handleChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setDirty(true);
    };

    const handleStaffChange = (field: string, value: string | boolean) => {
        setStaffForm(prev => ({ ...prev, [field]: value }));
        setStaffDirty(true);
    };

    const handleSave = async () => {
        if (!userId) return;
        try {
            setSaving(true);
            await adminUserService.updateUserDetails({
                id: userId,
                name: form.name,
                email: form.email,
            });
            toast.success(t('users.profileUpdated'));
            setDirty(false);
            await refreshUser();
        } catch (err) {
            toast.error(getErrorMessage(err, t('users.saveError')));
        } finally {
            setSaving(false);
        }
    };

    // Persona dada de alta sin cuenta: guarda el correo y le envía el enlace para crear su contraseña
    const handleGiveAccess = async () => {
        if (!userId) return;
        try {
            setGivingAccess(true);
            await adminUserService.giveAccountAccess(userId, form.email.trim());
            toast.success(t('staff.accessSent', { email: form.email.trim() }));
            setDirty(false);
            await refreshUser();
        } catch (err) {
            toast.error(getErrorMessage(err, t('staff.accessError')));
        } finally {
            setGivingAccess(false);
        }
    };

    const handleStaffSave = async () => {
        if (!userId) return;
        try {
            setSavingStaff(true);
            await adminUserService.updateStaff(userId, staffForm);
            toast.success(t('users.staffCardUpdated'));
            setStaffDirty(false);
            await refreshUser();
        } catch (err) {
            toast.error(getErrorMessage(err, t('users.saveError')));
        } finally {
            setSavingStaff(false);
        }
    };

    const handleManualToggle = async (manual: boolean) => {
        if (!userId) return;
        try {
            setTogglingManual(true);
            const updated = await adminUserService.setManualStaff(userId, manual);
            setStaffForm({
                photo: updated.staff?.photo || "",
                photoOriginal: updated.staff?.photoOriginal ?? null,
                photoEdit: updated.staff?.photoEdit ?? null,
                bio: updated.staff?.bio || "",
                funFact: updated.staff?.funFact || "",
                nickname: updated.staff?.nickname || "",
                instagramUrl: updated.staff?.instagramUrl || "",
                photoConsent: updated.staff?.photoConsent ?? false,
            });
            setStaffDirty(false);
            toast.success(manual ? t('users.addedToStaff') : t('users.removedFromStaff'));
            await refreshUser();
        } catch (err) {
            toast.error(getErrorMessage(err, t('users.saveError')));
        } finally {
            setTogglingManual(false);
        }
    };

    // Texto del post de #comosenotaqueeresdeyambo a partir de la ficha
    const copyInstagramCaption = async () => {
        const displayName = (staffForm.nickname || form.name).toUpperCase();
        const caption = `Hoy es Lunes de\n#comosenotaqueeresdeyambo\n\nY hoy traemos a.......\n\n💛 ${displayName}\n\n${staffForm.bio}`;
        try {
            await navigator.clipboard.writeText(caption);
            toast.success(t('users.captionCopied'));
        } catch {
            toast.error(t('users.captionCopyError'));
        }
    };

    const executeDeleteStaff = async () => {
        if (!userId) return;
        try {
            await adminUserService.deleteStaff(userId);
            setStaffForm({ photo: "", photoOriginal: null, photoEdit: null, bio: "", funFact: "", nickname: "", instagramUrl: "", photoConsent: false });
            setStaffDirty(false);
            toast.success(t('users.staffCardDeleted'));
            await refreshUser();
        } catch (err) {
            toast.error(getErrorMessage(err, t('users.staffCardDeleteError')));
        } finally {
            setConfirmDeleteStaff(false);
        }
    };

    const handleDelete = () => {
        if (!userId) return;
        setConfirmDelete(true);
    };

    const executeDelete = async () => {
        if (!userId) return;
        try {
            await adminUserService.deleteUser(userId);
            toast.success(t('users.userDeleted'));
            window.history.back();
        } catch (err) {
            toast.error(getErrorMessage(err, t('users.deleteError')));
        } finally {
            setConfirmDelete(false);
        }
    };

    return (
        <div className="max-w-3xl space-y-6">
            {/* Profile form */}
            <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 bg-gradient-to-r from-yambo-green-50/40 to-transparent border-b border-gray-100">
                    <h2 className="font-bold text-yambo-black flex items-center gap-2">
                        <FontAwesomeIcon icon={faCircleUser} className="w-4 h-4 text-yambo-green-600" />
                        {t('users.personalInfo')}
                    </h2>
                </div>
                <div className="p-5 sm:p-6">
                    {/* Name + Email side by side on desktop */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <InputComponent
                            label={t('common.name')}
                            value={form.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                        />
                        <InputComponent
                            label={t('users.email')}
                            type="email"
                            value={form.email}
                            onChange={(e) => handleChange("email", e.target.value)}
                        />
                    </div>

                    {user.hasAccount === false && (
                        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                            <p className="text-sm text-amber-800">{t('users.noAccountHint')}</p>
                            <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                                <ButtonComponent
                                    variant="neutral"
                                    size="sm"
                                    onClick={handleGiveAccess}
                                    disabled={givingAccess || !form.email.trim()}
                                    className="shrink-0"
                                >
                                    <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4 mr-1.5" />
                                    {givingAccess ? t('staff.sending') : t('staff.giveAccess')}
                                </ButtonComponent>
                            </RequirePermission>
                        </div>
                    )}

                    <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                        <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                            <ButtonComponent variant="primary" onClick={handleSave} disabled={saving || !dirty} className="w-full sm:w-auto">
                                <FontAwesomeIcon icon={faFloppyDisk} className="w-4 h-4 mr-1.5" />
                                {saving ? t('common.saving') : t('users.saveChanges')}
                            </ButtonComponent>
                        </div>
                    </RequirePermission>
                </div>
            </section>

            {/* Staff */}
            <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 bg-gradient-to-r from-yambo-green-50/40 to-transparent border-b border-gray-100">
                    <h2 className="font-bold text-yambo-black flex items-center gap-2">
                        <FontAwesomeIcon icon={faUsers} className="w-4 h-4 text-yambo-green-600" />
                        {t('users.staffSection')}
                    </h2>
                </div>
                <div className="p-5 sm:p-6">
                    <div className="grid gap-5">
                        <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                            <label className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 px-4 py-3 cursor-pointer">
                                <span>
                                    <span className="block text-sm font-medium text-gray-700">{t('users.addToStaffManually')}</span>
                                    <span className="block text-xs text-gray-400 mt-0.5">
                                        {hasStaffRole
                                            ? t('users.staffByRolesHint')
                                            : t('users.staffManualHint')}
                                    </span>
                                </span>
                                <CheckboxComponent
                                    variantType="toggle"
                                    className="shrink-0 mt-0.5"
                                    checked={isManualStaff}
                                    disabled={togglingManual}
                                    onChange={(e) => handleManualToggle(e.target.checked)}
                                />
                            </label>
                        </RequirePermission>

                        {!userIsStaff && (
                            <p className="text-sm text-gray-500">
                                {t('users.notStaffHint')}
                            </p>
                        )}

                        {userIsStaff && (
                            <>
                                {/* Photo */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('users.photo')}</label>
                                    <StaffPhotoField
                                        placeholder={form.name.charAt(0).toUpperCase()}
                                        value={staffForm}
                                        onChange={(photo) => {
                                            setStaffForm(prev => ({ ...prev, ...photo }));
                                            setStaffDirty(true);
                                        }}
                                    />
                                </div>

                                {/* Nickname */}
                                <InputComponent
                                    label={t('users.nickname')}
                                    value={staffForm.nickname}
                                    onChange={(e) => handleStaffChange("nickname", e.target.value)}
                                    maxLength={50}
                                    placeholder={t('users.nicknamePlaceholder')}
                                />

                                {/* Bio */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('users.bioLabel')}</label>
                                    <textarea
                                        value={staffForm.bio}
                                        onChange={(e) => handleStaffChange("bio", e.target.value)}
                                        placeholder={t('users.bioPlaceholder')}
                                        rows={6}
                                        maxLength={500}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none transition-shadow focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 focus:border-yambo-green-500"
                                    />
                                    <p className="text-xs text-gray-400 mt-1 text-right">{staffForm.bio.length}/500</p>
                                </div>

                                {/* Fun fact */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('users.funFact')}</label>
                                    <input
                                        type="text"
                                        value={staffForm.funFact}
                                        onChange={(e) => handleStaffChange("funFact", e.target.value)}
                                        placeholder={t('users.funFactPlaceholder')}
                                        maxLength={100}
                                        className="w-full border border-gray-200 rounded-2xl text-sm px-4 py-2.5 transition-all duration-200 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-yambo-green-300 focus:border-yambo-green-400 placeholder-gray-400 bg-white"
                                    />
                                </div>

                                {/* Instagram */}
                                <div>
                                    <InputComponent
                                        label={t('users.instagramUrl')}
                                        type="url"
                                        value={staffForm.instagramUrl}
                                        onChange={(e) => handleStaffChange("instagramUrl", e.target.value)}
                                        maxLength={300}
                                        placeholder="https://www.instagram.com/p/..."
                                    />
                                    <button type="button"
                                        onClick={copyInstagramCaption}
                                        disabled={!staffForm.bio}
                                        className="mt-1.5 text-xs text-yambo-green-600 hover:underline disabled:text-gray-300 disabled:no-underline"
                                    >
                                        {t('users.copyInstagramCaption')}
                                    </button>
                                </div>

                                {/* Public visibility */}
                                <label className={`flex items-start justify-between gap-4 rounded-xl border border-gray-200 px-4 py-3 ${canConsent ? "cursor-pointer" : "opacity-60 cursor-not-allowed"}`}>
                                    <span>
                                        <span className="block text-sm font-medium text-gray-700">{t('users.photoConsent')}</span>
                                        <span className="block text-xs text-gray-400 mt-0.5">
                                            {canConsent
                                                ? t('users.photoConsentHint')
                                                : t('users.photoConsentOnlySelf')}
                                            {user.staff?.photoConsentAt && (
                                                <> {t('users.photoConsentSince', { date: new Date(user.staff.photoConsentAt).toLocaleDateString() })}</>
                                            )}
                                        </span>
                                    </span>
                                    <CheckboxComponent
                                        variantType="toggle"
                                        className="shrink-0 mt-0.5"
                                        disabled={!canConsent}
                                        checked={staffForm.photoConsent}
                                        onChange={(e) => handleStaffChange("photoConsent", e.target.checked)}
                                    />
                                </label>
                            </>
                        )}
                    </div>

                    {userIsStaff && (
                        <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                            <div className="mt-6 flex flex-col sm:flex-row justify-between gap-3">
                                <ButtonComponent variant="danger-text" onClick={() => setConfirmDeleteStaff(true)} className="w-full sm:w-auto">
                                    <FontAwesomeIcon icon={faTrashCan} className="w-4 h-4 mr-1.5" />
                                    {t('users.deleteStaffCard')}
                                </ButtonComponent>
                                <ButtonComponent variant="primary" onClick={handleStaffSave} disabled={savingStaff || !staffDirty} className="w-full sm:w-auto">
                                    <FontAwesomeIcon icon={faFloppyDisk} className="w-4 h-4 mr-1.5" />
                                    {savingStaff ? t('common.saving') : t('users.saveStaffCard')}
                                </ButtonComponent>
                            </div>
                        </RequirePermission>
                    )}
                </div>
            </section>

            <ConfirmDialog
                isOpen={confirmDeleteStaff}
                onClose={() => setConfirmDeleteStaff(false)}
                onConfirm={executeDeleteStaff}
                title={t('users.deleteStaffCardTitle')}
                message={t('users.deleteStaffCardMessage', { name: user.name })}
                confirmLabel={t('users.deleteStaffCard')}
                variant="danger"
            />

            {/* Estado */}
            <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 bg-gradient-to-r from-yambo-green-50/40 to-transparent border-b border-gray-100">
                    <h2 className="font-bold text-yambo-black flex items-center gap-2">
                        <FontAwesomeIcon icon={user.enabled ? faCircleCheck : faCircleXmark} className={`w-4 h-4 ${user.enabled ? "text-yambo-green-600" : "text-coral"}`} />
                        {t('users.accountStatus')}
                    </h2>
                </div>
                <div className="p-5 sm:p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-3 h-3 rounded-full ${user.enabled ? "bg-yambo-green-500" : "bg-coral"}`} />
                        <span className="text-sm font-medium text-gray-700">
                            {user.enabled ? t('users.accountActive') : t('users.accountDisabled')}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 ml-6">
                        {user.enabled
                            ? t('users.accountActiveHint')
                            : t('users.accountDisabledHint')
                        }
                    </p>
                </div>
            </section>

            {/* Danger zone */}
            <RequirePermission permission={{ obj: "user", action: "delete" }} redirect={false}>
                {!user.system && (
                    <section className="bg-white rounded-2xl border border-red-200 overflow-hidden">
                        <div className="px-5 py-4 bg-gradient-to-r from-red-50/60 to-transparent border-b border-red-100">
                            <h2 className="font-bold text-red-600 flex items-center gap-2">
                                <FontAwesomeIcon icon={faTrashCan} className="w-4 h-4" />
                                {t('users.dangerZone')}
                            </h2>
                        </div>
                        <div className="p-5 sm:p-6">
                            <p className="text-sm text-gray-500 mb-4">
                                {t('users.deleteUserHint')}
                            </p>
                            <ButtonComponent variant="destructive" size="sm" onClick={handleDelete} className="w-full sm:w-auto">
                                <FontAwesomeIcon icon={faTrashCan} className="w-4 h-4 mr-1.5" />
                                {t('users.deleteUser')}
                            </ButtonComponent>
                        </div>
                    </section>
                )}
            <ConfirmDialog
                isOpen={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                onConfirm={executeDelete}
                title={t('users.deleteUser')}
                message={t('users.deleteUserMessage', { name: user.name })}
                confirmLabel={t('common.delete')}
                variant="danger"
            />
        </RequirePermission>
        </div>
    );
}
