package es.yambo_alco.web.model.enums;

/**
 * Enum representing the possible actions that can be performed on a resource.
 * These are statically defined and stored as strings in the database.
 */
public enum PermissionAction {
    CREATE("create"),
    READ("read"),
    UPDATE("update"),
    DELETE("delete");

    private final String value;

    PermissionAction(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    /**
     * Get the PermissionAction from a string value (case-insensitive).
     * @param value the string value to convert
     * @return the corresponding PermissionAction
     * @throws IllegalArgumentException if the value doesn't match any action
     */
    public static PermissionAction fromValue(String value) {
        if (value == null) {
            throw new IllegalArgumentException("Action value cannot be null");
        }
        for (PermissionAction action : values()) {
            if (action.value.equalsIgnoreCase(value)) {
                return action;
            }
        }
        throw new IllegalArgumentException("Unknown action: " + value);
    }

    @Override
    public String toString() {
        return value;
    }
}
