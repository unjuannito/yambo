package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.SettingsService;
import es.yambo_alco.web.service.UserService;
import es.yambo_alco.web.util.PermissionCheckService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;

@WebMvcTest(AdminUserController.class)
@Import(TestSecurityConfig.class)
@SuppressWarnings("null")
public class AdminUserControllerTest {

        @Autowired
        private MockMvc mockMvc;

        @MockitoBean
        private UserService userService;

        @MockitoBean
        private AuthService authService;

        @MockitoBean
        private PermissionCheckService permissionCheckService;

        @MockitoBean
        private SettingsService settingsService;

        @BeforeEach
        public void setup() {
                when(permissionCheckService.hasPermission(anyString(), anyString())).thenReturn(true);
        }

        @Test
        @WithMockUser(authorities = "LIST_USERS")
        public void listUsers_ok() throws Exception {
                User u = User.builder().id("U0000001").email("a@b.com").name("User")
                                .profiles(Set.of()).enabled(true).build();
                Mockito.when(userService.listUsers(Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
                                Mockito.any(), Mockito.any(PageRequest.class))).thenReturn(new PageImpl<>(List.of(u)));

                mockMvc.perform(get("/admin/users").accept(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk());
        }

        @Test
        @WithMockUser(authorities = "LIST_USERS")
        void listUsers_WithDefaultPagination_ShouldReturnPagedResults() throws Exception {
                // Given
                User user1 = User.builder()
                                .id("U0000001")
                                .email("user1@example.com")
                                .name("User One")
                                .profiles(Set.of(Profile.builder().id("ROLE_USER").build()))
                                .enabled(true)
                                .build();

                User user2 = User.builder()
                                .id("U0000002")
                                .email("user2@example.com")
                                .name("User Two")
                                .profiles(Set.of(Profile.builder().id("ROLE_ADMIN").build()))
                                .enabled(true)
                                .build();

                Page<User> userPage = new PageImpl<>(List.of(user1, user2), PageRequest.of(0, 20), 2);
                when(userService.listUsers(isNull(), isNull(), isNull(), isNull(), isNull(), any(PageRequest.class)))
                                .thenReturn(userPage);

                // When & Then
                mockMvc.perform(get("/admin/users")
                                .header("Authorization", "Bearer test.jwt.token")
                                .accept(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.content", hasSize(2)))
                                .andExpect(jsonPath("$.content[0].email").value("user1@example.com"))
                                .andExpect(jsonPath("$.content[1].email").value("user2@example.com"))
                                .andExpect(jsonPath("$.page.totalElements").value(2))
                                .andExpect(jsonPath("$.page.size").value(20))
                                .andExpect(jsonPath("$.page.number").value(0));

                verify(userService, times(1)).listUsers(isNull(), isNull(), isNull(), isNull(), isNull(),
                                any(PageRequest.class));
        }

        @Test
        @WithMockUser(authorities = "LIST_USERS")
        void listUsers_WithNameFilter_ShouldFilterByName() throws Exception {
                // Given
                User user = User.builder()
                                .id("U0000001")
                                .email("john@example.com")
                                .name("John Doe")
                                .profiles(Set.of())
                                .enabled(true)
                                .build();

                Page<User> userPage = new PageImpl<>(List.of(user), PageRequest.of(0, 20), 1);
                when(userService.listUsers(eq("John"), isNull(), isNull(), isNull(), isNull(), any(PageRequest.class)))
                                .thenReturn(userPage);

                // When & Then
                mockMvc.perform(get("/admin/users")
                                .param("name", "John")
                                .header("Authorization", "Bearer test.jwt.token")
                                .accept(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.content", hasSize(1)))
                                .andExpect(jsonPath("$.content[0].name").value("John Doe"));

                verify(userService, times(1)).listUsers(eq("John"), isNull(), isNull(), isNull(), isNull(),
                                any(PageRequest.class));
        }

        @Test
        @WithMockUser(authorities = "LIST_USERS")
        void listUsers_WithEmailFilter_ShouldFilterByEmail() throws Exception {
                // Given
                User user = User.builder()
                                .id("U0000001")
                                .email("test@example.com")
                                .name("Test User")
                                .profiles(Set.of())
                                .enabled(true)
                                .build();

                Page<User> userPage = new PageImpl<>(List.of(user), PageRequest.of(0, 20), 1);
                when(userService.listUsers(isNull(), eq("test@example.com"), isNull(), isNull(), isNull(),
                                any(PageRequest.class)))
                                .thenReturn(userPage);

                // When & Then
                mockMvc.perform(get("/admin/users")
                                .param("email", "test@example.com")
                                .header("Authorization", "Bearer test.jwt.token")
                                .accept(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.content[0].email").value("test@example.com"));

                verify(userService, times(1)).listUsers(isNull(), eq("test@example.com"), isNull(), isNull(), isNull(),
                                any(PageRequest.class));
        }

        @Test
        @WithMockUser(authorities = "LIST_USERS")
        void listUsers_WithEnabledFilter_ShouldFilterByEnabledStatus() throws Exception {
                // Given
                User enabledUser = User.builder()
                                .id("U0000002")
                                .email("enabled@example.com")
                                .name("Enabled User")
                                .profiles(Set.of())
                                .enabled(true)
                                .build();

                Page<User> userPage = new PageImpl<>(List.of(enabledUser), PageRequest.of(0, 20), 1);
                when(userService.listUsers(isNull(), isNull(), eq(true), isNull(), isNull(), any(PageRequest.class)))
                                .thenReturn(userPage);

                // When & Then
                mockMvc.perform(get("/admin/users")
                                .param("enabled", "true")
                                .header("Authorization", "Bearer test.jwt.token")
                                .accept(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.content[0].enabled").value(true));

                verify(userService, times(1)).listUsers(isNull(), isNull(), eq(true), isNull(), isNull(),
                                any(PageRequest.class));
        }

        @Test
        @WithMockUser(authorities = "LIST_USERS")
        void listUsers_WithPermissionsFilter_ShouldFilterByPermissions() throws Exception {
                // Given
                User user = User.builder()
                                .id("U0000001")
                                .email("admin@example.com")
                                .name("Admin User")
                                .profiles(Set.of())
                                .enabled(true)
                                .build();

                Page<User> userPage = new PageImpl<>(List.of(user), PageRequest.of(0, 20), 1);
                when(userService.listUsers(isNull(), isNull(), isNull(), anyList(), isNull(), any(PageRequest.class)))
                                .thenReturn(userPage);

                // When & Then
                mockMvc.perform(get("/admin/users")
                                .param("permissions", "MANAGE_USERS,LIST_USERS")
                                .header("Authorization", "Bearer test.jwt.token")
                                .accept(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk());

                verify(userService, times(1)).listUsers(isNull(), isNull(), isNull(), anyList(), isNull(),
                                any(PageRequest.class));
        }

        @Test
        @WithMockUser(authorities = "LIST_USERS")
        void listUsers_WithProfilesFilter_ShouldFilterByProfiles() throws Exception {
                // Given
                User user = User.builder()
                                .id("U0000001")
                                .email("admin@example.com")
                                .name("Admin User")
                                .profiles(Set.of(Profile.builder().id("ROLE_ADMIN").build()))
                                .enabled(true)
                                .build();

                Page<User> userPage = new PageImpl<>(List.of(user), PageRequest.of(0, 20), 1);
                when(userService.listUsers(isNull(), isNull(), isNull(), isNull(), anyList(), any(PageRequest.class)))
                                .thenReturn(userPage);

                // When & Then
                mockMvc.perform(get("/admin/users")
                                .param("profiles", "ROLE_ADMIN,ROLE_USER")
                                .header("Authorization", "Bearer test.jwt.token")
                                .accept(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk());

                verify(userService, times(1)).listUsers(isNull(), isNull(), isNull(), isNull(), anyList(),
                                any(PageRequest.class));
        }

        @Test
        @WithMockUser(authorities = "LIST_USERS")
        void listUsers_WithCustomPagination_ShouldRespectPageAndSize() throws Exception {
                // Given
                List<User> users = new ArrayList<>();
                for (int i = 0; i < 10; i++) {
                        users.add(User.builder()
                                        .id("U000000" + i)
                                        .email("user" + i + "@example.com")
                                        .name("User " + i)
                                        .profiles(Set.of())
                                        .enabled(true)
                                        .build());
                }

                Page<User> userPage = new PageImpl<>(users, PageRequest.of(1, 10), 25);
                when(userService.listUsers(isNull(), isNull(), isNull(), isNull(), isNull(), any(PageRequest.class)))
                                .thenReturn(userPage);

                // When & Then
                mockMvc.perform(get("/admin/users")
                                .param("page", "1")
                                .param("size", "10")
                                .header("Authorization", "Bearer test.jwt.token")
                                .accept(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.content", hasSize(10)))
                                .andExpect(jsonPath("$.page.number").value(1))
                                .andExpect(jsonPath("$.page.size").value(10))
                                .andExpect(jsonPath("$.page.totalElements").value(25));
        }

        @Test
        @WithMockUser(authorities = "LIST_USERS")
        void listUsers_WithSortByName_ShouldSortAscending() throws Exception {
                // Given
                User user1 = User.builder()
                                .id("U0000001")
                                .email("alice@example.com")
                                .name("Alice")
                                .profiles(Set.of())
                                .enabled(true)
                                .build();

                User user2 = User.builder()
                                .id("U0000002")
                                .email("bob@example.com")
                                .name("Bob")
                                .profiles(Set.of())
                                .enabled(true)
                                .build();

                PageRequest expectedPageRequest = PageRequest.of(0, 20, Sort.Direction.ASC, "name");
                Page<User> userPage = new PageImpl<>(List.of(user1, user2), expectedPageRequest, 2);
                when(userService.listUsers(isNull(), isNull(), isNull(), isNull(), isNull(), any(PageRequest.class)))
                                .thenReturn(userPage);

                // When & Then
                mockMvc.perform(get("/admin/users")
                                .param("sortBy", "name")
                                .param("direction", "ASC")
                                .header("Authorization", "Bearer test.jwt.token")
                                .accept(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.content[0].name").value("Alice"))
                                .andExpect(jsonPath("$.content[1].name").value("Bob"));
        }

        @Test
        @WithMockUser(authorities = "LIST_USERS")
        void listUsers_WithSortDescending_ShouldSortDescending() throws Exception {
                // Given
                Page<User> userPage = new PageImpl<>(List.of(), PageRequest.of(0, 20, Sort.Direction.DESC, "email"), 0);
                when(userService.listUsers(isNull(), isNull(), isNull(), isNull(), isNull(), any(PageRequest.class)))
                                .thenReturn(userPage);

                // When & Then
                mockMvc.perform(get("/admin/users")
                                .param("sortBy", "email")
                                .param("direction", "DESC")
                                .header("Authorization", "Bearer test.jwt.token")
                                .accept(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk());
        }

        @Test
        @WithMockUser(authorities = "LIST_USERS")
        void listUsers_WithMultipleFilters_ShouldApplyAllFilters() throws Exception {
                // Given
                User user = User.builder()
                                .id("U0000001")
                                .email("admin@example.com")
                                .name("Admin User")
                                .profiles(Set.of(Profile.builder().id("ROLE_ADMIN").build()))
                                .enabled(true)
                                .build();

                Page<User> userPage = new PageImpl<>(List.of(user), PageRequest.of(0, 20), 1);
                when(userService.listUsers(eq("Admin"), eq("admin@example.com"), eq(true), anyList(), anyList(),
                                any(PageRequest.class)))
                                .thenReturn(userPage);

                // When & Then
                mockMvc.perform(get("/admin/users")
                                .param("name", "Admin")
                                .param("email", "admin@example.com")
                                .param("enabled", "true")
                                .param("permissions", "MANAGE_USERS")
                                .param("profiles", "ROLE_ADMIN")
                                .header("Authorization", "Bearer test.jwt.token")
                                .accept(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.content[0].email").value("admin@example.com"));
        }

        @Test
        @WithMockUser(authorities = "LIST_USERS")
        void listUsers_WithEmptyResults_ShouldReturnEmptyPage() throws Exception {
                // Given
                Page<User> emptyPage = new PageImpl<>(List.of(), PageRequest.of(0, 20), 0);
                when(userService.listUsers(isNull(), isNull(), isNull(), isNull(), isNull(), any(PageRequest.class)))
                                .thenReturn(emptyPage);

                // When & Then
                mockMvc.perform(get("/admin/users")
                                .header("Authorization", "Bearer test.jwt.token")
                                .accept(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.content", hasSize(0)))
                                .andExpect(jsonPath("$.page.totalElements").value(0));
        }

        @Test
        @WithMockUser(authorities = "MANAGE_USERS")
        void updateUserProfiles_WithValidData_ShouldReturnUpdatedUser() throws Exception {
                User updatedUser = User.builder()
                                .id("U0000002")
                                .email("user2@example.com")
                                .name("User Two")
                                .profiles(Set.of(
                                                Profile.builder().id("ROLE_USER").name("User").build(),
                                                Profile.builder().id("ROLE_ADMIN").name("Admin").build()))
                                .build();

                when(userService.updateUserProfiles("U0000002", Set.of("ROLE_USER", "ROLE_ADMIN")))
                                .thenReturn(updatedUser);

                String requestBody = """
                                {
                                    "profileIds": ["ROLE_USER", "ROLE_ADMIN"]
                                }
                                """;

                mockMvc.perform(put("/admin/users/profiles?userId=U0000002")
                                .header("Authorization", "Bearer test.jwt.token")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(jsonPath("$.email").value("user2@example.com"))
                                .andExpect(jsonPath("$.profiles.length()").value(2))
                                .andExpect(jsonPath("$.profiles[0].id").exists())
                                .andExpect(jsonPath("$.profiles[1].id").exists());
        }

        @Test
        @WithMockUser(authorities = "MANAGE_USERS")
        void updateUserProfiles_WithEmptyProfiles_ShouldReturnBadRequest() throws Exception {
                String requestBody = """
                                {
                                    "profileIds": []
                                }
                                """;

                mockMvc.perform(put("/admin/users/profiles?userId=2")
                                .header("Authorization", "Bearer test.jwt.token")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isBadRequest());
        }

        @Test
        @WithMockUser(authorities = "MANAGE_USERS")
        void updateProfile_WithValidData_ShouldReturnUpdatedUser() throws Exception {
                User userToUpdate = User.builder()
                                .id("U0000001")
                                .email("old@example.com")
                                .name("Old Name")
                                .profiles(Set.of())
                                .enabled(true)
                                .build();
                User updatedUser = User.builder()
                                .id("U0000001")
                                .email("new@example.com")
                                .name("New Name")
                                .profiles(Set.of())
                                .enabled(true)
                                .build();

                when(userService.getUserById("U0000001")).thenReturn(userToUpdate);
                when(userService.updateProfile("U0000001", "New Name", "new@example.com")).thenReturn(updatedUser);

                String requestBody = """
                                {
                                    "id": "U0000001",
                                    "name": "New Name",
                                    "email": "new@example.com"
                                }
                                """;

                mockMvc.perform(put("/admin/users/profile")
                                .header("Authorization", "Bearer test.jwt.token")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.id").value("U0000001"))
                                .andExpect(jsonPath("$.email").value("new@example.com"))
                                .andExpect(jsonPath("$.name").value("New Name"));
        }

        @Test
        @WithMockUser(authorities = "MANAGE_USERS")
        void deleteUser_ShouldReturnOk() throws Exception {
                // current user must be different from the user being deleted to allow deletion
                User currentUser = User.builder().id("U9999999").build();
                when(authService.getCurrentUser(true)).thenReturn(currentUser);

                mockMvc.perform(delete("/admin/users/U0000001")
                                .header("Authorization", "Bearer test.jwt.token"))
                                .andExpect(status().isOk());
        }

        @Test
        @WithMockUser(authorities = "MANAGE_USERS")
        void deleteUser_SelfDeletion_ShouldReturnBadRequest() throws Exception {
                User currentUser = User.builder().id("U0000001").build();
                when(authService.getCurrentUser(true)).thenReturn(currentUser);

                mockMvc.perform(delete("/admin/users/U0000001")
                                .header("Authorization", "Bearer test.jwt.token"))
                                .andExpect(status().isBadRequest());
        }
}