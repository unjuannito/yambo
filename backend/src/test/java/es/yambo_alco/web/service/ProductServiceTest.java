package es.yambo_alco.web.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.FamilyProduct;
import es.yambo_alco.web.model.FamilyProductRoleAccess;
import es.yambo_alco.web.model.OptionValue;
import es.yambo_alco.web.model.Product;
import es.yambo_alco.web.model.ProductOption;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.Project;
import es.yambo_alco.web.model.ProjectGroup;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.UserProjectGroup;
import es.yambo_alco.web.model.enums.PermissionAction;
import es.yambo_alco.web.model.enums.PermissionResource;
import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import es.yambo_alco.web.repository.FamilyProductRepository;
import es.yambo_alco.web.repository.ProductRepository;
import es.yambo_alco.web.util.PermissionCheckService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private FamilyProductRepository familyProductRepository;

    @Mock
    private AuthService authService;

    @Mock
    private PermissionCheckService permissionCheck;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private ProductService productService;

    @Test
    void getProductById_WhenProductExistsAndUserHasAccess_ShouldReturnProduct() {
        // Given
        String productId = "P001";
        Product product = Product.builder()
                .id(productId)
                .name("Test Product")
                .active(true)
                .build();

        User user = User.builder()
                .id("U001")
                .profiles(Set.of(Profile.builder().id("ADMIN").build()))
                .build();

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(authService.getCurrentUser(true)).thenReturn(user);
        when(permissionCheck.hasPermission(PermissionResource.PRODUCT, PermissionAction.UPDATE)).thenReturn(false);
        when(permissionCheck.hasPermission(PermissionResource.PRODUCT, PermissionAction.CREATE)).thenReturn(false);

        // When
        Product result = productService.getProductById(productId);

        // Then
        assertEquals(product, result);
        verify(productRepository).findById(productId);
        verify(authService).getCurrentUser(true);
    }

    @Test
    void getProductById_WhenProductExistsAndUserIsAdmin_ShouldReturnProductWithoutAccessCheck() {
        // Given
        String productId = "P001";
        FamilyProduct familyProduct = FamilyProduct.builder()
                .id("F001")
                .roleAccess(Set.of(FamilyProductRoleAccess.builder()
                        .projectId("PRJ001").role(UserProjectGroupRole.MONITOR).build()))
                .build();

        Product product = Product.builder()
                .id(productId)
                .name("Test Product")
                .active(true)
                .familyProduct(familyProduct)
                .build();

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(permissionCheck.hasPermission(PermissionResource.PRODUCT, PermissionAction.UPDATE)).thenReturn(true);

        // When
        Product result = productService.getProductById(productId);

        // Then
        assertEquals(product, result);
        verify(productRepository).findById(productId);
        verify(permissionCheck).hasPermission(PermissionResource.PRODUCT, PermissionAction.UPDATE);
        verify(authService, never()).getCurrentUser(anyBoolean()); // Access check is skipped for admins
    }

    @Test
    void getProductById_WhenProductDoesNotExist_ShouldThrowException() {
        // Given
        String productId = "NONEXISTENT";

        when(productRepository.findById(productId)).thenReturn(Optional.empty());

        // When & Then
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> productService.getProductById(productId));
        assertEquals("Product not found", exception.getMessage());
        verify(productRepository).findById(productId);
        // Note: checkAccess is not called when product doesn't exist
    }

    @Test
    void getProductById_WhenProductHasFamilyAndUserHasAccess_ShouldReturnProduct() {
        // Given
        String productId = "P001";
        FamilyProduct familyProduct = FamilyProduct.builder()
                .id("F001")
                .roleAccess(Set.of(FamilyProductRoleAccess.builder()
                        .projectId("PRJ001").role(UserProjectGroupRole.MONITOR).build()))
                .build();

        Product product = Product.builder()
                .id(productId)
                .name("Test Product")
                .active(true)
                .familyProduct(familyProduct)
                .build();

        Project project = Project.builder().id("PRJ001").build();
        ProjectGroup projectGroup = ProjectGroup.builder().id("PG001").project(project).build();
        UserProjectGroup groupRole = UserProjectGroup.builder()
                .projectGroup(projectGroup)
                .role(UserProjectGroupRole.MONITOR)
                .build();
        User user = User.builder()
                .id("U001")
                .groupRoles(Set.of(groupRole))
                .build();

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(authService.getCurrentUser(true)).thenReturn(user);
        when(permissionCheck.hasPermission(PermissionResource.PRODUCT, PermissionAction.UPDATE)).thenReturn(false);
        when(permissionCheck.hasPermission(PermissionResource.PRODUCT, PermissionAction.CREATE)).thenReturn(false);

        // When
        Product result = productService.getProductById(productId);

        // Then
        assertEquals(product, result);
        verify(productRepository).findById(productId);
        verify(authService).getCurrentUser(true);
    }

    @Test
    void getProductById_WhenProductHasFamilyAndUserDoesNotHaveAccess_ShouldThrowException() {
        // Given
        String productId = "P001";
        FamilyProduct familyProduct = FamilyProduct.builder()
                .id("F001")
                .roleAccess(Set.of(FamilyProductRoleAccess.builder()
                        .projectId("PRJ001").role(UserProjectGroupRole.MONITOR).build()))
                .build();

        Product product = Product.builder()
                .id(productId)
                .name("Test Product")
                .active(true)
                .familyProduct(familyProduct)
                .build();

        Project otherProject = Project.builder().id("PRJ002").build();
        ProjectGroup otherProjectGroup = ProjectGroup.builder().id("PG002").project(otherProject).build();
        UserProjectGroup groupRole = UserProjectGroup.builder()
                .projectGroup(otherProjectGroup)
                .role(UserProjectGroupRole.MONITOR)
                .build();
        User user = User.builder()
                .id("U001")
                .groupRoles(Set.of(groupRole))
                .build();

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(authService.getCurrentUser(true)).thenReturn(user);
        when(permissionCheck.hasPermission(PermissionResource.PRODUCT, PermissionAction.UPDATE)).thenReturn(false);
        when(permissionCheck.hasPermission(PermissionResource.PRODUCT, PermissionAction.CREATE)).thenReturn(false);

        // When & Then
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> productService.getProductById(productId));
        assertEquals("Product not found", exception.getMessage());
        verify(productRepository).findById(productId);
        verify(authService).getCurrentUser(true);
    }

    @Test
    void listProducts_ShouldReturnFilteredProducts() {
        // Given
        String name = "test";
        Boolean active = true;
        Pageable pageable = PageRequest.of(0, 10);

        User user = User.builder()
                .id("U001")
                .profiles(Set.of(Profile.builder().id("ADMIN").build()))
                .build();

        List<Product> products = List.of(
                Product.builder().id("P001").name("Test Product 1").active(true).build(),
                Product.builder().id("P002").name("Test Product 2").active(true).build()
        );
        Page<Product> expectedPage = new PageImpl<>(products, pageable, products.size());

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(permissionCheck.hasPermission(PermissionResource.PRODUCT, PermissionAction.UPDATE)).thenReturn(false);
        when(permissionCheck.hasPermission(PermissionResource.PRODUCT, PermissionAction.CREATE)).thenReturn(false);
        doReturn(expectedPage).when(productRepository).findAll(org.mockito.ArgumentMatchers.<Specification<Product>>any(), eq(pageable));

        // When
        Page<Product> result = productService.listProducts(name, active, null, null, null, null, pageable);

        // Then
        assertEquals(expectedPage, result);
        verify(authService).getCurrentUser(true);
        verify(productRepository).findAll(org.mockito.ArgumentMatchers.<Specification<Product>>any(), eq(pageable));
    }

    @Test
    void listProducts_WhenUserIsAdmin_ShouldReturnAllProducts() {
        // Given
        String name = "test";
        Boolean active = null; // Admin can see inactive products too
        Pageable pageable = PageRequest.of(0, 10);

        User user = User.builder()
                .id("U001")
                .profiles(Set.of(Profile.builder().id("ADMIN").build()))
                .build();

        List<Product> products = List.of(
                Product.builder().id("P001").name("Test Product 1").active(true).build(),
                Product.builder().id("P002").name("Test Product 2").active(false).build()
        );
        Page<Product> expectedPage = new PageImpl<>(products, pageable, products.size());

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(permissionCheck.hasPermission(PermissionResource.PRODUCT, PermissionAction.UPDATE)).thenReturn(true);
        doReturn(expectedPage).when(productRepository).findAll(org.mockito.ArgumentMatchers.<Specification<Product>>any(), eq(pageable));

        // When
        Page<Product> result = productService.listProducts(name, active, null, null, null, null, pageable);

        // Then
        assertEquals(expectedPage, result);
        verify(authService).getCurrentUser(true);
        verify(permissionCheck).hasPermission(PermissionResource.PRODUCT, PermissionAction.UPDATE);
        verify(productRepository).findAll(org.mockito.ArgumentMatchers.<Specification<Product>>any(), eq(pageable));
    }

    @Test
    void createProduct_WhenValidData_ShouldCreateAndReturnProduct() {
        // Given
        String name = "New Product";
        String familyProductId = null;

        User user = User.builder()
                .id("U001")
                .profiles(Set.of(Profile.builder().id("ADMIN").build()))
                .build();

        Product expectedProduct = Product.builder()
                .name(name)
                .active(true)
                .basePrice(BigDecimal.valueOf(10.00))
                .options(new ArrayList<>())
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.existsByName(name)).thenReturn(false);
        when(productRepository.save(any(Product.class))).thenReturn(expectedProduct);

        // When
        Product result = productService.createProduct(name, familyProductId, BigDecimal.valueOf(10.00), new ArrayList<>(), new ArrayList<>(), null, null);


        // Then
        assertEquals(expectedProduct, result);
        verify(authService).getCurrentUser(true);
        verify(productRepository).existsByName(name);
        verify(productRepository).save(any(Product.class));
    }

    @Test
    void createProduct_WhenNameAlreadyExists_ShouldThrowException() {
        // Given
        String name = "Existing Product";

        User user = User.builder()
                .id("U001")
                .profiles(Set.of(Profile.builder().id("ADMIN").build()))
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.existsByName(name)).thenReturn(true);

        // When & Then
        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> productService.createProduct(name, null, BigDecimal.valueOf(10.00), new ArrayList<>(), new ArrayList<>(), null, null));
        assertEquals("Product name already exists", exception.getMessage());
        verify(authService).getCurrentUser(true);
        verify(productRepository).existsByName(name);
        verify(productRepository, never()).save(any());
    }

    @Test
        void createProduct_WhenNoFamilyProduct_ShouldCreateProduct() {
        // Given
        String name = "New Product";

        User user = User.builder()
                .id("U001")
                .profiles(Set.of(Profile.builder().id("ADMIN").build()))
                .build();

        Product expectedProduct = Product.builder()
                .name(name)
                .active(true)
                .basePrice(BigDecimal.valueOf(10.00))
                .options(new ArrayList<>())
                .images(new ArrayList<>())
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.existsByName(name)).thenReturn(false);
        when(productRepository.save(any(Product.class))).thenReturn(expectedProduct);

        // When & Then
        Product result = productService.createProduct(name, null, BigDecimal.valueOf(10.00), new ArrayList<>(), new ArrayList<>(), null, null);
        assertNotNull(result);
                verify(authService).getCurrentUser(true);
                verify(productRepository).existsByName(name);
                verify(productRepository).save(any());
        }

    @Test
    void updateProduct_WhenValidData_ShouldUpdateAndReturnProduct() {
        // Given
        String productId = "P001";
        String newName = "Updated Product";
        Boolean newActive = false;

        Product existingProduct = Product.builder()
                .id(productId)
                .name("Old Product")
                .active(true)
                .build();

        User user = User.builder()
                .id("U001")
                .profiles(Set.of(Profile.builder().id("ADMIN").build()))
                .build();

        Product updatedProduct = Product.builder()
                .id(productId)
                .name(newName)
                .active(newActive)
                .build();

        when(productRepository.findById(productId)).thenReturn(Optional.of(existingProduct));
        when(authService.getCurrentUser(true)).thenReturn(user);
        when(permissionCheck.hasPermission(PermissionResource.PRODUCT, PermissionAction.UPDATE)).thenReturn(false);
        when(permissionCheck.hasPermission(PermissionResource.PRODUCT, PermissionAction.CREATE)).thenReturn(false);
        when(productRepository.existsByName(newName)).thenReturn(false);
        when(productRepository.save(any(Product.class))).thenReturn(updatedProduct);

        // When
        Product result = productService.updateProduct(productId, newName, newActive, null, null, null, null, null, null);

        // Then
        assertEquals(updatedProduct, result);
        verify(productRepository).findById(productId);
        verify(authService).getCurrentUser(true);
        verify(productRepository).existsByName(newName);
        verify(productRepository).save(any(Product.class));
    }

    @Test
    void updateProduct_WhenNewNameAlreadyExists_ShouldThrowException() {
        // Given
        String productId = "P001";
        String newName = "Existing Product";

        Product existingProduct = Product.builder()
                .id(productId)
                .name("Old Product")
                .active(true)
                .build();

        User user = User.builder()
                .id("U001")
                .profiles(Set.of(Profile.builder().id("ADMIN").build()))
                .build();

        when(productRepository.findById(productId)).thenReturn(Optional.of(existingProduct));
        when(authService.getCurrentUser(true)).thenReturn(user);
        when(permissionCheck.hasPermission(PermissionResource.PRODUCT, PermissionAction.UPDATE)).thenReturn(false);
        when(permissionCheck.hasPermission(PermissionResource.PRODUCT, PermissionAction.CREATE)).thenReturn(false);
        when(productRepository.existsByName(newName)).thenReturn(true);

        // When & Then
        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> productService.updateProduct(productId, newName, null, null, null, null, null, null, null));
        assertEquals("Product name already exists", exception.getMessage());
        verify(productRepository).findById(productId);
        verify(authService).getCurrentUser(true);
        verify(productRepository).existsByName(newName);
        verify(productRepository, never()).save(any());
    }

    @Test
    void updateProduct_WhenSameName_ShouldAllowUpdate() {
        // Given
        String productId = "P001";
        String sameName = "Same Product";
        Boolean newActive = false;

        Product existingProduct = Product.builder()
                .id(productId)
                .name(sameName)
                .active(true)
                .build();

        User user = User.builder()
                .id("U001")
                .profiles(Set.of(Profile.builder().id("ADMIN").build()))
                .build();

        Product updatedProduct = Product.builder()
                .id(productId)
                .name(sameName)
                .active(newActive)
                .build();

        when(productRepository.findById(productId)).thenReturn(Optional.of(existingProduct));
        when(authService.getCurrentUser(true)).thenReturn(user);
        // Since name is the same, existsByName should not be called
        when(productRepository.save(any(Product.class))).thenReturn(updatedProduct);

        // When
        Product result = productService.updateProduct(productId, sameName, newActive, null, null, null, null, null, null);

        // Then
        assertEquals(updatedProduct, result);
        verify(productRepository).findById(productId);
        verify(authService).getCurrentUser(true);
        verify(productRepository, never()).existsByName(any());
        verify(productRepository).save(any(Product.class));
    }

    @Test
    void updateProduct_WhenOnlyActiveUpdated_ShouldUpdateProduct() {
        // Given
        String productId = "P001";
        Boolean newActive = false;

        Product existingProduct = Product.builder()
                .id(productId)
                .name("Test Product")
                .active(true)
                .build();

        User user = User.builder()
                .id("U001")
                .profiles(Set.of(Profile.builder().id("ADMIN").build()))
                .build();

        Product updatedProduct = Product.builder()
                .id(productId)
                .name("Test Product")
                .active(newActive)
                .build();

        when(productRepository.findById(productId)).thenReturn(Optional.of(existingProduct));
        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.save(any(Product.class))).thenReturn(updatedProduct);

        // When
        Product result = productService.updateProduct(productId, null, newActive, null, null, null, null, null, null);

        // Then
        assertEquals(updatedProduct, result);
        verify(productRepository).findById(productId);
        verify(authService).getCurrentUser(true);
        verify(productRepository, never()).existsByName(any());
        verify(productRepository).save(any(Product.class));
    }

    @Test
    void deleteProduct_WhenProductExists_ShouldDeleteProduct() {
        // Given
        String productId = "P001";
        Product existingProduct = Product.builder()
                .id(productId)
                .name("Test Product")
                .active(true)
                .build();

        User user = User.builder()
                .id("U001")
                .profiles(Set.of(Profile.builder().id("ADMIN").build()))
                .build();

        when(productRepository.findById(productId)).thenReturn(Optional.of(existingProduct));
        when(authService.getCurrentUser(true)).thenReturn(user);
        when(permissionCheck.hasPermission(PermissionResource.PRODUCT, PermissionAction.UPDATE)).thenReturn(false);
        when(permissionCheck.hasPermission(PermissionResource.PRODUCT, PermissionAction.CREATE)).thenReturn(false);

        // When
        productService.deleteProduct(productId);

        // Then
        verify(productRepository).findById(productId);
        verify(authService).getCurrentUser(true);
        verify(productRepository).delete(existingProduct);
    }

    @Test
    void deleteProduct_WhenProductDoesNotExist_ShouldThrowException() {
        // Given
        String productId = "NONEXISTENT";

        when(productRepository.findById(productId)).thenReturn(Optional.empty());

        // When & Then
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> productService.deleteProduct(productId));
        assertEquals("Product not found", exception.getMessage());
        verify(productRepository).findById(productId);
        // Note: checkAccess is not called when product doesn't exist
    }

        @Test
        void listProductsForProject_ShouldReturnProjectProducts() {
                // Given
                String projectId = "PRJ001";
                Pageable pageable = PageRequest.of(0, 10);
                List<Product> products = List.of(
                                Product.builder().id("P001").name("Project Product 1").projectId(projectId).active(true).build()
                );
                Page<Product> expectedPage = new PageImpl<>(products, pageable, products.size());

                doReturn(expectedPage).when(productRepository)
                                .findAll(org.mockito.ArgumentMatchers.<Specification<Product>>any(), eq(pageable));

                // When
                Page<Product> result = productService.listProductsForProject(projectId, null, true, pageable);

                // Then
                assertEquals(expectedPage, result);
                verify(productRepository).findAll(org.mockito.ArgumentMatchers.<Specification<Product>>any(), eq(pageable));
        }

    // ── calculatePrice tests ──────────────────────────────────────────────────

    @Test
    void calculatePrice_WithNullConfiguration_ShouldReturnBasePrice() {
        Product product = Product.builder().basePrice(new BigDecimal("25.00")).build();
        assertEquals(new BigDecimal("25.00"), productService.calculatePrice(product, null));
    }

    @Test
    void calculatePrice_WithBlankConfiguration_ShouldReturnBasePrice() {
        Product product = Product.builder().basePrice(new BigDecimal("25.00")).build();
        assertEquals(new BigDecimal("25.00"), productService.calculatePrice(product, "   "));
    }

    @Test
    void calculatePrice_WithInvalidJson_ShouldReturnBasePrice() throws Exception {
        Product product = Product.builder()
                .basePrice(new BigDecimal("25.00"))
                .options(List.of())
                .build();
        when(objectMapper.readValue(anyString(), eq(java.util.Map.class)))
                .thenThrow(new com.fasterxml.jackson.core.JsonProcessingException("bad") {});
        assertEquals(new BigDecimal("25.00"), productService.calculatePrice(product, "{bad"));
    }

    @Test
    void calculatePrice_WithNoOptions_ShouldReturnBasePrice() throws Exception {
        Product product = Product.builder()
                .basePrice(new BigDecimal("25.00"))
                .options(List.of())
                .build();
        when(objectMapper.readValue(anyString(), eq(java.util.Map.class)))
                .thenReturn(java.util.Map.of("Color", "red"));
        assertEquals(new BigDecimal("25.00"), productService.calculatePrice(product, "{\"Color\":\"red\"}"));
    }

    @Test
    void calculatePrice_WithOptionPrice_ShouldAddOptionPrice() throws Exception {
        ProductOption colorOption = ProductOption.builder()
                .name("Color")
                .type("text_input")
                .price(new BigDecimal("5.00"))
                .build();
        Product product = Product.builder()
                .basePrice(new BigDecimal("25.00"))
                .options(List.of(colorOption))
                .build();
        when(objectMapper.readValue(anyString(), eq(java.util.Map.class)))
                .thenReturn(java.util.Map.of("Color", "red"));
        assertEquals(new BigDecimal("30.00"), productService.calculatePrice(product, "{\"Color\":\"red\"}"));
    }

    static Stream<Arguments> selectOptionPriceProvider() {
        return Stream.of(
                Arguments.of("xl", new BigDecimal("28.00")),
                Arguments.of("Extra Large", new BigDecimal("28.00")),
                Arguments.of("xxl", new BigDecimal("25.00"))
        );
    }

    @ParameterizedTest(name = "selectedValue={0} => expectedTotal={1}")
    @MethodSource("selectOptionPriceProvider")
    void calculatePrice_WithSelectOption_ShouldComputePrice(String selectedValue, BigDecimal expectedTotal) throws Exception {
        OptionValue xlValue = OptionValue.builder()
                .id("xl")
                .label("Extra Large")
                .price(new BigDecimal("3.00"))
                .build();
        ProductOption sizeOption = ProductOption.builder()
                .name("Size")
                .type("select")
                .values(List.of(xlValue))
                .price(null)
                .build();
        Product product = Product.builder()
                .basePrice(new BigDecimal("25.00"))
                .options(List.of(sizeOption))
                .build();
        when(objectMapper.readValue(anyString(), eq(java.util.Map.class)))
                .thenReturn(java.util.Map.of("Size", selectedValue));
        assertEquals(expectedTotal, productService.calculatePrice(product, "{\"Size\":\"" + selectedValue + "\"}"));
    }

    @Test
    void calculatePrice_WithSelectOptionNullValuePrice_ShouldNotAddValuePrice() throws Exception {
        OptionValue xlValue = OptionValue.builder()
                .id("xl")
                .label("Extra Large")
                .price(null)
                .build();
        ProductOption sizeOption = ProductOption.builder()
                .name("Size")
                .type("select")
                .values(List.of(xlValue))
                .price(null)
                .build();
        Product product = Product.builder()
                .basePrice(new BigDecimal("25.00"))
                .options(List.of(sizeOption))
                .build();
        when(objectMapper.readValue(anyString(), eq(java.util.Map.class)))
                .thenReturn(java.util.Map.of("Size", "xl"));
        assertEquals(new BigDecimal("25.00"), productService.calculatePrice(product, "{\"Size\":\"xl\"}"));
    }

    @Test
    void calculatePrice_WithOptionNotInConfig_ShouldSkipIt() throws Exception {
        ProductOption colorOption = ProductOption.builder()
                .name("Color")
                .type("text_input")
                .price(new BigDecimal("5.00"))
                .build();
        Product product = Product.builder()
                .basePrice(new BigDecimal("25.00"))
                .options(List.of(colorOption))
                .build();
        when(objectMapper.readValue(anyString(), eq(java.util.Map.class)))
                .thenReturn(java.util.Map.of("Size", "xl"));
        assertEquals(new BigDecimal("25.00"), productService.calculatePrice(product, "{\"Size\":\"xl\"}"));
    }

    // ── formatConfiguration tests ─────────────────────────────────────────────

    static Stream<Arguments> nullOrBlankOrEmptyJsonProvider() {
        return Stream.of(
                Arguments.of((Object) null),
                Arguments.of("  "),
                Arguments.of("{}")
        );
    }

    @ParameterizedTest(name = "json={0}")
    @MethodSource("nullOrBlankOrEmptyJsonProvider")
    void formatConfiguration_WithNullOrBlankOrEmptyJson_ShouldReturnNull(String json) {
        Product product = Product.builder().options(List.of()).build();
        assertNull(productService.formatConfiguration(json, product));
    }

    @Test
    void formatConfiguration_WithInvalidJson_ShouldReturnRawJson() throws Exception {
        when(objectMapper.readValue(anyString(), eq(java.util.Map.class)))
                .thenThrow(new com.fasterxml.jackson.core.JsonProcessingException("bad") {});
        Product product = Product.builder().options(List.of()).build();
        assertEquals("{bad", productService.formatConfiguration("{bad", product));
    }

    @Test
    void formatConfiguration_WithNullProduct_ShouldReturnNull() throws Exception {
        when(objectMapper.readValue(anyString(), eq(java.util.Map.class)))
                .thenReturn(java.util.Map.of("Color", "red"));
        assertNull(productService.formatConfiguration("{\"Color\":\"red\"}", null));
    }

    @Test
    void formatConfiguration_WithEmptyConfig_ShouldReturnNull() throws Exception {
        when(objectMapper.readValue(anyString(), eq(java.util.Map.class)))
                .thenReturn(java.util.Map.of());
        Product product = Product.builder().options(List.of()).build();
        assertNull(productService.formatConfiguration("{\"x\":\"y\"}", product));
    }

    @Test
    void formatConfiguration_WithTextOption_ShouldReturnFormattedString() throws Exception {
        ProductOption notesOption = ProductOption.builder()
                .name("Notes")
                .type("text_input")
                .build();
        Product product = Product.builder().options(List.of(notesOption)).build();
        when(objectMapper.readValue(anyString(), eq(java.util.Map.class)))
                .thenReturn(java.util.Map.of("Notes", "My Note"));
        assertEquals("Notes: My Note", productService.formatConfiguration("{\"Notes\":\"My Note\"}", product));
    }

    @Test
    void formatConfiguration_WithBlankTextValue_ShouldFilterOut() throws Exception {
        ProductOption notesOption = ProductOption.builder()
                .name("Notes")
                .type("text_input")
                .build();
        Product product = Product.builder().options(List.of(notesOption)).build();
        java.util.Map<String, Object> config = new java.util.LinkedHashMap<>();
        config.put("Notes", "");
        when(objectMapper.readValue(anyString(), eq(java.util.Map.class))).thenReturn(config);
        assertNull(productService.formatConfiguration("{\"Notes\":\"\"}", product));
    }

    @Test
    void formatConfiguration_WithSelectOption_ShouldShowLabel() throws Exception {
        OptionValue xlValue = OptionValue.builder().id("xl").label("Extra Large").build();
        ProductOption sizeOption = ProductOption.builder()
                .name("Size")
                .type("select")
                .values(List.of(xlValue))
                .build();
        Product product = Product.builder().options(List.of(sizeOption)).build();
        when(objectMapper.readValue(anyString(), eq(java.util.Map.class)))
                .thenReturn(java.util.Map.of("Size", "xl"));
        assertEquals("Size: Extra Large", productService.formatConfiguration("{\"Size\":\"xl\"}", product));
    }

    @Test
    void formatConfiguration_WithSelectOptionInvalidValue_ShouldFilterOut() throws Exception {
        OptionValue xlValue = OptionValue.builder().id("xl").label("Extra Large").build();
        ProductOption sizeOption = ProductOption.builder()
                .name("Size")
                .type("select")
                .values(List.of(xlValue))
                .build();
        Product product = Product.builder().options(List.of(sizeOption)).build();
        when(objectMapper.readValue(anyString(), eq(java.util.Map.class)))
                .thenReturn(java.util.Map.of("Size", "xxl"));
        assertNull(productService.formatConfiguration("{\"Size\":\"xxl\"}", product));
    }

    @Test
    void formatConfiguration_WithUnknownOption_ShouldFilterOut() throws Exception {
        Product product = Product.builder().options(List.of()).build();
        when(objectMapper.readValue(anyString(), eq(java.util.Map.class)))
                .thenReturn(java.util.Map.of("FakeOption", "value"));
        assertNull(productService.formatConfiguration("{\"FakeOption\":\"value\"}", product));
    }

    @Test
    void formatConfiguration_WithNullValue_ShouldFilterOut() throws Exception {
        ProductOption notesOption = ProductOption.builder()
                .name("Notes")
                .type("text_input")
                .build();
        Product product = Product.builder().options(List.of(notesOption)).build();
        java.util.Map<String, Object> config = new java.util.LinkedHashMap<>();
        config.put("Notes", null);
        when(objectMapper.readValue(anyString(), eq(java.util.Map.class))).thenReturn(config);
        assertNull(productService.formatConfiguration("{\"Notes\":null}", product));
    }

    @Test
    void formatConfiguration_WithSelectOptionNoMatchFallsBackToRaw() throws Exception {
        ProductOption unknownOption = ProductOption.builder()
                .name("Custom")
                .type("text_input")
                .build();
        Product product = Product.builder().options(List.of(unknownOption)).build();
        when(objectMapper.readValue(anyString(), eq(java.util.Map.class)))
                .thenReturn(java.util.Map.of("Custom", "hello"));
        assertEquals("Custom: hello", productService.formatConfiguration("{\"Custom\":\"hello\"}", product));
    }
}
