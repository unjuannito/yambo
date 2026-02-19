package es.yambo_alco.web.model.enums;

/**
 * Status for individual order products.
 * Inherited from the FamilyProduct (merch drop) status.
 */
public enum OrderProductStatus {
    OPEN(0),
    ORDER_CLOSED(1),
    PENDING_FABRICATION(2),
    TO_BE_DELIVERED(3),
    DELIVERED(4),
    CANCELED(5);

    private final int value;

    OrderProductStatus(int value) {
        this.value = value;
    }

    public int getValue() {
        return value;
    }

    public static OrderProductStatus fromValue(int value) {
        for (OrderProductStatus status : OrderProductStatus.values()) {
            if (status.value == value) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown OrderProductStatus value: " + value);
    }

    /**
     * Convert from FamilyProductStatus to OrderProductStatus.
     * The order product status mirrors the family product status.
     */
    public static OrderProductStatus fromFamilyProductStatus(FamilyProductStatus familyStatus) {
        return switch (familyStatus) {
            case OPEN -> OPEN;
            case ORDER_CLOSED -> ORDER_CLOSED;
            case PENDING_FABRICATION -> PENDING_FABRICATION;
            case TO_BE_DELIVERED -> TO_BE_DELIVERED;
            case DELIVERED -> DELIVERED;
            case CANCELED -> CANCELED;
        };
    }
}
