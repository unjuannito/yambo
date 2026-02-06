export const ORDER_STATUS_CONFIG = {
    PENDING_CONFIRMATION: {
        label: "Pendiente de Confirmación",
        shortLabel: "Pendiente",
        className: "bg-yellow-100 text-yellow-800"
    },
    CONFIRMED: {
        label: "Confirmado",
        shortLabel: "Confirmado",
        className: "bg-blue-100 text-blue-800"
    },
    IN_PROGRESS: {
        label: "En Progreso",
        shortLabel: "En Progreso",
        className: "bg-orange-100 text-orange-800"
    },
    DELIVERED: {
        label: "Entregado",
        shortLabel: "Entregado",
        className: "bg-green-100 text-green-800"
    },
    CANCELLED: {
        label: "Cancelado",
        shortLabel: "Cancelado",
        className: "bg-red-100 text-red-800"
    }
} as const;

export type OrderStatus = keyof typeof ORDER_STATUS_CONFIG;
