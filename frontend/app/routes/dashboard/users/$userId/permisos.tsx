import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router";
import { adminUserService } from "~/services/adminUserService";
import { profileService, type Profile } from "~/services/profileService";
import type { User } from "~/types/userType";
import { RequirePermission } from "~/components/common/RequirePermission";
import MultiSelectComponent from "~/components/common/forms/MultiSelectComponent";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShieldHalved, faFloppyDisk, faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";

type OutletContext = {
    user: User;
    refreshUser: () => Promise<void>;
    userId: string | undefined;
};

export default function UserPermisos() {
    const { t } = useTranslation();
    const { user, refreshUser, userId } = useOutletContext<OutletContext>();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>(user.profiles.map(p => p.id));
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        profileService.getAllProfiles()
            .then(data => setProfiles(data))
            .catch(err => toast.error(getErrorMessage(err, "Error al cargar perfiles")))
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        if (!userId) return;
        try {
            setSaving(true);
            await adminUserService.updateUserProfiles(userId, selectedIds);
            toast.success("Permisos actualizados");
            await refreshUser();
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al guardar permisos"));
        } finally {
            setSaving(false);
        }
    };

    const hasChanged = JSON.stringify([...selectedIds].sort()) !== JSON.stringify([...user.profiles.map(p => p.id)].sort());

    if (loading) {
        return <LoadingSpinner size="md" message="Cargando perfiles..." />;
    }

    return (
        <div className="max-w-2xl space-y-6">
            {/* Profile selector */}
            <section className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-yambo-black mb-4">Perfiles asignados</h2>
                <p className="text-sm text-gray-500 mb-4">
                    Los perfiles determinan qué acciones puede realizar el usuario en la plataforma.
                </p>
                <MultiSelectComponent
                    label="Seleccionar perfiles"
                    value={selectedIds}
                    options={profiles.map(p => ({ value: p.id, label: p.name }))}
                    placeholder="Buscar perfiles..."
                    onChange={(e) => {
                        const selected = Array.from(
                            (e.target as HTMLSelectElement).selectedOptions,
                            (option) => option.value,
                        );
                        setSelectedIds(selected);
                    }}
                />
                {hasChanged && (
                    <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                        <div className="mt-6 flex justify-end">
                            <ButtonComponent variant="primary" onClick={handleSave} disabled={saving}>
                                <FontAwesomeIcon icon={faFloppyDisk} className="w-4 h-4 mr-1.5" />
                                {saving ? "Guardando..." : "Guardar cambios"}
                            </ButtonComponent>
                        </div>
                    </RequirePermission>
                )}
            </section>

            {/* Current profiles detail */}
            <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-yambo-green-50/40 to-transparent border-b border-gray-100">
                    <h2 className="font-bold text-yambo-black">Permisos por perfil</h2>
                </div>
                <div className="divide-y divide-gray-50">
                    {user.profiles.length > 0 ? user.profiles.map(profile => {
                        const fullProfile = profiles.find(p => p.id === profile.id);
                        return (
                            <div key={profile.id} className="px-6 py-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <FontAwesomeIcon icon={faShieldHalved} className="text-yambo-green-600 w-4 h-4" />
                                    <h3 className="font-semibold text-yambo-black">{profile.name}</h3>
                                </div>
                                {fullProfile?.permissions && fullProfile.permissions.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 ml-6">
                                        {fullProfile.permissions.map(perm => (
                                            <span key={perm.id} className="px-2 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs border border-gray-100">
                                                {perm.description || perm.id}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic ml-6">Sin permisos detallados</p>
                                )}
                            </div>
                        );
                    }) : (
                        <p className="px-6 py-4 text-sm text-gray-400 italic">Sin perfiles asignados</p>
                    )}
                </div>
            </section>
        </div>
    );
}
