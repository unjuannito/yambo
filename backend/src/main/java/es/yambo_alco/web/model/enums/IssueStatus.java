package es.yambo_alco.web.model.enums;

import lombok.Getter;

@Getter
public enum IssueStatus {
    OPEN(0, "Abierto", "#e67e22", "triangle-exclamation"),
    IN_PROGRESS(1, "En Progreso", "#3498db", "arrows-rotate"),
    CLOSED(2, "Cerrado", "#6b7280", "folder-closed");

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
