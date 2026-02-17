package es.yambo_alco.web.model.enums;

public enum FamilyProductStatus {
    ACTIVE(0),
    COMPLETED(1),
    ARCHIVED(2);

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
