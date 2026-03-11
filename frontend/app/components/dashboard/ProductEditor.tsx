import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { getErrorMessage } from "~/types/error";
import { productService, type OptionValue, type Product, type ProductOption } from "~/services/productService";
import { familyProductService, type FamilyProduct } from "~/services/familyProductService";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faGripVertical, faArrowUp, faArrowDown } from "@fortawesome/free-solid-svg-icons";
import FileUploader from "~/components/common/FileUploader";
import InputComponent from "~/components/common/forms/InputComponent";
import SelectComponent from "~/components/common/forms/SelectComponent";
import CheckboxComponent from "~/components/common/forms/CheckboxComponent";
import MarkdownEditor from "~/components/common/forms/MarkdownEditor";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, rectSortingStrategy, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ButtonComponent from "~/components/common/forms/ButtonComponent";

type ProductEditorMode = "create" | "edit";

export interface ProductEditorProps {
    mode: ProductEditorMode;
    productId?: string;
}

function SortableImageItem({ id, url, index, onRemove }: {
    id: string;
    url: string;
    index: number;
    onRemove: (index: number) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="relative group">
            <img
                src={url}
                alt={`Imagen ${index + 1}`}
                className="w-full h-24 object-cover rounded-xl border border-gray-100"
                onError={(e) => {
                    (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f3f4f6' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%239ca3af' font-size='12'%3EError%3C/text%3E%3C/svg%3E";
                }}
            />
            <button
                type="button"
                {...attributes}
                {...listeners}
                className="absolute top-1 left-1 bg-gray-800/70 text-white rounded-full w-6 h-6 flex items-center justify-center cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <FontAwesomeIcon icon={faGripVertical} className="w-3 h-3" />
            </button>
            <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute top-1 right-1 bg-coral text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
            </button>
            <span className="absolute bottom-1 left-1 bg-gray-800/70 text-white text-[10px] rounded-full px-1.5">
                {index + 1}
            </span>
        </div>
    );
}

function SortableOptionItem({ id, children }: {
    id: string;
    children: (props: { dragHandleProps: Record<string, any> }) => React.ReactNode;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style}>
            {children({ dragHandleProps: { ...attributes, ...listeners } })}
        </div>
    );
}

function SortableValueItem({ id, children }: {
    id: string;
    children: (props: { dragHandleProps: Record<string, any> }) => React.ReactNode;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style}>
            {children({ dragHandleProps: { ...attributes, ...listeners } })}
        </div>
    );
}

function emptyProduct(): Product {
    return {
        id: "",
        name: "",
        projectId: null,
        familyProductId: null,
        active: true,
        basePrice: 0,
        options: [],
        images: [],
        description: "",
    };
}

function normalizeOptionalId(value: string | null | undefined): string | undefined {
    const trimmed = (value ?? "").trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeOption(option: ProductOption): ProductOption {
    if (option.type === "select") {
        return {
            ...option,
            values: option.values ?? [],
        };
    }

    return {
        ...option,
        values: undefined,
    };
}

export default function ProductEditor({ mode, productId }: ProductEditorProps) {
    const navigate = useNavigate();

    const isEditing = mode === "edit";

    const [savedProducts, setSavedProducts] = useState<Product[]>([]);
    const [familyProducts, setFamilyProducts] = useState<FamilyProduct[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [jsonInput, setJsonInput] = useState("");
    const [jsonError, setJsonError] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [product, setProduct] = useState<Product>(() => emptyProduct());

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    const imageIdCounter = useRef(0);
    const imageIdMap = useRef(new Map<string, string>());

    const optionIdCounter = useRef(0);
    const optionIdListRef = useRef<string[]>([]);

    const imageIds = useMemo(() => {
        const imgs = product.images || [];
        const newMap = new Map<string, string>();
        const usedIds = new Set<string>();

        const ids = imgs.map((url) => {
            const existingId = imageIdMap.current.get(url);
            if (existingId && !usedIds.has(existingId)) {
                usedIds.add(existingId);
                newMap.set(url, existingId);
                return existingId;
            }
            const id = `img-${imageIdCounter.current++}`;
            usedIds.add(id);
            newMap.set(url, id);
            return id;
        });

        imageIdMap.current = newMap;
        return ids;
    }, [product.images]);

    const optionIds = useMemo(() => {
        const opts = product.options || [];
        const prev = optionIdListRef.current;
        while (prev.length < opts.length) {
            prev.push(`opt-${optionIdCounter.current++}`);
        }
        const ids = prev.slice(0, opts.length);
        optionIdListRef.current = ids;
        return ids;
    }, [product.options.length]);

    useEffect(() => {
        const loadProducts = async () => {
            try {
                setLoading(true);

                const familyResponse = await familyProductService.listFamilyProducts(0, 200);
                setFamilyProducts(familyResponse.content);

                if (isEditing) {
                    if (!productId) {
                        throw new Error("Missing productId for edit mode");
                    }
                    const productToEdit = await productService.getProductById(productId);
                    setProduct(productToEdit);
                    setJsonInput("");
                    setJsonError("");
                    return;
                }

                const response = await productService.getAllProducts(0, 100);
                setSavedProducts(response.content);
            } catch (err) {
                toast.error(getErrorMessage(err, "Error al cargar el producto"));
                navigate("/mi-espacio/merch");
            } finally {
                setLoading(false);
            }
        };

        loadProducts();
    }, [isEditing, navigate, productId]);

    const addOption = () => {
        setProduct({
            ...product,
            options: [
                ...product.options,
                {
                    name: "",
                    type: "select",
                    values: [],
                    required: false,
                },
            ],
        });
    };

    const removeOption = (index: number) => {
        setProduct({
            ...product,
            options: product.options.filter((_, i) => i !== index),
        });
    };

    const updateOption = (index: number, updates: Partial<ProductOption>) => {
        const newOptions = [...product.options];
        const next = normalizeOption({ ...newOptions[index], ...updates } as ProductOption);
        newOptions[index] = next;
        setProduct({ ...product, options: newOptions });
    };

    const addValue = (optionIndex: number) => {
        const newOptions = [...product.options];
        const existing = newOptions[optionIndex];

        const nextValues = [...(existing.values ?? [])];
        nextValues.push({
            id: "",
            label: "",
            price: 0,
        });

        newOptions[optionIndex] = normalizeOption({ ...existing, values: nextValues });
        setProduct({ ...product, options: newOptions });
    };

    const removeValue = (optionIndex: number, valueIndex: number) => {
        const newOptions = [...product.options];
        const existing = newOptions[optionIndex];

        const nextValues = (existing.values ?? []).filter((_, i) => i !== valueIndex);
        newOptions[optionIndex] = normalizeOption({ ...existing, values: nextValues });
        setProduct({ ...product, options: newOptions });
    };

    const updateValue = (optionIndex: number, valueIndex: number, updates: Partial<OptionValue>) => {
        const newOptions = [...product.options];
        const existing = newOptions[optionIndex];

        const nextValues = [...(existing.values ?? [])];

        if (updates.label !== undefined) {
            updates.id = updates.label.toLowerCase();
        }

        nextValues[valueIndex] = {
            ...nextValues[valueIndex],
            ...updates,
        };

        newOptions[optionIndex] = normalizeOption({ ...existing, values: nextValues });
        setProduct({ ...product, options: newOptions });
    };

    const moveValue = (optionIndex: number, valueIndex: number, direction: "up" | "down") => {
        const newOptions = [...product.options];
        const existing = newOptions[optionIndex];
        const values = [...(existing.values ?? [])];
        const target = direction === "up" ? valueIndex - 1 : valueIndex + 1;
        if (target < 0 || target >= values.length) return;
        const reordered = arrayMove(values, valueIndex, target);
        newOptions[optionIndex] = normalizeOption({ ...existing, values: reordered });
        setProduct({ ...product, options: newOptions });
    };

    const handleValueDragEnd = (optionIndex: number) => (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const values = product.options[optionIndex].values ?? [];
        const valueIds = values.map((_, i) => `val-${optionIndex}-${i}`);
        const oldIndex = valueIds.indexOf(active.id as string);
        const newIndex = valueIds.indexOf(over.id as string);
        if (oldIndex === -1 || newIndex === -1) return;
        const newOptions = [...product.options];
        const existing = newOptions[optionIndex];
        newOptions[optionIndex] = normalizeOption({ ...existing, values: arrayMove(values, oldIndex, newIndex) });
        setProduct({ ...product, options: newOptions });
    };

    const addImage = () => {
        setProduct({
            ...product,
            images: [...(product.images || []), ""],
        });
    };

    const removeImage = (index: number) => {
        setProduct({
            ...product,
            images: (product.images || []).filter((_, i) => i !== index),
        });
    };

    const moveImage = (index: number, direction: "up" | "down") => {
        const imgs = [...(product.images || [])];
        const target = direction === "up" ? index - 1 : index + 1;
        if (target < 0 || target >= imgs.length) return;
        [imgs[index], imgs[target]] = [imgs[target], imgs[index]];
        setProduct({ ...product, images: imgs });
    };

    const updateImage = (index: number, url: string) => {
        const newImages = [...(product.images || [])];
        newImages[index] = url;
        setProduct({ ...product, images: newImages });
    };

    const moveOption = (index: number, direction: "up" | "down") => {
        const opts = [...product.options];
        const target = direction === "up" ? index - 1 : index + 1;
        if (target < 0 || target >= opts.length) return;
        const newOpts = arrayMove(opts, index, target);
        optionIdListRef.current = arrayMove(optionIdListRef.current, index, target);
        setProduct({ ...product, options: newOpts });
    };

    const handleOptionDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = optionIds.indexOf(active.id as string);
        const newIndex = optionIds.indexOf(over.id as string);

        optionIdListRef.current = arrayMove(optionIdListRef.current, oldIndex, newIndex);
        setProduct((prev) => ({
            ...prev,
            options: arrayMove(prev.options, oldIndex, newIndex),
        }));
    };

    const handleImageDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = imageIds.indexOf(active.id as string);
        const newIndex = imageIds.indexOf(over.id as string);

        setProduct((prev) => ({
            ...prev,
            images: arrayMove(prev.images || [], oldIndex, newIndex),
        }));
    };

    const saveProduct = async () => {
        try {
            setSaving(true);

            if (isEditing) {
                if (!productId) {
                    throw new Error("Missing productId for edit mode");
                }

                const productData = {
                    name: product.name,
                    active: product.active,
                    images: product.images,
                    options: product.options,
                    basePrice: product.basePrice,
                    familyProductId: normalizeOptionalId(product.familyProductId),
                    description: product.description,
                };

                await productService.updateProduct(productId, productData);
                toast.success("Producto actualizado exitosamente");
                navigate(`/mi-espacio/merch/${productId}`);
                return;
            }

            await productService.createProduct({
                name: product.name,
                familyProductId: normalizeOptionalId(product.familyProductId),
                basePrice: product.basePrice,
                options: product.options.map(normalizeOption),
                images: product.images,
                description: product.description,
            });

            toast.success("Producto guardado exitosamente");
            navigate("/mi-espacio/merch");
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al guardar el producto"));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-white to-yambo-green-50/30 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yambo-green-500 mx-auto"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <ButtonComponent
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/mi-espacio/merch")}
                >
                    ← Volver al merch
                </ButtonComponent>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                <h1 className="text-2xl font-extrabold font-display text-yambo-black mb-2">{isEditing ? "Editar Producto" : "Crear Nuevo Producto"}</h1>
                <p className="text-gray-400">
                    {isEditing ? "Modifica los detalles del producto" : "Crea un nuevo producto con todas sus opciones"}
                </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-xl font-bold font-display text-yambo-black mb-4">Detalles del Producto</h2>
                        <div className="space-y-4">
                            <InputComponent
                                label="Nombre del Producto"
                                type="text"
                                value={product.name}
                                onChange={(e) => setProduct({ ...product, name: e.target.value })}
                                placeholder="ej. Sudadera Jamboloco 2025"
                            />

                            <SelectComponent
                                label="Drop (Familia de productos)"
                                value={product.familyProductId || ""}
                                onChange={(e) =>
                                    setProduct({
                                        ...product,
                                        familyProductId: e.target.value.length ? e.target.value : null,
                                    })
                                }
                                options={[
                                    { value: "", label: "Sin drop" },
                                    ...familyProducts.map((family) => ({ value: family.id, label: family.name })),
                                ]}
                            />

                            <InputComponent
                                label="Precio Base (€)"
                                type="number"
                                value={product.basePrice}
                                onChange={(e) => setProduct({ ...product, basePrice: parseFloat(e.target.value) || 0 })}
                                placeholder="0"
                            />

                            <CheckboxComponent
                                label="Activo"
                                variantType="toggle"
                                variant="right"
                                checked={product.active}
                                disabled={!isEditing}
                                onChange={(e) => {
                                    if (!isEditing) return;
                                    setProduct({ ...product, active: e.target.checked });
                                }}
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-xl font-bold font-display text-yambo-black mb-4">Descripción del Producto</h2>
                        <MarkdownEditor
                            value={product.description || ""}
                            onChange={(value) => setProduct({ ...product, description: value })}
                            className="min-h-[200px] border border-gray-200 rounded-xl"
                        />
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-xl font-bold font-display text-yambo-black mb-4">Imágenes del Producto</h2>
                        <FileUploader
                            multiple
                            label="Arrastra o haz clic para subir archivos"
                            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                            onUpload={(file) =>
                                setProduct((prev) => ({
                                    ...prev,
                                    images: [...(prev.images || []), file.url],
                                }))
                            }
                            onDelete={() =>
                                setProduct((prev) => ({
                                    ...prev,
                                    images: (prev.images || []).filter((_, i) => i !== (prev.images || []).length - 1),
                                }))
                            }
                        />
                        {(product.images || []).length > 0 && (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleImageDragEnd}>
                                <SortableContext items={imageIds} strategy={rectSortingStrategy}>
                                    <div className="mt-4 grid grid-cols-3 gap-3">
                                        {(product.images || []).map((url, index) => (
                                            <SortableImageItem
                                                key={imageIds[index]}
                                                id={imageIds[index]}
                                                url={url}
                                                index={index}
                                                onRemove={removeImage}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold font-display text-yambo-black">Opciones del Producto</h2>
                            <ButtonComponent
                                variant="primary"
                                size="sm"
                                onClick={addOption}
                            >
                                + Añadir Opción
                            </ButtonComponent>
                        </div>

                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleOptionDragEnd}>
                            <SortableContext items={optionIds} strategy={verticalListSortingStrategy}>
                        <div className="space-y-6">
                            {product.options.map((option, optionIndex) => (
                                <SortableOptionItem key={optionIds[optionIndex]} id={optionIds[optionIndex]}>
                                    {({ dragHandleProps }) => (
                                <div className="border border-gray-100 rounded-2xl p-5">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                {...dragHandleProps}
                                                className="cursor-grab text-gray-300 hover:text-gray-500 p-1"
                                                title="Arrastrar para reordenar"
                                            >
                                                <FontAwesomeIcon icon={faGripVertical} className="w-4 h-4" />
                                            </button>
                                            <h3 className="font-bold text-lg text-yambo-black">Opción {optionIndex + 1}</h3>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => moveOption(optionIndex, "up")}
                                                disabled={optionIndex === 0}
                                                className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Mover arriba"
                                            >
                                                <FontAwesomeIcon icon={faArrowUp} className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => moveOption(optionIndex, "down")}
                                                disabled={optionIndex === product.options.length - 1}
                                                className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Mover abajo"
                                            >
                                                <FontAwesomeIcon icon={faArrowDown} className="w-4 h-4" />
                                            </button>
                                            <ButtonComponent
                                                variant="danger-text"
                                                size="sm"
                                                onClick={() => removeOption(optionIndex)}
                                                className="ml-2"
                                            >
                                                Eliminar
                                            </ButtonComponent>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                                        <InputComponent
                                            label="Nombre"
                                            type="text"
                                            value={option.name}
                                            onChange={(e) => updateOption(optionIndex, { name: e.target.value })}
                                            placeholder="ej. Talla"
                                        />

                                        <SelectComponent
                                            label="Tipo"
                                            value={option.type}
                                            onChange={(e) =>
                                                updateOption(optionIndex, {
                                                    type: e.target.value as ProductOption["type"],
                                                })
                                            }
                                            options={[
                                                { value: "select", label: "Selección" },
                                                { value: "checkbox", label: "Checkbox" },
                                                { value: "text_input", label: "Entrada de Texto" },
                                            ]}
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <CheckboxComponent
                                            label="Requerido"
                                            variant="left"
                                            checked={!!option.required}
                                            onChange={(e) => updateOption(optionIndex, { required: e.target.checked })}
                                        />
                                    </div>

                                    {option.type === "select" && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-semibold text-yambo-black">Valores</h4>
                                                <ButtonComponent
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => addValue(optionIndex)}
                                                >
                                                    + Añadir Valor
                                                </ButtonComponent>
                                            </div>

                                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleValueDragEnd(optionIndex)}>
                                                <SortableContext items={(option.values || []).map((_, vi) => `val-${optionIndex}-${vi}`)} strategy={verticalListSortingStrategy}>
                                            {(option.values || []).map((value, valueIndex) => (
                                                <SortableValueItem key={`val-${optionIndex}-${valueIndex}`} id={`val-${optionIndex}-${valueIndex}`}>
                                                    {({ dragHandleProps }) => (
                                                <div className="flex gap-1 items-end">
                                                    <button
                                                        type="button"
                                                        {...dragHandleProps}
                                                        className="cursor-grab text-gray-300 hover:text-gray-500 p-1 self-center"
                                                        title="Arrastrar para reordenar"
                                                    >
                                                        <FontAwesomeIcon icon={faGripVertical} className="w-3 h-3" />
                                                    </button>
                                                    <div className="flex flex-col gap-0.5 self-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => moveValue(optionIndex, valueIndex, "up")}
                                                            disabled={valueIndex === 0}
                                                            className="text-gray-300 hover:text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed leading-none"
                                                            title="Mover arriba"
                                                        >
                                                            <FontAwesomeIcon icon={faArrowUp} className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => moveValue(optionIndex, valueIndex, "down")}
                                                            disabled={valueIndex === (option.values || []).length - 1}
                                                            className="text-gray-300 hover:text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed leading-none"
                                                            title="Mover abajo"
                                                        >
                                                            <FontAwesomeIcon icon={faArrowDown} className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <div className="flex-1">
                                                        <InputComponent
                                                            label="Etiqueta"
                                                            type="text"
                                                            value={value.label}
                                                            onChange={(e) => updateValue(optionIndex, valueIndex, { label: e.target.value })}
                                                            placeholder="ej. XL"
                                                            className="text-sm"
                                                        />
                                                    </div>
                                                    <div className="w-24">
                                                        <InputComponent
                                                            label="Precio"
                                                            type="number"
                                                            value={value.price || 0}
                                                            onChange={(e) =>
                                                                updateValue(optionIndex, valueIndex, {
                                                                    price: parseFloat(e.target.value) || 0,
                                                                })
                                                            }
                                                            className="text-sm"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => removeValue(optionIndex, valueIndex)}
                                                        className="px-2 py-1 bg-coral text-white rounded-full hover:bg-red-500 text-sm transition-colors"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                    )}
                                                </SortableValueItem>
                                            ))}
                                                </SortableContext>
                                            </DndContext>

                                            {(option.values || []).length === 0 && (
                                                <p className="text-gray-400 text-sm">No hay valores añadidos aún.</p>
                                            )}
                                        </div>
                                    )}

                                    {option.type === "text_input" && (
                                        <div className="mt-4">
                                            <InputComponent
                                                label="Precio adicional (€)"
                                                type="number"
                                                value={option.price || 0}
                                                onChange={(e) =>
                                                    updateOption(optionIndex, {
                                                        price: parseFloat(e.target.value) || 0,
                                                    })
                                                }
                                                className="w-40"
                                            />
                                        </div>
                                    )}
                                </div>
                                    )}
                                </SortableOptionItem>
                            ))}

                            {product.options.length === 0 && (
                                <p className="text-gray-400 text-sm text-center py-4">
                                    No hay opciones añadidas aún. Haz clic en "Añadir Opción" para comenzar.
                                </p>
                            )}
                        </div>
                            </SortableContext>
                        </DndContext>
                    </div>

                    <ButtonComponent
                        variant="primary"
                        size="lg"
                        onClick={saveProduct}
                        isLoading={saving}
                        className="w-full"
                    >
                        {isEditing ? "Guardar Cambios" : "Crear Producto"}
                    </ButtonComponent>
                </div>
            </div>
        </div>
    );
}
