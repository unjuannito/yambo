import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { Modal } from "~/components/common/Modal";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { orderService, type CreateOrderProduct } from "~/services/orderService";
import { adminUserService, type UserFilters } from "~/services/adminUserService";
import { productService, type Product } from "~/services/productService";
import { familyProductService, type FamilyProduct } from "~/services/familyProductService";
import { getErrorMessage } from "~/types/error";
import type { Order } from "~/types/order";

interface OrderEditorModalProps {
    /** Pedido a editar; null = crear pedido nuevo. */
    order: Order | null;
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

interface EditorLine {
    key: string;
    productId: string;
    quantity: number;
    configuration?: string;
}

const EMPTY_LINE: EditorLine = { key: crypto.randomUUID(), productId: "", quantity: 1 };

/**
 * Modal de crear/editar pedido para administradores (issue #76).
 * - Crear: buscador de socio + línea(s) de producto (drop → producto → configuración → cantidad)
 * - Editar: mismas líneas precargadas desde el pedido (solo estados no finales)
 */
export function OrderEditorModal({ order, isOpen, onClose, onSaved }: OrderEditorModalProps) {
    const { t } = useTranslation();
    const isEdit = order !== null;

    const [lines, setLines] = useState<EditorLine[]>([EMPTY_LINE]);
    const [userId, setUserId] = useState("");
    const [userQuery, setUserQuery] = useState("");
    const [userResults, setUserResults] = useState<{ id: string; name: string; email: string }[]>([]);
    const [showUserResults, setShowUserResults] = useState(false);

    const [drops, setDrops] = useState<FamilyProduct[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [saving, setSaving] = useState(false);

    // ── Carga inicial ──
    useEffect(() => {
        if (!isOpen) return;
        // Reset al abrir
        setUserId("");
        setUserQuery("");
        setUserResults([]);
        setLines(order
            ? order.products.map((p) => ({
                  key: crypto.randomUUID(),
                  productId: p.productId,
                  quantity: p.quantity,
                  configuration: p.configuration && p.configuration !== "{}" ? p.configuration : undefined,
              }))
            : [EMPTY_LINE]);

        familyProductService.listFamilyProducts(0, 200)
            .then((r) => setDrops(r.content))
            .catch(() => setDrops([]));
        productService.getAllProducts(0, 500)
            .then((r) => setProducts(r.content))
            .catch(() => setProducts([]));
    }, [isOpen, order]);

    // ── Búsqueda de socio (solo crear) ──
    useEffect(() => {
        if (isEdit || !isOpen || userQuery.trim().length < 2) {
            setUserResults([]);
            return;
        }
        const timer = window.setTimeout(async () => {
            try {
                const filters: UserFilters & { page: number; size: number } = { query: userQuery.trim(), page: 0, size: 8 };
                const r = await adminUserService.listUsers(filters);
                setUserResults(r.content.map((u) => ({ id: u.id, name: u.name ?? u.email, email: u.email })));
            } catch {
                setUserResults([]);
            }
        }, 300);
        return () => window.clearTimeout(timer);
    }, [userQuery, isEdit, isOpen]);

    const updateLine = (key: string, patch: Partial<EditorLine>) => {
        setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    };

    const removeLine = (key: string) => {
        setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : [EMPTY_LINE]));
    };

    const addLine = () => setLines((prev) => [...prev, { ...EMPTY_LINE, key: crypto.randomUUID() }]);

    const productOptions = useMemo(
        () => products.filter((p) => p.active),
        [products]
    );

    const handleSubmit = async () => {
        // Validaciones
        if (isEdit) {
            // sin validación de usuario — el socio ya está en el pedido
        } else if (!userId) {
            toast.error(t("orders.editor.needMember"));
            return;
        }

        const cleanLines = lines.filter((l) => l.productId);
        if (cleanLines.length === 0) {
            toast.error(t("orders.editor.needProduct"));
            return;
        }

        const orderProducts: CreateOrderProduct[] = cleanLines.map((l) => ({
            productId: l.productId,
            quantity: Math.max(1, l.quantity || 1),
            configuration: l.configuration && l.configuration.trim() ? l.configuration.trim() : undefined,
        }));

        setSaving(true);
        try {
            if (isEdit && order) {
                await orderService.updateOrder(order.id, { products: orderProducts });
                toast.success(t("orders.editor.updated"));
            } else {
                await orderService.createOrder({ products: orderProducts, userId: userId || undefined });
                toast.success(t("orders.editor.created"));
            }
            onSaved();
            onClose();
        } catch (err) {
            toast.error(getErrorMessage(err, t("orders.editor.error")));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" title={isEdit ? t("orders.editor.editTitle") : t("orders.editor.createTitle")}>
            <div className="p-6">
                {/* Buscador de socio (solo crear) */}
                {!isEdit && (
                    <div className="mb-5">
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {t("orders.editor.member")}
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={userQuery}
                                onChange={(e) => { setUserQuery(e.target.value); setShowUserResults(true); }}
                                onFocus={() => setShowUserResults(true)}
                                onBlur={() => window.setTimeout(() => setShowUserResults(false), 200)}
                                placeholder={t("orders.editor.memberPlaceholder")}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-yambo-green-500 focus:border-transparent outline-none transition-all"
                            />
                            {showUserResults && userResults.length > 0 && (
                                <div className="absolute z-30 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg max-h-56 overflow-y-auto">
                                    {userResults.map((u) => (
                                        <button
                                            type="button"
                                            key={u.id}
                                            onClick={() => { setUserId(u.id); setUserQuery(`${u.name} (${u.email})`); setShowUserResults(false); }}
                                            className="w-full text-left px-3 py-2.5 hover:bg-yambo-green-50 text-sm transition-colors"
                                        >
                                            <span className="font-medium text-gray-800">{u.name}</span>
                                            <span className="text-gray-400 ml-2">{u.email}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {userId && (
                            <p className="mt-1 text-xs text-yambo-green-700">
                                ✓ {t("orders.editor.memberSelected")}
                            </p>
                        )}
                    </div>
                )}

                {/* Líneas de producto */}
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t("orders.editor.products")}
                </label>
                <div className="space-y-3 mb-4">
                    {lines.map((line, idx) => (
                        <div key={line.key} className="flex flex-col sm:flex-row gap-2 bg-gray-50 rounded-xl p-3">
                            <select
                                value={line.productId}
                                onChange={(e) => updateLine(line.key, { productId: e.target.value })}
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-yambo-green-500"
                            >
                                <option value="">{t("orders.editor.selectProduct")}</option>
                                {drops.map((drop) => {
                                    const dropProducts = productOptions.filter((p) => p.familyProductId === drop.id);
                                    if (dropProducts.length === 0) return null;
                                    return (
                                        <optgroup key={drop.id} label={drop.name}>
                                            {dropProducts.map((p) => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </optgroup>
                                    );
                                })}
                                {productOptions.filter((p) => !p.familyProductId).map((p) => (
                                    <option key={p.id} value={p.id}>{p.name} (sin drop)</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                min={1}
                                value={line.quantity}
                                onChange={(e) => updateLine(line.key, { quantity: parseInt(e.target.value) || 1 })}
                                className="w-20 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yambo-green-500"
                                title={t("orders.editor.quantity")}
                            />
                            <button
                                type="button"
                                onClick={() => removeLine(line.key)}
                                className="px-2.5 py-2 text-gray-400 hover:text-red-500 transition-colors"
                                aria-label={t("orders.editor.removeProduct")}
                            >
                                <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                            </button>
                            {idx === lines.length - 1 && (
                                <button
                                    type="button"
                                    onClick={addLine}
                                    className="px-2.5 py-2 text-yambo-green-600 hover:text-yambo-green-800 transition-colors"
                                    aria-label={t("orders.editor.addProduct")}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Configuración (avanzado) */}
                <div className="mb-5">
                    <details className="group">
                        <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 select-none">
                            {t("orders.editor.advancedConfig")}
                        </summary>
                        <p className="text-xs text-gray-400 mt-1 mb-1.5">
                            {t("orders.editor.advancedHint")}
                        </p>
                        <textarea
                            value={lines[0]?.configuration ?? ""}
                            onChange={(e) => updateLine(lines[0].key, { configuration: e.target.value })}
                            rows={3}
                            placeholder='{"color": "negro", "talla": "M"}'
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-yambo-green-500"
                        />
                    </details>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3">
                    <ButtonComponent variant="ghost" onClick={onClose}>
                        {t("common.cancel")}
                    </ButtonComponent>
                    <ButtonComponent variant="primary" onClick={handleSubmit} isLoading={saving}>
                        {isEdit ? t("orders.editor.saveChanges") : t("orders.editor.createOrder")}
                    </ButtonComponent>
                </div>
            </div>
        </Modal>
    );
}
