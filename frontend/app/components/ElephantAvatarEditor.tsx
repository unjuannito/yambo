import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    AVATAR_BACKGROUNDS,
    AVATAR_CLOTHES,
    AVATAR_EXTRAS,
    AVATAR_EYES,
    AVATAR_HAIR,
    AVATAR_TOPS,
    AVATAR_TRUNKS,
    COVERING_TOPS,
    ElephantAvatar,
    avatarFromSeed,
    normalizeAvatar,
    sameAvatar,
    type ElephantAvatarConfig,
} from "~/components/ElephantAvatar";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import CheckboxComponent from "~/components/common/forms/CheckboxComponent";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faDice, faFloppyDisk, faRotateLeft } from "@fortawesome/free-solid-svg-icons";

type Section = "background" | "hair" | "eyes" | "trunk" | "clothes" | "top" | "extra";
type OptionSection = Exclude<Section, "background">;

const SECTIONS: Section[] = ["background", "hair", "eyes", "trunk", "clothes", "top", "extra"];

const OPTIONS: Record<OptionSection, readonly string[]> = {
    hair: AVATAR_HAIR,
    eyes: AVATAR_EYES,
    trunk: AVATAR_TRUNKS,
    clothes: AVATAR_CLOTHES,
    top: AVATAR_TOPS,
    extra: AVATAR_EXTRAS,
};

function randomConfig(): ElephantAvatarConfig {
    return avatarFromSeed(Math.random().toString(36).slice(2) + Date.now().toString(36));
}

interface ElephantAvatarEditorProps {
    /** Semilla de la persona: da el elefante por defecto y al que vuelve "Restablecer". */
    seed: string;
    /** Elefante guardado (tal cual llega del backend); si falta, se parte del de la semilla. */
    value?: Partial<ElephantAvatarConfig> | null;
    /** Se llama en cada cambio, por si se quiere reflejar fuera del editor. */
    onChange?: (config: ElephantAvatarConfig) => void;
    /** Si se pasa, aparece el botón Guardar. */
    onSave?: (config: ElephantAvatarConfig) => void | Promise<void>;
    onCancel?: () => void;
    saving?: boolean;
    /** Nombre que acompaña a la vista previa, como en la tarjeta del equipo. */
    name?: string;
    className?: string;
}

/**
 * Editor del elefante de una persona: vista previa grande, pestañas por categoría y
 * miniaturas que muestran cómo quedaría cada opción sobre el elefante actual.
 */
export function ElephantAvatarEditor({
    seed,
    value,
    onChange,
    onSave,
    onCancel,
    saving = false,
    name,
    className = "",
}: ElephantAvatarEditorProps) {
    const { t } = useTranslation();
    const initial = useMemo(() => normalizeAvatar(value, seed), [value, seed]);
    const [config, setConfig] = useState<ElephantAvatarConfig>(initial);
    const [section, setSection] = useState<Section>("hair");

    // Si llega otro valor desde fuera (p. ej. tras cargar del backend), se adopta
    useEffect(() => setConfig(initial), [initial]);

    const update = (next: ElephantAvatarConfig) => {
        setConfig(next);
        onChange?.(next);
    };
    const patch = (partial: Partial<ElephantAvatarConfig>) => update({ ...config, ...partial });

    const seedDefault = useMemo(() => avatarFromSeed(seed), [seed]);
    const dirty = !sameAvatar(config, initial);
    const hatCovers = COVERING_TOPS.includes(config.top);

    return (
        <div className={`grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] items-start ${className}`}>
            {/* Vista previa */}
            <div className="w-full max-w-[260px] mx-auto lg:sticky lg:top-6 space-y-4">
                <div className="rounded-2xl bg-white shadow-md overflow-hidden border border-gray-100">
                    <div className="w-full aspect-[5/6]">
                        <ElephantAvatar seed={seed} config={config} title={t("avatar.title")} className="block" />
                    </div>
                    {name && (
                        <div className="px-4 py-3">
                            <p className="text-base font-bold text-yambo-black truncate">{name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{t("avatar.previewHint")}</p>
                        </div>
                    )}
                </div>

                <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
                    <label className="flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer">
                        <span className="text-sm font-medium text-gray-700">{t("avatar.flip")}</span>
                        <CheckboxComponent
                            variantType="toggle"
                            className="shrink-0"
                            checked={config.flip}
                            onChange={(e) => patch({ flip: e.target.checked })}
                        />
                    </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <ButtonComponent type="button" variant="neutral" size="sm" onClick={() => update(randomConfig())}>
                        <FontAwesomeIcon icon={faDice} className="mr-1.5" />
                        {t("avatar.random")}
                    </ButtonComponent>
                    <ButtonComponent
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => update(seedDefault)}
                        disabled={sameAvatar(config, seedDefault)}
                    >
                        <FontAwesomeIcon icon={faRotateLeft} className="mr-1.5" />
                        {t("avatar.reset")}
                    </ButtonComponent>
                </div>
            </div>

            {/* Opciones */}
            <div className="min-w-0">
                <div className="flex flex-wrap gap-2 mb-5" role="tablist" aria-label={t("avatar.parts")}>
                    {SECTIONS.map((id) => {
                        const active = section === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setSection(id)}
                                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-yambo-green-300 ${
                                    active
                                        ? "bg-yambo-black text-white shadow-md"
                                        : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                                }`}
                            >
                                {t(`avatar.sections.${id}`)}
                            </button>
                        );
                    })}
                </div>

                {section === "background" ? (
                    <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={t("avatar.sections.background")}>
                        {AVATAR_BACKGROUNDS.map((color, i) => {
                            const selected = config.background === i;
                            return (
                                <button
                                    key={color}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    aria-label={`${t("avatar.sections.background")} ${i + 1}`}
                                    onClick={() => patch({ background: i })}
                                    style={{ backgroundColor: color }}
                                    className={`w-12 h-12 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-yambo-green-300 ${
                                        selected
                                            ? "ring-2 ring-yambo-green-500 ring-offset-2 scale-105 shadow-md"
                                            : "border border-gray-200 shadow-sm hover:scale-105"
                                    }`}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <>
                        {section === "hair" && hatCovers && (
                            <p className="text-sm text-gray-500 bg-yambo-purple-50 border border-yambo-purple-100 rounded-xl px-4 py-2.5 mb-4">
                                {t(config.top === "cap" ? "avatar.hairUnderCap" : "avatar.hairUnderBeanie")}
                            </p>
                        )}
                        <div
                            className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-3"
                            role="radiogroup"
                            aria-label={t(`avatar.sections.${section}`)}
                        >
                            {OPTIONS[section].map((option) => {
                                const selected = config[section] === option;
                                const label = t(`avatar.options.${section}.${option}`);
                                const preview = { ...config, [section]: option } as ElephantAvatarConfig;
                                return (
                                    <button
                                        key={option}
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        onClick={() => patch({ [section]: option } as Partial<ElephantAvatarConfig>)}
                                        className={`relative rounded-2xl overflow-hidden bg-white border-2 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-yambo-green-300 ${
                                            selected
                                                ? "border-yambo-green-500 shadow-md"
                                                : "border-gray-100 shadow-sm hover:border-yambo-green-200 hover:shadow-md hover-lift"
                                        }`}
                                    >
                                        <span className="block w-full aspect-square">
                                            <ElephantAvatar seed={seed} config={preview} title={label} className="block" />
                                        </span>
                                        <span className="block px-2 py-1.5 text-xs font-medium text-gray-600 text-center truncate">{label}</span>
                                        {selected && (
                                            <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-yambo-green-500 text-white flex items-center justify-center shadow-sm">
                                                <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}

                {(onSave || onCancel) && (
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6 pt-5 border-t border-gray-100">
                        {onCancel && (
                            <ButtonComponent type="button" variant="secondary" onClick={onCancel} disabled={saving}>
                                {t("common.cancel")}
                            </ButtonComponent>
                        )}
                        {onSave && (
                            <ButtonComponent
                                type="button"
                                variant="primary"
                                onClick={() => onSave(config)}
                                disabled={!dirty}
                                isLoading={saving}
                            >
                                <FontAwesomeIcon icon={faFloppyDisk} className="mr-1.5" />
                                {t("avatar.save")}
                            </ButtonComponent>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ElephantAvatarEditor;
