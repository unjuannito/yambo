import { useState } from "react";
import { orderService } from "~/services/orderService";
import type { Order } from "~/types/order";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";

interface ConfirmDeliveryButtonProps {
    readonly orderId: string;
    readonly onConfirmed: (updated: Order) => void;
}

export function ConfirmDeliveryButton({ orderId, onConfirmed }: ConfirmDeliveryButtonProps) {
    const [isConfirming, setIsConfirming] = useState(false);

    const handleClick = async () => {
        setIsConfirming(true);
        try {
            const updated = await orderService.confirmProductDelivery(orderId);
            onConfirmed(updated);
            toast.success("Entrega confirmada correctamente.");
        } catch (err) {
            toast.error(getErrorMessage(err, "No se pudo confirmar la entrega."));
        } finally {
            setIsConfirming(false);
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={isConfirming}
            className="mt-3 text-sm text-yambo-green-600 hover:text-yambo-green-800 disabled:text-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-1"
        >
            {isConfirming ? "Confirmando..." : "✓ Confirmar entrega"}
        </button>
    );
}
