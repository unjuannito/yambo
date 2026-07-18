import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { issueService } from "~/services/issueService";
import { formatConfiguration } from "~/utils/issueUtils";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { getErrorMessage } from "~/types/error";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import toast from "react-hot-toast";

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
    const { t } = useTranslation();
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
                setError(t('issues.titleRequired'));
                setLoading(false);
                return;
            }

            if (!description.trim()) {
                setError(t('issues.descriptionRequired'));
                setLoading(false);
                return;
            }

            if (selectedOrderedProductIds.length === 0) {
                setError(t('issues.selectProductRequired'));
                setLoading(false);
                return;
            }

            await issueService.createIssue({
                orderedProductIds: selectedOrderedProductIds,
                title: title.trim(),
                description: description.trim(),
            });

            toast.success(t('issues.created'));

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
            const message = getErrorMessage(err, t('issues.createError'));
            toast.error(message);
            setError(
                message,
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-2xl font-extrabold font-display text-yambo-black mb-4">
                {t('issues.createIssue') || "Reportar incidencia"}
            </h2>

            {error && <ErrorMessage message={error} />}

            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label
                        htmlFor="title"
                        className="block text-sm font-semibold text-yambo-black mb-1.5"
                    >
                        {t('issues.title')} *
                    </label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t('issues.titlePlaceholder')}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 focus:border-yambo-green-400 transition-all"
                        disabled={loading}
                    />
                </div>

                <div className="mb-4">
                    {isMultiSelection ? (
                        <>
                            <label className="block text-sm font-semibold text-yambo-black mb-2">
                                {t('orders.product')} *
                            </label>
                            <div className="border border-gray-200 rounded-xl p-2.5 max-h-56 overflow-y-auto space-y-2 bg-slate-50/40">
                                {orderedProducts.map((product) => {
                                    const checked =
                                        selectedOrderedProductIds.includes(
                                            product.id,
                                        );
                                    return (
                                        <div
                                            key={product.id}
                                            className={`rounded-xl border transition-colors ${checked ? "border-yambo-green-200 bg-yambo-green-50/60" : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"}`}
                                        >
                                            <label
                                                htmlFor={`ordered-product-${product.id}`}
                                                className="flex items-start gap-3 p-3 cursor-pointer"
                                            >
                                                <input
                                                    id={`ordered-product-${product.id}`}
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => {
                                                        setSelectedOrderedProductIds(
                                                            (prev) =>
                                                                checked
                                                                    ? prev.filter(
                                                                          (id) => id !== product.id,
                                                                      )
                                                                    : [
                                                                          ...prev,
                                                                          product.id,
                                                                      ],
                                                        );
                                                    }}
                                                    disabled={loading}
                                                    className="mt-0.5 h-4 w-4 shrink-0 rounded-md accent-yambo-green-500"
                                                />
                                                <div className="min-w-0 flex-1 text-sm text-gray-600">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <span className="block font-semibold text-yambo-black break-words">
                                                            {product.name}
                                                        </span>
                                                        {checked && (
                                                            <span className="shrink-0 rounded-full bg-yambo-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-yambo-green-700">
                                                                {t('common.selected')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {t('orders.quantity')}: {product.quantity ?? 1}
                                                        {typeof product.unitPrice === "number"
                                                            ? ` · ${product.unitPrice.toFixed(2)} €`
                                                            : ""}
                                                    </p>
                                                    {product.configuration &&
                                                        product.configuration !== "{}" && (
                                                            <p className="mt-1 text-xs leading-relaxed text-gray-500 break-words">
                                                                <span className="font-medium text-gray-600">{t('orders.configuration')}</span>{" "}
                                                                {formatConfiguration(product.configuration)}
                                                            </p>
                                                        )}
                                                </div>
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="mt-2 text-xs font-medium text-gray-500">
                                {selectedOrderedProductIds.length} {t('common.selected') || "seleccionados"}
                            </p>
                        </>
                    ) : (
                        <>
                            <label className="block text-sm font-semibold text-yambo-black mb-1.5">
                                {t('orders.product')}
                            </label>
                            <p className="text-sm text-gray-600 bg-yambo-green-50/30 border border-gray-100 rounded-xl px-4 py-2.5">
                                {orderedProducts[0]?.name || t('orders.product')}
                            </p>
                            {orderedProducts[0]?.configuration &&
                                orderedProducts[0].configuration !== "{}" && (
                                    <p className="mt-1.5 text-xs text-gray-400">
                                        {t('orders.configuration')}{" "}
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
                        {t('issues.description')} *
                    </label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('issues.descriptionPlaceholder')}
                        className="w-full min-h-[160px] px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 focus:border-yambo-green-400 transition-all resize-y text-sm text-yambo-black placeholder-gray-400"
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
                        {t('common.cancel')}
                    </ButtonComponent>
                    <ButtonComponent
                        type="submit"
                        isLoading={loading}
                        variant="primary"
                    >
                        {loading ? t('common.saving') : (t('issues.createIssue') || "Reportar incidencia")}
                    </ButtonComponent>
                </div>
            </form>
        </div>
    );
};
