package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.service.ProfileService;
import es.yambo_alco.web.util.PermissionCheckService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Roles have been renamed to profiles; these tests cover the ProfileController endpoints
 * that replaced the former RoleController.
 */
@WebMvcTest(controllers = ProfileController.class)
@Import(TestSecurityConfig.class)
class RoleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProfileService profileService;

    @MockitoBean
    private PermissionCheckService permissionCheckService;

    @Test
    @WithMockUser
    void getAllProfiles_ShouldReturnProfileList() throws Exception {
        Profile profile = Profile.builder()
                .id("PROFILE001")
                .name("Admin")
                .build();

        when(permissionCheckService.hasPermission(anyString(), anyString())).thenReturn(true);
        when(profileService.getAllProfiles()).thenReturn(List.of(profile));

        mockMvc.perform(get("/admin/profiles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("PROFILE001"))
                .andExpect(jsonPath("$[0].name").value("Admin"));
    }

    @Test
    @WithMockUser
    void getAllProfiles_WhenNoProfiles_ShouldReturnEmptyList() throws Exception {
        when(permissionCheckService.hasPermission(anyString(), anyString())).thenReturn(true);
        when(profileService.getAllProfiles()).thenReturn(List.of());

        mockMvc.perform(get("/admin/profiles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void getAllProfiles_WithoutAuth_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/admin/profiles"))
                .andExpect(status().isForbidden());
    }
}
