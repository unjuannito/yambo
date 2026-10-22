import { useState } from "react";
import { useTranslation } from "react-i18next";
import InputComponent from "~/components/common/forms/InputComponent";
import SelectComponent from "~/components/common/forms/SelectComponent";
import LabelComponent from "~/components/common/forms/LabelComponent";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { ACTIVITY_STATUS_OPTIONS } from "~/types/activity";
import ActivityImageSourceModal from "./ActivityImageSourceModal";

interface ActivityFormProps {
    form: any;
    projectOptions: { value: string; label: string }[];
    managerOptions: { value: string; label: string }[];
    onChange: (field: string, value: any) => void;
    onSubmit: () => void;
    submitLabel: string;
    loading?: boolean;
}

const ActivityForm: React.FC<ActivityFormProps> = ({
    form,
    projectOptions,
    managerOptions,
    onChange,
    onSubmit,
    submitLabel,
    loading,
}) => {
    const { t } = useTranslation();
    const [imageModalOpen, setImageModalOpen] = useState(false);

    const imagePreviewSrc = form.image
        ? (form.image.startsWith("/") ? `/api${form.image}` : form.image)
        : null;

    const selectedStatus = ACTIVITY_STATUS_OPTIONS.find((option) => option.value === form.status);
    const formattedDate = form.date
        ? new Date(form.date).toLocaleString("es-ES", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
        : t('dashboard.freeOrPending');

    const formattedEndDate = form.endDate
        ? new Date(form.endDate).toLocaleString("es-ES", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
        : null;

    const formattedPrice = form.price ? `${Number(form.price).toFixed(2)} €` : t('dashboard.freeOrPending');

    return (
    <>
    <form
        className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]"
        onSubmit={e => {
            e.preventDefault();
            onSubmit();
        }}
    >
        <aside className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5 lg:border-r lg:border-slate-200 lg:bg-gradient-to-b lg:from-slate-50 lg:to-white">
            <div className="flex flex-col gap-5 lg:sticky lg:top-0">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t('dashboard.imageSection')}</p>
                    <h3 className="mt-1 text-lg font-black tracking-tight text-yambo-black">{t('dashboard.imagePreview')}</h3>
                    <p className="mt-1 text-sm text-gray-500">{t('dashboard.imageDescription')}</p>
                </div>

                <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                    {imagePreviewSrc ? (
                        <img src={imagePreviewSrc} alt={t('dashboard.preview')} className="h-52 w-full object-cover" />
                    ) : (
                        <div className="flex h-52 items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-50 px-6 text-center text-sm font-medium text-gray-400">
                            {t('dashboard.previewImageHere')}
                        </div>
                    )}

                    <div className="border-t border-slate-100 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <ButtonComponent type="button" variant="primary" onClick={() => setImageModalOpen(true)}>
                                {t('dashboard.uploadOrUseUrl')}
                            </ButtonComponent>
                            {form.image && (
                                <ButtonComponent type="button" variant="neutral" onClick={() => onChange("image", "")}>
                                    {t('dashboard.removeImage')}
                                </ButtonComponent>
                            )}
                        </div>
                    </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t('dashboard.preview')}</p>
                    <div className="mt-3 rounded-[22px] border border-slate-100 bg-slate-50/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                                {form.public ? t('dashboard.public') : t('dashboard.private')}
                            </span>
                            {selectedStatus && (
                                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                                    {selectedStatus.label}
                                </span>
                            )}
                        </div>
                        <h4 className="mt-3 text-lg font-black tracking-tight text-yambo-black">
                            {form.name || t('dashboard.newActivity')}
                        </h4>
                        <p className="mt-2 text-sm text-gray-500">
                            {form.location || t('dashboard.locationPending')}
                        </p>
                        <div className="mt-4 space-y-1 text-sm text-gray-500">
                            <p>{formattedDate}</p>
                            {formattedEndDate && <p>{t('common.until')} {formattedEndDate}</p>}
                            {!formattedEndDate && form.date && <p>{t('dashboard.noEndDate')}</p>}
                            <p>{formattedPrice}</p>
                        </div>
                    </div>
                </div>
            </div>
        </aside>

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
            <div className="mb-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t('dashboard.details')}</p>
                <h3 className="mt-1 text-xl font-black tracking-tight text-yambo-black">{t('dashboard.mainInfo')}</h3>
                <p className="mt-1 text-sm text-gray-500">{t('dashboard.mainInfoDesc')}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <InputComponent
                        label={t('dashboard.name')}
                        value={form.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("name", e.target.value)}
                        required
                    />
                </div>

                <div className="sm:col-span-2">
                    <LabelComponent label={t('dashboard.description')}>
                        <textarea
                            value={form.description ?? ""}
                            onChange={e => onChange("description", e.target.value)}
                            rows={5}
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yambo-green-300 focus:border-yambo-green-400 transition-all resize-y min-h-[120px]"
                            placeholder={t('dashboard.descriptionPlaceholder')}
                        />
                    </LabelComponent>
                </div>

                <div className="sm:col-span-2">
                    <InputComponent
                        label={t('dashboard.location')}
                        value={form.location}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("location", e.target.value)}
                        placeholder={t('dashboard.optionalLocation')}
                    />
                </div>

                <InputComponent
                    label={t('dashboard.price')}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("price", e.target.value)}
                    placeholder={t('dashboard.optionalPrice')}
                />

                <InputComponent
                    label={t('dashboard.startDate')}
                    type="datetime-local"
                    value={form.date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("date", e.target.value)}
                    required
                />
                <InputComponent
                    label={t('dashboard.endDate')}
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("endDate", e.target.value)}
                />

                <SelectComponent
                    label={t('dashboard.status')}
                    value={form.status}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange("status", e.target.value)}
                    options={ACTIVITY_STATUS_OPTIONS}
                />
                <SelectComponent
                    label={t('activities.public')}
                    value={form.public ? "true" : "false"}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange("public", e.target.value === "true")}
                    options={[{ value: "true", label: t('common.yes') }, { value: "false", label: t('common.no') }]}
                />

                <SelectComponent
                    label={t('dashboard.project')}
                    value={form.projectId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange("projectId", e.target.value)}
                    options={projectOptions}
                    required
                />
                <SelectComponent
                    label={t('dashboard.manager')}
                    value={form.managerId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange("managerId", e.target.value)}
                    options={[{ value: "", label: t('dashboard.noManager') }, ...managerOptions]}
                />
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <ButtonComponent type="submit" variant="primary" isLoading={loading}>
                    {submitLabel}
                </ButtonComponent>
            </div>
        </section>
    </form>

    <ActivityImageSourceModal
        isOpen={imageModalOpen}
        value={form.image}
        onClose={() => setImageModalOpen(false)}
        onChange={(value) => onChange("image", value)}
    />
    </>
    );
};

export default ActivityForm;
