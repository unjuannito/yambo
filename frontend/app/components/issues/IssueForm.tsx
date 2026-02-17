import React, { useState } from "react";
import { issueService } from "~/services/issueService";
import { formatConfiguration } from "~/utils/issueUtils";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { getErrorMessage } from "~/types/error";
import ButtonComponent from "~/components/common/forms/ButtonComponent";

interface IssueFormProps {
    orderedProducts: {
        id: string;
        name: string;
        configuration?: string;
        quantity?: number;
        unitPrice?: number;
    }[];
    initialSelectedOrderedProductIds?: string[];
    onSuccess: () => void;
    onCancel: () => void;
}

export const IssueForm: React.FC<IssueFormProps> = ({
    orderedProducts,
    initialSelectedOrderedProductIds,
    onSuccess,
    onCancel,
}) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [selectedOrderedProductIds, setSelectedOrderedProductIds] = useState<
        string[]
    >(
        initialSelectedOrderedProductIds &&
            initialSelectedOrderedProductIds.length > 0
            ? initialSelectedOrderedProductIds
            : orderedProducts.map((product) => product.id),
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isMultiSelection = orderedProducts.length > 1;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (!title.trim()) {
                setError("El título es requerido");
                setLoading(false);
                return;
            }

            if (!description.trim()) {
                setError("La descripción es requerida");
                setLoading(false);
                return;
            }

            if (selectedOrderedProductIds.length === 0) {
                setError("Selecciona al menos un producto");
                setLoading(false);
                return;
            }

            await issueService.createIssue({
                orderedProductIds: selectedOrderedProductIds,
                title: title.trim(),
                description: description.trim(),
            });

            setTitle("");
            setDescription("");
            setSelectedOrderedProductIds(
                initialSelectedOrderedProductIds &&
                    initialSelectedOrderedProductIds.length > 0
                    ? initialSelectedOrderedProductIds
                    : orderedProducts.map((product) => product.id),
            );
            onSuccess();
        } catch (err) {
            setError(
                getErrorMessage(err, "Error al crear la incidencia"),
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Reportar incidencia
            </h2>

            {error && <ErrorMessage message={error} />}

            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label
                        htmlFor="title"
                        className="block text-sm font-medium text-gray-700 mb-1"
                    >
                        Título *
                    </label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Describe la incidencia brevemente"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={loading}
                    />
                </div>

                <div className="mb-4">
                    {isMultiSelection ? (
                        <>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Productos relacionados *
                            </label>
                            <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                                {orderedProducts.map((product) => {
                                    const checked =
                                        selectedOrderedProductIds.includes(
                                            product.id,
                                        );
                                    return (
                                        <label
                                            key={product.id}
                                            className="flex items-start gap-2 text-sm text-gray-700"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => {
                                                    setSelectedOrderedProductIds(
                                                        (prev) =>
                                                            checked
                                                                ? prev.filter(
                                                                      (id) =>
                                                                          id !==
                                                                          product.id,
                                                                  )
                                                                : [
                                                                      ...prev,
                                                                      product.id,
                                                                  ],
                                                    );
                                                }}
                                                disabled={loading}
                                                className="w-4 h-4 text-blue-600 rounded mt-0.5"
                                            />
                                            <span>
                                                <span className="block font-medium">
                                                    {product.name}
                                                </span>
                                                <span className="block text-xs text-gray-500">
                                                    Cantidad:{" "}
                                                    {product.quantity ?? 1}
                                                    {typeof product.unitPrice ===
                                                    "number"
                                                        ? ` · ${product.unitPrice.toFixed(2)} €`
                                                        : ""}
                                                </span>
                                                {product.configuration &&
                                                    product.configuration !==
                                                        "{}" && (
                                                        <span className="block text-xs text-gray-500">
                                                            Configuración:{" "}
                                                            {formatConfiguration(
                                                                product.configuration,
                                                            )}
                                                        </span>
                                                    )}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                {selectedOrderedProductIds.length} seleccionados
                            </p>
                        </>
                    ) : (
                        <>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Producto relacionado
                            </label>
                            <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                                {orderedProducts[0]?.name || "Producto"}
                            </p>
                            {orderedProducts[0]?.configuration &&
                                orderedProducts[0].configuration !== "{}" && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        Configuración:{" "}
                                        {formatConfiguration(
                                            orderedProducts[0].configuration,
                                        )}
                                    </p>
                                )}
                        </>
                    )}
                </div>

                <div className="mb-4">
                    <label
                        htmlFor="description"
                        className="block text-sm font-medium text-gray-700 mb-1"
                    >
                        Descripción *
                    </label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe la incidencia en detalle"
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={loading}
                    />
                </div>

                <div className="flex gap-2 justify-end">
                    <ButtonComponent
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        variant="neutral"
                    >
                        Cancelar
                    </ButtonComponent>
                    <ButtonComponent
                        type="submit"
                        loading={loading}
                        variant="primary"
                    >
                        {loading ? "Guardando..." : "Reportar incidencia"}
                    </ButtonComponent>
                </div>
            </form>
        </div>
    );
};
