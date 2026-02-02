package es.yambo_alco.web.repository.spec;

import es.yambo_alco.web.model.OrderProduct;
import org.springframework.data.jpa.domain.Specification;

public final class OrderProductSpecifications {

    private OrderProductSpecifications() {}

    public static Specification<OrderProduct> orderIdEquals(String orderId) {
        return (root, query, cb) -> orderId == null ? null : cb.equal(root.get("orderId"), orderId);
    }

    public static Specification<OrderProduct> productIdEquals(String productId) {
        return (root, query, cb) -> productId == null ? null : cb.equal(root.get("productId"), productId);
    }

    public static Specification<OrderProduct> quantityGreaterThan(Integer minQuantity) {
        return (root, query, cb) -> minQuantity == null ? null : cb.greaterThan(root.get("quantity"), minQuantity);
    }

    public static Specification<OrderProduct> priceGreaterThan(Double minPrice) {
        return (root, query, cb) -> minPrice == null ? null : cb.greaterThan(root.get("price"), minPrice);
    }

    public static Specification<OrderProduct> priceLessThan(Double maxPrice) {
        return (root, query, cb) -> maxPrice == null ? null : cb.lessThan(root.get("price"), maxPrice);
    }
}
