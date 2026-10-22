package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.Permission;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.enums.PermissionAction;
import es.yambo_alco.web.model.enums.PermissionResource;
import es.yambo_alco.web.service.ProfileService;
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

import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ProfileController.class)
@Import(TestSecurityConfig.class)
class ProfileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProfileService profileService;

    @MockitoBean
    private PermissionCheckService permissionCheckService;

    @BeforeEach
    void setUp() {
        when(permissionCheckService.hasPermission(anyString(), anyString())).thenReturn(true);
    }

    private Profile createProfile(String id, String name, boolean system) {
        return Profile.builder()
                .id(id)
                .name(name)
                .system(system)
                .permissions(Set.of(
                        Permission.builder()
                                .id("P001")
                                .resource(PermissionResource.USER)
                                .action(PermissionAction.READ)
                                .build()
                ))
                .build();
    }

    @Test
    @WithMockUser
    void listProfiles_ShouldReturnPagedResults() throws Exception {
        Profile profile = createProfile("ADMIN", "Administrator", true);
        PageImpl<Profile> page = new PageImpl<>(List.of(profile), PageRequest.of(0, 10), 1);
        when(profileService.listProfiles(any(), any(), any(), any(PageRequest.class))).thenReturn(page);

        mockMvc.perform(get("/admin/profiles/list"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].id").value("ADMIN"))
                .andExpect(jsonPath("$.content[0].name").value("Administrator"));
    }

    @Test
    @WithMockUser
    void listProfiles_WithQuery_ShouldFilter() throws Exception {
        Profile profile = createProfile("ADMIN", "Administrator", true);
        PageImpl<Profile> page = new PageImpl<>(List.of(profile), PageRequest.of(0, 10), 1);
        when(profileService.listProfiles(eq("admin"), any(), any(), any(PageRequest.class))).thenReturn(page);

        mockMvc.perform(get("/admin/profiles/list?query=admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value("ADMIN"));
    }

    @Test
    @WithMockUser
    void getAllProfiles_ShouldReturnAll() throws Exception {
        List<Profile> profiles = List.of(
                createProfile("ADMIN", "Administrator", true),
                createProfile("USER", "User", false)
        );
        when(profileService.getAllProfiles()).thenReturn(profiles);

        mockMvc.perform(get("/admin/profiles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value("ADMIN"))
                .andExpect(jsonPath("$[1].id").value("USER"));
    }

    @Test
    @WithMockUser
    void getProfile_ShouldReturnProfile() throws Exception {
        Profile profile = createProfile("ADMIN", "Administrator", true);
        when(profileService.getProfileById("ADMIN")).thenReturn(profile);

        mockMvc.perform(get("/admin/profiles/ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("ADMIN"))
                .andExpect(jsonPath("$.name").value("Administrator"))
                .andExpect(jsonPath("$.system").value(true));
    }

    @Test
    @WithMockUser
    void getAllPermissions_ShouldReturnList() throws Exception {
        List<Permission> permissions = List.of(
                Permission.builder().id("P001").resource(PermissionResource.USER).action(PermissionAction.READ).hasCondition(false).build()
        );
        when(profileService.getAllPermissions()).thenReturn(permissions);

        mockMvc.perform(get("/admin/profiles/permissions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value("P001"))
                .andExpect(jsonPath("$[0].resource").value("user"));
    }

    @Test
    @WithMockUser
    void updateProfilePermissions_ShouldReturnUpdatedProfile() throws Exception {
        Profile updated = createProfile("CUSTOM", "Custom", false);
        when(profileService.updateProfilePermissions("CUSTOM", Set.of("P001"))).thenReturn(updated);

        String requestBody = """
                {
                    "permissionIds": ["P001"]
                }
                """;

        mockMvc.perform(put("/admin/profiles/CUSTOM/permissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("CUSTOM"));
    }

    @Test
    @WithMockUser
    void updateProfile_ShouldReturnUpdatedProfile() throws Exception {
        Profile updated = createProfile("CUSTOM", "Updated Name", false);
        when(profileService.updateProfile("CUSTOM", "Updated Name", Set.of("P001"))).thenReturn(updated);

        String requestBody = """
                {
                    "name": "Updated Name",
                    "permissionIds": ["P001"]
                }
                """;

        mockMvc.perform(put("/admin/profiles/CUSTOM")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Name"));
    }

    @Test
    @WithMockUser
    void createProfile_ShouldReturnCreatedProfile() throws Exception {
        Profile created = createProfile("NEWPRO", "New Profile", false);
        when(profileService.createProfile("New Profile", Set.of("P001"))).thenReturn(created);

        String requestBody = """
                {
                    "name": "New Profile",
                    "permissionIds": ["P001"]
                }
                """;

        mockMvc.perform(post("/admin/profiles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("NEWPRO"))
                .andExpect(jsonPath("$.name").value("New Profile"));
    }

    @Test
    @WithMockUser
    void deleteProfile_ShouldReturnOk() throws Exception {
        mockMvc.perform(delete("/admin/profiles/CUSTOM01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value("Profile deleted successfully"));
    }

    @Test
    @WithMockUser
    void createProfile_WithBlankName_ShouldReturnBadRequest() throws Exception {
        String requestBody = """
                {
                    "name": ""
                }
                """;

        mockMvc.perform(post("/admin/profiles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest());
    }
}
