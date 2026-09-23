import type { Product } from "~/services/productService";

/**
 * Calcula el precio total de un producto a partir de su configuración de opciones.
 * Debe mantenerse en sincronía con `ProductService.calculatePrice` del backend:
 * - select: suma `OptionValue.price` del valor elegido.
 * - checkbox: suma `ProductOption.price` solo si está marcado.
 * - text_input: suma `ProductOption.price` solo si el texto no está vacío.
 */
export function calculateProductPrice(
    product: Product,
    configuration: Record<string, any>,
): number {
    let price = product.basePrice ?? 0;

    for (const option of product.options ?? []) {
        const selectedValue = configuration[option.name];
        if (selectedValue == null) continue;

        if (option.type === "select") {
            const valueId =
                typeof selectedValue === "object" && selectedValue !== null
                    ? selectedValue.id
                    : selectedValue;
            const value = option.values?.find((v) => v.id === valueId);
            if (value?.price) {
                price += value.price;
            }
        } else if (option.type === "checkbox") {
            const checked = selectedValue === true || selectedValue === "true";
            if (checked && option.price) {
                price += option.price;
            }
        } else if (option.type === "text_input") {
            if (typeof selectedValue === "string" && selectedValue.trim() !== "" && option.price) {
                price += option.price;
            }
        }
    }

    return price;
}
