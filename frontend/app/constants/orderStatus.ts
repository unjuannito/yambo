// ── Order Status ──

export enum OrderStatus {
    PENDING_PAYMENT = 'PENDING_PAYMENT',
    CONFIRMING_PAYMENT = 'CONFIRMING_PAYMENT',
    PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
    CANCELED = 'CANCELED',
    PENDING_PRODUCTS = 'PENDING_PRODUCTS',
    CLOSED = 'CLOSED',
}

export const ORDER_STATUS_CONFIG = {
    PENDING_PAYMENT: {
        label: "Pendiente de Pago",
        shortLabel: "Pdte. Pago",
        className: "bg-yellow-100 text-yellow-800"
    },
    CONFIRMING_PAYMENT: {
        label: "Confirmando Pago",
        shortLabel: "Conf. Pago",
        className: "bg-orange-100 text-orange-800"
    },
    PAYMENT_CONFIRMED: {
        label: "Pago Confirmado",
        shortLabel: "Pagado",
        className: "bg-blue-100 text-blue-800"
    },
    CANCELED: {
        label: "Cancelado",
        shortLabel: "Cancelado",
        className: "bg-red-100 text-red-800"
    },
    PENDING_PRODUCTS: {
        label: "Pendiente de Productos",
        shortLabel: "Pdte. Productos",
        className: "bg-orange-100 text-orange-800"
    },
    CLOSED: {
        label: "Cerrado",
        shortLabel: "Cerrado",
        className: "bg-green-100 text-green-800"
    }
} as const;

export const ORDER_WORKFLOW_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING_PAYMENT]: [OrderStatus.CONFIRMING_PAYMENT, OrderStatus.CANCELED],
    [OrderStatus.CONFIRMING_PAYMENT]: [OrderStatus.PAYMENT_CONFIRMED, OrderStatus.CANCELED],
    [OrderStatus.PAYMENT_CONFIRMED]: [OrderStatus.PENDING_PRODUCTS],
    [OrderStatus.PENDING_PRODUCTS]: [OrderStatus.CLOSED],
    [OrderStatus.CLOSED]: [],
    [OrderStatus.CANCELED]: [],
};

// ── Family Product (Drop) Status ──

export enum FamilyProductStatus {
    OPEN = 'OPEN',
    ORDER_CLOSED = 'ORDER_CLOSED',
    PENDING_FABRICATION = 'PENDING_FABRICATION',
    TO_BE_DELIVERED = 'TO_BE_DELIVERED',
    DELIVERED = 'DELIVERED',
    CANCELED = 'CANCELED',
}

export const FAMILY_PRODUCT_STATUS_CONFIG = {
    OPEN: {
        label: "Abierto",
        shortLabel: "Abierto",
        className: "bg-green-100 text-green-800"
    },
    ORDER_CLOSED: {
        label: "Pedidos Cerrados",
        shortLabel: "Cerrado",
        className: "bg-blue-100 text-blue-800"
    },
    PENDING_FABRICATION: {
        label: "En Fabricación",
        shortLabel: "Fabricación",
        className: "bg-yellow-100 text-yellow-800"
    },
    TO_BE_DELIVERED: {
        label: "Por Entregar",
        shortLabel: "Por Entregar",
        className: "bg-orange-100 text-orange-800"
    },
    DELIVERED: {
        label: "Entregado",
        shortLabel: "Entregado",
        className: "bg-green-100 text-green-800"
    },
    CANCELED: {
        label: "Cancelado (Devolver dinero)",
        shortLabel: "Cancelado",
        className: "bg-red-100 text-red-800"
    }
} as const;

export const FAMILY_PRODUCT_WORKFLOW_TRANSITIONS: Record<FamilyProductStatus, FamilyProductStatus[]> = {
    [FamilyProductStatus.OPEN]: [FamilyProductStatus.ORDER_CLOSED, FamilyProductStatus.CANCELED],
    [FamilyProductStatus.ORDER_CLOSED]: [FamilyProductStatus.PENDING_FABRICATION, FamilyProductStatus.CANCELED],
    [FamilyProductStatus.PENDING_FABRICATION]: [FamilyProductStatus.TO_BE_DELIVERED, FamilyProductStatus.CANCELED],
    [FamilyProductStatus.TO_BE_DELIVERED]: [FamilyProductStatus.DELIVERED, FamilyProductStatus.CANCELED],
    [FamilyProductStatus.DELIVERED]: [],
    [FamilyProductStatus.CANCELED]: [],
};
