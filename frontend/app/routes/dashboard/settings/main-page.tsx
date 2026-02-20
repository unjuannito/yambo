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
import { faChevronUp, faChevronDown, faXmark } from "@fortawesome/free-solid-svg-icons";

export function meta() {
    return [
        { title: "Yambo - Editor Página Principal" },
        { name: "description", content: "Editor de contenido de la página principal" },
    ];
}

type MainPageTab = "hero" | "about";

interface BulletItem {
    icon: string;
    title: string;
    description: string;
    link: string;
}

const EMPTY_BULLET: BulletItem = { icon: "\u25CE", title: "", description: "", link: "" };

export default function MainPageEditor() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<MainPageTab>("hero");
    const [saving, setSaving] = useState(false);

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
            setError(getErrorMessage(err, "Error al cargar la configuración de la página principal"));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadSettings();
    }, [loadSettings]);

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
            toast.error(getErrorMessage(err, "Error al guardar la sección Hero"));
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
            toast.error(getErrorMessage(err, "Error al guardar la sección Sobre Nosotros"));
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
        { key: "hero", label: "Hero" },
        { key: "about", label: "Sobre Nosotros" },
    ];

    if (loading) {
        return (
            <RequirePermission permission={{ obj: "settings", action: "update" }} redirectTo="/mi-espacio">
                <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                    <LoadingSpinner message="Cargando configuración..." size="lg" />
                </main>
            </RequirePermission>
        );
    }

    if (error) {
        return (
            <RequirePermission permission={{ obj: "settings", action: "update" }} redirectTo="/mi-espacio">
                <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                    <ErrorMessage message={error} onRetry={loadSettings} />
                </main>
            </RequirePermission>
        );
    }

    return (
        <RequirePermission permission={{ obj: "settings", action: "update" }} redirectTo="/mi-espacio">
            <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                <h1 className="text-3xl font-bold mb-6">Editor de Página Principal</h1>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.key
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Hero Tab */}
                {activeTab === "hero" && (
                    <section className="bg-white rounded-lg shadow p-6 space-y-6">
                        <div>
                            <h2 className="text-xl font-semibold mb-1">Sección Hero</h2>
                            <p className="text-sm text-gray-500 mb-4">
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
                                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                                rows={3}
                                maxLength={500}
                                value={heroSubtitle}
                                placeholder="Breve descripción debajo del título..."
                                onChange={(e) => setHeroSubtitle(e.target.value)}
                            />
                            <p className="text-xs text-gray-400 text-right mt-1">{heroSubtitle.length}/500</p>
                        </div>

                        <InputComponent
                            label="URL de imagen de fondo"
                            value={heroImage}
                            placeholder="https://..."
                            onChange={(e) => setHeroImage(e.target.value)}
                        />

                        {heroImage && (
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Vista previa</p>
                                <div className="relative rounded-lg overflow-hidden h-48 bg-gray-100">
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
                                            <p className="text-2xl font-bold">{heroTitle || "Título"}</p>
                                            <p className="text-sm mt-1">{heroSubtitle || "Subtítulo"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-4 border-t">
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
                    <section className="bg-white rounded-lg shadow p-6 space-y-6">
                        <div>
                            <h2 className="text-xl font-semibold mb-1">Sección Sobre Nosotros</h2>
                            <p className="text-sm text-gray-500 mb-4">
                                Texto introductorio y puntos destacados.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Texto introductorio</label>
                            <textarea
                                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                                rows={4}
                                maxLength={1000}
                                value={aboutIntro}
                                placeholder="Describe brevemente la organización..."
                                onChange={(e) => setAboutIntro(e.target.value)}
                            />
                            <p className="text-xs text-gray-400 text-right mt-1">{aboutIntro.length}/1000</p>
                        </div>

                        <InputComponent
                            label="URL de imagen"
                            value={aboutImage}
                            placeholder="https://..."
                            onChange={(e) => setAboutImage(e.target.value)}
                        />

                        {aboutImage && (
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Vista previa</p>
                                <img
                                    src={aboutImage}
                                    alt="Vista previa about"
                                    className="rounded-lg max-h-48 object-cover"
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
                                        className="border rounded-lg p-4 bg-gray-50 relative"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-semibold text-gray-500 uppercase">
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
                                                    className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30"
                                                    title="Eliminar"
                                                >
                                                    <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-[4rem_1fr] gap-3">
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Icono</label>
                                                <input
                                                    type="text"
                                                    className="w-full border rounded px-2 py-2 text-center text-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={bullet.icon}
                                                    maxLength={4}
                                                    onChange={(e) => updateBullet(index, "icon", e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Título</label>
                                                <input
                                                    type="text"
                                                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={bullet.title}
                                                    placeholder="Título del punto"
                                                    onChange={(e) => updateBullet(index, "title", e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-3">
                                            <label className="block text-xs text-gray-500 mb-1">Descripción</label>
                                            <textarea
                                                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                                                rows={2}
                                                maxLength={300}
                                                value={bullet.description}
                                                placeholder="Breve descripción..."
                                                onChange={(e) => updateBullet(index, "description", e.target.value)}
                                            />
                                        </div>

                                        <div className="mt-3">
                                            <label className="block text-xs text-gray-500 mb-1">Enlace (opcional)</label>
                                            <input
                                                type="text"
                                                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={bullet.link}
                                                placeholder="/ruta o https://..."
                                                onChange={(e) => updateBullet(index, "link", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t">
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
