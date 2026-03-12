import InputComponent from "~/components/common/forms/InputComponent";
import SelectComponent from "~/components/common/forms/SelectComponent";
import MarkdownEditor from "~/components/common/forms/MarkdownEditor";
import LabelComponent from "~/components/common/forms/LabelComponent";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { ACTIVITY_STATUS_OPTIONS } from "~/types/activity";

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
}) => (
    <form
        className="flex flex-col gap-4"
        onSubmit={e => {
            e.preventDefault();
            onSubmit();
        }}
    >
        <InputComponent
            label="Nombre"
            value={form.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("name", e.target.value)}
            required
        />
        <LabelComponent label="Descripción">
            <MarkdownEditor
                value={form.description}
                onChange={v => onChange("description", v)}
                className="border border-gray-200 rounded-xl p-2 bg-white"
            />
        </LabelComponent>
        <InputComponent
            label="Fecha"
            type="datetime-local"
            value={form.date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("date", e.target.value)}
            required
        />
        <SelectComponent
            label="Estado"
            value={form.status}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange("status", e.target.value)}
            options={ACTIVITY_STATUS_OPTIONS}
        />
        <SelectComponent
            label="Pública"
            value={form.public ? "true" : "false"}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange("public", e.target.value === "true")}
            options={[{ value: "true", label: "Sí" }, { value: "false", label: "No" }]}
        />
        <SelectComponent
            label="Proyecto"
            value={form.projectId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange("projectId", e.target.value)}
            options={projectOptions}
            required
        />
        <SelectComponent
            label="Responsable"
            value={form.managerId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange("managerId", e.target.value)}
            options={managerOptions}
        />
        <div className="flex justify-end gap-2">
            <ButtonComponent type="submit" variant="primary" isLoading={loading}>
                {submitLabel}
            </ButtonComponent>
        </div>
    </form>
);

export default ActivityForm;
