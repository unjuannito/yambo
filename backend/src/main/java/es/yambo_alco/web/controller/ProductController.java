package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.Product;
import es.yambo_alco.web.model.ProductOption;
import es.yambo_alco.web.service.ProductService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @PostMapping
    @PreAuthorize("@permissionCheck.hasPermission('product', 'create')")
    public ResponseEntity<ProductResponse> createProduct(@Valid @RequestBody CreateProductRequest request) {
        BigDecimal basePrice = normalizeBasePrice(request.getBasePrice());
        Product product = productService.createProduct(
                request.getName(),
                request.getFamilyProductId(),
                basePrice,
                request.getOptions(),
                request.getImages(),
                request.getDescription());
        return ResponseEntity.status(HttpStatus.CREATED).body(new ProductResponse(product));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<ProductResponse>> listProducts(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) Boolean active,
            Pageable pageable) {
        Page<Product> products = productService.listProducts(name, active, pageable);
        Page<ProductResponse> response = products.map(ProductResponse::new);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ProductResponse> getProduct(@PathVariable String id) {
        Product product = productService.getProductById(id);
        return ResponseEntity.ok(new ProductResponse(product));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('product', 'update')")
    public ResponseEntity<ProductResponse> updateProduct(
            @PathVariable String id,
            @Valid @RequestBody UpdateProductRequest request) {
        BigDecimal basePrice = normalizeBasePrice(request.getBasePrice());
        Product product = productService.updateProduct(
                id,
                request.getName(),
                request.getActive(),
                request.getImages(),
                request.getOptions(),
                basePrice,
                request.getFamilyProductId(),
                request.getDescription());
        return ResponseEntity.ok(new ProductResponse(product));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionCheck.hasPermission('product', 'delete')")
    public ResponseEntity<Void> deleteProduct(@PathVariable String id) {
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class CreateProductRequest {
        @NotBlank(message = "Name is required")
        private String name;

        private String familyProductId;

        @NotNull(message = "Base price is required")
        private BigDecimal basePrice;

        private List<ProductOption> options;

        private List<String> images;

        private String description;
    }

    @Data
    public static class UpdateProductRequest {
        private String name;
        private Boolean active;
        private List<String> images;
        private List<ProductOption> options;
        private BigDecimal basePrice;
        private String familyProductId;
        private String description;
    }

    @Data
    public static class ProductResponse {
        private String id;
        private String name;
        private String familyProductId;
        private boolean active;
        private BigDecimal basePrice;
        private List<ProductOption> options;
        private List<String> images;
        private String description;

        public ProductResponse(Product product) {
            this.id = product.getId();
            this.name = product.getName();
            this.familyProductId = product.getFamilyProduct() != null ? product.getFamilyProduct().getId() : null;
            this.active = product.isActive();
            this.basePrice = product.getBasePrice();
            this.options = product.getOptions();
            this.images = product.getImages();
            this.description = product.getDescription();
        }
    }

    @Data
    public static class PriceResponse {
        private BigDecimal basePrice;
        private BigDecimal finalPrice;

        public PriceResponse(BigDecimal basePrice, BigDecimal finalPrice) {
            this.basePrice = basePrice;
            this.finalPrice = finalPrice;
        }
    }

    private BigDecimal normalizeBasePrice(BigDecimal basePrice) {
        if (basePrice == null) {
            return null;
        }
        BigDecimal normalized = basePrice.stripTrailingZeros();
        if (normalized.scale() < 0) {
            normalized = normalized.setScale(0);
        }
        return normalized;
    }
}
