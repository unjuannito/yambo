import { useEffect, useState } from "react";
import { productService, type Product } from "~/services/productService";
import { useAuth } from "~/hooks/useAuth";
import { useNavigate } from "react-router";
import type { Route } from "./+types/index";
import { RequirePermission } from "~/components/common/RequirePermission";
import { FilterableTable } from "~/components/common/FilterableTable";
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(
        null,
    );
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
        null,
    );

    useEffect(() => {
        const loadProducts = async () => {
            try {
                setLoading(true);
                const response = await productService.getAllProducts(
                    0,
                    50,
                    undefined,
                    true,
                );
                setProducts(response.content);
            } catch (err) {
                setError("Error al cargar los artículos");
                console.error("Error loading products:", err);
            } finally {
                setLoading(false);
            }
        };

        loadProducts();
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

    const columns = [
        {
            key: "name" as keyof Product,
            header: "Nombre",
            filter: {
                enabled: true,
                type: "text" as const,
                placeholder: "Buscar por nombre...",
            },
        },
    ];

    const renderItem = (product: Product) => (
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
                        <p className="text-2xl font-bold text-blue-600">
                            {product.basePrice.toFixed(2)} €
                        </p>
                    </div>
                    {hasPermission({ obj: "product", action: "update" }) && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(
                                    `/mi-espacio/merch/${product.id}/configurar`,
                                );
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-gray-900 mb-8">
                            Merch
                        </h1>
                        <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <RequirePermission
                permission={{ obj: "product", action: "read" }}
                redirectTo="/mi-espacio"
            >
                <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                    <h1 className="text-3xl font-bold mb-6">Merch</h1>
                    <div className="text-center">
                        <p className="text-red-600">{error}</p>
                    </div>
                </main>
            </RequirePermission>
        );
    }

    return (
        <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
            <div className="flex justify-between items-center mb-6">
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
            <div className="text-center mb-4">
                <p className="text-gray-600">
                    Artículos disponibles de nuestra campaña de merch
                </p>
                <p className="text-sm text-gray-500 mt-2">
                    Todos los artículos se ofrecen a coste, sin beneficio para
                    la asociación
                </p>
            </div>

            <FilterableTable
                columns={columns}
                keyField="id"
                data={products}
                display={{
                    type: "grid",
                    renderItem,
                    emptyMessage:
                        "No hay artículos disponibles en este momento.",
                    loadingMessage: "Cargando artículos...",
                    onRowClick: (product: Product) =>
                        navigate(`/mi-espacio/merch/${product.id}`),
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
                >
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
                            src={selectedProduct.images[selectedImageIndex]}
                            alt={`${selectedProduct.name} ${selectedImageIndex + 1}`}
                            className="max-w-full max-h-[80vh] object-contain"
                            onClick={(e) => e.stopPropagation()}
                        />

                        {/* Navigation arrows */}
                        {selectedProduct.images.length > 1 && (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        prevImage();
                                    }}
                                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-75 transition-all text-xl"
                                >
                                    ‹
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        nextImage();
                                    }}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-75 transition-all text-xl"
                                >
                                    ›
                                </button>
                            </>
                        )}

                        {/* Image counter */}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                            {selectedImageIndex + 1} /{" "}
                            {selectedProduct.images.length}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
