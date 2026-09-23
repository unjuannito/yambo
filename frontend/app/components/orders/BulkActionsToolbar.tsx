import type { Order } from "~/services/orderService";
import { OrderStatus, ORDER_STATUS_CONFIG, ORDER_WORKFLOW_TRANSITIONS } from "~/constants/orderStatus";
import ButtonComponent from "~/components/common/forms/ButtonComponent";

interface BulkActionsToolbarProps {
    readonly selectedOrders: string[];
    readonly allOrdersOnPage: Order[];
    readonly bulkStatus: string;
    readonly onBulkStatusChange: (status: string) => void;
    readonly onClearSelection: () => void;
    readonly onApplyStatus: () => void;
}

export function BulkActionsToolbar({
    selectedOrders,
    allOrdersOnPage,
    bulkStatus,
    onBulkStatusChange,
    onClearSelection,
    onApplyStatus,
}: BulkActionsToolbarProps) {
    return (
        <>
            {selectedOrders.length > 0 && (
                <div className="bg-yambo-green-50/50 border border-yambo-green-200 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="text-sm font-medium text-yambo-green-800 shrink-0">
                    {selectedOrders.length} pedido
                    {selectedOrders.length !== 1 ? "s" : ""}{" "}
                    seleccionado
                    {selectedOrders.length !== 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {(() => {
                        const selectedOrderObjects = allOrdersOnPage.filter(o => selectedOrders.includes(o.id));
                        const transitionSets = selectedOrderObjects.map(o => ORDER_WORKFLOW_TRANSITIONS[o.status as OrderStatus] || []);
                        const commonTransitions = transitionSets.length > 0
                            ? transitionSets.reduce((common, curr) => common.filter(s => curr.includes(s)))
                            : [];
                        return (
                            <select
                                value={bulkStatus}
                                onChange={(e) => onBulkStatusChange(e.target.value)}
                                className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50"
                                disabled={commonTransitions.length === 0}
                            >
                                <option value="">
                                    {commonTransitions.length === 0
                                        ? "Sin transiciones comunes"
                                        : "Cambiar estado a..."}
                                </option>
                                {commonTransitions.map((status) => {
                                    const cfg = ORDER_STATUS_CONFIG[status as keyof typeof ORDER_STATUS_CONFIG];
                                    return (
                                        <option key={status} value={status}>
                                            {cfg?.label || status}
                                        </option>
                                    );
                                })}
                            </select>
                        );
                    })()}
                    <ButtonComponent
                        variant="primary"
                        size="sm"
                        onClick={onApplyStatus}
                        disabled={!bulkStatus}
                    >
                        Actualizar
                    </ButtonComponent>
                </div>
                <ButtonComponent
                    variant="ghost"
                    size="sm"
                    onClick={() => onClearSelection()}
                >
                    Cancelar
                </ButtonComponent>
            </div>
            )}
        </>
    );
}
