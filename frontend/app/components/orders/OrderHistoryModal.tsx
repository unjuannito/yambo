import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Modal } from "~/components/common/Modal";
import { orderService, type OrderChange } from "~/services/orderService";
import { getErrorMessage } from "~/types/error";

interface OrderHistoryModalProps {
    orderId: string;
    isOpen: boolean;
    onClose: () => void;
}

const ACTION_LABEL: Record<string, string> = {
    ADDED: "Añadido",
    MODIFIED: "Modificado",
    REMOVED: "Eliminado",
    UNCHANGED: "Sin cambios",
};

const ACTION_COLOR: Record<string, string> = {
    ADDED: "bg-green-100 text-green-700",
    MODIFIED: "bg-blue-100 text-blue-700",
    REMOVED: "bg-red-100 text-red-700",
    UNCHANGED: "bg-gray-100 text-gray-600",
};

export function OrderHistoryModal({ orderId, isOpen, onClose }: OrderHistoryModalProps) {
    const [changes, setChanges] = useState<OrderChange[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !orderId) return;
        setLoading(true);
        setError(null);
        orderService.getOrderHistory(orderId)
            .then(setChanges)
            .catch((err) => setError(getErrorMessage(err, "No se pudo cargar el historial")))
            .finally(() => setLoading(false));
    }, [isOpen, orderId]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md" title="Historial de cambios del pedido">
            {loading && <p className="text-sm text-gray-400 py-4">Cargando…</p>}
            {error && <p className="text-sm text-red-500 py-4">{error}</p>}
            {!loading && !error && changes.length === 0 && (
                <p className="text-sm text-gray-400 py-4">Sin cambios registrados.</p>
            )}
            {!loading && !error && changes.length > 0 && (
                <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                    {changes.map((c) => (
                        <li key={c.id} className="rounded-xl border border-gray-100 bg-slate-50/60 p-3 text-sm">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${ACTION_COLOR[c.action] ?? "bg-gray-100 text-gray-600"}`}>
                                    {ACTION_LABEL[c.action] ?? c.action}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {new Date(c.changedAt).toLocaleString("es-ES")}
                                </span>
                            </div>
                            {c.summary && <p className="text-gray-700 mb-1">{c.summary}</p>}
                            <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-0.5">
                                {c.userId && c.userName && (
                                    <span>
                                        Por:{" "}
                                        <Link
                                            to={`/mi-espacio/admin/usuarios/${c.userId}/perfil`}
                                            className="font-medium text-yambo-green-700 hover:underline"
                                        >
                                            {c.userName}
                                        </Link>
                                    </span>
                                )}
                                {c.issueId && (
                                    <span>
                                        Incidencia:{" "}
                                        <Link
                                            to={`/mi-espacio/incidencias/${c.issueId}`}
                                            className="font-mono text-yambo-green-700 hover:underline"
                                        >
                                            {c.issueId}
                                        </Link>
                                    </span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Modal>
    );
}
