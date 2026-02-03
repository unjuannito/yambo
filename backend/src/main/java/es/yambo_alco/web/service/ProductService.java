package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.FamilyProduct;
import es.yambo_alco.web.model.Product;
import es.yambo_alco.web.model.ProductOption;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.FamilyProductRepository;
import es.yambo_alco.web.repository.ProductRepository;
import es.yambo_alco.web.repository.spec.ProductSpecifications;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final FamilyProductRepository familyProductRepository;
    private final AuthService authService;

    public Product getProductById(@NonNull String productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        checkAccess(product);
        return product;
    }

    public Page<Product> listProducts(String name, Boolean active, @NonNull Pageable pageable) {
        User user = authService.getCurrentUser(true);
        Set<String> profileIds = user.getProfiles().stream()
                .map(p -> p.getId())
                .collect(Collectors.toSet());

        Specification<Product> spec = Specification.where(null);
        spec = spec.and(ProductSpecifications.nameContains(name));
        spec = spec.and(ProductSpecifications.activeEquals(active));
        spec = spec.and(ProductSpecifications.userHasAccess(profileIds));

        return productRepository.findAll(spec, pageable);
    }

    public Product createProduct(@NonNull String name, String familyProductId, @NonNull BigDecimal basePrice, List<ProductOption> options, List<String> images) {
        authService.getCurrentUser(true);
        // TODO: check if user can create in this family

        if (productRepository.existsByName(name)) {
            throw new BadRequestException("Product name already exists");
        }

        FamilyProduct familyProduct = null;
        if (familyProductId != null && !familyProductId.trim().isEmpty()) {
            familyProduct = familyProductRepository.findById(familyProductId)
                    .orElseThrow(() -> new BadRequestException("Family product not found"));
        }

        Product product = Product.builder()
                .name(name)
                .active(true)
                .basePrice(basePrice)
                .options(options != null ? options : new ArrayList<>())
                .images(images != null ? images : new ArrayList<>())
            .familyProduct(familyProduct)
                .build();

        return productRepository.save(product);
    }

    public Product updateProduct(@NonNull String productId, String name, Boolean active, List<String> images, List<ProductOption> options, BigDecimal basePrice, String familyProductId) {
        Product product = getProductById(productId);
        // TODO: check if user can update

        if (name != null && !name.trim().isEmpty()) {
            if (!name.equals(product.getName()) && productRepository.existsByName(name)) {
                throw new BadRequestException("Product name already exists");
            }
            product.setName(name.trim());
        }

        if (active != null) {
            product.setActive(active);
        }

        if (images != null) {
            product.setImages(images);
        }

        if (options != null) {
            product.setOptions(options);
        }

        if (basePrice != null) {
            product.setBasePrice(basePrice);
        }

        if (familyProductId != null) {
            String trimmedFamilyId = familyProductId.trim();
            if (trimmedFamilyId.isEmpty()) {
                product.setFamilyProduct(null);
            } else {
                FamilyProduct familyProduct = familyProductRepository.findById(trimmedFamilyId)
                        .orElseThrow(() -> new BadRequestException("Family product not found"));
                product.setFamilyProduct(familyProduct);
            }
        }

        return productRepository.save(product);
    }

    public void deleteProduct(@NonNull String productId) {
        Product product = getProductById(productId);
        // TODO: check if user can delete
        productRepository.delete(product);
    }

    public Page<Product> listProductsForProject(@NonNull String projectId, String name, Boolean active, @NonNull Pageable pageable) {
        Specification<Product> spec = Specification.where(null);
        spec = spec.and(ProductSpecifications.projectIdInFamilyProjects(projectId));
        spec = spec.and(ProductSpecifications.nameContains(name));
        spec = spec.and(ProductSpecifications.activeEquals(active != null ? active : true));
        return productRepository.findAll(spec, pageable);
    }

    private void checkAccess(Product product) {
        User user = authService.getCurrentUser(true);
        Set<String> userProfileIds = user.getProfiles().stream()
                .map(p -> p.getId())
                .collect(Collectors.toSet());

        if (product.getFamilyProduct() == null) {
            return;
        }

        boolean hasAccess = product.getFamilyProduct().getProfile() != null
            && userProfileIds.contains(product.getFamilyProduct().getProfile().getId());

        if (!hasAccess) {
            throw new ResourceNotFoundException("Product not found");
        }
    }
}