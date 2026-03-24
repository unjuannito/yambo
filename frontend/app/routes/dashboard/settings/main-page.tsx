import { useState, useEffect, useCallback } from "react";
import { RequirePermission } from "~/components/common/RequirePermission";
import InputComponent from "~/components/common/forms/InputComponent";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { settingsService } from "~/services/settingsService";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronUp, faChevronDown, faXmark, faGripVertical, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import FileUploader from "~/components/common/FileUploader";

export function meta() {
    return [
        { title: "Yambo - Editor Página Principal" },
        { name: "description", content: "Editor de contenido de la página principal" },
    ];
}

type MainPageTab = "sections" | "hero" | "about";

interface BulletItem {
    icon: string;
    title: string;
    description: string;
    link: string;
}

const EMPTY_BULLET: BulletItem = { icon: "\u25CE", title: "", description: "", link: "" };

interface SectionConfig {
    id: string;
    visible: boolean;
    title: string;
}

const SECTION_LABELS: Record<string, string> = {
    hero: "Hero (cabecera)",
    about: "Sobre Nosotros",
    projects: "Proyectos Destacados",
    activities: "Actividades",
    monitors: "Equipo de Monitores",
};

const DEFAULT_SECTIONS: SectionConfig[] = [
    { id: "hero", visible: true, title: "" },
    { id: "about", visible: true, title: "¿Qué es Yambo?" },
    { id: "projects", visible: true, title: "Proyectos Destacados" },
    { id: "activities", visible: true, title: "Actividades" },
    { id: "monitors", visible: true, title: "Equipo de Monitores" },
];

export default function MainPageEditor() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<MainPageTab>("sections");
    const [saving, setSaving] = useState(false);

    // Sections config
    const [sections, setSections] = useState<SectionConfig[]>([...DEFAULT_SECTIONS]);

    // Hero
    const [heroTitle, setHeroTitle] = useState("");
    const [heroSubtitle, setHeroSubtitle] = useState("");
    const [heroImage, setHeroImage] = useState("");

    // About
    const [aboutIntro, setAboutIntro] = useState("");
    const [aboutImage, setAboutImage] = useState("");
    const [aboutBullets, setAboutBullets] = useState<BulletItem[]>([{ ...EMPTY_BULLET }]);

    const loadSettings = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const allSettings = await settingsService.getAllSettings();

            const get = (key: string) => allSettings.find(s => s.key === key)?.value ?? "";

            setHeroTitle(get("home.hero.title"));
            setHeroSubtitle(get("home.hero.subtitle"));
            setHeroImage(get("home.hero.image"));
            setAboutIntro(get("home.about.intro"));
            setAboutImage(get("home.about.image"));

            // Sections config
            const sectionsRaw = get("home.sections.config");
            if (sectionsRaw) {
                try {
                    const parsed = JSON.parse(sectionsRaw) as SectionConfig[];
                    if (parsed.length > 0) setSections(parsed);
                } catch {
                    // keep defaults
                }
            }

            const bulletsRaw = get("home.about.bullets");
            if (bulletsRaw) {
                try {
                    const parsed = JSON.parse(bulletsRaw) as BulletItem[];
                    setAboutBullets(parsed.length > 0 ? parsed : [{ ...EMPTY_BULLET }]);
                } catch {
                    setAboutBullets([{ ...EMPTY_BULLET }]);
                }
            }
        } catch (err) {
            setError(getErrorMessage(err, "La página principal se nos resiste"));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadSettings();
    }, [loadSettings]);

    // --- Section handlers ---
    const toggleSectionVisibility = (index: number) => {
        setSections(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], visible: !updated[index].visible };
            return updated;
        });
    };

    const updateSectionTitle = (index: number, title: string) => {
        setSections(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], title };
            return updated;
        });
    };

    const moveSection = (index: number, direction: "up" | "down") => {
        setSections(prev => {
            const newArr = [...prev];
            const target = direction === "up" ? index - 1 : index + 1;
            if (target < 0 || target >= newArr.length) return prev;
            [newArr[index], newArr[target]] = [newArr[target], newArr[index]];
            return newArr;
        });
    };

    const handleSaveSections = async () => {
        try {
            setSaving(true);
            await settingsService.updateSettingsBulk({
                "home.sections.config": JSON.stringify(sections),
            });
            toast.success("Configuración de secciones guardada correctamente");
        } catch (err) {
            toast.error(getErrorMessage(err, "¡Las secciones no quieren guardarse!"));
        } finally {
            setSaving(false);
        }
    };

    const handleSaveHero = async () => {
        try {
            setSaving(true);
            await settingsService.updateSettingsBulk({
                "home.hero.title": heroTitle,
                "home.hero.subtitle": heroSubtitle,
                "home.hero.image": heroImage,
            });
            toast.success("Sección Hero guardada correctamente");
        } catch (err) {
            toast.error(getErrorMessage(err, "¡El Hero se resiste a guardarse!"));
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAbout = async () => {
        try {
            setSaving(true);
            const validBullets = aboutBullets.filter(b => b.title.trim() || b.description.trim());
            await settingsService.updateSettingsBulk({
                "home.about.intro": aboutIntro,
                "home.about.image": aboutImage,
                "home.about.bullets": JSON.stringify(validBullets),
            });
            toast.success("Sección Sobre Nosotros guardada correctamente");
        } catch (err) {
            toast.error(getErrorMessage(err, "¡La sección Sobre Nosotros no coopera!"));
        } finally {
            setSaving(false);
        }
    };

    const updateBullet = (index: number, field: keyof BulletItem, value: string) => {
        setAboutBullets(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const addBullet = () => {
        setAboutBullets(prev => [...prev, { ...EMPTY_BULLET }]);
    };

    const removeBullet = (index: number) => {
        setAboutBullets(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
    };

    const moveBullet = (index: number, direction: "up" | "down") => {
        setAboutBullets(prev => {
            const newArr = [...prev];
            const target = direction === "up" ? index - 1 : index + 1;
            if (target < 0 || target >= newArr.length) return prev;
            [newArr[index], newArr[target]] = [newArr[target], newArr[index]];
            return newArr;
        });
    };

    const tabs: { key: MainPageTab; label: string }[] = [
        { key: "sections", label: "Secciones" },
        { key: "hero", label: "Hero" },
        { key: "about", label: "Sobre Nosotros" },
    ];

    if (loading) {
        return (
            <RequirePermission permission={{ obj: "settings", action: "update" }} redirectTo="/mi-espacio">
                <main className="flex flex-col p-6 md:p-8 w-full md:w-[calc(100vw-16rem)]">
                    <LoadingSpinner message="Cargando configuración..." size="lg" />
                </main>
            </RequirePermission>
        );
    }

    if (error) {
        return (
            <RequirePermission permission={{ obj: "settings", action: "update" }} redirectTo="/mi-espacio">
                <main className="flex flex-col p-6 md:p-8 w-full md:w-[calc(100vw-16rem)]">
                    <ErrorMessage message={error} onRetry={loadSettings} />
                </main>
            </RequirePermission>
        );
    }

    return (
        <RequirePermission permission={{ obj: "settings", action: "update" }} redirectTo="/mi-espacio">
            <main className="flex flex-col p-6 md:p-8 w-full md:w-[calc(100vw-16rem)]">
                <h1 className="text-3xl font-extrabold font-display text-yambo-black mb-2">Editor de Página Principal 🏠</h1>
                <p className="text-gray-400 mb-6">Personaliza el contenido visible en la página de inicio.</p>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 mb-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.key
                                    ? "border-yambo-green-500 text-yambo-green-600"
                                    : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Sections Tab */}
                {activeTab === "sections" && (
                    <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
                        <div>
                            <h2 className="text-xl font-bold font-display text-yambo-black mb-1">Configuración de Secciones</h2>
                            <p className="text-sm text-gray-400 mb-4">
                                Configura el orden, visibilidad y títulos de cada sección de la página principal.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {sections.map((section, index) => (
                                <div
                                    key={section.id}
                                    className={`border rounded-2xl p-4 transition-colors ${
                                        section.visible
                                            ? "bg-white border-gray-100"
                                            : "bg-gray-50 border-gray-100 opacity-60"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Reorder buttons */}
                                        <div className="flex flex-col gap-0.5">
                                            <button
                                                type="button"
                                                onClick={() => moveSection(index, "up")}
                                                disabled={index === 0}
                                                className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                                title="Mover arriba"
                                            >
                                                <FontAwesomeIcon icon={faChevronUp} className="w-3 h-3" />
                                            </button>
                                            <FontAwesomeIcon icon={faGripVertical} className="w-3 h-3 text-gray-300" />
                                            <button
                                                type="button"
                                                onClick={() => moveSection(index, "down")}
                                                disabled={index === sections.length - 1}
                                                className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                                title="Mover abajo"
                                            >
                                                <FontAwesomeIcon icon={faChevronDown} className="w-3 h-3" />
                                            </button>
                                        </div>

                                        {/* Visibility toggle */}
                                        <button
                                            type="button"
                                            onClick={() => toggleSectionVisibility(index)}
                                            className={`p-2 rounded-full transition-colors ${
                                                section.visible
                                                    ? "text-yambo-green-600 hover:bg-yambo-green-50"
                                                    : "text-gray-400 hover:bg-gray-100"
                                            }`}
                                            title={section.visible ? "Ocultar sección" : "Mostrar sección"}
                                        >
                                            <FontAwesomeIcon
                                                icon={section.visible ? faEye : faEyeSlash}
                                                className="w-5 h-5"
                                            />
                                        </button>

                                        {/* Section info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-semibold text-gray-400 uppercase">
                                                    {SECTION_LABELS[section.id] || section.id}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                    section.visible
                                                        ? "bg-yambo-green-50 text-yambo-green-700"
                                                        : "bg-gray-100 text-gray-500"
                                                }`}>
                                                    {section.visible ? "Visible" : "Oculto"}
                                                </span>
                                            </div>
                                            {section.id !== "hero" && (
                                                <input
                                                    type="text"
                                                    value={section.title}
                                                    onChange={(e) => updateSectionTitle(index, e.target.value)}
                                                    placeholder={SECTION_LABELS[section.id] || "Título de sección"}
                                                    className="w-full border border-gray-100 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-yambo-green-500 focus:ring-1 focus:ring-yambo-green-500/50"
                                                />
                                            )}
                                            {section.id === "hero" && (
                                                <span className="text-xs text-gray-400">
                                                    El título del Hero se configura en la pestaña "Hero"
                                                </span>
                                            )}
                                        </div>

                                        {/* Position indicator */}
                                        <span className="text-xs text-gray-300 font-mono w-6 text-center">
                                            {index + 1}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-100">
                            <ButtonComponent
                                variant="primary"
                                onClick={handleSaveSections}
                                disabled={saving}
                            >
                                {saving ? "Guardando..." : "Guardar Secciones"}
                            </ButtonComponent>
                        </div>
                    </section>
                )}

                {/* Hero Tab */}
                {activeTab === "hero" && (
                    <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
                        <div>
                            <h2 className="text-xl font-bold font-display text-yambo-black mb-1">Sección Hero</h2>
                            <p className="text-sm text-gray-400 mb-4">
                                La cabecera principal de la página de inicio.
                            </p>
                        </div>

                        <InputComponent
                            label="Título"
                            value={heroTitle}
                            placeholder="Ej: Bienvenidos a Yambo"
                            onChange={(e) => setHeroTitle(e.target.value)}
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo</label>
                            <textarea
                                className="w-full border border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:border-yambo-green-500 focus:ring-1 focus:ring-yambo-green-500/50 resize-y"
                                rows={3}
                                maxLength={500}
                                value={heroSubtitle}
                                placeholder="Breve descripción debajo del título..."
                                onChange={(e) => setHeroSubtitle(e.target.value)}
                            />
                            <p className="text-xs text-gray-400 text-right mt-1">{heroSubtitle.length}/500</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Imagen de fondo</label>
                            <FileUploader
                                compact
                                multiple={false}
                                label="Subir imagen de fondo"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                onUpload={(file) => setHeroImage(file.url)}
                            />
                        </div>

                        {heroImage && (
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Vista previa</p>
                                <div className="relative rounded-2xl overflow-hidden h-48 bg-gray-100">
                                    <img
                                        src={heroImage}
                                        alt="Vista previa hero"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = "none";
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <div className="text-center text-white">
                                            <p className="text-2xl font-extrabold font-display">{heroTitle || "Título"}</p>
                                            <p className="text-sm mt-1">{heroSubtitle || "Subtítulo"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-4 border-t border-gray-100">
                            <ButtonComponent
                                variant="primary"
                                onClick={handleSaveHero}
                                disabled={saving}
                            >
                                {saving ? "Guardando..." : "Guardar Hero"}
                            </ButtonComponent>
                        </div>
                    </section>
                )}

                {/* About Tab */}
                {activeTab === "about" && (
                    <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
                        <div>
                            <h2 className="text-xl font-bold font-display text-yambo-black mb-1">Sección Sobre Nosotros</h2>
                            <p className="text-sm text-gray-400 mb-4">
                                Texto introductorio y puntos destacados.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Texto introductorio</label>
                            <textarea
                                className="w-full border border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:border-yambo-green-500 focus:ring-1 focus:ring-yambo-green-500/50 resize-y"
                                rows={4}
                                maxLength={1000}
                                value={aboutIntro}
                                placeholder="Describe brevemente la organización..."
                                onChange={(e) => setAboutIntro(e.target.value)}
                            />
                            <p className="text-xs text-gray-400 text-right mt-1">{aboutIntro.length}/1000</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Imagen</label>
                            <FileUploader
                                compact
                                multiple={false}
                                label="Subir imagen"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                onUpload={(file) => setAboutImage(file.url)}
                            />
                        </div>

                        {aboutImage && (
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Vista previa</p>
                                <img
                                    src={aboutImage}
                                    alt="Vista previa about"
                                    className="rounded-2xl max-h-48 object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                />
                            </div>
                        )}

                        {/* Bullets editor */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-gray-700">Puntos destacados</label>
                                <ButtonComponent variant="primary" size="sm" onClick={addBullet}>
                                    + Añadir punto
                                </ButtonComponent>
                            </div>

                            <div className="space-y-4">
                                {aboutBullets.map((bullet, index) => (
                                    <div
                                        key={index}
                                        className="border border-gray-100 rounded-2xl p-4 bg-yambo-green-50/30 relative"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-semibold text-gray-400 uppercase">
                                                Punto {index + 1}
                                            </span>
                                            <div className="flex gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => moveBullet(index, "up")}
                                                    disabled={index === 0}
                                                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                                    title="Mover arriba"
                                                >
                                                    <FontAwesomeIcon icon={faChevronUp} className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => moveBullet(index, "down")}
                                                    disabled={index === aboutBullets.length - 1}
                                                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                                    title="Mover abajo"
                                                >
                                                    <FontAwesomeIcon icon={faChevronDown} className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeBullet(index)}
                                                    disabled={aboutBullets.length <= 1}
                                                    className="p-1 text-coral hover:text-coral/80 disabled:opacity-30"
                                                    title="Eliminar"
                                                >
                                                    <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-[4rem_1fr] gap-3">
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Icono</label>
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-100 rounded-xl px-2 py-2 text-center text-xl focus:outline-none focus:border-yambo-green-500 focus:ring-1 focus:ring-yambo-green-500/50"
                                                    value={bullet.icon}
                                                    maxLength={4}
                                                    onChange={(e) => updateBullet(index, "icon", e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Título</label>
                                                <input
                                                    type="text"
                                                    className="w-full border border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:border-yambo-green-500 focus:ring-1 focus:ring-yambo-green-500/50"
                                                    value={bullet.title}
                                                    placeholder="Título del punto"
                                                    onChange={(e) => updateBullet(index, "title", e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-3">
                                            <label className="block text-xs text-gray-400 mb-1">Descripción</label>
                                            <textarea
                                                className="w-full border border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:border-yambo-green-500 focus:ring-1 focus:ring-yambo-green-500/50 resize-y"
                                                rows={2}
                                                maxLength={300}
                                                value={bullet.description}
                                                placeholder="Breve descripción..."
                                                onChange={(e) => updateBullet(index, "description", e.target.value)}
                                            />
                                        </div>

                                        <div className="mt-3">
                                            <label className="block text-xs text-gray-400 mb-1">Enlace (opcional)</label>
                                            <input
                                                type="text"
                                                className="w-full border border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:border-yambo-green-500 focus:ring-1 focus:ring-yambo-green-500/50"
                                                value={bullet.link}
                                                placeholder="/ruta o https://..."
                                                onChange={(e) => updateBullet(index, "link", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-100">
                            <ButtonComponent
                                variant="primary"
                                onClick={handleSaveAbout}
                                disabled={saving}
                            >
                                {saving ? "Guardando..." : "Guardar Sobre Nosotros"}
                            </ButtonComponent>
                        </div>
                    </section>
                )}
            </main>
        </RequirePermission>
    );
}
