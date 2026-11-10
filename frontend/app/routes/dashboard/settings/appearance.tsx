import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { RequirePermission } from "~/components/common/RequirePermission";
import { PageHeader } from "~/components/common/PageHeader";
import { PageContainer } from "~/components/common/PageContainer";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { settingsService } from "~/services/settingsService";
import { fileService } from "~/services/fileService";
import { getErrorMessage } from "~/types/error";
import { publicService } from "~/services/publicService";
import {
    DEFAULT_APPEARANCE,
    PALETTES,
    appearanceFromPlain,
    appearanceToPlain,
    isCustomAppearance,
    applyThemeToElement,
    type Appearance,
    type RadiusStyle,
    type FontStyle,
    type PalettePreset,
} from "~/lib/theme";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faPalette,
    faPaintBrush,
    faRotateLeft,
    faTrash,
    faCheck,
    faEye,
    faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import toast from "react-hot-toast";

export default function Appearance() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState<Appearance>({ ...DEFAULT_APPEARANCE });
    const previewRef = useRef<HTMLDivElement>(null);

    const loadAppearance = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const raw = await publicService.getAppearance();
            setDraft(appearanceFromPlain(raw));
        } catch (err) {
            setError(getErrorMessage(err, "No se pudo cargar la apariencia"));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAppearance();
    }, [loadAppearance]);

    // Preview en vivo: al cambiar el borrador, retematiza el panel de vista previa.
    useEffect(() => {
        if (previewRef.current) {
            applyThemeToElement(previewRef.current, draft);
        }
    }, [draft]);

    const set = <K extends keyof Appearance>(key: K, value: Appearance[K]) =>
        setDraft((d) => ({ ...d, [key]: value }));

    /** Aplica una paleta de partida: ajusta los 4 colores base. */
    const applyPalette = (p: PalettePreset) => setDraft((d) => ({ ...d, ...p.values }));

    const handleSave = async () => {
        try {
            setSaving(true);
            await settingsService.saveAppearance(appearanceToPlain(draft));
            toast.success("Apariencia guardada. Recarga las páginas para verla aplicada.");
            navigate(0);
        } catch (err) {
            toast.error(getErrorMessage(err, "No se pudo guardar la apariencia"));
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        try {
            setSaving(true);
            await settingsService.saveAppearance(appearanceToPlain(DEFAULT_APPEARANCE));
            setDraft({ ...DEFAULT_APPEARANCE });
            toast.success("Apariencia restablecida a los valores por defecto");
            navigate(0);
        } catch (err) {
            toast.error(getErrorMessage(err, "No se pudo restablecer la apariencia"));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <RequirePermission permission={{ obj: "settings", action: "read" }} redirectTo="/mi-espacio">
                <PageContainer>
                    <LoadingSpinner message="Cargando apariencia…" size="lg" />
                </PageContainer>
            </RequirePermission>
        );
    }

    if (error) {
        return (
            <RequirePermission permission={{ obj: "settings", action: "read" }} redirectTo="/mi-espacio">
                <PageContainer>
                    <ErrorMessage message={error} onRetry={loadAppearance} />
                </PageContainer>
            </RequirePermission>
        );
    }

    const custom = isCustomAppearance(draft);

    return (
        <RequirePermission permission={{ obj: "settings", action: "read" }} redirectTo="/mi-espacio">
            <PageContainer>
                <PageHeader
                    title={
                        <span className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faPalette} className="text-yambo-green-500" />
                            Apariencia
                        </span>
                    }
                    description="Personaliza colores, esquinas, tipografía, degradados y animaciones. Se aplica a toda la web, al panel y a los correos."
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* ── Controles ── */}
                    <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
                        <h2 className="text-xl font-bold font-display text-yambo-black flex items-center gap-2">
                            <FontAwesomeIcon icon={faPaintBrush} className="text-yambo-green-500" />
                            Personalización
                        </h2>

                        {/* Paletas de partida */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Paletas de partida</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {PALETTES.map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => applyPalette(p)}
                                        className="p-3 rounded-xl border-2 border-gray-100 hover:border-yambo-green-300 hover:shadow-sm transition-all text-left"
                                        title={`Aplicar paleta ${p.name}`}
                                    >
                                        <div className="flex gap-1.5 mb-2">
                                            {p.swatches.map((c) => (
                                                <span
                                                    key={c}
                                                    className="w-6 h-6 rounded-full border border-black/10"
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">{p.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Colores */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Colores</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <ColorField label="Color principal" value={draft.primaryColor} onChange={(v) => set("primaryColor", v)} />
                                <ColorField label="Color de acento" value={draft.accentColor} onChange={(v) => set("accentColor", v)} />
                                <ColorField label="Color de fondo" value={draft.bgColor} onChange={(v) => set("bgColor", v)} />
                                <ColorField label="Color de texto" value={draft.textColor} onChange={(v) => set("textColor", v)} />
                            </div>
                            <p className="text-sm text-gray-400 mt-2">
                                El color principal es la base de toda la paleta (botones, enlaces, énfasis).
                            </p>
                        </div>

                        {/* Esquinas */}
                        <Segmented
                            label="Esquinas"
                            value={draft.radius}
                            onChange={(v) => set("radius", v as RadiusStyle)}
                            options={[
                                { value: "playful", label: "Redondeadas" },
                                { value: "soft", label: "Suaves" },
                                { value: "square", label: "Cuadradas" },
                            ]}
                        />

                        {/* Tipografía */}
                        <Segmented
                            label="Tipografía de titulares"
                            value={draft.font}
                            onChange={(v) => set("font", v as FontStyle)}
                            options={[
                                { value: "jakarta", label: "Jakarta" },
                                { value: "inter", label: "Inter" },
                                { value: "system", label: "Sistema" },
                                { value: "serif", label: "Serif" },
                            ]}
                        />

                        {/* Conmutadores */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Toggle label="Degradados" hint="Botones y hero con degradado" value={draft.gradients} onChange={(v) => set("gradients", v)} />
                            <Toggle label="Animaciones" hint="Efectos de entrada y hover" value={draft.motion} onChange={(v) => set("motion", v)} />
                        </div>

                        {/* Ángulo del degradado */}
                        <div className={draft.gradients === "off" ? "opacity-40 pointer-events-none" : ""}>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-sm font-medium text-gray-700">Ángulo del degradado</label>
                                <span className="text-xs font-mono text-gray-400">{draft.gradientAngle}°</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={360}
                                step={5}
                                value={draft.gradientAngle}
                                onChange={(e) => set("gradientAngle", Number(e.target.value))}
                                className="w-full accent-yambo-green-500"
                                aria-label="Ángulo del degradado"
                            />
                        </div>

                        {/* Logo y portada */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ImageField
                                label="Logo"
                                value={draft.logo ?? ""}
                                onUploaded={(url) => set("logo", url)}
                                onClear={() => set("logo", undefined)}
                            />
                            <ImageField
                                label="Portada / hero"
                                value={draft.cover ?? ""}
                                onUploaded={(url) => set("cover", url)}
                                onClear={() => set("cover", undefined)}
                            />
                        </div>
                    </section>

                    {/* ── Vista previa en vivo ── */}
                    <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                        <h2 className="text-xl font-bold font-display text-yambo-black flex items-center gap-2">
                            <FontAwesomeIcon icon={faEye} className="text-yambo-green-500" />
                            Vista previa
                        </h2>
                        <p className="text-sm text-gray-400">
                            Así lucirá la aplicación con los cambios. Se actualiza en vivo.
                        </p>
                        <div
                            ref={previewRef}
                            className="rounded-2xl border border-gray-200 p-6 space-y-4 bg-white"
                        >
                            <h3 className="text-2xl font-extrabold font-display">Tu asociación, a tu gusto</h3>
                            <p className="text-gray-600">Un titular con la tipografía y el color elegidos.</p>
                            <div className="flex flex-wrap gap-3">
                                <button type="button" className="px-4 py-2 rounded-full text-white font-semibold bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 shadow-lg shadow-yambo-green-500/25">
                                    Botón principal
                                </button>
                                <button type="button" className="px-4 py-2 rounded-full font-semibold bg-yambo-purple-500 text-white">
                                    Botón de acento
                                </button>
                                <button type="button" className="px-4 py-2 rounded-xl border-2 border-yambo-green-500 text-yambo-green-700 font-semibold">
                                    Botón de borde
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-yambo-green-500" />
                                <span className="w-3 h-3 rounded-full bg-yambo-purple-500" />
                                <span className="text-sm text-gray-500">Muestras de color</span>
                            </div>
                            {draft.cover && (
                                <div className="rounded-xl overflow-hidden border border-gray-200">
                                    <img src={draft.cover} alt="Portada" className="w-full max-h-48 object-cover" />
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* ── Acciones ── */}
                <div className="flex flex-wrap items-center justify-end gap-3 mt-6">
                    <ButtonComponent variant="secondary" onClick={handleReset} disabled={saving || !custom}>
                        <FontAwesomeIcon icon={faRotateLeft} className="mr-2" /> Restablecer
                    </ButtonComponent>
                    <RequirePermission permission={{ obj: "settings", action: "update" }} redirect={false}>
                        <ButtonComponent variant="primary" onClick={handleSave} disabled={saving}>
                            {saving ? "Guardando…" : (
                                <>
                                    <FontAwesomeIcon icon={faCheck} className="mr-2" /> Guardar apariencia
                                </>
                            )}
                        </ButtonComponent>
                    </RequirePermission>
                </div>
            </PageContainer>
        </RequirePermission>
    );
}

/* ── Subcomponentes de control ─────────────────────────────────────── */

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
                    aria-label={label}
                />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                        const v = e.target.value.trim();
                        if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) || v === "") onChange(v);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-yambo-green-500 focus:border-transparent outline-none"
                />
            </div>
        </div>
    );
}

function Segmented({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <div className="inline-flex flex-wrap gap-1 p-1 bg-gray-100 rounded-full">
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                            value === opt.value
                                ? "bg-white text-yambo-green-700 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

function Toggle({
    label,
    hint,
    value,
    onChange,
}: {
    label: string;
    hint?: string;
    value: "on" | "off";
    onChange: (v: "on" | "off") => void;
}) {
    const on = value === "on";
    return (
        <label className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer">
            <span>
                <span className="block text-sm font-medium text-gray-700">{label}</span>
                {hint && <span className="block text-xs text-gray-400">{hint}</span>}
            </span>
            <span
                role="switch"
                aria-checked={on}
                aria-label={label}
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onChange(on ? "off" : "on");
                    }
                }}
                onClick={() => onChange(on ? "off" : "on")}
                className={`relative inline-flex w-11 h-6 shrink-0 rounded-full transition-colors ${on ? "bg-yambo-green-500" : "bg-gray-300"}`}
            >
                <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${on ? "translate-x-5" : ""}`}
                />
            </span>
        </label>
    );
}

function ImageField({
    label,
    value,
    onUploaded,
    onClear,
}: {
    label: string;
    value: string;
    onUploaded: (url: string) => void;
    onClear: () => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    return (
        <div className="space-y-2">
            <span className="block text-sm font-medium text-gray-700">{label}</span>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    setUploading(true);
                    try {
                        const record = await fileService.upload(f);
                        onUploaded(record.url);
                    } catch (err) {
                        toast.error(getErrorMessage(err, `No se pudo subir la ${label.toLowerCase()}`));
                    } finally {
                        setUploading(false);
                    }
                }}
            />
            {value ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 group">
                    <img src={value} alt={label} className="w-full max-h-32 object-cover" />
                    <button
                        type="button"
                        onClick={onClear}
                        className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1.5 text-red-500 shadow"
                        aria-label={`Quitar ${label.toLowerCase()}`}
                    >
                        <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="w-full p-5 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-yambo-green-400 hover:text-yambo-green-600 text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {uploading ? (
                        <>
                            <FontAwesomeIcon icon={faSpinner} spin /> Subiendo…
                        </>
                    ) : (
                        "Subir imagen"
                    )}
                </button>
            )}
        </div>
    );
}
