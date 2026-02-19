package es.yambo_alco.web.model.enums;

public enum FamilyProductStatus {
    OPEN(0),
    ORDER_CLOSED(1),
    PENDING_FABRICATION(2),
    TO_BE_DELIVERED(3),
    DELIVERED(4),
    CANCELED(5);

    private final int value;

    FamilyProductStatus(int value) {
        this.value = value;
    }

    public int getValue() {
        return value;
    }

    public static FamilyProductStatus fromValue(int value) {
        for (FamilyProductStatus status : FamilyProductStatus.values()) {
            if (status.value == value) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown FamilyProductStatus value: " + value);
    }
}
