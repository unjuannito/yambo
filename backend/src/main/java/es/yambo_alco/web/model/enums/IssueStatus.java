package es.yambo_alco.web.model.enums;

import lombok.Getter;

@Getter
public enum IssueStatus {
    OPEN(0, "ABIERTO", "#e67e22", "⚠️"),
    IN_PROGRESS(1, "EN PROGRESO", "#3498db", "🔄"),
    RESOLVED(2, "RESUELTO", "#27ae60", "✓"),
    CLOSED(3, "CERRADO", "#6b7280", "🗂️"),
    REOPENED(4, "REABIERTO", "#7c3aed", "♻️");

    private final int value;
    private final String label;
    private final String color;
    private final String icon;

    IssueStatus(int value, String label, String color, String icon) {
        this.value = value;
        this.label = label;
        this.color = color;
        this.icon = icon;
    }

    public static IssueStatus fromValue(int value) {
        for (IssueStatus status : IssueStatus.values()) {
            if (status.value == value) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown IssueStatus value: " + value);
    }
}
