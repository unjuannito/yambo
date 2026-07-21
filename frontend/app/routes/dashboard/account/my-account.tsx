import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/my-account";
import { useAuth } from "~/hooks/useAuth";
import { useApiMutation } from "~/hooks/useApiMutation";
import { userService } from "~/services/userService";
import { fileService } from "~/services/fileService";
import { useTranslation } from "react-i18next";
import type { UpdateProfileRequest, ChangePasswordRequest } from "~/services/userService";
import type { CurrentUser } from "~/types/userType";
import InputComponent from "~/components/common/forms/InputComponent";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLock, faTrash, faCircleExclamation, faBell, faCamera, faSpinner, faXmark } from "@fortawesome/free-solid-svg-icons";
import type { NotificationPreferences } from "~/types/userType";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Yambo - Mi cuenta" },
    { name: "Yambo - Mi cuenta", content: "Yambo - Mi cuenta" },
  ];
}

const UserIcon = () => <FontAwesomeIcon icon={faUser} className="w-5 h-5" />;
const LockIcon = () => <FontAwesomeIcon icon={faLock} className="w-5 h-5" />;
const TrashIcon = () => <FontAwesomeIcon icon={faTrash} className="w-5 h-5" />;
const BellIcon = () => <FontAwesomeIcon icon={faBell} className="w-5 h-5" />;

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function MyAccount() {
  const navigate = useNavigate();
  const { user, reload, logout } = useAuth();
  const { t } = useTranslation();

  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    photo: user?.photo || "",
    bio: user?.bio || "",
    funFact: user?.funFact || "",
  });

  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const openPhotoPicker = () => photoInputRef.current?.click();

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setPhotoError("La imagen no puede superar los 2 MB");
      return;
    }

    setPhotoError(null);
    setPhotoUploading(true);
    try {
      const uploaded = await fileService.upload(file);
      setProfileData((prev) => ({ ...prev, photo: uploaded.url }));
    } catch (err) {
      setPhotoError("Error al subir la imagen. Inténtalo de nuevo.");
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    orderStatus: true,
    orderCancelled: true,
    issueCreated: true,
    issueComments: true,
    issueStatus: true,
  });

  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name,
        email: user.email,
        photo: user.photo || "",
        bio: user.bio || "",
        funFact: user.funFact || "",
      });
      if (user.notificationPreferences) {
        setNotifPrefs(user.notificationPreferences);
      }
    }
  }, [user]);

  const updateProfileMutation = useApiMutation<CurrentUser, UpdateProfileRequest>({
    mutationFn: (data) => userService.updateProfile(data),
    successMessage: "Perfil actualizado correctamente",
    onSuccess: () => {
      reload();
    },
  });

  const changePasswordMutation = useApiMutation<void, ChangePasswordRequest>({
    mutationFn: (data) => userService.changePassword(data),
    successMessage: "Contraseña cambiada correctamente",
    onSuccess: () => {
      setPasswordData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
  });

  const deleteAccountMutation = useApiMutation<string, void>({
    mutationFn: () => userService.deleteAccount(),
    successMessage: "Tu cuenta ha sido programada para eliminación. Recibirás un correo con más información.",
    onSuccess: () => {
      setShowDeleteDialog(false);
      logout();
      navigate("/login");
    },
  });

  const updateNotifPrefsMutation = useApiMutation<NotificationPreferences, NotificationPreferences>({
    mutationFn: (data) => userService.updateNotificationPreferences(data),
    successMessage: "Preferencias de notificación actualizadas",
    onSuccess: () => {
      reload();
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
              setPasswordError(t('myAccount.passwordMismatch'));
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError(t('myAccount.passwordMinLength'));
      return;
    }

    changePasswordMutation.mutate({
      oldPassword: passwordData.oldPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
  };

  const handleNotifPrefsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateNotifPrefsMutation.mutate(notifPrefs);
  };

  return (
    <main className="flex flex-col items-center p-4 md:p-8 w-full min-h-screen">
      {/* Header con avatar */}
      <div className="mb-8 w-full max-w-5xl">
        <div className="flex items-center justify-center gap-6">
          {user?.photo ? (
            <img
              src={user.photo}
              alt={user.name}
              className="w-20 h-20 rounded-full object-cover shadow-lg ring-4 ring-yambo-green-100"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yambo-green-400 to-yambo-green-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {user ? getInitials(user.name) : "?"}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-extrabold font-display text-yambo-black">{user?.name || "Cargando..."}</h1>
            <p className="text-gray-400 mt-1">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 w-full max-w-5xl">
        {/* Información personal */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-yambo-green-50 to-yambo-green-100/50 border-b border-yambo-green-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-yambo-green-500 to-yambo-green-600 rounded-xl text-white">
                <UserIcon />
              </div>
              <div>
                <h2 className="text-lg font-bold font-display text-yambo-black">{t('myAccount.personalInfo')}</h2>
                <p className="text-sm text-gray-400">{t('myAccount.personalInfoDesc')}</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleProfileSubmit} className="p-6 space-y-5">
            <InputComponent
              label={t('myAccount.fullName')}
              name="name"
              type="text"
              value={profileData.name}
              onChange={(e) =>
                setProfileData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
              minLength={2}
              maxLength={100}
              placeholder={t('myAccount.fullNamePlaceholder')}
            />
            <InputComponent
              label={t('myAccount.email')}
              name="email"
              type="email"
              value={profileData.email}
              onChange={(e) =>
                setProfileData((prev) => ({ ...prev, email: e.target.value }))
              }
              required
              placeholder="tu@email.com"
            />
            <div className="space-y-4">
              <div className="flex items-center gap-5">
                {profileData.photo ? (
                  <div className="relative group">
                    <img
                      src={profileData.photo}
                      alt="Foto de perfil"
                      className="w-24 h-24 rounded-full object-cover shadow-md ring-4 ring-yambo-green-100"
                    />
                    <button
                      type="button"
                      onClick={() => setProfileData((prev) => ({ ...prev, photo: "" }))}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                      title="Eliminar foto"
                    >
                      <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yambo-green-400 to-yambo-green-600 flex items-center justify-center text-white text-3xl font-bold shadow-md ring-4 ring-yambo-green-100">
                    {getInitials(profileData.name || "?")}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700">{t('myAccount.profilePhoto')}</label>
                  <div className="flex gap-2">
                    <ButtonComponent type="button" variant="primary" size="sm" onClick={openPhotoPicker} disabled={photoUploading}>
                      {photoUploading ? (
                        <><FontAwesomeIcon icon={faSpinner} spin className="mr-1" /> Subiendo...</>
                      ) : (
                        <><FontAwesomeIcon icon={faCamera} className="mr-1" /> {profileData.photo ? "Cambiar foto" : "Subir foto"}</>
                      )}
                    </ButtonComponent>
                    {profileData.photo && (
                      <ButtonComponent type="button" variant="danger-text" size="sm" onClick={() => setProfileData((prev) => ({ ...prev, photo: "" }))}>
                        <FontAwesomeIcon icon={faTrash} className="mr-1" /> Eliminar
                      </ButtonComponent>
                    )}
                  </div>
                  {photoError && <p className="text-xs text-red-500">{photoError}</p>}
                  <p className="text-xs text-gray-400">JPEG, PNG, WebP. Máx 2 MB.</p>
                </div>
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
            {user?.groupRoles && user.groupRoles.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Roles en Grupos</label>
                <p className="text-sm text-gray-600">
                  {user.groupRoles.map(gr => {
                  const label = gr.groupName ? `${gr.groupName} (${gr.projectName})` : gr.projectName;
                  const roleLabel = gr.role === 'COORDINATOR' ? 'Coordinador' : gr.role === 'PARENT' ? 'Padre/Madre' : 'Monitor';
                  return `${roleLabel} - ${label}`;
                  }).join(", ")}
                </p>
              </div>
            )}
            {user?.groupRoles && user.groupRoles.length > 0 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Biografía</label>
                  <textarea
                    name="bio"
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    placeholder={t('myAccount.bioPlaceholder')}
                    rows={3}
                    maxLength={500}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 focus:border-yambo-green-500 resize-none transition-all"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{profileData.bio.length}/500</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dato curioso</label>
                  <input
                    name="funFact"
                    type="text"
                    value={profileData.funFact}
                    onChange={(e) =>
                      setProfileData((prev) => ({ ...prev, funFact: e.target.value }))
                    }
                    placeholder={t('myAccount.funFactPlaceholder')}
                    maxLength={100}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 focus:border-yambo-green-500 transition-all"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{profileData.funFact.length}/100</p>
                </div>
              </>
            )}
            <div className="flex justify-end pt-2">
              <ButtonComponent
                type="submit"
                variant="primary"
                isLoading={updateProfileMutation.isLoading}
              >
                {t('myAccount.saveChanges')}
              </ButtonComponent>
            </div>
          </form>
        </section>

        {/* Seguridad */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-amber-100/50 border-b border-amber-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl text-white">
                <LockIcon />
              </div>
              <div>
                <h2 className="text-lg font-bold font-display text-yambo-black">{t('myAccount.security')}</h2>
                <p className="text-sm text-gray-400">{t('myAccount.securityDesc')}</p>
              </div>
            </div>
          </div>
          <form onSubmit={handlePasswordSubmit} className="p-6 space-y-5">
            <InputComponent
              label={t('myAccount.currentPassword')}
              name="oldPassword"
              type="password"
              value={passwordData.oldPassword}
              onChange={(e) =>
                setPasswordData((prev) => ({
                  ...prev,
                  oldPassword: e.target.value,
                }))
              }
              required
              placeholder="••••••••"
            />
            <InputComponent
              label={t('myAccount.newPassword')}
              name="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData((prev) => ({
                  ...prev,
                  newPassword: e.target.value,
                }))
              }
              required
              minLength={8}
              pattern=".{8,}"
              title={t('myAccount.passwordMinLength')}
              placeholder={t('myAccount.newPasswordPlaceholder')}
            />
            <InputComponent
              label={t('myAccount.confirmNewPassword')}
              name="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData((prev) => ({
                  ...prev,
                  confirmPassword: e.target.value,
                }))
              }
              required
              minLength={8}
              placeholder={t('myAccount.confirmNewPasswordPlaceholder')}
            />
            {passwordError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <FontAwesomeIcon icon={faCircleExclamation} className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700 text-sm">{passwordError}</p>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <ButtonComponent
                type="submit"
                variant="primary"
                isLoading={changePasswordMutation.isLoading}
              >
                {t('myAccount.changePassword')}
              </ButtonComponent>
            </div>
          </form>
        </section>

        {/* Notificaciones */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-yambo-purple-50 to-yambo-purple-100/50 border-b border-yambo-purple-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-yambo-purple-400 to-yambo-purple-600 rounded-xl text-white">
                <BellIcon />
              </div>
              <div>
                <h2 className="text-lg font-bold font-display text-yambo-black">{t('myAccount.notifications')}</h2>
                <p className="text-sm text-gray-400">{t('myAccount.notificationsDesc')}</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleNotifPrefsSubmit} className="p-6 space-y-4">
            <NotifToggle
              label={t('myAccount.notifOrderUpdates')}
              description={t('myAccount.notifOrderUpdatesDesc')}
              checked={notifPrefs.orderStatus}
              onChange={(v) => setNotifPrefs((p) => ({ ...p, orderStatus: v }))}
            />
            <NotifToggle
              label={t('myAccount.notifOrderCancellations')}
              description={t('myAccount.notifOrderCancellationsDesc')}
              checked={notifPrefs.orderCancelled}
              onChange={(v) => setNotifPrefs((p) => ({ ...p, orderCancelled: v }))}
            />
            <NotifToggle
              label={t('myAccount.notifNewIssues')}
              description={t('myAccount.notifNewIssuesDesc')}
              checked={notifPrefs.issueCreated}
              onChange={(v) => setNotifPrefs((p) => ({ ...p, issueCreated: v }))}
            />
            <NotifToggle
              label={t('myAccount.notifIssueComments')}
              description={t('myAccount.notifIssueCommentsDesc')}
              checked={notifPrefs.issueComments}
              onChange={(v) => setNotifPrefs((p) => ({ ...p, issueComments: v }))}
            />
            <NotifToggle
              label={t('myAccount.notifIssueStatusChanges')}
              description={t('myAccount.notifIssueStatusChangesDesc')}
              checked={notifPrefs.issueStatus}
              onChange={(v) => setNotifPrefs((p) => ({ ...p, issueStatus: v }))}
            />
            <div className="flex justify-end pt-2">
              <ButtonComponent
                type="submit"
                variant="primary"
                isLoading={updateNotifPrefsMutation.isLoading}
              >
                {t('myAccount.savePreferences')}
              </ButtonComponent>
            </div>
          </form>
        </section>

        {/* Zona de peligro */}
        <section className="bg-white rounded-2xl shadow-sm border border-coral/30 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-red-100/50 border-b border-red-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-coral to-red-500 rounded-xl text-white">
                <TrashIcon />
              </div>
              <div>
                <h2 className="text-lg font-bold font-display text-red-700">{t('myAccount.dangerZone')}</h2>
                <p className="text-sm text-red-400">{t('myAccount.dangerZoneDesc')}</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4">
              <p className="text-gray-700 text-sm leading-relaxed">
                {t('myAccount.deleteWarning')}
              </p>
            </div>
            <ButtonComponent
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className="w-full sm:w-auto"
            >
              <TrashIcon />
              <span className="ml-2">{t('myAccount.deleteAccount')}</span>
            </ButtonComponent>
          </div>
        </section>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteAccount}
        title={t('myAccount.deleteConfirmTitle')}
        message={t('myAccount.deleteConfirmMessage')}
        confirmLabel={t('myAccount.deleteConfirmLabel')}
        cancelLabel="Cancelar"
        variant="danger"
        isLoading={deleteAccountMutation.isLoading}
      />
    </main>
  );
}

function NotifToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-yambo-green-50/30 cursor-pointer transition-colors">
      <div>
        <p className="text-sm font-medium text-yambo-black">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 focus:ring-offset-2 ${
          checked ? "bg-yambo-green-500" : "bg-gray-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}
