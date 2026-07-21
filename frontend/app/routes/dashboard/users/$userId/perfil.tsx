import { useState } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router";
import { adminUserService } from "~/services/adminUserService";
import type { User } from "~/types/userType";
import { RequirePermission } from "~/components/common/RequirePermission";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import FileUploader from "~/components/common/FileUploader";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faTrashCan, faBan, faCheck } from "@fortawesome/free-solid-svg-icons";

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
        email: user.email,
        photo: user.photo || "",
        bio: user.bio || "",
        funFact: user.funFact || "",
    });
    const [dirty, setDirty] = useState(false);

    const handleChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setDirty(true);
    };

    const handleSave = async () => {
        if (!userId) return;
        try {
            setSaving(true);
            await adminUserService.updateUserDetails({
                id: userId,
                name: form.name,
                email: form.email,
                photo: form.photo || undefined,
                bio: form.bio || undefined,
                funFact: form.funFact || undefined,
            });
            toast.success("Perfil actualizado");
            setDirty(false);
            await refreshUser();
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al guardar"));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!userId) return;
        if (!confirm(`¿Eliminar permanentemente a "${user.name}"? Esta acción no se puede deshacer.`)) return;
        try {
            await adminUserService.deleteUser(userId);
            toast.success("Usuario eliminado");
            // Navigate back to user list
            window.history.back();
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al eliminar"));
        }
    };

    return (
        <div className="max-w-2xl space-y-6">
            {/* Profile form */}
            <section className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-yambo-black mb-4">Información personal</h2>
                <div className="grid gap-4">
                    {/* Photo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Foto</label>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-yambo-green-100 flex items-center justify-center text-2xl font-bold text-yambo-green-700 shrink-0 overflow-hidden">
                                {form.photo
                                    ? <img src={form.photo} alt={form.name} className="w-full h-full object-cover" />
                                    : form.name.charAt(0).toUpperCase()
                                }
                            </div>
                            <FileUploader
                                compact
                                multiple={false}
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                label="Subir foto"
                                onUpload={(file) => handleChange("photo", file.url)}
                            />
                            {form.photo && (
                                <button
                                    onClick={() => handleChange("photo", "")}
                                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    Quitar
                                </button>
                            )}
                        </div>
                    </div>

                    <InputComponent
                        label="Nombre"
                        value={form.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                    />
                    <InputComponent
                        label="Email"
                        type="email"
                        value={form.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Biografía</label>
                        <textarea
                            value={form.bio}
                            onChange={(e) => handleChange("bio", e.target.value)}
                            placeholder="Breve biografía..."
                            rows={3}
                            maxLength={500}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 focus:border-yambo-green-500 resize-none"
                        />
                    </div>
                    <InputComponent
                        label="Dato curioso"
                        value={form.funFact}
                        onChange={(e) => handleChange("funFact", e.target.value)}
                        placeholder="Un dato curioso..."
                        maxLength={100}
                    />
                </div>

                <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                    <div className="mt-6 flex justify-end">
                        <ButtonComponent variant="primary" onClick={handleSave} disabled={saving || !dirty}>
                            <FontAwesomeIcon icon={faFloppyDisk} className="w-4 h-4 mr-1.5" />
                            {saving ? "Guardando..." : "Guardar cambios"}
                        </ButtonComponent>
                    </div>
                </RequirePermission>
            </section>

            {/* Estado */}
            <section className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-yambo-black mb-4">Estado de la cuenta</h2>
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${user.enabled ? "bg-yambo-green-500" : "bg-coral"}`} />
                    <span className="text-sm text-gray-700">{user.enabled ? "Cuenta activa" : "Cuenta desactivada"}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1 ml-5">
                    {user.enabled
                        ? "El usuario puede iniciar sesión y usar la plataforma."
                        : "El usuario no puede iniciar sesión hasta que se reactive."
                    }
                </p>
            </section>

            {/* Danger zone */}
            <RequirePermission permission={{ obj: "user", action: "delete" }} redirect={false}>
                {!user.system && (
                    <section className="bg-white rounded-2xl border border-red-200 p-6">
                        <h2 className="text-lg font-bold text-red-600 mb-2">Zona de peligro</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Eliminar al usuario de forma permanente. No se puede deshacer.
                        </p>
                        <ButtonComponent variant="destructive" size="sm" onClick={handleDelete}>
                            <FontAwesomeIcon icon={faTrashCan} className="w-4 h-4 mr-1.5" />
                            Eliminar usuario
                        </ButtonComponent>
                    </section>
                )}
            </RequirePermission>
        </div>
    );
}
