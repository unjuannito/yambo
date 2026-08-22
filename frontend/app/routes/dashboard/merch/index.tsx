import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import i18n from "~/i18n/config";
import { productService, type Product } from "~/services/productService";
import { familyProductService, type FamilyProduct } from "~/services/familyProductService";
import { useAuth } from "~/hooks/useAuth";
import { useNavigate } from "react-router";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { getErrorMessage } from "~/types/error";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import type { Route } from "./+types/index";
import { FilterableTable } from "~/components/common/FilterableTable";
import type { FilterableColumn, ContentInfo, FilterValues, FilterField } from "~/components/common/FilterableTable";
import ImageCarousel from "~/components/common/ImageCarousel";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import ListPageShell from "~/components/common/ListPageShell";

export function meta({}: Route.MetaArgs) {
    return [
        { title: i18n.t("merch.productMetaTitle") },
        {
            name: "description",
            content: i18n.t("merch.productMetaDesc"),
        },
    ];
}

export default function Merch() {
    const { t } = useTranslation();
    const { hasPermission } = useAuth();
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [drops, setDrops] = useState<FamilyProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

    const isProductAdmin = hasPermission({ obj: "product", action: "update" }) ||
        hasPermission({ obj: "product", action: "create" });

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const activeFilter = isProductAdmin ? undefined : true;
                const [productsResponse, dropsResponse] = await Promise.all([
                    productService.getAllProducts(0, 200, undefined, activeFilter),
                    familyProductService.listFamilyProducts(0, 200, undefined, activeFilter),
                ]);
                setProducts(productsResponse.content);
                setDrops(dropsResponse.content);
            } catch (err) {
                setError(getErrorMessage(err, t("merch.productsDataError")));
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const columns = useMemo<FilterableColumn<Product>[]>(() => [
        {
            key: "name" as keyof Product,
            header: t("merch.name"),
            filter: {
                enabled: true,
                type: "search" as const,
                placeholder: t("merch.searchByNamePlaceholder"),
            },
        },
    ], [t]);

    const dropFilterOptions = useMemo(() =>
        drops.map((drop) => {
            const count = products.filter(p => p.familyProductId === drop.id).length;
            return { value: drop.id, label: `${drop.name} (${count})` };
        }),
        [drops, products]
    );

    const extraFilters = useMemo<FilterField[]>(() =>
        drops.length > 0
            ? [{
                key: "familyProductId",
                label: t("merch.drops"),
                type: "multi-select" as const,
                options: dropFilterOptions,
                placeholder: t("merch.selectCollection"),
            }]
            : [],
        [drops, dropFilterOptions, t]
    );

    const filterFn = useCallback((product: Product, filters: FilterValues): boolean => {
        const searchQuery = filters.name as string | undefined;
        if (searchQuery && searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            const matchesName = product.name.toLowerCase().includes(query);
            const matchesDesc = product.description?.toLowerCase().includes(query);
            if (!matchesName && !matchesDesc) return false;
        }

        const dropFilter = filters.familyProductId as string[] | undefined;
        if (dropFilter && dropFilter.length > 0) {
            if (!product.familyProductId || !dropFilter.includes(product.familyProductId)) return false;
        }

        return true;
    }, []);

    const openImageModal = (product: Product, index: number) => {
        setSelectedProduct(product);
        setSelectedImageIndex(index);
    };

    const closeImageModal = () => {
        setSelectedProduct(null);
        setSelectedImageIndex(null);
    };

    const nextImage = () => {
        if (selectedProduct?.images && selectedImageIndex !== null) {
            setSelectedImageIndex(
                (selectedImageIndex + 1) % selectedProduct.images.length,
            );
        }
    };

    const prevImage = () => {
        if (selectedProduct?.images && selectedImageIndex !== null) {
            setSelectedImageIndex(
                (selectedImageIndex - 1 + selectedProduct.images.length) %
                    selectedProduct.images.length,
            );
        }
    };

    const renderAboveContent = useCallback((info: ContentInfo<Product>) => {
        const { allData, filteredData, filters, updateFilter, clearFilters } = info;
        const selectedDrops = (filters.familyProductId as string[] | undefined) ?? [];
        const searchQuery = filters.name as string | undefined;
        const hasActiveFilters = !!(searchQuery?.trim()) || selectedDrops.length > 0;

        return (
            <>
                {hasActiveFilters && (
                    <div className="flex items-center gap-2 -mt-2 mb-2 flex-wrap">
                        <span className="text-xs text-gray-400">{t("merch.activeFilters")}</span>
                        {searchQuery?.trim() && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yambo-green-50 text-yambo-green-700 text-xs rounded-full font-medium">
                                {t("merch.filterName", { query: searchQuery.trim() })}
                                <button type="button"
                                    onClick={() => updateFilter("name", undefined)}
                                    className="hover:text-yambo-green-900 font-bold"
                                    aria-label={t("merch.removeNameFilter")}
                                >
                                    ×
                                </button>
                            </span>
                        )}
                        {selectedDrops.map(dropId => {
                            const drop = drops.find(d => d.id === dropId);
                            if (!drop) return null;
                            return (
                                <span key={dropId} className="inline-flex items-center gap-1 px-2.5 py-1 bg-yambo-green-50 text-yambo-green-700 text-xs rounded-full font-medium">
                                    {t("merch.collection", { name: drop.name })}
                                    <button type="button"
                                        onClick={() => updateFilter("familyProductId", selectedDrops.filter(id => id !== dropId))}
                                        className="hover:text-yambo-green-900 font-bold"
                                        aria-label={t("merch.removeCollectionFilter", { name: drop.name })}
                                    >
                                        ×
                                    </button>
                                </span>
                            );
                        })}
                        <button type="button"
                            onClick={clearFilters}
                            className="text-xs text-gray-400 hover:text-gray-600 underline ml-auto"
                        >
                            {t("merch.clearFilters")}
                        </button>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400">
                        {filteredData.length === allData.length
                            ? `${allData.length} ${t("merch.articles")?.toLowerCase()}`
                            : `${filteredData.length} ${t("common.of")} ${allData.length} ${t("merch.articles")?.toLowerCase()}`
                        }
                        {selectedDrops.length > 0 && (
                            <span className="font-medium text-yambo-green-600 ml-1">
                                {t("common.in")} {selectedDrops.map(id => drops.find(d => d.id === id)?.name).filter(Boolean).join(", ")}
                            </span>
                        )}
                    </p>
                </div>
            </>
        );
    }, [drops, t]);

    const renderEmptyState = useCallback((clearFilters: () => void) => (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
            <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <p className="text-gray-500 text-lg mb-2">{t("merch.noArticlesFound")}</p>
            <p className="text-gray-400 text-sm mb-4">
                {t("merch.noArticlesHint")}
            </p>
            <ButtonComponent variant="neutral" onClick={clearFilters}>
                {t("merch.clearFilters")}
            </ButtonComponent>
        </div>
    ), [t]);

    const renderGridItem = useCallback((product: Product) => {
        const productDrop = product.familyProductId
            ? drops.find(drop => drop.id === product.familyProductId)
            : null;

        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all flex md:flex-col">
                {/* Mobile: thumbnail left */}
                <div className="block md:hidden w-24 h-24 shrink-0">
                    {product.images && product.images.length > 0 ? (
                        <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-300 text-xs">{t("merch.noImage")}</span>
                        </div>
                    )}
                </div>

                {/* Desktop: image carousel (full width) */}
                <div className="hidden md:block">
                    <ImageCarousel
                        images={product.images || []}
                        alt={product.name}
                        className="mb-0 h-92"
                        onImageClick={(index) => openImageModal(product, index)}
                        showArrowsOnHover={false}
                    />
                </div>

                <div className="flex-1 p-3 md:p-6 min-w-0">
                    <div className="flex justify-between items-start mb-2 md:mb-4">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm md:text-lg font-bold font-display text-yambo-black line-clamp-2 md:line-clamp-none mb-1 md:mb-2">
                                {product.name}
                            </h3>
                            {productDrop && (
                                <div className="mb-1 md:mb-2">
                                    <span className="inline-block bg-yambo-green-50 text-yambo-green-700 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full font-medium text-[10px] md:text-sm">
                                        {productDrop.name}
                                    </span>
                                    {productDrop.endTms && (
                                        <p className="hidden md:block mt-1 text-gray-400 text-sm">
                                            {t("merch.availableUntil")} {new Date(productDrop.endTms).toLocaleDateString('es-ES', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    )}
                                </div>
                            )}
                            <p className="text-base md:text-2xl font-extrabold text-yambo-green-600">
                                {product.basePrice.toFixed(2)} €
                            </p>
                        </div>
                        {hasPermission({ obj: "product", action: "update" }) && (
                            <button type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/mi-espacio/articulos/${product.id}/configurar`);
                                }}
                                className="ml-2 md:ml-4 px-2 md:px-3 py-1 bg-gray-100 text-gray-600 text-[10px] md:text-sm rounded-full hover:bg-gray-200 transition-colors font-medium shrink-0"
                                title={t("merch.editProductTitle")}
                            >
                                {t("merch.editProduct")}
                            </button>
                        )}
                    </div>
                    {product.options && product.options.length > 0 && (
                        <p className="text-[10px] md:text-sm text-gray-400 mb-2 md:mb-4">
                            {product.options.length === 1
                                ? t("merch.optionsCount", { count: product.options.length })
                                : t("merch.optionsCountPlural", { count: product.options.length })
                            } {product.options.length === 1 ? t("merch.available") : t("merch.availablePlural")}
                        </p>
                    )}
                </div>
            </div>
        );
    }, [drops, hasPermission, navigate, t]);

    if (loading) {
        return (
            <main className="flex flex-col p-4 md:p-6 w-full">
                <h1 className="text-3xl font-extrabold font-display text-yambo-black mb-6">{t("merch.articles")}</h1>
                <div className="flex justify-center py-12">
                    <LoadingSpinner size="lg" message={t("merch.loadingArticles")} />
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="flex flex-col p-4 md:p-6 w-full">
                <h1 className="text-3xl font-extrabold font-display text-yambo-black mb-6">{t("merch.articles")}</h1>
                <ErrorMessage message={error} />
            </main>
        );
    }

    return (
        <>
        <ListPageShell<Product>
            title={t("merch.articles")}
            subtitle={t("merch.articlesDescription")}
            actions={
                hasPermission({ obj: "product", action: "create" }) && (
                    <ButtonComponent
                        variant="primary"
                        onClick={() => navigate("/mi-espacio/articulos/nuevo")}
                    >
                        {t("merch.addArticle")}
                    </ButtonComponent>
                )
            }
            columns={columns}
            keyField="id"
            data={products}
            extraFilters={extraFilters}
            filterFn={filterFn}
            renderAboveContent={renderAboveContent}
            renderEmptyState={renderEmptyState}
            display={{
                type: "grid",
                renderItem: renderGridItem,
                gridClassName: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
                emptyMessage: t("merch.noArticles"),
                onRowClick: (product: Product) => navigate(`/mi-espacio/articulos/${product.id}`),
            }}
            features={{
                enablePagination: false,
            }}
        >
            <span className="text-sm text-gray-400 ml-1">
                {t("merch.articlesCostNote")}
            </span>
        </ListPageShell>

            {selectedImageIndex !== null && selectedProduct?.images && (
                <div
                    className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50"
                    onClick={closeImageModal}
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${t("merch.productImages")} - ${selectedProduct.name}`}
                >
                    <div className="relative max-w-4xl max-h-full p-4">
                        <button type="button"
                            onClick={closeImageModal}
                            className="absolute top-6 right-6 z-10 bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-all"
                            aria-label={t("merch.closeImage")}
                        >
                            x
                        </button>

                        <img
                            src={selectedProduct.images[selectedImageIndex]}
                            alt={`${selectedProduct.name} - ${t("merch.productImages")} ${selectedImageIndex + 1} ${t("common.of")} ${selectedProduct.images.length}`}
                            className="max-w-full max-h-[80vh] object-contain rounded-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />

                        {selectedProduct.images.length > 1 && (
                            <>
                                <button type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        prevImage();
                                    }}
                                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-75 transition-all text-xl"
                                    aria-label={t("merch.prevImage")}
                                >
                                    ‹
                                </button>
                                <button type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        nextImage();
                                    }}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-75 transition-all text-xl"
                                    aria-label={t("merch.nextImage")}
                                >
                                    ›
                                </button>
                            </>
                        )}

                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                            {t("merch.imageCounter", { current: selectedImageIndex + 1, total: selectedProduct.images.length })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
