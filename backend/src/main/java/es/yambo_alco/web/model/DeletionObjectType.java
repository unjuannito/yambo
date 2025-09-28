package es.yambo_alco.web.model;

public enum DeletionObjectType {
    USER("user");

    private final String value;

    DeletionObjectType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static DeletionObjectType fromString(String value) {
        for (DeletionObjectType type : DeletionObjectType.values()) {
            if (type.value.equalsIgnoreCase(value)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown object type: " + value);
    }

    @Override
    public String toString() {
        return value;
    }
}