package es.yambo_alco.web.model.enums;

/**
 * Enum representing the possible resources that can have permissions.
 * These are statically defined and stored as strings in the database.
 */
public enum PermissionResource {
    USER("user"),
    PROFILE("profile"),
    INVITATION("invitation"),
    PRODUCT("product"),
    PROJECT("project"),
    FAMILY_PRODUCT("family_product"),
    ORDER("order");

    private final String value;

    PermissionResource(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    /**
     * Get the PermissionResource from a string value (case-insensitive).
     * @param value the string value to convert
     * @return the corresponding PermissionResource
     * @throws IllegalArgumentException if the value doesn't match any resource
     */
    public static PermissionResource fromValue(String value) {
        if (value == null) {
            throw new IllegalArgumentException("Resource value cannot be null");
        }
        for (PermissionResource resource : values()) {
            if (resource.value.equalsIgnoreCase(value)) {
                return resource;
            }
        }
        throw new IllegalArgumentException("Unknown resource: " + value);
    }

    @Override
    public String toString() {
        return value;
    }
}
