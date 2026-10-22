package es.yambo_alco.web.model.enums;

import lombok.Getter;

@Getter
public enum ActivityStatus {
    PLANNED(0, "Planificada", "#3b82f6"),
    OPEN_REGISTRATION(1, "Abierta para apuntarse", "#22c55e"),
    REGISTRATION_CLOSED(2, "Inscripciones cerradas", "#f59e0b"),
    CLOSED(3, "Cerrada", "#6b7280"),
    CANCELLED(4, "Cancelada", "#ef4444");

    private final int value;
    private final String label;
    private final String color;

    ActivityStatus(int value, String label, String color) {
        this.value = value;
        this.label = label;
        this.color = color;
    }

    public static ActivityStatus fromValue(int value) {
        for (ActivityStatus status : values()) {
            if (status.value == value) return status;
        }
        throw new IllegalArgumentException("Unknown ActivityStatus value: " + value);
    }
}
