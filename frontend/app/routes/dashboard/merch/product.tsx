import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { productService, type Product, type ProductOption } from "~/services/productService";
import { familyProductService, type FamilyProduct } from "~/services/familyProductService";
import { useAuth } from "~/hooks/useAuth";
import { useCart } from "~/context/CartContext";
import { Navigate } from "react-router";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import SelectComponent from "~/components/common/forms/SelectComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import CheckboxComponent from "~/components/common/forms/CheckboxComponent";
import MarkdownEditor from "~/components/common/forms/MarkdownEditor";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";

export function meta() {
    return [
        { title: "Yambo - Producto" },
        {
            name: "description",
            content: "Detalle de producto - Yambo Merch",
        },
    ];
}

export default function ProductPage() {
    const { productId } = useParams<{ productId: string }>();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const { addItem } = useCart();
    const [product, setProduct] = useState<Product | null>(null);
    const [drop, setDrop] = useState<FamilyProduct | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [configuration, setConfiguration] = useState<Record<string, any>>({});
    const [totalPrice, setTotalPrice] = useState(0);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    useEffect(() => {
        const loadProduct = async () => {
            if (!productId) return;
            try {
                setLoading(true);
                const prod = await productService.getProductById(productId);

                setProduct(prod);
                setTotalPrice(prod.basePrice);
                document.title = `Yambo - ${prod.name}`;

                // Load drop if product has one
                if (prod.familyProductId) {
                    try {
                        const dropData = await familyProductService.getFamilyProduct(prod.familyProductId);
                        setDrop(dropData);
                    } catch {
                        // Drop data is supplementary; product still usable without it
                    }
                }
            } catch (err) {
                setError(getErrorMessage(err, "Error al cargar el producto"));
            } finally {
                setLoading(false);
            }
        };

        loadProduct();
    }, [productId]);

    useEffect(() => {
        if (product) {
            calculatePrice();
        }
    }, [configuration, product]);

    const calculatePrice = () => {
        if (!product) return;
        let price = product.basePrice;

        product.options.forEach((option) => {
            const selectedValue = configuration[option.name];

            if (option.type === "select" && selectedValue) {
                const valueId = typeof selectedValue === 'object' ? selectedValue.id : selectedValue;
                const value = option.values?.find((v) => v.id === valueId);
                if (value?.price) price += value.price;
            } else if (option.type === "text_input" && selectedValue && selectedValue.trim() !== "") {
                if (option.price) price += option.price;
            }
        });

        setTotalPrice(price);
    };

    const handleSelectChange = (optionName: string, value: string) => {
        // Store both id and label for display purposes
        const option = product?.options.find(opt => opt.name === optionName);
        const selectedOption = option?.values?.find(v => v.id === value);

        setConfiguration({
            ...configuration,
            [optionName]: selectedOption ? { id: value, label: selectedOption.label } : value
        });
    };

    const handleCheckboxChange = (optionName: string, checked: boolean) => {
        setConfiguration({ ...configuration, [optionName]: checked });
    };

    const handleTextChange = (optionName: string, value: string) => {
        const trimmedValue = value.trim();
        setConfiguration({
            ...configuration,
            [optionName]: trimmedValue === "" ? "" : value,
        });
    };

    const handleAddToCart = () => {
        if (!product) return;

        // Validate required options
        const missingRequired = product.options.filter(
            (option) => option.required && !configuration[option.name]
        );

        if (missingRequired.length > 0) {
            toast.error(`Por favor, selecciona: ${missingRequired.map(o => o.name).join(", ")}`);
            return;
        }

        addItem(product, configuration, totalPrice);
        toast.success("Artículo añadido a la cesta");
    };

    const openImageModal = (index: number) => {
        setSelectedImageIndex(index);
    };

    const closeImageModal = () => {
        setSelectedImageIndex(null);
    };

    const nextImage = () => {
        if (product?.images && selectedImageIndex !== null) {
            setSelectedImageIndex((selectedImageIndex + 1) % product.images.length);
        }
    };

    const prevImage = () => {
        if (product?.images && selectedImageIndex !== null) {
            setSelectedImageIndex((selectedImageIndex - 1 + product.images.length) % product.images.length);
        }
    };

    const renderOption = (option: ProductOption) => {
        switch (option.type) {
            case "select":
                const selectedValue = configuration[option.name];
                const selectValue = selectedValue
                    ? (typeof selectedValue === 'object' ? selectedValue.id : selectedValue)
                    : "";

                return (
                    <SelectComponent
                        label={option.name}
                        required={option.required}
                        value={selectValue}
                        onChange={(e) => handleSelectChange(option.name, e.target.value)}
                        options={[
                            { value: "", label: `Seleccionar ${option.name}` },
                            ...(option.values?.map((value) => ({
                                value: value.id,
                                label: `${value.label}${value.price ? ` (+${value.price}€)` : ""}`
                            })) || [])
                        ]}
                    />
                );

            case "checkbox":
                return (
                    <CheckboxComponent
                        label={option.name}
                        checked={configuration[option.name] || false}
                        onChange={(e) => handleCheckboxChange(option.name, e.target.checked)}
                        required={option.required}
                    />
                );

            case "text_input":
                return (
                    <InputComponent
                        label={`${option.name}${option.price && option.price > 0 ? ` (+${option.price}€)` : ''}`}
                        type="text"
                        value={configuration[option.name] || ""}
                        onChange={(e) => handleTextChange(option.name, e.target.value)}
                        placeholder={`Enter ${option.name}`}
                        required={option.required}
                    />
                );

            default:
                return null;
        }
    };

    if (loading) {
        return (
            <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                <div className="flex justify-center py-12">
                    <LoadingSpinner size="lg" message="Cargando producto..." />
                </div>
            </main>
        );
    }

    if (error || !product) {
        return (
            <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                <h1 className="text-3xl font-bold mb-6">Producto no encontrado</h1>
                <ErrorMessage message={error || "Producto no disponible"} className="mb-4" />
                <div>
                    <ButtonComponent
                        onClick={() => navigate("/mi-espacio/merch")}
                        variant="neutral"
                    >
                        Volver al merch
                    </ButtonComponent>
                </div>
            </main>
        );
    }

    return (
        <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
            <div className="mb-6">
                <ButtonComponent
                    onClick={() => navigate("/mi-espacio/merch")}
                    variant="neutral"
                    size="sm"
                >
                    ← Volver al merch
                </ButtonComponent>
            </div>

            <div className="grid lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-4">Imágenes del producto</h2>
                        {product.images && product.images.length > 0 ? (
                            <div className="space-y-4">
                                <img
                                    src={product.images[0]}
                                    alt={product.name}
                                    className="w-full h-92 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => openImageModal(0)}
                                />
                                {product.images.length > 1 && (
                                    <div className="grid grid-cols-3 gap-2">
                                        {product.images.slice(1).map((image, index) => (
                                            <img
                                                key={index}
                                                src={image}
                                                alt={`${product.name} ${index + 2}`}
                                                className="w-full h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => openImageModal(index + 1)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                                <span className="text-gray-500">Sin imagen</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-baseline justify-between gap-4 mb-4">
                            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
                            <span className="text-2xl font-bold text-blue-600">{product.basePrice.toFixed(2)}€</span>
                        </div>
                        {drop && (
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="inline-block bg-blue-600 text-white px-3 py-1 rounded-full font-medium text-sm">
                                        {drop.name}
                                    </span>
                                </div>
                                {drop.endTms && (
                                    <p className="text-sm text-gray-700">
                                        <span className="font-medium">Disponible hasta:</span>{' '}
                                        {new Date(drop.endTms).toLocaleDateString('es-ES', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </p>
                                )}
                            </div>
                        )}
                        {product.description && (
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold mb-2">Descripción</h2>
                                <MarkdownEditor
                                    value={product.description}
                                    readOnly
                                    className="border rounded"
                                />
                            </div>
                        )}
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold">Opciones</h2>
                            {product.options.map((option, index) => (
                                <div key={index}>{renderOption(option)}</div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:sticky lg:top-8 h-fit">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-6">Resumen del pedido</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Precio base</span>
                                <span>{product.basePrice.toFixed(2)}€</span>
                            </div>

                            {product.options.map((option) => {
                                const selectedValue = configuration[option.name];
                                if (!selectedValue) return null;

                                if (option.type === "select") {
                                    const valueId = typeof selectedValue === 'object' ? selectedValue.id : selectedValue;
                                    const value = option.values?.find((v) => v.id === valueId);
                                    if (value?.price) {
                                        return (
                                            <div key={option.name} className="flex justify-between text-sm">
                                                <span className="text-gray-600">
                                                    {option.name}: {value.label}
                                                </span>
                                                <span>+{value.price.toFixed(2)}€</span>
                                            </div>
                                        );
                                    }
                                } else if (option.type === "text_input" && selectedValue.trim() !== "" && option.price) {
                                    return (
                                        <div key={option.name} className="flex justify-between text-sm">
                                            <span className="text-gray-600">{option.name}</span>
                                            <span>+{option.price.toFixed(2)}€</span>
                                        </div>
                                    );
                                }
                                return null;
                            })}

                            <div className="border-t pt-3">
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total</span>
                                    <span>{totalPrice.toFixed(2)}€</span>
                                </div>
                            </div>
                        </div>

                        <ButtonComponent className="w-full mt-4" variant="primary" onClick={handleAddToCart}>
                            Añadir al carrito
                        </ButtonComponent>
                    </div>
                </div>
            </div>

            {/* Image Modal */}
            {selectedImageIndex !== null && product?.images && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50" onClick={closeImageModal}>
                    <div className="relative max-w-4xl max-h-full p-4">
                        {/* Close button */}
                        <button
                            onClick={closeImageModal}
                            className="absolute top-6 right-6 z-10 bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-all"
                        >
                            ✕
                        </button>

                        {/* Main image */}
                        <img
                            src={product.images[selectedImageIndex]}
                            alt={`${product.name} ${selectedImageIndex + 1}`}
                            className="max-w-full max-h-[80vh] object-contain"
                            onClick={(e) => e.stopPropagation()}
                        />

                        {/* Navigation arrows */}
                        {product.images.length > 1 && (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        prevImage();
                                    }}
                                    className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-75 transition-all text-xl"
                                >
                                    ‹
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        nextImage();
                                    }}
                                    className="absolute right-6 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-75 transition-all text-xl"
                                >
                                    ›
                                </button>
                            </>
                        )}

                        {/* Image counter */}
                        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                            {selectedImageIndex + 1} / {product.images.length}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}