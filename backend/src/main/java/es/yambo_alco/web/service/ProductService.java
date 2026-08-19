package es.yambo_alco.web.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.FamilyProduct;
import es.yambo_alco.web.model.FamilyProductRoleAccess;
import es.yambo_alco.web.model.OptionValue;
import es.yambo_alco.web.model.Product;
import es.yambo_alco.web.model.ProductOption;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.PermissionAction;
import es.yambo_alco.web.model.enums.PermissionResource;
import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import es.yambo_alco.web.repository.FamilyProductRepository;
import es.yambo_alco.web.repository.ProductRepository;
import es.yambo_alco.web.repository.spec.ProductSpecifications;
import es.yambo_alco.web.util.PermissionCheckService;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private static final String OPTION_TYPE_SELECT = "select";

    private final ProductRepository productRepository;
    private final FamilyProductRepository familyProductRepository;
    private final AuthService authService;
    private final PermissionCheckService permissionCheck;
    private final ObjectMapper objectMapper;

    public Product getProductById(@NonNull String productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        boolean isProductAdmin = permissionCheck.hasPermission(PermissionResource.PRODUCT, PermissionAction.UPDATE) ||
                permissionCheck.hasPermission(PermissionResource.PRODUCT, PermissionAction.CREATE);

        if (!isProductAdmin) {
            checkAccess(product);
        }

        return product;
    }

    public Page<Product> listProducts(String name, Boolean active, String familyName,
                                       String projectName, BigDecimal minPrice, BigDecimal maxPrice,
                                       @NonNull Pageable pageable) {
        User user = authService.getCurrentUser(true);

        boolean isProductAdmin = permissionCheck.hasPermission(PermissionResource.PRODUCT, PermissionAction.UPDATE) ||
                permissionCheck.hasPermission(PermissionResource.PRODUCT, PermissionAction.CREATE);

        Specification<Product> spec = Specification.where(null);
        spec = spec.and(ProductSpecifications.nameContains(name));
        spec = spec.and(ProductSpecifications.familyProductNameContains(familyName));
        spec = spec.and(ProductSpecifications.projectNameContains(projectName));
        spec = spec.and(ProductSpecifications.basePriceGreaterThanOrEqual(minPrice));
        spec = spec.and(ProductSpecifications.basePriceLessThanOrEqual(maxPrice));

        if (isProductAdmin) {
            spec = spec.and(ProductSpecifications.activeEquals(active));
        } else {
            Set<String> projectIds = FamilyProductRoleAccess.projectIds(user);
            Set<UserProjectGroupRole> roles = FamilyProductRoleAccess.roles(user);
            spec = spec.and(ProductSpecifications.activeEquals(active != null ? active : true));
            spec = spec.and(ProductSpecifications.userHasAccess(projectIds, roles));
            spec = spec.and(ProductSpecifications.familyProductActive());
        }

        return productRepository.findAll(spec, pageable);
    }

    public Product createProduct(@NonNull String name, String familyProductId, @NonNull BigDecimal basePrice,
            List<ProductOption> options, List<String> images, String description, String shortDescription) {
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
                .description(description)
                .shortDescription(shortDescription)
                .build();

        return productRepository.save(product);
    }

    public Product updateProduct(@NonNull String productId, String name, Boolean active, List<String> images,
            List<ProductOption> options, BigDecimal basePrice, String familyProductId, String description, String shortDescription) {
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

        if (description != null) {
            product.setDescription(description);
        }

        if (shortDescription != null) {
            product.setShortDescription(shortDescription);
        }

        return productRepository.save(product);
    }

    public void deleteProduct(@NonNull String productId) {
        Product product = getProductById(productId);
        // TODO: check if user can delete
        productRepository.delete(product);
    }

    public Page<Product> listProductsForProject(@NonNull String projectId, String name, Boolean active,
            @NonNull Pageable pageable) {
        Specification<Product> spec = Specification.where(null);
        spec = spec.and(ProductSpecifications.projectIdInFamilyProjects(projectId));
        spec = spec.and(ProductSpecifications.nameContains(name));
        spec = spec.and(ProductSpecifications.activeEquals(active != null ? active : true));
        return productRepository.findAll(spec, pageable);
    }

    private void checkAccess(Product product) {
        User user = authService.getCurrentUser(true);

        if (product.getFamilyProduct() == null) {
            return;
        }

        FamilyProduct fp = product.getFamilyProduct();

        if (!FamilyProductRoleAccess.userHasAccess(user, fp.getRoleAccess())) {
            throw new ResourceNotFoundException("Product not found");
        }
    }

    public BigDecimal calculatePrice(Product product, String configurationJson) {
        BigDecimal totalPrice = product.getBasePrice();

        if (configurationJson == null || configurationJson.trim().isEmpty()) {
            return totalPrice;
        }

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> configuration = objectMapper.readValue(configurationJson, Map.class);

            List<ProductOption> options = product.getOptions();
            if (options == null || options.isEmpty()) {
                return totalPrice;
            }

            for (ProductOption option : options) {
                Object selectedValue = configuration.get(option.getName());
                if (selectedValue == null) {
                    continue;
                }
                totalPrice = totalPrice.add(calculatePriceForOption(option, selectedValue));
            }
        } catch (Exception e) {
            // If parsing fails, just return base price
            return totalPrice;
        }

        return totalPrice;
    }

    private BigDecimal calculatePriceForOption(ProductOption option, Object selectedValue) {
        BigDecimal extra = option.getPrice() != null ? option.getPrice() : BigDecimal.ZERO;
        if (OPTION_TYPE_SELECT.equals(option.getType()) && option.getValues() != null) {
            String selectedValueStr = selectedValue.toString();
            for (OptionValue value : option.getValues()) {
                if (value.getLabel().equals(selectedValueStr) || value.getId().equals(selectedValueStr)) {
                    if (value.getPrice() != null) {
                        extra = extra.add(value.getPrice());
                    }
                    break;
                }
            }
        }
        return extra;
    }

    public String formatConfiguration(String configurationJson, Product product) {
        if (configurationJson == null || configurationJson.trim().isEmpty() || configurationJson.equals("{}")) {
            return null;
        }

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> config = objectMapper.readValue(configurationJson, Map.class);

            if (config.isEmpty() || product == null || product.getOptions() == null) {
                return null;
            }

            String formatted = config.entrySet().stream()
                    .filter(entry -> entry.getValue() != null)
                    .filter(entry -> !(entry.getValue() instanceof String s) || !s.isBlank())
                    .filter(entry -> isValidOption(entry.getKey(), entry.getValue(), product.getOptions()))
                    .map(entry -> formatOptionValue(entry.getKey(), entry.getValue(), product.getOptions()))
                    .collect(Collectors.joining(", "));

            return formatted.isEmpty() ? null : formatted;
        } catch (Exception e) {
            // If parsing fails, return raw JSON
            return configurationJson;
        }
    }

    private boolean isValidOption(String optionName, Object value, List<ProductOption> options) {
        ProductOption option = options.stream()
                .filter(opt -> opt.getName().equals(optionName))
                .findFirst()
                .orElse(null);

        if (option == null) {
            return false;
        }

        if (OPTION_TYPE_SELECT.equals(option.getType()) && option.getValues() != null) {
            String valueStr = value.toString();
            return option.getValues().stream()
                    .anyMatch(v -> v.getId().equals(valueStr) || v.getLabel().equals(valueStr));
        }

        return true;
    }

    private String formatOptionValue(String optionName, Object value, List<ProductOption> options) {
        ProductOption option = options.stream()
                .filter(opt -> opt.getName().equals(optionName))
                .findFirst()
                .orElse(null);

        if (option == null) {
            return optionName + ": " + value;
        }

        if (OPTION_TYPE_SELECT.equals(option.getType()) && option.getValues() != null) {
            String valueStr = value.toString();
            OptionValue optionValue = option.getValues().stream()
                    .filter(v -> v.getId().equals(valueStr) || v.getLabel().equals(valueStr))
                    .findFirst()
                    .orElse(null);

            if (optionValue != null) {
                return optionName + ": " + optionValue.getLabel();
            }
        }

        return optionName + ": " + value;
    }
}