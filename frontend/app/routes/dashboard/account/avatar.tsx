import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/avatar";
import { useAuth } from "~/hooks/useAuth";
import { useApiMutation } from "~/hooks/useApiMutation";
import { userService } from "~/services/userService";
import type { CurrentUser } from "~/types/userType";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import ElephantAvatar, {
    AVATAR_BACKGROUNDS,
    AVATAR_CLOTHES,
    AVATAR_EXTRAS,
    AVATAR_EYES,
    AVATAR_TOPS,
    avatarFromSeed,
    type ElephantAvatarConfig,
} from "~/components/ElephantAvatar";
import { isStaff } from "~/utils/roleHelpers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faDice, faFloppyDisk, faRotateLeft, faCheck } from "@fortawesome/free-solid-svg-icons";

export function meta({}: Route.MetaArgs) {
    return [{ title: "Yambo - Mi elefante" }];
}

const pick = <T,>(options: readonly T[]): T => options[Math.floor(Math.random() * options.length)];

function randomAvatar(): ElephantAvatarConfig {
    return {
        background: Math.floor(Math.random() * AVATAR_BACKGROUNDS.length),
        clothes: pick(AVATAR_CLOTHES),
        eyes: pick(AVATAR_EYES),
        top: pick(AVATAR_TOPS),
        extra: pick(AVATAR_EXTRAS),
        trunkUp: Math.random() < 0.5,
        flip: Math.random() < 0.5,
    };
}

interface OptionGridProps<T extends string | boolean> {
    title: string;
    options: readonly T[];
    selected: T;
    label: (option: T) => string;
    /** El elefante actual con esa opción aplicada, para la miniatura. */
    preview: (option: T) => ElephantAvatarConfig;
    onSelect: (option: T) => void;
    seed: string;
}

/** Una fila de miniaturas: cada una es el elefante actual con esa opción puesta. */
function OptionGrid<T extends string | boolean>({ title, options, selected, label, preview, onSelect, seed }: OptionGridProps<T>) {
    return (
        <section>
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-2">{title}</h2>
            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-2.5">
                {options.map((option) => {
                    const isSelected = option === selected;
                    return (
                        <button
                            key={String(option)}
                            type="button"
                            onClick={() => onSelect(option)}
                            aria-pressed={isSelected}
                            title={label(option)}
                            className={`group relative rounded-2xl overflow-hidden border-2 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-yambo-green-400 ${
                                isSelected
                                    ? "border-yambo-green-500 shadow-md scale-[1.03]"
                                    : "border-transparent hover:border-yambo-green-200 hover:-translate-y-0.5"
                            }`}
                        >
                            <ElephantAvatar seed={seed} config={preview(option)} title={label(option)} className="w-full aspect-square block" />
                            <span className="block bg-white px-1 py-1 text-[11px] font-medium text-gray-600 truncate">{label(option)}</span>
                            {isSelected && (
                                <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-yambo-green-500 text-white flex items-center justify-center">
                                    <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

export default function MyElephant() {
    const { t } = useTranslation();
    const { user, reload } = useAuth();
    const seed = user?.id ?? "yambo";
    const saved = useMemo(() => user?.staff?.avatar ?? avatarFromSeed(seed), [user, seed]);
    const [avatar, setAvatar] = useState<ElephantAvatarConfig>(saved);
    const [spin, setSpin] = useState(false);

    useEffect(() => setAvatar(saved), [saved]);

    const dirty = JSON.stringify(avatar) !== JSON.stringify(saved);
    const isDefault = !user?.staff?.avatar;
    const set = <K extends keyof ElephantAvatarConfig>(key: K, value: ElephantAvatarConfig[K]) =>
        setAvatar((prev) => ({ ...prev, [key]: value }));

    const saveMutation = useApiMutation<CurrentUser, ElephantAvatarConfig>({
        mutationFn: (data) => userService.updateStaffAvatar(data),
        successMessage: t("avatar.saved"),
        onSuccess: () => reload(),
    });
    const resetMutation = useApiMutation<CurrentUser, void>({
        mutationFn: () => userService.resetStaffAvatar(),
        successMessage: t("avatar.resetDone"),
        onSuccess: () => reload(),
    });

    const surprise = () => {
        setAvatar(randomAvatar());
        setSpin(true);
        window.setTimeout(() => setSpin(false), 450);
    };

    if (user && !isStaff(user)) {
        return (
            <main className="p-4 md:p-8 max-w-2xl mx-auto text-center">
                <p className="text-gray-500">{t("avatar.onlyStaff")}</p>
                <Link to="/mi-espacio/cuenta" className="inline-block mt-4 text-yambo-green-600 font-semibold hover:underline">
                    {t("avatar.back")}
                </Link>
            </main>
        );
    }

    const displayName = user?.staff?.nickname || user?.name || "";

    return (
        <main className="p-4 md:p-8 w-full max-w-6xl mx-auto">
            <Link to="/mi-espacio/cuenta" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-yambo-green-600 transition-colors">
                <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
                {t("avatar.back")}
            </Link>
            <h1 className="mt-3 text-3xl font-extrabold font-display text-yambo-black">{t("avatar.title")}</h1>
            <p className="text-gray-500 mt-1 max-w-2xl">{t("avatar.subtitle")}</p>

            <div className="mt-6 grid gap-8 lg:grid-cols-[320px_1fr] items-start">
                {/* Vista previa: la tarjeta tal y como se verá en la página del equipo */}
                <aside className="lg:sticky lg:top-6">
                    <div className="rounded-3xl bg-white shadow-xl overflow-hidden border border-gray-100">
                        <div className={`transition-transform duration-500 ${spin ? "scale-95 rotate-2" : ""}`}>
                            <ElephantAvatar seed={seed} config={avatar} title={displayName} className="w-full aspect-[5/6] block" />
                        </div>
                        <div className="p-4">
                            <p className="text-lg font-bold text-yambo-black truncate">{displayName}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{t("avatar.previewHint")}</p>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <ButtonComponent type="button" variant="secondary" onClick={surprise}>
                            <FontAwesomeIcon icon={faDice} className={`mr-1.5 ${spin ? "animate-spin" : ""}`} /> {t("avatar.surprise")}
                        </ButtonComponent>
                        <ButtonComponent
                            type="button"
                            variant="secondary"
                            onClick={() => (dirty ? setAvatar(saved) : resetMutation.mutate())}
                            disabled={!dirty && isDefault}
                            isLoading={resetMutation.isLoading}
                        >
                            <FontAwesomeIcon icon={faRotateLeft} className="mr-1.5" /> {dirty ? t("avatar.undo") : t("avatar.reset")}
                        </ButtonComponent>
                    </div>
                    <ButtonComponent
                        type="button"
                        variant="primary"
                        className="w-full mt-2"
                        onClick={() => saveMutation.mutate(avatar)}
                        disabled={!dirty}
                        isLoading={saveMutation.isLoading}
                    >
                        <FontAwesomeIcon icon={faFloppyDisk} className="mr-1.5" /> {t("avatar.save")}
                    </ButtonComponent>
                    {isDefault && !dirty && <p className="text-xs text-gray-400 mt-2 text-center">{t("avatar.defaultHint")}</p>}
                </aside>

                <div className="space-y-7">
                    <section>
                        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-2">{t("avatar.background")}</h2>
                        <div className="flex flex-wrap gap-2.5">
                            {AVATAR_BACKGROUNDS.map((color, index) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => set("background", index)}
                                    aria-pressed={avatar.background === index}
                                    aria-label={`${t("avatar.background")} ${index + 1}`}
                                    style={{ backgroundColor: color }}
                                    className={`w-11 h-11 rounded-full border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-yambo-green-400 ${
                                        avatar.background === index ? "border-yambo-green-500 scale-110 shadow-md" : "border-white shadow-sm hover:scale-105"
                                    }`}
                                />
                            ))}
                        </div>
                    </section>

                    <OptionGrid
                        title={t("avatar.top")}
                        options={AVATAR_TOPS}
                        selected={avatar.top}
                        label={(o) => t(`avatar.tops.${o}`)}
                        preview={(o) => ({ ...avatar, top: o })}
                        onSelect={(o) => set("top", o)}
                        seed={seed}
                    />
                    <OptionGrid
                        title={t("avatar.eyes")}
                        options={AVATAR_EYES}
                        selected={avatar.eyes}
                        label={(o) => t(`avatar.eyesOptions.${o}`)}
                        preview={(o) => ({ ...avatar, eyes: o })}
                        onSelect={(o) => set("eyes", o)}
                        seed={seed}
                    />
                    <OptionGrid
                        title={t("avatar.clothes")}
                        options={AVATAR_CLOTHES}
                        selected={avatar.clothes}
                        label={(o) => t(`avatar.clothesOptions.${o}`)}
                        preview={(o) => ({ ...avatar, clothes: o })}
                        onSelect={(o) => set("clothes", o)}
                        seed={seed}
                    />
                    <OptionGrid
                        title={t("avatar.extra")}
                        options={AVATAR_EXTRAS}
                        selected={avatar.extra}
                        label={(o) => t(`avatar.extras.${o}`)}
                        preview={(o) => ({ ...avatar, extra: o })}
                        onSelect={(o) => set("extra", o)}
                        seed={seed}
                    />
                    <OptionGrid
                        title={t("avatar.trunk")}
                        options={[false, true] as const}
                        selected={avatar.trunkUp}
                        label={(o) => (o ? t("avatar.trunkUp") : t("avatar.trunkDown"))}
                        preview={(o) => ({ ...avatar, trunkUp: o })}
                        onSelect={(o) => set("trunkUp", o)}
                        seed={seed}
                    />
                    <OptionGrid
                        title={t("avatar.direction")}
                        options={[false, true] as const}
                        selected={avatar.flip}
                        label={(o) => (o ? t("avatar.lookLeft") : t("avatar.lookRight"))}
                        preview={(o) => ({ ...avatar, flip: o })}
                        onSelect={(o) => set("flip", o)}
                        seed={seed}
                    />
                </div>
            </div>
        </main>
    );
}
