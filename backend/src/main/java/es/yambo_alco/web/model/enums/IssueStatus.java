package es.yambo_alco.web.model.enums;

public enum IssueStatus {
    OPEN(0),
    IN_PROGRESS(1),
    RESOLVED(2),
    CLOSED(3),
    REOPENED(4);

    private final int value;

    IssueStatus(int value) {
        this.value = value;
    }

    public int getValue() {
        return value;
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
