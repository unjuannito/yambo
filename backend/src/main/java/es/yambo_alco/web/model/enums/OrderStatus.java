package es.yambo_alco.web.model.enums;

public enum OrderStatus {
    PENDING_PAYMENT(0),
    PAYMENT_CONFIRMED(1),
    CANCELED(2),
    PENDING_PRODUCTS(3),
    CLOSED(4);

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
