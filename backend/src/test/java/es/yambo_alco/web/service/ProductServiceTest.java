package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.FamilyProduct;
import es.yambo_alco.web.model.Product;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.ProductRepository;
import es.yambo_alco.web.repository.ProjectRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

        @Mock
        private ProjectRepository projectRepository;

    @Mock
    private AuthService authService;

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

        // When
        Product result = productService.getProductById(productId);

        // Then
        assertEquals(product, result);
        verify(productRepository).findById(productId);
        verify(authService).getCurrentUser(true);
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
        Profile adminProfile = Profile.builder().id("ADMIN").build();
        FamilyProduct familyProduct = FamilyProduct.builder()
                .id("F001")
                .profiles(Set.of(adminProfile))
                .build();

        Product product = Product.builder()
                .id(productId)
                .name("Test Product")
                .active(true)
                .familyProduct(familyProduct)
                .build();

        User user = User.builder()
                .id("U001")
                .profiles(Set.of(adminProfile))
                .build();

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(authService.getCurrentUser(true)).thenReturn(user);

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
        Profile adminProfile = Profile.builder().id("ADMIN").build();
        Profile userProfile = Profile.builder().id("USER").build();
        FamilyProduct familyProduct = FamilyProduct.builder()
                .id("F001")
                .profiles(Set.of(adminProfile))
                .build();

        Product product = Product.builder()
                .id(productId)
                .name("Test Product")
                .active(true)
                .familyProduct(familyProduct)
                .build();

        User user = User.builder()
                .id("U001")
                .profiles(Set.of(userProfile))
                .build();

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(authService.getCurrentUser(true)).thenReturn(user);

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
        doReturn(expectedPage).when(productRepository).findAll(org.mockito.ArgumentMatchers.<Specification<Product>>any(), eq(pageable));

        // When
        Page<Product> result = productService.listProducts(name, active, pageable);

        // Then
        assertEquals(expectedPage, result);
        verify(authService).getCurrentUser(true);
        verify(productRepository).findAll(org.mockito.ArgumentMatchers.<Specification<Product>>any(), eq(pageable));
    }

    @Test
    void createProduct_WhenValidData_ShouldCreateAndReturnProduct() {
        // Given
        String name = "New Product";
        String projectId = "PRJ001";
        String familyProductId = null;

        User user = User.builder()
                .id("U001")
                .profiles(Set.of(Profile.builder().id("ADMIN").build()))
                .build();

        Product expectedProduct = Product.builder()
                .name(name)
                .projectId(projectId)
                .active(true)
                .basePrice(BigDecimal.valueOf(10.00))
                .options(new ArrayList<>())
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.existsByName(name)).thenReturn(false);
        when(projectRepository.existsById(projectId)).thenReturn(true);
        when(productRepository.save(any(Product.class))).thenReturn(expectedProduct);

        // When
        Product result = productService.createProduct(name, projectId, familyProductId, BigDecimal.valueOf(10.00), new ArrayList<>(), new ArrayList<>());


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
        String projectId = "PRJ001";

        User user = User.builder()
                .id("U001")
                .profiles(Set.of(Profile.builder().id("ADMIN").build()))
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.existsByName(name)).thenReturn(true);

        // When & Then
        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> productService.createProduct(name, projectId, null, BigDecimal.valueOf(10.00), new ArrayList<>(), new ArrayList<>()));
        assertEquals("Product name already exists", exception.getMessage());
        verify(authService).getCurrentUser(true);
        verify(productRepository).existsByName(name);
        verify(productRepository, never()).save(any());
    }

    @Test
    void createProduct_WhenProjectDoesNotExist_ShouldThrowException() {
        // Given
        String name = "New Product";
        String projectId = "PRJ404";

        User user = User.builder()
                .id("U001")
                .profiles(Set.of(Profile.builder().id("ADMIN").build()))
                .build();

        when(authService.getCurrentUser(true)).thenReturn(user);
        when(productRepository.existsByName(name)).thenReturn(false);
        when(projectRepository.existsById(projectId)).thenReturn(false);

        // When & Then
        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> productService.createProduct(name, projectId, null, BigDecimal.valueOf(10.00), new ArrayList<>(), new ArrayList<>()));
        assertEquals("Project not found", exception.getMessage());
        verify(authService).getCurrentUser(true);
        verify(productRepository).existsByName(name);
        verify(projectRepository).existsById(projectId);
        verify(productRepository, never()).save(any());
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
        when(productRepository.existsByName(newName)).thenReturn(false);
        when(productRepository.save(any(Product.class))).thenReturn(updatedProduct);

        // When
        Product result = productService.updateProduct(productId, newName, newActive, null, null, null, null, null);

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
        when(productRepository.existsByName(newName)).thenReturn(true);

        // When & Then
        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> productService.updateProduct(productId, newName, null, null, null, null, null, null));
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
        Product result = productService.updateProduct(productId, sameName, newActive, null, null, null, null, null);

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
        Product result = productService.updateProduct(productId, null, newActive, null, null, null, null, null);

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
}