import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "~/i18n/config";
import { useParams, useNavigate } from "react-router";
import { productService, type Product, type ProductOption } from "~/services/productService";
import { familyProductService, type FamilyProduct } from "~/services/familyProductService";
import { productViewService } from "~/services/productViewService";
import { useCart } from "~/context/CartContext";
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
        { title: i18n.t("merch.productPageTitle") },
        {
            name: "description",
            content: i18n.t("merch.productMeta"),
        },
    ];
}

export default function ProductPage() {
    const { t } = useTranslation();
    const { productId } = useParams<{ productId: string }>();
    const navigate = useNavigate();
    const { addItem } = useCart();
    const [product, setProduct] = useState<Product | null>(null);
    const [drop, setDrop] = useState<FamilyProduct | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [configuration, setConfiguration] = useState<Record<string, any>>({});
    const [totalPrice, setTotalPrice] = useState(0);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

    useEffect(() => {
        const loadProduct = async () => {
            if (!productId) return;
            try {
                setLoading(true);
                const prod = await productService.getProductById(productId);

                setProduct(prod);
                setTotalPrice(prod.basePrice);
                document.title = `${t("merch.productPageTitle")} - ${prod.name}`;

                if (prod.familyProductId) {
                    try {
                        const dropData = await familyProductService.getFamilyProduct(prod.familyProductId);
                        setDrop(dropData);
                    } catch {
                        // Drop data is supplementary
                    }
                }
            } catch (err) {
                setError(getErrorMessage(err, t("merch.productDataError")));
            } finally {
                setLoading(false);
            }
        };

        loadProduct();
    }, [productId, t]);

    useEffect(() => {
        if (productId) {
            productViewService.trackView(productId);
        }
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

        const missingRequired = product.options.filter(
            (option) => option.required && !configuration[option.name]
        );

        if (missingRequired.length > 0) {
            toast.error(t("merch.missingOptions", { options: missingRequired.map(o => o.name).join(", ") }));
            return;
        }

        addItem(product, configuration, totalPrice);
        toast.success(t("merch.addedToCart"));
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
                            { value: "", label: t("merch.selectOption", { name: option.name }) },
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
                        placeholder={t("merch.textInputPlaceholder", { name: option.name })}
                        required={option.required}
                    />
                );

            default:
                return null;
        }
    };

    if (loading) {
        return (
            <main className="flex flex-col p-3 sm:p-6 w-full">
                <div className="flex justify-center py-12">
                    <LoadingSpinner size="lg" message={t("merch.productLoading")} />
                </div>
            </main>
        );
    }

    if (error || !product) {
        return (
            <main className="flex flex-col p-3 sm:p-6 w-full">
                <h1 className="text-3xl font-extrabold font-display text-yambo-black mb-6">{t("merch.productNotFound")}</h1>
                <ErrorMessage message={error || t("merch.productUnavailable")} className="mb-4" />
                <div>
                    <ButtonComponent
                        onClick={() => navigate("/mi-espacio/articulos")}
                        variant="neutral"
                    >
                        {t("merch.backToArticles")}
                    </ButtonComponent>
                </div>
            </main>
        );
    }

    return (
        <main className="flex flex-col p-3 sm:p-6 w-full max-w-4xl mx-auto">
            <div className="mb-6">
                <ButtonComponent
                    onClick={() => navigate("/mi-espacio/articulos")}
                    variant="neutral"
                    size="sm"
                >
                    ← {t("merch.backToArticles")}
                </ButtonComponent>
            </div>

            <div className="lg:grid lg:grid-cols-2 lg:gap-6">
                {/* Left column: Info + Image carousel */}
                <div className="space-y-4 sm:space-y-6 mb-4 sm:mb-6 lg:mb-0">
                    {/* Info block: name + short description + drop */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                        <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-yambo-black mb-2">{product.name}</h1>
                        {product.shortDescription && (
                            <p className="text-sm sm:text-base text-gray-600 mb-3">{product.shortDescription}</p>
                        )}
                        {drop && (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-block bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 text-white px-3 py-1 rounded-full font-medium text-xs sm:text-sm">
                                    {drop.name}
                                </span>
                                {drop.endTms && (
                                    <span className="text-xs sm:text-sm text-gray-500">
                                        {t("merch.availableUntil")}{' '}
                                        {new Date(drop.endTms).toLocaleDateString('es-ES', {
                                            day: 'numeric', month: 'long', year: 'numeric'
                                        })}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Image carousel */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                        {product.images && product.images.length > 0 ? (
                            <div className="space-y-3">
                                <div className="relative aspect-[4/3] sm:aspect-[16/9] bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center">
                                    <img
                                        src={product.images[selectedImageIndex ?? 0]}
                                        alt={product.name}
                                        className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => openImageModal(selectedImageIndex ?? 0)}
                                    />
                                    {product.images.length > 1 && (
                                        <>
                                            <button type="button"
                                                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                                                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-black/60 transition-all text-lg"
                                                aria-label={t("merch.prevImage")}
                                            >‹</button>
                                            <button type="button"
                                                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-black/60 transition-all text-lg"
                                                aria-label={t("merch.nextImage")}
                                            >›</button>
                                        </>
                                    )}
                                </div>

                                {/* Dots navigation (mobile only) */}
                                {product.images.length > 1 && (
                                    <div className="flex justify-center gap-2 lg:hidden">
                                        {product.images.map((_, idx) => (
                                            <button type="button"
                                                key={idx}
                                                onClick={() => setSelectedImageIndex(idx)}
                                                className={`w-2.5 h-2.5 rounded-full transition-all ${
                                                    (selectedImageIndex ?? 0) === idx
                                                        ? 'bg-yambo-green-600 scale-110'
                                                        : 'bg-gray-300 hover:bg-gray-400'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Thumbnail previews (desktop only) */}
                                {product.images.length > 1 && (
                                    <div className="hidden lg:grid lg:grid-cols-4 gap-2">
                                        {product.images.map((image, idx) => (
                                            <button type="button"
                                                key={idx}
                                                onClick={() => setSelectedImageIndex(idx)}
                                                className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                                                    (selectedImageIndex ?? 0) === idx
                                                        ? 'border-yambo-green-600 ring-2 ring-yambo-green-600/30'
                                                        : 'border-transparent hover:border-gray-300'
                                                }`}
                                            >
                                                <img
                                                    src={image}
                                                    alt={`${product.name} ${idx + 1}`}
                                                    className="w-full h-16 object-cover"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full aspect-[4/3] bg-gray-100 rounded-xl flex items-center justify-center">
                                <span className="text-gray-400">{t("merch.noImage")}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right column: Purchase card (sticky on desktop) */}
                <div className="lg:sticky lg:top-8 h-fit">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                        <h2 className="text-lg font-bold font-display text-yambo-black mb-4">{t("merch.productOptions")}</h2>
                        <div className="space-y-4">
                            {product.options.map((option, index) => (
                                <div key={`opt-${index}`}>{renderOption(option)}</div>
                            ))}
                        </div>

                        <hr className="my-4 border-gray-100" />

                        <div className="flex items-center justify-between mb-4">
                            <span className="text-base sm:text-lg font-bold text-yambo-black">{t("merch.totalLabel")}</span>
                            <span className="text-xl sm:text-2xl font-extrabold text-yambo-green-600">{totalPrice.toFixed(2).replace('.', ',')} €</span>
                        </div>

                        <ButtonComponent className="w-full" variant="primary" onClick={handleAddToCart}>
                            {t("merch.addToCart")}
                        </ButtonComponent>
                    </div>

                    {product.description && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mt-4 sm:mt-6">
                            <h2 className="text-lg font-bold font-display text-yambo-black mb-4">{t("merch.productDescription")}</h2>
                            <MarkdownEditor
                                value={product.description}
                                readOnly
                                className="border rounded-xl"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Image Modal */}
            {selectedImageIndex !== null && product?.images && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-75" onClick={closeImageModal} role="presentation">
                    <div className="relative max-w-4xl max-h-full p-4">
                        <button type="button"
                            onClick={closeImageModal}
                            className="absolute top-6 right-6 z-10 bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-all"
                            aria-label={t("merch.closeImage")}
                        >
                            ✕
                        </button>
                        <img
                            src={product.images[selectedImageIndex]}
                            alt={`${product.name} ${selectedImageIndex + 1}`}
                            className="max-w-full max-h-[80vh] object-contain rounded-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                        {product.images.length > 1 && (
                            <>
                                <button type="button"
                                    onClick={(e) => { e.stopPropagation(); prevImage(); }}
                                    className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-75 transition-all text-xl"
                                    aria-label={t("merch.prevImage")}
                                >‹</button>
                                <button type="button"
                                    onClick={(e) => { e.stopPropagation(); nextImage(); }}
                                    className="absolute right-6 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-75 transition-all text-xl"
                                    aria-label={t("merch.nextImage")}
                                >›</button>
                            </>
                        )}
                        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                            {t("merch.imageCounter", { current: selectedImageIndex + 1, total: product.images.length })}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
