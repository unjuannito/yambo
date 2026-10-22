package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.Product;
import es.yambo_alco.web.model.ProductOption;
import es.yambo_alco.web.service.ProductService;
import es.yambo_alco.web.util.PermissionCheckService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ProductController.class)
@Import(TestSecurityConfig.class)
@SuppressWarnings("null")
class ProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProductService productService;

    @MockitoBean
    private PermissionCheckService permissionCheckService;

    @BeforeEach
    void setUp() {
        when(permissionCheckService.hasPermission(anyString(), anyString())).thenReturn(true);
    }

    @Test
    @WithMockUser
    void createProduct_WithPermission_ShouldCreateProduct() throws Exception {
        Product product = Product.builder()
                .id("PROD001")
                .name("Merch 1")
                .active(true)
                .basePrice(BigDecimal.TEN)
                .options(List.of())
                .images(List.of("img.png"))
                .build();

        when(productService.createProduct(eq("Merch 1"), eq("FAM001"), eq(BigDecimal.TEN), any(), any(), any(), any()))
                .thenReturn(product);

        String payload = """
                {
                    "name": "Merch 1",
                    "familyProductId": "FAM001",
                    "basePrice": 10.00,
                    "options": [],
                    "images": ["img.png"]
                }
                """;

        mockMvc.perform(post("/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("PROD001"))
                .andExpect(jsonPath("$.basePrice").value(10));
    }

    @Test
    @WithMockUser
    void listProducts_WithAuth_ShouldReturnProducts() throws Exception {
        Product product = Product.builder()
                .id("PROD001")
                .name("Merch 1")
                .active(true)
                .basePrice(BigDecimal.TEN)
                .options(List.of(new ProductOption()))
                .build();

        when(productService.listProducts(eq(null), eq(null), eq(null), eq(null), eq(null), eq(null), any()))
                .thenReturn(new PageImpl<>(List.of(product), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value("PROD001"))
                .andExpect(jsonPath("$.content[0].name").value("Merch 1"));
    }

    @Test
    @WithMockUser
    void getProduct_WithAuth_ShouldReturnProduct() throws Exception {
        Product product = Product.builder()
                .id("PROD001")
                .name("Merch 1")
                .active(true)
                .basePrice(BigDecimal.TEN)
                .build();

        when(productService.getProductById("PROD001")).thenReturn(product);

        mockMvc.perform(get("/products/PROD001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("PROD001"))
                .andExpect(jsonPath("$.name").value("Merch 1"));
    }

    @Test
    @WithMockUser
    void updateProduct_WithPermission_ShouldUpdateProduct() throws Exception {
        Product product = Product.builder()
                .id("PROD001")
                .name("Merch Updated")
                .active(false)
                .basePrice(BigDecimal.valueOf(12))
                .build();

        when(productService.updateProduct(eq("PROD001"), eq("Merch Updated"), eq(false), any(), any(), eq(BigDecimal.valueOf(12)), eq(null), any(), any()))
                .thenReturn(product);

        String payload = """
                {
                    "name": "Merch Updated",
                    "active": false,
                    "basePrice": 12.00,
                                        "familyProductId": null
                }
                """;

        mockMvc.perform(put("/products/PROD001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Merch Updated"))
                .andExpect(jsonPath("$.active").value(false));
    }

    @Test
    @WithMockUser
    void deleteProduct_WithPermission_ShouldReturnNoContent() throws Exception {
        mockMvc.perform(delete("/products/PROD001"))
                .andExpect(status().isNoContent());
    }
}
