import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/my-account";
import { useAuth } from "~/hooks/useAuth";
import { useApiMutation } from "~/hooks/useApiMutation";
import { userService } from "~/services/userService";
import type { UpdateProfileRequest, ChangePasswordRequest } from "~/services/userService";
import InputComponent from "~/components/common/forms/InputComponent";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Yambo - Mi cuenta" },
    { name: "Yambo - Mi cuenta", content: "Yambo - Mi cuenta" },
  ];
}

// Iconos SVG inline para evitar dependencias
const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

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
  });

  // Estados para el formulario de contraseña
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Estado para el diálogo de confirmación de eliminación
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Errores de validación local
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Sincronizar datos del usuario cuando se carguen
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name,
        email: user.email,
      });
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

  return (
    <main className="flex flex-col items-center p-4 md:p-8 w-full bg-gray-50 min-h-screen">
      {/* Header con avatar */}
      <div className="mb-8 w-full max-w-5xl">
        <div className="flex items-center justify-center gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {user ? getInitials(user.name) : "?"}
          </div>
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
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
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

// Type import for the mutation
import type { CurrentUser } from "~/types/userType";
