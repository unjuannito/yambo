import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan, faUserSlash } from "@fortawesome/free-solid-svg-icons";
import { RequirePermission } from "~/components/common/RequirePermission";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { UnsavedChangesGuard, UnsavedChangesNotice } from "~/components/common/UnsavedChanges";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import {
    ProjectFormFields,
    isValidCoordinationEmail,
    toProjectForm,
    toProjectRequest,
    type ProjectFormValues,
} from "~/components/dashboard/team/ProjectFormFields";
import { projectService } from "~/services/projectService";
import { projectRoleInvitationService } from "~/services/projectRoleInvitationService";
import { ApiError, getErrorMessage } from "~/types/error";
import type { ProjectContext } from "./_layout";

type Danger = "deleteProject" | "revokeParents" | null;

export default function ProjectSettings() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { project, reloadProjects } = useOutletContext<ProjectContext>();
    const [form, setForm] = useState<ProjectFormValues>(() => toProjectForm(project));
    const [emailError, setEmailError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [danger, setDanger] = useState<Danger>(null);
    // Al borrar el proyecto ya no hay nada que proteger
    const [deleted, setDeleted] = useState(false);

    useEffect(() => {
        setForm(toProjectForm(project));
        setEmailError(null);
    }, [project]);

    const saved = toProjectForm(project);
    const dirty = !deleted && (Object.keys(saved) as (keyof ProjectFormValues)[]).some((key) => saved[key] !== form[key]);

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error(t("projects.nameRequired"));
            return;
        }
        if (!isValidCoordinationEmail(form.coordinationEmail)) {
            setEmailError(t("projects.coordinationEmailInvalid"));
            return;
        }
        setEmailError(null);
        try {
            setSaving(true);
            // El correo vacío se envía tal cual para que el backend lo borre
            await projectService.updateProject(project.id, {
                ...toProjectRequest(form),
                coordinationEmail: form.coordinationEmail.trim(),
            });
            toast.success(t("projects.updated"));
            await reloadProjects();
        } catch (err) {
            if (err instanceof ApiError && err.message === "Invalid coordination email") {
                setEmailError(t("projects.coordinationEmailInvalid"));
                return;
            }
            toast.error(getErrorMessage(err, t("projects.saveError")));
        } finally {
            setSaving(false);
        }
    };

    const confirmDanger = async () => {
        const action = danger;
        setDanger(null);
        try {
            if (action === "deleteProject") {
                await projectService.deleteProject(project.id);
                setDeleted(true);
                toast.success(t("projects.deleted"));
                navigate("/mi-espacio/proyectos");
                await reloadProjects();
            } else if (action === "revokeParents") {
                toast.success(await projectRoleInvitationService.revokeAllParentRolesByProject(project.id));
            }
        } catch (err) {
            toast.error(getErrorMessage(err, action === "deleteProject" ? t("projects.deleteError") : t("team.revokeParentsError")));
        }
    };

    return (
        <RequirePermission permission={{ obj: "project", action: "update" }} redirect={false}>
            <UnsavedChangesGuard when={dirty} />
            <div className="max-w-2xl">
                <ProjectFormFields
                    form={form}
                    onChange={setForm}
                    coordinationEmailError={emailError}
                    onCoordinationEmailErrorClear={() => setEmailError(null)}
                />
                <div className="flex flex-wrap items-center justify-end gap-3 mt-6">
                    <UnsavedChangesNotice show={dirty} />
                    <ButtonComponent onClick={handleSave} variant="primary" disabled={saving || !dirty}>
                        {saving ? t("common.saving") : t("common.saveChanges")}
                    </ButtonComponent>
                </div>

                <div className="mt-10 rounded-2xl border border-red-100 bg-red-50/40 p-4 space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-red-700">{t("team.dangerZone")}</h3>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-gray-600 max-w-md">{t("team.revokeParentsHint")}</p>
                        <ButtonComponent variant="destructive-text" size="sm" onClick={() => setDanger("revokeParents")}>
                            <FontAwesomeIcon icon={faUserSlash} className="mr-2" />
                            {t("team.revokeParents")}
                        </ButtonComponent>
                    </div>
                    <RequirePermission permission={{ obj: "project", action: "delete" }} redirect={false}>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-red-100 pt-4">
                            <p className="text-sm text-gray-600 max-w-md">{t("team.deleteProjectHint")}</p>
                            <ButtonComponent variant="destructive" size="sm" onClick={() => setDanger("deleteProject")}>
                                <FontAwesomeIcon icon={faTrashCan} className="mr-2" />
                                {t("team.deleteProject")}
                            </ButtonComponent>
                        </div>
                    </RequirePermission>
                </div>
            </div>

            <ConfirmDialog
                isOpen={danger !== null}
                onClose={() => setDanger(null)}
                onConfirm={confirmDanger}
                title={danger === "revokeParents" ? t("team.revokeParents") : t("team.deleteProject")}
                message={danger === "revokeParents" ? t("team.revokeParentsConfirm") : t("projects.confirmDelete", { name: project.name })}
                confirmLabel={t("common.delete")}
                variant="danger"
            />
        </RequirePermission>
    );
}
