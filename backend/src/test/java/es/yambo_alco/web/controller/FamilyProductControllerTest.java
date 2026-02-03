package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.FamilyProduct;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.Project;
import es.yambo_alco.web.service.FamilyProductService;
import es.yambo_alco.web.util.PermissionCheckService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = FamilyProductController.class)
@Import(TestSecurityConfig.class)
@SuppressWarnings("null")
class FamilyProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FamilyProductService familyProductService;

    @MockitoBean
    private PermissionCheckService permissionCheckService;

    @BeforeEach
    void setUp() {
        when(permissionCheckService.hasPermission(anyString(), anyString())).thenReturn(true);
    }

    @Test
    @WithMockUser
    void createFamilyProduct_WithStartAndEnd_ShouldReturnCreated() throws Exception {
        LocalDateTime start = LocalDateTime.now().minusDays(1);
        LocalDateTime end = LocalDateTime.now().plusDays(10);

        FamilyProduct familyProduct = FamilyProduct.builder()
                .id("FAM001")
                .name("Drop")
                .startTms(start)
                .endTms(end)
                .profile(Profile.builder().id("BASIC").build())
                .projects(Set.of(Project.builder().id("PRJ001").build()))
                .build();

        when(familyProductService.createFamilyProduct(anyString(), any(LocalDateTime.class), any(LocalDateTime.class), any()))
                .thenReturn(familyProduct);

        String payload = """
                {
                    "name": "Drop",
                    "startTms": "2026-01-01T10:00:00",
                    "endTms": "2026-02-01T10:00:00",
                    "projectIds": ["PRJ001"]
                }
                """;

        mockMvc.perform(post("/family-products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("FAM001"))
                .andExpect(jsonPath("$.startTms").exists())
                .andExpect(jsonPath("$.endTms").exists())
                .andExpect(jsonPath("$.profileId").value("BASIC"))
                .andExpect(jsonPath("$.projectIds[0]").value("PRJ001"));
    }

    @Test
    @WithMockUser
    void updateFamilyProduct_WithStartAndEnd_ShouldReturnOk() throws Exception {
        LocalDateTime start = LocalDateTime.now().minusDays(2);
        LocalDateTime end = LocalDateTime.now().plusDays(2);

        FamilyProduct familyProduct = FamilyProduct.builder()
                .id("FAM001")
                .name("Drop Updated")
                .startTms(start)
                .endTms(end)
                .build();

        when(familyProductService.updateFamilyProduct(anyString(), any(), any(), any(), any()))
                .thenReturn(familyProduct);

        String payload = """
                {
                    "name": "Drop Updated",
                    "startTms": "2026-01-02T10:00:00",
                    "endTms": "2026-02-02T10:00:00"
                }
                """;

        mockMvc.perform(put("/family-products/FAM001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Drop Updated"))
                .andExpect(jsonPath("$.startTms").exists())
                .andExpect(jsonPath("$.endTms").exists());
    }
}
