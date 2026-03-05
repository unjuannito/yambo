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

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [productsResponse, dropsResponse] = await Promise.all([
                    productService.getAllProducts(0, 200, undefined, true),
                    familyProductService.listFamilyProducts(0, 200, undefined, true),
                ]);
                setProducts(productsResponse.content);
                setDrops(dropsResponse.content);
            } catch (err) {
                setError(getErrorMessage(err, "Error al cargar los artículos"));
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // ── Column definitions (search filter) ──────────────────────────
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

    // ── Extra filter: drop selector ─────────────────────────────────
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
                type: "select" as const,
                options: dropFilterOptions,
            }]
            : [],
        [drops, dropFilterOptions]
    );

    // ── Custom filter: search across name + description ─────────────
    const filterFn = useCallback((product: Product, filters: FilterValues): boolean => {
        // Text search across name + description
        const searchQuery = filters.name as string | undefined;
        if (searchQuery && searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            const matchesName = product.name.toLowerCase().includes(query);
            const matchesDesc = product.description?.toLowerCase().includes(query);
            if (!matchesName && !matchesDesc) return false;
        }

        // Drop filter
        const dropFilter = filters.familyProductId as string | undefined;
        if (dropFilter) {
            if (product.familyProductId !== dropFilter) return false;
        }

        return true;
    }, []);

    // ── Image modal ─────────────────────────────────────────────────
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

    // ── Render slots ────────────────────────────────────────────────
    const renderAboveContent = useCallback((info: ContentInfo<Product>) => {
        const { allData, filteredData, filters, updateFilter, clearFilters } = info;
        const selectedDrop = filters.familyProductId as string | undefined;
        const searchQuery = filters.name as string | undefined;
        const hasActiveFilters = !!(searchQuery?.trim()) || !!selectedDrop;

        return (
            <>
                {/* Active Filters Chips */}
                {hasActiveFilters && (
                    <div className="flex items-center gap-2 -mt-2 mb-2">
                        <span className="text-xs text-gray-500">Filtros activos:</span>
                        {searchQuery?.trim() && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                                Nombre: &quot;{searchQuery.trim()}&quot;
                                <button
                                    onClick={() => updateFilter("name", undefined)}
                                    className="hover:text-blue-900 font-bold"
                                    aria-label="Quitar filtro de nombre"
                                >
                                    ×
                                </button>
                            </span>
                        )}
                        {selectedDrop && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                                Drop: {drops.find(d => d.id === selectedDrop)?.name}
                                <button
                                    onClick={() => updateFilter("familyProductId", undefined)}
                                    className="hover:text-blue-900 font-bold"
                                    aria-label="Quitar filtro de drop"
                                >
                                    ×
                                </button>
                            </span>
                        )}
                        <button
                            onClick={clearFilters}
                            className="text-xs text-gray-500 hover:text-gray-700 underline ml-auto"
                        >
                            Limpiar filtros
                        </button>
                    </div>
                )}

                {/* Drop Quick-Select Pills */}
                {drops.length > 1 && !selectedDrop && (
                    <div className="mb-2">
                        <h2 className="text-lg font-semibold text-gray-700 mb-3">Drops disponibles</h2>
                        <div className="flex flex-wrap gap-2">
                            {drops.map((drop) => {
                                const productCount = allData.filter(p => p.familyProductId === drop.id).length;
                                return (
                                    <button
                                        key={drop.id}
                                        onClick={() => updateFilter("familyProductId", drop.id)}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors shadow-sm"
                                    >
                                        <span>{drop.name}</span>
                                        <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">
                                            {productCount}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Results Count */}
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        {filteredData.length === allData.length
                            ? `${allData.length} artículo${allData.length !== 1 ? "s" : ""}`
                            : `${filteredData.length} de ${allData.length} artículo${allData.length !== 1 ? "s" : ""}`
                        }
                        {selectedDrop && (
                            <span className="font-medium text-blue-600 ml-1">
                                en {drops.find(d => d.id === selectedDrop)?.name}
                            </span>
                        )}
                    </p>
                </div>
            </>
        );
    }, [drops]);

    const renderEmptyState = useCallback((clearFilters: () => void) => (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-100">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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
            <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
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
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {product.name}
                            </h3>
                            {productDrop && (
                                <div className="mb-2 text-sm">
                                    <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                                        {productDrop.name}
                                    </span>
                                    {productDrop.endTms && (
                                        <p className="mt-1 text-gray-600">
                                            Disponible hasta: {new Date(productDrop.endTms).toLocaleDateString('es-ES', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    )}
                                </div>
                            )}
                            <p className="text-2xl font-bold text-blue-600">
                                {product.basePrice.toFixed(2)} €
                            </p>
                        </div>
                        {hasPermission({ obj: "product", action: "update" }) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/mi-espacio/merch/${product.id}/configurar`);
                                }}
                                className="ml-4 px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                                title="Editar producto"
                            >
                                Editar
                            </button>
                        )}
                    </div>
                    {product.options && product.options.length > 0 && (
                        <p className="text-sm text-gray-600 mb-4">
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

    // ── Loading / Error states ──────────────────────────────────────
    if (loading) {
        return (
            <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                <h1 className="text-3xl font-bold mb-6">Merch</h1>
                <div className="flex justify-center py-12">
                    <LoadingSpinner size="lg" message="Cargando artículos..." />
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                <h1 className="text-3xl font-bold mb-6">Merch</h1>
                <ErrorMessage message={error} />
            </main>
        );
    }

    // ── Main render ─────────────────────────────────────────────────
    return (
        <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-3xl font-bold">Merch</h1>
                {hasPermission({ obj: "product", action: "create" }) && (
                    <ButtonComponent
                        variant="primary"
                        onClick={() => navigate("/mi-espacio/merch/nuevo")}
                    >
                        + Añadir Artículo
                    </ButtonComponent>
                )}
            </div>
            <p className="text-gray-600 mb-6">
                Artículos disponibles de nuestra campaña de merch.
                <span className="text-sm text-gray-500 ml-1">
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

            {/* Image Modal */}
            {selectedImageIndex !== null && selectedProduct?.images && (
                <div
                    className="fixed inset-0 bg-black/75 flex items-center justify-center z-50"
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
                            className="max-w-full max-h-[80vh] object-contain"
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
