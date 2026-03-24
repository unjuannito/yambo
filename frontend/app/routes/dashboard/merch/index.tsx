import { useEffect, useState, useMemo, useCallback } from "react";
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

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Yambo - Merch" },
        {
            name: "description",
            content: "Merch de Yambo - Productos disponibles",
        },
    ];
}

export default function Merch() {
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
                setError(getErrorMessage(err, "¡Los artículos no quieren salir!"));
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const columns = useMemo<FilterableColumn<Product>[]>(() => [
        {
            key: "name" as keyof Product,
            header: "Nombre",
            filter: {
                enabled: true,
                type: "search" as const,
                placeholder: "Buscar por nombre de artículo...",
            },
        },
    ], []);

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
                label: "Drop",
                type: "multi-select" as const,
                options: dropFilterOptions,
                placeholder: "Seleccionar drops...",
            }]
            : [],
        [drops, dropFilterOptions]
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
                        <span className="text-xs text-gray-400">Filtros activos:</span>
                        {searchQuery?.trim() && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yambo-green-50 text-yambo-green-700 text-xs rounded-full font-medium">
                                Nombre: &quot;{searchQuery.trim()}&quot;
                                <button
                                    onClick={() => updateFilter("name", undefined)}
                                    className="hover:text-yambo-green-900 font-bold"
                                    aria-label="Quitar filtro de nombre"
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
                                    Drop: {drop.name}
                                    <button
                                        onClick={() => updateFilter("familyProductId", selectedDrops.filter(id => id !== dropId))}
                                        className="hover:text-yambo-green-900 font-bold"
                                        aria-label={`Quitar filtro de drop ${drop.name}`}
                                    >
                                        ×
                                    </button>
                                </span>
                            );
                        })}
                        <button
                            onClick={clearFilters}
                            className="text-xs text-gray-400 hover:text-gray-600 underline ml-auto"
                        >
                            Limpiar filtros
                        </button>
                    </div>
                )}

                {drops.length > 1 && (
                    <div className="mb-2">
                        <h2 className="text-lg font-bold font-display text-yambo-black mb-3">Drops disponibles</h2>
                        <div className="flex flex-wrap gap-2">
                            {drops.map((drop) => {
                                const productCount = allData.filter(p => p.familyProductId === drop.id).length;
                                const isSelected = selectedDrops.includes(drop.id);
                                return (
                                    <button
                                        key={drop.id}
                                        onClick={() => {
                                            const newDrops = isSelected
                                                ? selectedDrops.filter(id => id !== drop.id)
                                                : [...selectedDrops, drop.id];
                                            updateFilter("familyProductId", newDrops.length > 0 ? newDrops : undefined);
                                        }}
                                        className={`inline-flex items-center gap-2 px-4 py-2 border rounded-full text-sm font-medium transition-all ${
                                            isSelected
                                                ? "bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 border-yambo-green-500 text-white shadow-md shadow-yambo-green-500/25"
                                                : "bg-white border-gray-200 text-gray-600 hover:bg-yambo-green-50 hover:border-yambo-green-300 hover:text-yambo-green-700"
                                        }`}
                                    >
                                        <span>{drop.name}</span>
                                        <span className={`px-1.5 py-0.5 rounded-full text-xs ${isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                                            {productCount}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400">
                        {filteredData.length === allData.length
                            ? `${allData.length} artículo${allData.length !== 1 ? "s" : ""}`
                            : `${filteredData.length} de ${allData.length} artículo${allData.length !== 1 ? "s" : ""}`
                        }
                        {selectedDrops.length > 0 && (
                            <span className="font-medium text-yambo-green-600 ml-1">
                                en {selectedDrops.map(id => drops.find(d => d.id === id)?.name).filter(Boolean).join(", ")}
                            </span>
                        )}
                    </p>
                </div>
            </>
        );
    }, [drops]);

    const renderEmptyState = useCallback((clearFilters: () => void) => (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
            <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <p className="text-gray-500 text-lg mb-2">No se encontraron artículos</p>
            <p className="text-gray-400 text-sm mb-4">
                Prueba con otros términos de búsqueda o cambia los filtros.
            </p>
            <ButtonComponent variant="neutral" onClick={clearFilters}>
                Limpiar filtros
            </ButtonComponent>
        </div>
    ), []);

    const renderGridItem = useCallback((product: Product) => {
        const productDrop = product.familyProductId
            ? drops.find(drop => drop.id === product.familyProductId)
            : null;

        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all">
                <ImageCarousel
                    images={product.images || []}
                    alt={product.name}
                    className="mb-0 h-92"
                    onImageClick={(index) => openImageModal(product, index)}
                    showArrowsOnHover={false}
                />
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                            <h3 className="text-lg font-bold font-display text-yambo-black mb-2">
                                {product.name}
                            </h3>
                            {productDrop && (
                                <div className="mb-2 text-sm">
                                    <span className="inline-block bg-yambo-green-50 text-yambo-green-700 px-2.5 py-1 rounded-full font-medium">
                                        {productDrop.name}
                                    </span>
                                    {productDrop.endTms && (
                                        <p className="mt-1 text-gray-400">
                                            Disponible hasta: {new Date(productDrop.endTms).toLocaleDateString('es-ES', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    )}
                                </div>
                            )}
                            <p className="text-2xl font-extrabold text-yambo-green-600">
                                {product.basePrice.toFixed(2)} €
                            </p>
                        </div>
                        {hasPermission({ obj: "product", action: "update" }) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/mi-espacio/merch/${product.id}/configurar`);
                                }}
                                className="ml-4 px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-full hover:bg-gray-200 transition-colors font-medium"
                                title="Editar producto"
                            >
                                Editar
                            </button>
                        )}
                    </div>
                    {product.options && product.options.length > 0 && (
                        <p className="text-sm text-gray-400 mb-4">
                            {product.options.length} opción
                            {product.options.length !== 1 ? "es" : ""} disponible
                            {product.options.length !== 1 ? "s" : ""}
                        </p>
                    )}
                    <ButtonComponent variant="primary">
                        Más información
                    </ButtonComponent>
                </div>
            </div>
        );
    }, [drops, hasPermission, navigate]);

    if (loading) {
        return (
            <main className="flex flex-col p-6 md:p-8 w-full md:w-[calc(100vw-16rem)]">
                <h1 className="text-3xl font-extrabold font-display text-yambo-black mb-6">Merch</h1>
                <div className="flex justify-center py-12">
                    <LoadingSpinner size="lg" message="Cargando artículos..." />
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="flex flex-col p-6 md:p-8 w-full md:w-[calc(100vw-16rem)]">
                <h1 className="text-3xl font-extrabold font-display text-yambo-black mb-6">Merch</h1>
                <ErrorMessage message={error} />
            </main>
        );
    }

    return (
        <main className="flex flex-col p-6 md:p-8 w-full md:w-[calc(100vw-16rem)]">
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-3xl font-extrabold font-display text-yambo-black">Merch</h1>
                {hasPermission({ obj: "product", action: "create" }) && (
                    <ButtonComponent
                        variant="primary"
                        onClick={() => navigate("/mi-espacio/merch/nuevo")}
                    >
                        + Añadir Artículo
                    </ButtonComponent>
                )}
            </div>
            <p className="text-gray-400 mb-6">
                Artículos disponibles de nuestra campaña de merch.
                <span className="text-sm text-gray-400 ml-1">
                    Todos los artículos se ofrecen a coste, sin beneficio para la asociación.
                </span>
            </p>

            <FilterableTable<Product>
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
                    emptyMessage: "No hay artículos disponibles en este momento.",
                    onRowClick: (product: Product) => navigate(`/mi-espacio/merch/${product.id}`),
                }}
                features={{
                    enablePagination: false,
                }}
            />

            {selectedImageIndex !== null && selectedProduct?.images && (
                <div
                    className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50"
                    onClick={closeImageModal}
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Imagen de ${selectedProduct.name}`}
                >
                    <div className="relative max-w-4xl max-h-full p-4">
                        <button
                            onClick={closeImageModal}
                            className="absolute top-6 right-6 z-10 bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-all"
                            aria-label="Cerrar imagen"
                        >
                            ✕
                        </button>

                        <img
                            src={selectedProduct.images[selectedImageIndex]}
                            alt={`${selectedProduct.name} - imagen ${selectedImageIndex + 1} de ${selectedProduct.images.length}`}
                            className="max-w-full max-h-[80vh] object-contain rounded-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />

                        {selectedProduct.images.length > 1 && (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        prevImage();
                                    }}
                                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-75 transition-all text-xl"
                                    aria-label="Imagen anterior"
                                >
                                    ‹
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        nextImage();
                                    }}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-75 transition-all text-xl"
                                    aria-label="Imagen siguiente"
                                >
                                    ›
                                </button>
                            </>
                        )}

                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                            {selectedImageIndex + 1} / {selectedProduct.images.length}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
