import { useTranslation } from "react-i18next";
import InputComponent from "~/components/common/forms/InputComponent";
import CheckboxComponent from "~/components/common/forms/CheckboxComponent";
import FileUploader from "~/components/common/FileUploader";
import type { Project } from "~/services/projectService";

export type ProjectFormValues = {
    name: string;
    season: string;
    active: boolean;
    description: string;
    image: string;
    featured: boolean;
    signatureColor: string;
    coordinationEmail: string;
};

export const EMPTY_PROJECT_FORM: ProjectFormValues = {
    name: "",
    season: "",
    active: true,
    description: "",
    image: "",
    featured: false,
    signatureColor: "",
    coordinationEmail: "",
};

export function toProjectForm(project: Project): ProjectFormValues {
    return {
        name: project.name,
        season: project.season || "",
        active: project.active,
        description: project.description || "",
        image: project.image || "",
        featured: project.featured,
        signatureColor: project.signatureColor || "",
        coordinationEmail: project.coordinationEmail || "",
    };
}

/** Los campos comunes a crear y editar; el correo de coordinación lo pone quien llama. */
export function toProjectRequest(form: ProjectFormValues) {
    return {
        name: form.name,
        season: form.season || null,
        active: form.active,
        description: form.description || null,
        image: form.image || null,
        featured: form.featured,
        signatureColor: form.signatureColor || null,
    };
}

// Same rule the backend applies after trimming
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidCoordinationEmail(value: string): boolean {
    const trimmed = value.trim();
    return trimmed === "" || (trimmed.length <= 254 && EMAIL_PATTERN.test(trimmed));
}

interface ProjectFormFieldsProps {
    form: ProjectFormValues;
    onChange: (form: ProjectFormValues) => void;
    coordinationEmailError: string | null;
    onCoordinationEmailErrorClear: () => void;
    disabled?: boolean;
}

export function ProjectFormFields({ form, onChange, coordinationEmailError, onCoordinationEmailErrorClear, disabled }: ProjectFormFieldsProps) {
    const { t } = useTranslation();
    const set = (patch: Partial<ProjectFormValues>) => onChange({ ...form, ...patch });

    return (
        <fieldset disabled={disabled} className="grid gap-4 min-w-0">
            <div className="grid sm:grid-cols-2 gap-4">
                <InputComponent label={t("common.name")} value={form.name} onChange={(e) => set({ name: e.target.value })} />
                <InputComponent label={t("common.season")} value={form.season} onChange={(e) => set({ season: e.target.value })} />
            </div>
            <FileUploader
                compact
                multiple={false}
                label={t("projects.image")}
                accept="image/jpeg,image/png,image/gif,image/webp"
                onUpload={(file) => set({ image: file.url })}
            />
            {form.image && (
                <img src={form.image} alt={t("projects.preview")} className="h-20 w-20 object-cover rounded-xl border border-gray-100" />
            )}
            <div>
                <InputComponent
                    id="project-coordination-email"
                    type="email"
                    label={t("projects.coordinationEmail")}
                    placeholder={t("projects.coordinationEmailPlaceholder")}
                    value={form.coordinationEmail}
                    maxLength={254}
                    aria-invalid={coordinationEmailError ? true : undefined}
                    aria-describedby="project-coordination-email-help"
                    onChange={(e) => {
                        const value = e.target.value;
                        set({ coordinationEmail: value });
                        if (coordinationEmailError && isValidCoordinationEmail(value)) onCoordinationEmailErrorClear();
                    }}
                />
                {coordinationEmailError ? (
                    <p id="project-coordination-email-help" role="alert" className="text-xs text-red-600 mt-1">
                        {coordinationEmailError}
                    </p>
                ) : (
                    <p id="project-coordination-email-help" className="text-xs text-gray-400 mt-1">
                        {t("projects.coordinationEmailHelp")}
                    </p>
                )}
            </div>
            <div>
                <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 mb-1">{t("common.description")}</label>
                <textarea
                    id="project-description"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-yambo-green-500 focus:ring-1 focus:ring-yambo-green-500/50 resize-y"
                    rows={3}
                    maxLength={1000}
                    value={form.description}
                    placeholder={t("projects.descriptionPlaceholder")}
                    onChange={(e) => set({ description: e.target.value })}
                />
                <p className="text-xs text-gray-400 text-right mt-1">{form.description.length}/1000</p>
            </div>
            <div className="flex flex-wrap gap-6">
                <CheckboxComponent label={t("common.active")} variant="left" checked={form.active} onChange={(e) => set({ active: e.target.checked })} />
                <CheckboxComponent label={t("projects.featuredOnHome")} variant="left" checked={form.featured} onChange={(e) => set({ featured: e.target.checked })} />
            </div>
            <div>
                <label htmlFor="project-signature-color" className="block text-sm font-medium text-gray-700 mb-1">{t("projects.signatureColor")}</label>
                <div className="flex items-center gap-3">
                    <input
                        type="color"
                        aria-label={t("projects.signatureColor")}
                        value={form.signatureColor || "#33a35e"}
                        onChange={(e) => set({ signatureColor: e.target.value })}
                        className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                    />
                    <input
                        id="project-signature-color"
                        type="text"
                        placeholder="#33a35e"
                        value={form.signatureColor}
                        onChange={(e) => set({ signatureColor: e.target.value })}
                        className="w-32 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yambo-green-500 focus:ring-1 focus:ring-yambo-green-500/50"
                        maxLength={7}
                    />
                </div>
            </div>
        </fieldset>
    );
}
