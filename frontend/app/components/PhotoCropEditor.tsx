import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "~/components/common/Modal";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import {
    DEFAULT_EDIT,
    FRAME,
    MAX_ZOOM,
    normalizeEdit,
    pan,
    placement,
    renderCrop,
    rotateTo,
    zoomTo,
    type PhotoEdit,
} from "~/utils/photoCrop";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRotateLeft, faArrowRotateRight, faFloppyDisk, faMagnifyingGlassMinus, faMagnifyingGlassPlus, faRotateLeft } from "@fortawesome/free-solid-svg-icons";

interface PhotoCropEditorProps {
    isOpen: boolean;
    /** La foto original que se encuadra. */
    src: string;
    /** Encuadre del que se parte (el guardado, al reajustar). */
    initialEdit?: Partial<PhotoEdit> | null;
    onCancel: () => void;
    /** Recibe el encuadre elegido y el recorte ya generado. */
    onConfirm: (edit: PhotoEdit, crop: Blob) => void | Promise<void>;
    saving?: boolean;
}

interface PlacedPhotoProps {
    src: string;
    size: { width: number; height: number } | null;
    edit: PhotoEdit;
    /** Píxeles por unidad de marco. */
    unit: number;
    className?: string;
}

/** La foto colocada respecto al centro de su contenedor, que hace de centro del marco. */
function PlacedPhoto({ src, size, edit, unit, className = "" }: PlacedPhotoProps) {
    if (!size) return null;
    const place = placement(size.width, size.height, edit);
    return (
        <img
            src={src}
            alt=""
            draggable={false}
            className={`absolute left-1/2 top-1/2 max-w-none select-none pointer-events-none ${className}`}
            style={{
                width: place.width * unit,
                height: place.height * unit,
                transform: `translate(calc(-50% + ${place.offsetX * unit}px), calc(-50% + ${place.offsetY * unit}px)) rotate(${place.rotation}deg)`,
            }}
        />
    );
}

/** La foto dentro de un marco 5:6 de un ancho dado. */
function FramedPhoto({ frameWidth, ...photo }: Omit<PlacedPhotoProps, "unit" | "className"> & { frameWidth: number }) {
    const unit = frameWidth / FRAME.width;
    return (
        <div className="relative shrink-0 overflow-hidden bg-gray-100" style={{ width: frameWidth, height: unit * FRAME.height }}>
            <PlacedPhoto {...photo} unit={unit} />
        </div>
    );
}

/** Margen alrededor del marco donde se ve, atenuado, lo que queda fuera del recorte. */
const STAGE_PADDING = 28;
const ZOOM_STEP = 0.25;
/** El deslizador endereza hasta ±45°; los giros completos van con los botones de 90°. */
const MAX_STRAIGHTEN = 45;

interface SliderProps {
    id: string;
    min: number;
    max: number;
    step: number;
    value: number;
    onChange: (value: number) => void;
    disabled: boolean;
    /** Desde dónde se pinta el tramo relleno: el mínimo (zoom) o el centro (enderezar). */
    fillFrom?: "min" | "center";
}

function Slider({ id, min, max, step, value, onChange, disabled, fillFrom = "min" }: SliderProps) {
    const percent = ((value - min) / (max - min)) * 100;
    const [from, to] = fillFrom === "min" ? [0, percent] : [Math.min(50, percent), Math.max(50, percent)];
    const fill = "var(--color-yambo-green-500)";
    return (
        <input
            id={id}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={disabled}
            className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-yambo-green-300 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-yambo-green-500 [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-yambo-green-500"
            style={{ background: `linear-gradient(to right, #e5e7eb ${from}%, ${fill} ${from}%, ${fill} ${to}%, #e5e7eb ${to}%)` }}
        />
    );
}

/**
 * Editor de encuadre de la foto de perfil: se arrastra para centrar, se acerca y se gira.
 * Devuelve el encuadre y el recorte final, listo para subir.
 */
export function PhotoCropEditor({ isOpen, src, initialEdit, onCancel, onConfirm, saving = false }: PhotoCropEditorProps) {
    const { t } = useTranslation();
    const [edit, setEdit] = useState<PhotoEdit>(() => normalizeEdit(initialEdit));
    const [size, setSize] = useState<{ width: number; height: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [rendering, setRendering] = useState(false);
    const [frameWidth, setFrameWidth] = useState(300);
    const [dragging, setDragging] = useState(false);

    const imageRef = useRef<HTMLImageElement | null>(null);
    const stageRef = useRef<HTMLDivElement | null>(null);
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const pinchDistance = useRef<number | null>(null);

    // Cada vez que se abre con otra foto se carga y se parte de su encuadre
    useEffect(() => {
        if (!isOpen) return;
        setEdit(normalizeEdit(initialEdit));
        setSize(null);
        setError(null);
        const image = new Image();
        image.onload = () => {
            imageRef.current = image;
            setSize({ width: image.naturalWidth, height: image.naturalHeight });
        };
        image.onerror = () => setError(t("photoEditor.loadError"));
        image.src = src;
        return () => {
            image.onload = null;
            image.onerror = null;
        };
    }, [isOpen, src]);

    // El marco se adapta al hueco disponible: en pantallas bajas se encoge para dejar sitio a los controles
    useEffect(() => {
        if (!isOpen) return;
        const measure = () => {
            const available = (stageRef.current?.parentElement?.clientWidth ?? 360) - STAGE_PADDING * 2;
            const share = window.innerWidth < 640 ? 0.3 : 0.45;
            const byHeight = (window.innerHeight * share * FRAME.width) / FRAME.height;
            setFrameWidth(Math.max(150, Math.min(300, available, byHeight)));
        };
        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, [isOpen]);

    const unit = frameWidth / FRAME.width;
    const ready = size !== null && !error;

    const setZoom = (zoom: number) => size && setEdit((prev) => zoomTo(size.width, size.height, prev, zoom));
    const move = (dx: number, dy: number) => size && setEdit((prev) => pan(size.width, size.height, prev, dx, dy));

    // El giro se reparte en vueltas de 90° (botones) y un enderezado fino (deslizador)
    const quarterTurns = Math.round(edit.rotation / 90) * 90;
    const straighten = edit.rotation - quarterTurns;
    const setStraighten = (value: number) => {
        // Imán en el cero para volver a dejarla recta sin afinar
        const snapped = Math.abs(value) < 1.5 ? 0 : value;
        setEdit((prev) => rotateTo(prev, quarterTurns + snapped));
    };
    const turn = (degrees: number) => setEdit((prev) => rotateTo(prev, prev.rotation + degrees));

    const untouched = edit.x === 0 && edit.y === 0 && edit.zoom === 1 && edit.rotation === 0;

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!ready) return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        pinchDistance.current = null;
        setDragging(true);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const previous = pointers.current.get(e.pointerId);
        if (!previous || !size) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pointers.current.size >= 2) {
            // Pellizco: la distancia entre los dos dedos marca el zoom
            const [a, b] = [...pointers.current.values()];
            const distance = Math.hypot(a.x - b.x, a.y - b.y);
            if (pinchDistance.current) {
                const factor = distance / pinchDistance.current;
                setEdit((prev) => zoomTo(size.width, size.height, prev, prev.zoom * factor));
            }
            pinchDistance.current = distance;
            return;
        }

        move((e.clientX - previous.x) / unit, (e.clientY - previous.y) / unit);
    };

    const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
        pointers.current.delete(e.pointerId);
        pinchDistance.current = null;
        if (pointers.current.size === 0) setDragging(false);
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (!size) return;
        setEdit((prev) => zoomTo(size.width, size.height, prev, prev.zoom * (1 - e.deltaY * 0.0015)));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!ready) return;
        const stepSize = e.shiftKey ? 0.5 : 0.1;
        const actions: Record<string, () => void> = {
            ArrowLeft: () => move(-stepSize, 0),
            ArrowRight: () => move(stepSize, 0),
            ArrowUp: () => move(0, -stepSize),
            ArrowDown: () => move(0, stepSize),
            "+": () => setZoom(edit.zoom + ZOOM_STEP),
            "-": () => setZoom(edit.zoom - ZOOM_STEP),
        };
        const action = actions[e.key];
        if (!action) return;
        e.preventDefault();
        action();
    };

    const handleConfirm = async () => {
        if (!imageRef.current) return;
        try {
            setRendering(true);
            setError(null);
            const crop = await renderCrop(imageRef.current, edit);
            await onConfirm(edit, crop);
        } catch {
            setError(t("photoEditor.saveError"));
        } finally {
            setRendering(false);
        }
    };

    const busy = saving || rendering;
    const iconButtonClass =
        "w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:border-yambo-green-400 hover:text-yambo-green-600 transition-colors disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-600";

    return (
        <Modal
            isOpen={isOpen}
            onClose={busy ? () => {} : onCancel}
            title={t("photoEditor.title")}
            size="md"
            variant="bottom-sheet"
            footer={
                <>
                    <ButtonComponent type="button" variant="secondary" onClick={onCancel} disabled={busy}>
                        {t("common.cancel")}
                    </ButtonComponent>
                    <ButtonComponent type="button" variant="primary" onClick={handleConfirm} disabled={!ready} isLoading={busy}>
                        <FontAwesomeIcon icon={faFloppyDisk} className="mr-1.5" />
                        {t("photoEditor.confirm")}
                    </ButtonComponent>
                </>
            }
        >
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-[auto_1fr] items-start">
                {/* Escenario: el marco en claro y, atenuado, lo que queda fuera del recorte */}
                <div className="w-full sm:w-[356px]">
                    <div
                        ref={stageRef}
                        role="application"
                        tabIndex={0}
                        aria-label={t("photoEditor.frameLabel")}
                        className={`relative mx-auto rounded-2xl overflow-hidden bg-gray-900 touch-none select-none focus:outline-none focus-visible:ring-4 focus-visible:ring-yambo-green-200 ${
                            dragging ? "cursor-grabbing" : "cursor-grab"
                        }`}
                        style={{ width: frameWidth + STAGE_PADDING * 2, height: unit * FRAME.height + STAGE_PADDING * 2 }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerEnd}
                        onPointerCancel={handlePointerEnd}
                        onWheel={handleWheel}
                        onKeyDown={handleKeyDown}
                    >
                        <PlacedPhoto src={src} size={size} edit={edit} unit={unit} className="opacity-35" />
                        <div
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg ring-2 ring-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
                            style={{ width: frameWidth, height: unit * FRAME.height }}
                        >
                            <PlacedPhoto src={src} size={size} edit={edit} unit={unit} />
                            {/* Guía del avatar redondo: el círculo central del marco */}
                            <div
                                aria-hidden
                                data-testid="avatar-guide"
                                className="absolute left-0 right-0 top-1/2 -translate-y-1/2 aspect-square rounded-full border-2 border-dashed border-white/60 pointer-events-none"
                            />
                            {/* Cuadrícula de tercios mientras se mueve */}
                            <div
                                aria-hidden
                                className={`absolute inset-0 pointer-events-none transition-opacity duration-200 ${dragging ? "opacity-100" : "opacity-0"}`}
                                style={{
                                    backgroundImage:
                                        "linear-gradient(to right, rgba(255,255,255,.55) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.55) 1px, transparent 1px)",
                                    backgroundSize: "33.333% 33.333%",
                                    backgroundPosition: "-1px -1px",
                                }}
                            />
                        </div>
                        {!ready && (
                            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-300 bg-gray-900 px-4 text-center">
                                {error ?? t("photoEditor.loading")}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-between gap-3 mt-2 mx-auto" style={{ maxWidth: frameWidth + STAGE_PADDING * 2 }}>
                        <p className="text-xs text-gray-400">
                            <span className="sm:hidden">{t("photoEditor.dragHintTouch")}</span>
                            <span className="hidden sm:inline">{t("photoEditor.dragHint")}</span>
                        </p>
                        <button
                            type="button"
                            onClick={() => setEdit({ ...DEFAULT_EDIT })}
                            disabled={!ready || untouched}
                            className="shrink-0 text-xs font-medium text-yambo-green-600 hover:text-yambo-green-700 disabled:text-gray-300 transition-colors"
                        >
                            <FontAwesomeIcon icon={faRotateLeft} className="mr-1" />
                            {t("photoEditor.reset")}
                        </button>
                    </div>
                </div>

                <div className="space-y-4 sm:space-y-5 min-w-0">
                    {/* Zoom */}
                    <div>
                        <div className="flex items-baseline justify-between mb-1.5">
                            <label htmlFor="photo-zoom" className="text-sm font-medium text-gray-700">
                                {t("photoEditor.zoom")}
                            </label>
                            <span className="text-xs tabular-nums text-gray-400">{Math.round(edit.zoom * 100)}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                className={iconButtonClass}
                                onClick={() => setZoom(edit.zoom - ZOOM_STEP)}
                                disabled={!ready || edit.zoom <= 1}
                                aria-label={t("photoEditor.zoomOut")}
                                title={t("photoEditor.zoomOut")}
                            >
                                <FontAwesomeIcon icon={faMagnifyingGlassMinus} className="w-4 h-4" />
                            </button>
                            <Slider id="photo-zoom" min={1} max={MAX_ZOOM} step={0.01} value={edit.zoom} onChange={setZoom} disabled={!ready} />
                            <button
                                type="button"
                                className={iconButtonClass}
                                onClick={() => setZoom(edit.zoom + ZOOM_STEP)}
                                disabled={!ready || edit.zoom >= MAX_ZOOM}
                                aria-label={t("photoEditor.zoomIn")}
                                title={t("photoEditor.zoomIn")}
                            >
                                <FontAwesomeIcon icon={faMagnifyingGlassPlus} className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Giro: vueltas de 90° con los botones y enderezado fino con el deslizador */}
                    <div>
                        <div className="flex items-baseline justify-between mb-1.5">
                            <label htmlFor="photo-rotation" className="text-sm font-medium text-gray-700">
                                {t("photoEditor.straighten")}
                            </label>
                            <span className="text-xs tabular-nums text-gray-400">
                                {straighten > 0 ? "+" : ""}
                                {Math.round(straighten)}°
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                className={iconButtonClass}
                                onClick={() => turn(-90)}
                                disabled={!ready}
                                aria-label={t("photoEditor.rotateLeft")}
                                title={t("photoEditor.rotateLeft")}
                            >
                                <FontAwesomeIcon icon={faArrowRotateLeft} className="w-4 h-4" />
                            </button>
                            <Slider
                                id="photo-rotation"
                                min={-MAX_STRAIGHTEN}
                                max={MAX_STRAIGHTEN}
                                step={0.5}
                                value={straighten}
                                onChange={setStraighten}
                                disabled={!ready}
                                fillFrom="center"
                            />
                            <button
                                type="button"
                                className={iconButtonClass}
                                onClick={() => turn(90)}
                                disabled={!ready}
                                aria-label={t("photoEditor.rotateRight")}
                                title={t("photoEditor.rotateRight")}
                            >
                                <FontAwesomeIcon icon={faArrowRotateRight} className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Vistas previas: la tarjeta del equipo (5:6, el marco entero) y el avatar redondo (el centro) */}
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                        <p className="text-xs font-medium text-gray-500 mb-2">{t("photoEditor.preview")}</p>
                        <div className="flex items-end gap-4">
                            <div className="text-center">
                                <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100">
                                    <FramedPhoto src={src} size={size} edit={edit} frameWidth={70} />
                                </div>
                                <span className="block text-[11px] text-gray-400 mt-1">{t("photoEditor.previewCard")}</span>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center rounded-full overflow-hidden shadow-sm ring-2 ring-yambo-green-100 mx-auto" style={{ width: 56, height: 56 }}>
                                    <FramedPhoto src={src} size={size} edit={edit} frameWidth={56} />
                                </div>
                                <span className="block text-[11px] text-gray-400 mt-1">{t("photoEditor.previewAvatar")}</span>
                            </div>
                        </div>
                    </div>

                    {error && size && <p className="text-sm text-red-500">{error}</p>}
                </div>
            </div>
        </Modal>
    );
}

export default PhotoCropEditor;
