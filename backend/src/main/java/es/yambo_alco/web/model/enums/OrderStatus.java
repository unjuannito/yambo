package es.yambo_alco.web.model.enums;

public enum OrderStatus {
    PENDING_CONFIRMATION(0),
    CONFIRMED(1),
    IN_PROGRESS(2),
    DELIVERED(3),
    CANCELLED(4);

    private final int value;

    OrderStatus(int value) {
        this.value = value;
    }

    public int getValue() {
        return value;
    }

    public static OrderStatus fromValue(int value) {
        for (OrderStatus status : OrderStatus.values()) {
            if (status.value == value) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown OrderStatus value: " + value);
    }
}
