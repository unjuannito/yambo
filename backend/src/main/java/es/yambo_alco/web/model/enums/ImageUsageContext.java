package es.yambo_alco.web.model.enums;

import lombok.Getter;

@Getter
public enum ImageUsageContext {
    USER_PHOTO(0, "Foto de usuario", true),
    PRODUCT_IMAGE(1, "Imagen de producto", false),
    PROJECT_IMAGE(2, "Imagen de proyecto", true),
    HOME_IMAGE(3, "Imagen de página principal", true),
    MARKDOWN_IMAGE(4, "Imagen de markdown", false);

    private final int value;
    private final String label;
    /**
     * If true, uploading a new image with the same context + reference
     * will automatically delete the previous one.
     */
    private final boolean replacePrevious;

    ImageUsageContext(int value, String label, boolean replacePrevious) {
        this.value = value;
        this.label = label;
        this.replacePrevious = replacePrevious;
    }

    public static ImageUsageContext fromValue(int value) {
        for (ImageUsageContext ctx : values()) {
            if (ctx.value == value) return ctx;
        }
        throw new IllegalArgumentException("Unknown ImageUsageContext value: " + value);
    }
}
