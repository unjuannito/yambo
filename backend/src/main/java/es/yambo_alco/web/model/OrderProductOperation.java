package es.yambo_alco.web.model;

import java.util.UUID;

/**
 * Operación explícita sobre un producto de un pedido durante una edición.
 *
 * @param orderedProductId ID del order_product existente (modified/unchanged/removed).
 * @param productId        ID del producto (added/modified/unchanged/removed).
 * @param quantity         Cantidad del producto.
 * @param configuration    Configuración JSON (opcional).
 * @param action           "added" | "modified" | "unchanged" | "removed".
 */
public record OrderProductOperation(
        UUID orderedProductId,
        String productId,
        Integer quantity,
        String configuration,
        String action) {
}
