package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Product;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.ProductRepository;
import es.yambo_alco.web.repository.spec.ProductSpecifications;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
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

    public Product createProduct(@NonNull String name, String projectId, String familyProductId) {
        User user = authService.getCurrentUser(true);
        // TODO: check if user can create in this family
        // For now, assume ok

        if (productRepository.existsByName(name)) {
            throw new BadRequestException("Product name already exists");
        }

        Product product = Product.builder()
                .name(name)
                .projectId(projectId)
                .active(true)
                .build();

        // TODO: set familyProduct if provided

        return productRepository.save(product);
    }

    public Product updateProduct(@NonNull String productId, String name, Boolean active) {
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

        return productRepository.save(product);
    }

    public void deleteProduct(@NonNull String productId) {
        Product product = getProductById(productId);
        // TODO: check if user can delete
        productRepository.delete(product);
    }

    private void checkAccess(Product product) {
        User user = authService.getCurrentUser(true);
        Set<String> userProfileIds = user.getProfiles().stream()
                .map(p -> p.getId())
                .collect(Collectors.toSet());

        if (product.getFamilyProduct() == null) {
            return; // allow
        }

        boolean hasAccess = product.getFamilyProduct().getProfiles().stream()
                .anyMatch(p -> userProfileIds.contains(p.getId()));

        if (!hasAccess) {
            throw new ResourceNotFoundException("Product not found"); // or Forbidden
        }
    }

    // TODO: existsByName method in repo
}