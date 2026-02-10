import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useAuth } from "~/hooks/useAuth";
import { productService, type OptionValue, type Product, type ProductOption } from "~/services/productService";
import { familyProductService, type FamilyProduct } from "~/services/familyProductService";

type ProductEditorMode = "create" | "edit";

export interface ProductEditorProps {
    mode: ProductEditorMode;
    productId?: string;
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
    const { isAuthenticated } = useAuth();
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

    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

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

                // create mode
                const response = await productService.getAllProducts(0, 100);
                setSavedProducts(response.content);
            } catch (err) {
                console.error("Error loading product(s):", err);
                alert("Error al cargar el producto");
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
        
        // Auto-generate id from label in lowercase
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

    const updateImage = (index: number, url: string) => {
        const newImages = [...(product.images || [])];
        newImages[index] = url;
        setProduct({ ...product, images: newImages });
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
                };

                await productService.updateProduct(productId, productData);
                alert("Producto actualizado exitosamente!");
                navigate(`/mi-espacio/merch/${productId}`);
                return;
            }

            await productService.createProduct({
                name: product.name,
                familyProductId: normalizeOptionalId(product.familyProductId),
                basePrice: product.basePrice,
                options: product.options.map(normalizeOption),
                images: product.images,
            });

            alert("Producto guardado exitosamente!");
            navigate("/mi-espacio/merch");
        } catch (err) {
            console.error("Error saving product:", err);
            alert("Error al guardar el producto");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <button
                    onClick={() => navigate("/mi-espacio/merch")}
                    className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                    ← Volver al merch
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h1 className="text-2xl font-bold mb-4">{isEditing ? "Editar Producto" : "Crear Nuevo Producto"}</h1>
                <p className="text-gray-600">
                    {isEditing ? "Modifica los detalles del producto" : "Crea un nuevo producto con todas sus opciones"}
                </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-4">Detalles del Producto</h2>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Nombre del Producto</label>
                                <input
                                    type="text"
                                    value={product.name}
                                    onChange={(e) => setProduct({ ...product, name: e.target.value })}
                                    placeholder="ej. Sudadera Jamboloco 2025"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Drop (Familia de productos)</label>
                                <select
                                    value={product.familyProductId || ""}
                                    onChange={(e) =>
                                        setProduct({
                                            ...product,
                                            familyProductId: e.target.value.length ? e.target.value : null,
                                        })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Sin drop</option>
                                    {familyProducts.map((family) => (
                                        <option key={family.id} value={family.id}>
                                            {family.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Precio Base (€)</label>
                                <input
                                    type="number"
                                    value={product.basePrice}
                                    onChange={(e) => setProduct({ ...product, basePrice: parseFloat(e.target.value) || 0 })}
                                    placeholder="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-gray-700">Activo</label>
                                <input
                                    type="checkbox"
                                    checked={product.active}
                                    disabled={!isEditing}
                                    onChange={(e) => {
                                        if (!isEditing) {
                                            return;
                                        }
                                        setProduct({ ...product, active: e.target.checked });
                                    }}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Imágenes del Producto</h2>
                            <button
                                onClick={addImage}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                            >
                                + Añadir Imagen
                            </button>
                        </div>
                        <div className="space-y-3">
                            {(product.images || []).map((image, index) => (
                                <div key={index} className="flex gap-2 items-center">
                                    <input
                                        type="text"
                                        value={image}
                                        onChange={(e) => updateImage(index, e.target.value)}
                                        placeholder="URL de la imagen"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    />
                                    <button
                                        onClick={() => removeImage(index)}
                                        className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                            {(product.images || []).length === 0 && (
                                <p className="text-gray-500 text-sm text-center py-4">
                                    No hay imágenes añadidas aún. Haz clic en "Añadir Imagen" para comenzar.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Opciones del Producto</h2>
                            <button
                                onClick={addOption}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                            >
                                + Añadir Opción
                            </button>
                        </div>

                        <div className="space-y-6">
                            {product.options.map((option, optionIndex) => (
                                <div key={optionIndex} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="font-semibold text-lg">Opción {optionIndex + 1}</h3>
                                        <button
                                            onClick={() => removeOption(optionIndex)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            Eliminar
                                        </button>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Nombre</label>
                                            <input
                                                type="text"
                                                value={option.name}
                                                onChange={(e) => updateOption(optionIndex, { name: e.target.value })}
                                                placeholder="ej. Talla"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Tipo</label>
                                            <select
                                                value={option.type}
                                                onChange={(e) =>
                                                    updateOption(optionIndex, {
                                                        type: e.target.value as ProductOption["type"],
                                                    })
                                                }
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="select">Selección</option>
                                                <option value="checkbox">Checkbox</option>
                                                <option value="text_input">Entrada de Texto</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mb-4">
                                        <input
                                            type="checkbox"
                                            checked={!!option.required}
                                            onChange={(e) => updateOption(optionIndex, { required: e.target.checked })}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label className="text-sm font-medium text-gray-700">Requerido</label>
                                    </div>

                                    {option.type === "select" && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium">Valores</h4>
                                                <button
                                                    onClick={() => addValue(optionIndex)}
                                                    className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                                                >
                                                    + Añadir Valor
                                                </button>
                                            </div>

                                            {(option.values || []).map((value, valueIndex) => (
                                                <div key={valueIndex} className="flex gap-2 items-end">
                                                    <div className="flex-1">
                                                        <label className="block text-xs text-gray-600 mb-1">Etiqueta</label>
                                                        <input
                                                            type="text"
                                                            value={value.label}
                                                            onChange={(e) => updateValue(optionIndex, valueIndex, { label: e.target.value })}
                                                            placeholder="ej. XL"
                                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                        />
                                                    </div>
                                                    <div className="w-24">
                                                        <label className="block text-xs text-gray-600 mb-1">Precio</label>
                                                        <input
                                                            type="number"
                                                            value={value.price || 0}
                                                            onChange={(e) =>
                                                                updateValue(optionIndex, valueIndex, {
                                                                    price: parseFloat(e.target.value) || 0,
                                                                })
                                                            }
                                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => removeValue(optionIndex, valueIndex)}
                                                        className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            ))}

                                            {(option.values || []).length === 0 && (
                                                <p className="text-gray-500 text-sm">No hay valores añadidos aún.</p>
                                            )}
                                        </div>
                                    )}

                                    {option.type === "text_input" && (
                                        <div className="mt-4 space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Precio adicional (€)</label>
                                            <input
                                                type="number"
                                                value={option.price || 0}
                                                onChange={(e) =>
                                                    updateOption(optionIndex, {
                                                        price: parseFloat(e.target.value) || 0,
                                                    })
                                                }
                                                className="w-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {product.options.length === 0 && (
                                <p className="text-gray-500 text-sm text-center py-4">
                                    No hay opciones añadidas aún. Haz clic en "Añadir Opción" para comenzar.
                                </p>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={saveProduct}
                        disabled={saving}
                        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-lg font-semibold"
                    >
                        {saving ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Producto"}
                    </button>
                </div>
            </div>
        </div>
    );
}
