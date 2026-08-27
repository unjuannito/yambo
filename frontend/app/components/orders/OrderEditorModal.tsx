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
import ProductOptionsFields from "~/components/common/forms/ProductOptionsFields";

interface OrderEditorModalProps {
    /** Pedido a editar; null = crear pedido nuevo. */
    order: Order | null;
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    /** ID de socio con el que precargar el formulario al crear un pedido. */
    initialUserId?: string;
}

interface EditorLine {
    key: string;
    productId: string;
    quantity: number;
    configuration?: Record<string, any>;
}

const EMPTY_LINE: EditorLine = { key: crypto.randomUUID(), productId: "", quantity: 1 };

/** Parsea la configuración JSON de un pedido a objeto (o `undefined` si es inválida/vacía). */
function parseConfiguration(raw?: string): Record<string, any> | undefined {
    if (!raw) return undefined;
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed as Record<string, any>;
        }
        return undefined;
    } catch {
        return undefined;
    }
}

/** Serializa la configuración a JSON string, normalizando selects (`{ id, label }` → `id`). */
function serializeConfiguration(config?: Record<string, any>): string | undefined {
    if (!config) return undefined;
    const normalized = Object.entries(config).reduce<Record<string, any>>((acc, [key, value]) => {
        acc[key] = typeof value === "object" && value !== null && "id" in value ? value.id : value;
        return acc;
    }, {});
    const json = JSON.stringify(normalized);
    return json && json !== "{}" && json !== "null" ? json : undefined;
}

/**
 * Modal de crear/editar pedido para administradores (issue #76).
 * - Crear: buscador de socio + línea(s) de producto (drop → producto → configuración → cantidad)
 * - Editar: mismas líneas precargadas desde el pedido (solo estados no finales)
 */
export function OrderEditorModal({ order, isOpen, onClose, onSaved, initialUserId }: OrderEditorModalProps) {
    const { t } = useTranslation();
    const isEdit = order !== null;

    const [lines, setLines] = useState<EditorLine[]>([EMPTY_LINE]);
    const [userId, setUserId] = useState("");
    const [userQuery, setUserQuery] = useState("");
    const [userResults, setUserResults] = useState<{ id: string; name: string; email: string }[]>([]);
    const [showUserResults, setShowUserResults] = useState(false);
    const [justification, setJustification] = useState("");

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
                  configuration: parseConfiguration(p.configuration),
              }))
            : [EMPTY_LINE]);

        familyProductService.listFamilyProducts(0, 200)
            .then((r) => setDrops(r.content))
            .catch(() => setDrops([]));
        productService.getAllProducts(0, 500)
            .then((r) => setProducts(r.content))
            .catch(() => setProducts([]));
    }, [isOpen, order]);

    // ── Precarga del socio al crear un pedido (p. ej. desde ?customerId=…) ──
    useEffect(() => {
        if (!isOpen || isEdit || !initialUserId) return;
        let cancelled = false;
        adminUserService
            .listUsers({ id: initialUserId, page: 0, size: 1 })
            .then((r) => {
                if (cancelled || r.content.length === 0) return;
                const u = r.content[0];
                setUserId(u.id);
                setUserQuery(`${u.name ?? u.email} (${u.email})`);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [isOpen, isEdit, initialUserId]);

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

        if (!justification.trim()) {
            toast.error(t("orders.editor.needJustification"));
            return;
        }

        const cleanLines = lines.filter((l) => l.productId);
        if (cleanLines.length === 0) {
            toast.error(t("orders.editor.needProduct"));
            return;
        }

        // Validación de opciones obligatorias del producto
        for (const line of cleanLines) {
            const product = products.find((p) => p.id === line.productId);
            if (!product) continue;
            const missingRequired = (product.options ?? []).filter(
                (option) => option.required && !line.configuration?.[option.name]
            );
            if (missingRequired.length > 0) {
                toast.error(t("merch.missingOptions", { options: missingRequired.map((o) => o.name).join(", ") }));
                return;
            }
        }

        const orderProducts: CreateOrderProduct[] = cleanLines.map((l) => ({
            productId: l.productId,
            quantity: Math.max(1, l.quantity || 1),
            configuration: serializeConfiguration(l.configuration),
        }));

        setSaving(true);
        try {
            if (isEdit && order) {
                await orderService.updateOrder(order.id, { products: orderProducts, justification: justification.trim() });
                toast.success(t("orders.editor.updated"));
            } else {
                await orderService.createOrder({ products: orderProducts, userId: userId || undefined, justification: justification.trim() });
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

            {/* Justificación (incidencia o petición) — obligatoria */}
            <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {t("orders.editor.justification")} <span className="text-red-500">*</span>
                </label>
                <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    rows={3}
                    placeholder={t("orders.editor.justificationPlaceholder")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yambo-green-500 transition-all"
                />
                <p className="mt-1 text-xs text-gray-400">
                    {t("orders.editor.justificationHint")}
                </p>
            </div>

            {/* Líneas de producto */}
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t("orders.editor.products")}
            </label>
            <div className="space-y-3 mb-4">
                {lines.map((line, idx) => (
                    <div key={line.key} className="bg-gray-50 rounded-xl p-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={line.productId}
                                onChange={(e) => updateLine(line.key, { productId: e.target.value, configuration: {} })}
                                className="w-full sm:w-auto sm:flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-yambo-green-500"
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
                        {(() => {
                            const selectedProduct = products.find((p) => p.id === line.productId);
                            return selectedProduct ? (
                                <div className="mt-3 border-t border-gray-200 pt-3">
                                    <p className="text-xs font-semibold text-gray-500 mb-2">
                                        {t("orders.editor.configForProduct")}
                                    </p>
                                    <ProductOptionsFields
                                        product={selectedProduct}
                                        configuration={line.configuration ?? {}}
                                        onChange={(config) => updateLine(line.key, { configuration: config })}
                                        columns={2}
                                    />
                                </div>
                            ) : null;
                        })()}
                    </div>
                ))}
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
        </Modal>
    );
}
