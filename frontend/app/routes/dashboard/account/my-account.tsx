import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/my-account";
import { useAuth } from "~/hooks/useAuth";
import { useApiMutation } from "~/hooks/useApiMutation";
import { userService } from "~/services/userService";
import type { UpdateProfileRequest, ChangePasswordRequest } from "~/services/userService";
import type { CurrentUser } from "~/types/userType";
import InputComponent from "~/components/common/forms/InputComponent";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLock, faTrash, faCircleExclamation, faBell } from "@fortawesome/free-solid-svg-icons";
import FileUploader from "~/components/common/FileUploader";
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

  // Estados para el formulario de perfil
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    photo: user?.photo || "",
    bio: user?.bio || "",
    funFact: user?.funFact || "",
  });

  // Estados para el formulario de contraseña
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Estado para el diálogo de confirmación de eliminación
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Estado para preferencias de notificación
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    orderStatus: true,
    orderCancelled: true,
    issueCreated: true,
    issueComments: true,
    issueStatus: true,
  });

  // Errores de validación local
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Sincronizar datos del usuario cuando se carguen
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

  // Mutation para actualizar perfil
  const updateProfileMutation = useApiMutation<CurrentUser, UpdateProfileRequest>({
    mutationFn: (data) => userService.updateProfile(data),
    successMessage: "Perfil actualizado correctamente",
    onSuccess: () => {
      reload();
    },
  });

  // Mutation para cambiar contraseña
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

  // Mutation para eliminar cuenta
  const deleteAccountMutation = useApiMutation<string, void>({
    mutationFn: () => userService.deleteAccount(),
    successMessage: "Tu cuenta ha sido programada para eliminación. Recibirás un correo con más información.",
    onSuccess: () => {
      setShowDeleteDialog(false);
      logout();
      navigate("/login");
    },
  });

  // Mutation para actualizar preferencias de notificación
  const updateNotifPrefsMutation = useApiMutation<NotificationPreferences, NotificationPreferences>({
    mutationFn: (data) => userService.updateNotificationPreferences(data),
    successMessage: "Preferencias de notificación actualizadas",
    onSuccess: () => {
      reload();
    },
  });

  // Handlers
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres");
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
    <main className="flex flex-col items-center p-4 md:p-8 w-full bg-gray-50 min-h-screen">
      {/* Header con avatar */}
      <div className="mb-8 w-full max-w-5xl">
        <div className="flex items-center justify-center gap-6">
          {user?.photo ? (
            <img
              src={user.photo}
              alt={user.name}
              className="w-20 h-20 rounded-full object-cover shadow-lg"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {user ? getInitials(user.name) : "?"}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{user?.name || "Cargando..."}</h1>
            <p className="text-gray-500 mt-1">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 w-full max-w-5xl">
        {/* Sección de información del perfil */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg text-white">
                <UserIcon />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Información personal</h2>
                <p className="text-sm text-gray-500">Actualiza tu nombre y correo electrónico</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleProfileSubmit} className="p-6 space-y-5">
            <InputComponent
              label="Nombre completo"
              name="name"
              type="text"
              value={profileData.name}
              onChange={(e) =>
                setProfileData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
              minLength={2}
              maxLength={100}
              placeholder="Tu nombre completo"
            />
            <InputComponent
              label="Correo electrónico"
              name="email"
              type="email"
              value={profileData.email}
              onChange={(e) =>
                setProfileData((prev) => ({ ...prev, email: e.target.value }))
              }
              required
              placeholder="tu@email.com"
            />
            <FileUploader
              compact
              multiple={false}
              label="Foto de perfil"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onUpload={(file) =>
                setProfileData((prev) => ({ ...prev, photo: file.url }))
              }
            />
            {user?.groupRoles && user.groupRoles.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Roles en Grupos</label>
                <p className="text-sm text-gray-600">
                  {user.groupRoles.map(gr => {
                    const label = gr.groupName ? `${gr.groupName} (${gr.projectName})` : gr.projectName;
                    return `${gr.role === 'COORDINATOR' ? 'Coordinador' : 'Monitor'} - ${label}`;
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
                    placeholder="Cuéntanos algo sobre ti..."
                    rows={3}
                    maxLength={500}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
                    placeholder="Un dato curioso sobre ti..."
                    maxLength={100}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{profileData.funFact.length}/100</p>
                </div>
              </>
            )}
            <div className="flex justify-end pt-2">
              <ButtonComponent
                type="submit"
                variant="primary"
                loading={updateProfileMutation.isLoading}
              >
                Guardar cambios
              </ButtonComponent>
            </div>
          </form>
        </section>

        {/* Sección de cambio de contraseña */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-amber-100 border-b border-amber-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg text-white">
                <LockIcon />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Seguridad</h2>
                <p className="text-sm text-gray-500">Actualiza tu contraseña regularmente</p>
              </div>
            </div>
          </div>
          <form onSubmit={handlePasswordSubmit} className="p-6 space-y-5">
            <InputComponent
              label="Contraseña actual"
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
              label="Nueva contraseña"
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
              title="La contraseña debe tener al menos 8 caracteres"
              placeholder="Mínimo 8 caracteres"
            />
            <InputComponent
              label="Confirmar nueva contraseña"
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
              placeholder="Repite la nueva contraseña"
            />
            {passwordError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <FontAwesomeIcon icon={faCircleExclamation} className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700 text-sm">{passwordError}</p>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <ButtonComponent
                type="submit"
                variant="primary"
                loading={changePasswordMutation.isLoading}
              >
                Cambiar contraseña
              </ButtonComponent>
            </div>
          </form>
        </section>

        {/* Sección de preferencias de notificación */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg text-white">
                <BellIcon />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Notificaciones</h2>
                <p className="text-sm text-gray-500">Elige qué correos electrónicos deseas recibir</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleNotifPrefsSubmit} className="p-6 space-y-4">
            <NotifToggle
              label="Actualizaciones de pedidos"
              description="Recibe un correo cuando cambie el estado de tu pedido"
              checked={notifPrefs.orderStatus}
              onChange={(v) => setNotifPrefs((p) => ({ ...p, orderStatus: v }))}
            />
            <NotifToggle
              label="Cancelaciones de pedidos"
              description="Recibe un correo cuando se cancele un pedido"
              checked={notifPrefs.orderCancelled}
              onChange={(v) => setNotifPrefs((p) => ({ ...p, orderCancelled: v }))}
            />
            <NotifToggle
              label="Nuevas incidencias"
              description="Recibe un correo cuando se cree una incidencia en tu pedido"
              checked={notifPrefs.issueCreated}
              onChange={(v) => setNotifPrefs((p) => ({ ...p, issueCreated: v }))}
            />
            <NotifToggle
              label="Comentarios en incidencias"
              description="Recibe un correo cuando alguien comente en tu incidencia"
              checked={notifPrefs.issueComments}
              onChange={(v) => setNotifPrefs((p) => ({ ...p, issueComments: v }))}
            />
            <NotifToggle
              label="Cambios de estado de incidencias"
              description="Recibe un correo cuando cambie el estado de tu incidencia"
              checked={notifPrefs.issueStatus}
              onChange={(v) => setNotifPrefs((p) => ({ ...p, issueStatus: v }))}
            />
            <div className="flex justify-end pt-2">
              <ButtonComponent
                type="submit"
                variant="primary"
                loading={updateNotifPrefsMutation.isLoading}
              >
                Guardar preferencias
              </ButtonComponent>
            </div>
          </form>
        </section>

        {/* Sección de eliminación de cuenta */}
        <section className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-red-100 border-b border-red-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500 rounded-lg text-white">
                <TrashIcon />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-red-700">Zona de peligro</h2>
                <p className="text-sm text-red-500">Acciones irreversibles</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-4">
              <p className="text-gray-700 text-sm leading-relaxed">
                <strong className="text-red-700">Atención:</strong> Una vez que elimines tu cuenta,
                tendrás <strong>30 días</strong> para revertir esta acción contactando con soporte.
                Pasado ese tiempo, tu cuenta y todos tus datos serán eliminados permanentemente.
              </p>
            </div>
            <ButtonComponent
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className="w-full sm:w-auto"
            >
              <TrashIcon />
              <span className="ml-2">Eliminar mi cuenta</span>
            </ButtonComponent>
          </div>
        </section>
      </div>

      {/* Diálogo de confirmación para eliminar cuenta */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteAccount}
        title="¿Eliminar tu cuenta?"
        message="Esta acción es irreversible. Tu cuenta será programada para eliminación y se eliminará permanentemente después de 30 días. Durante este periodo puedes contactar con soporte para cancelar la eliminación."
        confirmLabel="Sí, eliminar mi cuenta"
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
    <label className="flex items-center justify-between gap-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
          checked ? "bg-purple-600" : "bg-gray-200"
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
