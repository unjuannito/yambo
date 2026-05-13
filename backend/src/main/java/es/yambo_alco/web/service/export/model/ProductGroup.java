package es.yambo_alco.web.service.export.model;

import es.yambo_alco.web.model.Product;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Groups all {@link ProductGroupItem}s for a single product across all included orders.
 */
public class ProductGroup {

    public final String productId;
    public final String productName;
    public final String dropName;
    public final String dropId;
    public final Product product;
    public final List<ProductGroupItem> items = new ArrayList<>();

    public ProductGroup(String productId, String productName, String dropName, String dropId, Product product) {
        this.productId = productId;
        this.productName = productName;
        this.dropName = dropName;
        this.dropId = dropId;
        this.product = product;
    }

    public int totalQty() {
        return items.stream().mapToInt(ProductGroupItem::quantity).sum();
    }

    public BigDecimal totalRevenue() {
        return items.stream()
                .map(i -> i.unitPrice().multiply(BigDecimal.valueOf(i.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
