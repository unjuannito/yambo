import React, { useState } from "react";
import { issueService } from "~/services/issueService";
import { formatConfiguration } from "~/utils/issueUtils";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { getErrorMessage } from "~/types/error";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import MarkdownEditor from "~/components/common/forms/MarkdownEditor";

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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-2xl font-extrabold font-display text-yambo-black mb-4">
                Reportar incidencia
            </h2>

            {error && <ErrorMessage message={error} />}

            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label
                        htmlFor="title"
                        className="block text-sm font-semibold text-yambo-black mb-1.5"
                    >
                        Título *
                    </label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Describe la incidencia brevemente"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 focus:border-yambo-green-400 transition-all"
                        disabled={loading}
                    />
                </div>

                <div className="mb-4">
                    {isMultiSelection ? (
                        <>
                            <label className="block text-sm font-semibold text-yambo-black mb-2">
                                Productos relacionados *
                            </label>
                            <div className="border border-gray-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                                {orderedProducts.map((product) => {
                                    const checked =
                                        selectedOrderedProductIds.includes(
                                            product.id,
                                        );
                                    return (
                                        <label
                                            key={product.id}
                                            className="flex items-start gap-2.5 text-sm text-gray-600 hover:bg-yambo-green-50/30 rounded-lg p-1.5 transition-colors cursor-pointer"
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
                                                className="w-4 h-4 text-yambo-green-500 rounded-md mt-0.5 accent-yambo-green-500"
                                            />
                                            <span>
                                                <span className="block font-semibold text-yambo-black">
                                                    {product.name}
                                                </span>
                                                <span className="block text-xs text-gray-400">
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
                                                        <span className="block text-xs text-gray-400">
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
                            <p className="mt-1.5 text-xs text-gray-400">
                                {selectedOrderedProductIds.length} seleccionados
                            </p>
                        </>
                    ) : (
                        <>
                            <label className="block text-sm font-semibold text-yambo-black mb-1.5">
                                Producto relacionado
                            </label>
                            <p className="text-sm text-gray-600 bg-yambo-green-50/30 border border-gray-100 rounded-xl px-4 py-2.5">
                                {orderedProducts[0]?.name || "Producto"}
                            </p>
                            {orderedProducts[0]?.configuration &&
                                orderedProducts[0].configuration !== "{}" && (
                                    <p className="mt-1.5 text-xs text-gray-400">
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
                        className="block text-sm font-semibold text-yambo-black mb-1.5"
                    >
                        Descripción *
                    </label>
                    <div className={loading ? "pointer-events-none opacity-50" : ""}>
                        <MarkdownEditor
                            value={description}
                            onChange={(val) => setDescription(val)}
                        />
                    </div>
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
                        isLoading={loading}
                        variant="primary"
                    >
                        {loading ? "Guardando..." : "Reportar incidencia"}
                    </ButtonComponent>
                </div>
            </form>
        </div>
    );
};
