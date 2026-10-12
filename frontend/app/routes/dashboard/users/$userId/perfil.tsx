import { useState } from "react";
import { useParams, useOutletContext } from "react-router";
import { adminUserService } from "~/services/adminUserService";
import type { User } from "~/types/userType";
import { RequirePermission } from "~/components/common/RequirePermission";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import CheckboxComponent from "~/components/common/forms/CheckboxComponent";
import FileUploader from "~/components/common/FileUploader";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faTrashCan, faCircleUser, faCircleCheck, faCircleXmark, faUsers } from "@fortawesome/free-solid-svg-icons";
import { isStaff } from "~/utils/roleHelpers";

type OutletContext = {
    user: User;
    refreshUser: () => Promise<void>;
    userId: string | undefined;
};

export default function UserPerfil() {
    const { userId } = useParams();
    const { user, refreshUser } = useOutletContext<OutletContext>();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: user.name,
        email: user.email,
    });
    const [dirty, setDirty] = useState(false);
    const [savingStaff, setSavingStaff] = useState(false);
    const [staffForm, setStaffForm] = useState({
        photo: user.staff?.photo || "",
        bio: user.staff?.bio || "",
        funFact: user.staff?.funFact || "",
    });
    const [staffDirty, setStaffDirty] = useState(false);
    const [togglingManual, setTogglingManual] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const userIsStaff = isStaff(user);
    const isManualStaff = user.staff?.manual ?? false;
    const hasStaffRole = isStaff({ groupRoles: user.groupRoles });

    const handleChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setDirty(true);
    };

    const handleStaffChange = (field: string, value: string) => {
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
            toast.success("Perfil actualizado");
            setDirty(false);
            await refreshUser();
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al guardar"));
        } finally {
            setSaving(false);
        }
    };

    const handleStaffSave = async () => {
        if (!userId) return;
        try {
            setSavingStaff(true);
            await adminUserService.updateStaff(userId, staffForm);
            toast.success("Ficha del equipo actualizada");
            setStaffDirty(false);
            await refreshUser();
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al guardar"));
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
                bio: updated.staff?.bio || "",
                funFact: updated.staff?.funFact || "",
            });
            setStaffDirty(false);
            toast.success(manual ? "Añadido al equipo" : "Quitado del equipo");
            await refreshUser();
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al guardar"));
        } finally {
            setTogglingManual(false);
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
            toast.success("Usuario eliminado");
            window.history.back();
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al eliminar"));
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
                        Información personal
                    </h2>
                </div>
                <div className="p-5 sm:p-6">
                    {/* Name + Email side by side on desktop */}
                    <div className="grid md:grid-cols-2 gap-4">
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
                    </div>

                    <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                        <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                            <ButtonComponent variant="primary" onClick={handleSave} disabled={saving || !dirty} className="w-full sm:w-auto">
                                <FontAwesomeIcon icon={faFloppyDisk} className="w-4 h-4 mr-1.5" />
                                {saving ? "Guardando..." : "Guardar cambios"}
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
                        Equipo
                    </h2>
                </div>
                <div className="p-5 sm:p-6">
                    <div className="grid gap-5">
                        <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                            <label className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 px-4 py-3 cursor-pointer">
                                <span>
                                    <span className="block text-sm font-medium text-gray-700">Añadir al equipo manualmente</span>
                                    <span className="block text-xs text-gray-400 mt-0.5">
                                        {hasStaffRole
                                            ? "Ya forma parte del equipo por sus roles de monitor o coordinador en proyectos."
                                            : "Lo convierte en miembro del equipo aunque no tenga rol de monitor o coordinador en ningún proyecto."}
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
                                Este usuario no forma parte del equipo, así que no tiene ficha (foto, biografía y dato curioso).
                            </p>
                        )}

                        {userIsStaff && (
                            <>
                                {/* Photo */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Foto</label>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-yambo-green-100 flex items-center justify-center text-2xl font-bold text-yambo-green-700 shrink-0 overflow-hidden">
                                            {staffForm.photo
                                                ? <img src={staffForm.photo} alt={form.name} className="w-full h-full object-cover" />
                                                : form.name.charAt(0).toUpperCase()
                                            }
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <FileUploader
                                                compact
                                                multiple={false}
                                                accept="image/jpeg,image/png,image/gif,image/webp"
                                                label="Subir foto"
                                                onUpload={(file) => handleStaffChange("photo", file.url)}
                                            />
                                            {staffForm.photo && (
                                                <button type="button"
                                                    onClick={() => handleStaffChange("photo", "")}
                                                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    Quitar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Bio */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Biografía</label>
                                    <textarea
                                        value={staffForm.bio}
                                        onChange={(e) => handleStaffChange("bio", e.target.value)}
                                        placeholder="Breve biografía..."
                                        rows={3}
                                        maxLength={500}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none transition-shadow focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 focus:border-yambo-green-500"
                                    />
                                    <p className="text-xs text-gray-400 mt-1 text-right">{staffForm.bio.length}/500</p>
                                </div>

                                {/* Fun fact */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Dato curioso</label>
                                    <input
                                        type="text"
                                        value={staffForm.funFact}
                                        onChange={(e) => handleStaffChange("funFact", e.target.value)}
                                        placeholder="Un dato curioso..."
                                        maxLength={100}
                                        className="w-full border border-gray-200 rounded-2xl text-sm px-4 py-2.5 transition-all duration-200 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-yambo-green-300 focus:border-yambo-green-400 placeholder-gray-400 bg-white"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {userIsStaff && (
                        <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                            <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                                <ButtonComponent variant="primary" onClick={handleStaffSave} disabled={savingStaff || !staffDirty} className="w-full sm:w-auto">
                                    <FontAwesomeIcon icon={faFloppyDisk} className="w-4 h-4 mr-1.5" />
                                    {savingStaff ? "Guardando..." : "Guardar ficha"}
                                </ButtonComponent>
                            </div>
                        </RequirePermission>
                    )}
                </div>
            </section>

            {/* Estado */}
            <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 bg-gradient-to-r from-yambo-green-50/40 to-transparent border-b border-gray-100">
                    <h2 className="font-bold text-yambo-black flex items-center gap-2">
                        <FontAwesomeIcon icon={user.enabled ? faCircleCheck : faCircleXmark} className={`w-4 h-4 ${user.enabled ? "text-yambo-green-600" : "text-coral"}`} />
                        Estado de la cuenta
                    </h2>
                </div>
                <div className="p-5 sm:p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-3 h-3 rounded-full ${user.enabled ? "bg-yambo-green-500" : "bg-coral"}`} />
                        <span className="text-sm font-medium text-gray-700">
                            {user.enabled ? "Cuenta activa" : "Cuenta desactivada"}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 ml-6">
                        {user.enabled
                            ? "El usuario puede iniciar sesión y usar la plataforma."
                            : "El usuario no puede iniciar sesión hasta que se reactive."
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
                                Zona de peligro
                            </h2>
                        </div>
                        <div className="p-5 sm:p-6">
                            <p className="text-sm text-gray-500 mb-4">
                                Eliminar al usuario de forma permanente. No se puede deshacer.
                            </p>
                            <ButtonComponent variant="destructive" size="sm" onClick={handleDelete} className="w-full sm:w-auto">
                                <FontAwesomeIcon icon={faTrashCan} className="w-4 h-4 mr-1.5" />
                                Eliminar usuario
                            </ButtonComponent>
                        </div>
                    </section>
                )}
            <ConfirmDialog
                isOpen={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                onConfirm={executeDelete}
                title="Eliminar usuario"
                message={`¿Eliminar permanentemente a "${user.name}"? Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar"
                variant="danger"
            />
        </RequirePermission>
        </div>
    );
}
