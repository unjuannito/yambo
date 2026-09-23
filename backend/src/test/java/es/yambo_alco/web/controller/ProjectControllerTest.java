package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.model.Product;
import es.yambo_alco.web.model.Project;
import es.yambo_alco.web.repository.ProjectGroupRepository;
import es.yambo_alco.web.service.ProductService;
import es.yambo_alco.web.service.ProjectService;
import es.yambo_alco.web.util.PermissionCheckService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ProjectController.class)
@Import(TestSecurityConfig.class)
@SuppressWarnings("null")
class ProjectControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProjectService projectService;

    @MockitoBean
    private ProductService productService;

    @MockitoBean
    private ProjectGroupRepository projectGroupRepository;

    @MockitoBean
    private PermissionCheckService permissionCheckService;

    @BeforeEach
    void setUp() {
        when(permissionCheckService.hasPermission(anyString(), anyString())).thenReturn(true);
    }

    @Test
    @WithAnonymousUser
    void listProjects_PublicRead_ShouldReturnProjects() throws Exception {
        Project project = Project.builder().id("PRJ001").name("Project 1").active(true).season("2026").build();
        when(projectService.listProjects(eq(null), eq(null), eq(null), any()))
                .thenReturn(new PageImpl<>(List.of(project), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value("PRJ001"))
                .andExpect(jsonPath("$.content[0].name").value("Project 1"))
                .andExpect(jsonPath("$.content[0].season").value("2026"));
    }

    @Test
    @WithAnonymousUser
    void getProject_PublicRead_ShouldReturnProject() throws Exception {
        Project project = Project.builder().id("PRJ001").name("Project 1").active(true).build();
        when(projectService.getProjectById("PRJ001")).thenReturn(project);

        mockMvc.perform(get("/projects/PRJ001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("PRJ001"))
                .andExpect(jsonPath("$.name").value("Project 1"));
    }

    @Test
    @WithMockUser
    void createProject_WithPermission_ShouldCreateProject() throws Exception {
        Project project = Project.builder().id("PRJ001").name("Project 1").active(true).build();
        when(projectService.createProject(eq("Project 1"), eq(true), eq("2026"), eq(null), eq(null), eq(null), eq(null), eq(null))).thenReturn(project);

        String payload = """
                {
                    "name": "Project 1",
                    "active": true,
                    "season": "2026"
                }
                """;

        mockMvc.perform(post("/projects")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("PRJ001"))
                .andExpect(jsonPath("$.name").value("Project 1"));
    }

    @Test
    @WithAnonymousUser
    void listProjectProducts_PublicRead_ShouldReturnProducts() throws Exception {
        Project project = Project.builder().id("PRJ001").name("Project 1").active(true).build();
        Product product = Product.builder().id("PROD001").name("Merch 1").projectId("PRJ001").active(true).basePrice(BigDecimal.TEN).build();

        when(projectService.getProjectById("PRJ001")).thenReturn(project);
        when(productService.listProductsForProject(eq("PRJ001"), eq(null), eq(true), any()))
                .thenReturn(new PageImpl<>(List.of(product), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/projects/PRJ001/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value("PROD001"))
                .andExpect(jsonPath("$.content[0].projectId").value("PRJ001"))
                .andExpect(jsonPath("$.content[0].basePrice").value(10));
    }

    @Test
    @WithMockUser
    void createProject_WithCoordinationEmail_ShouldPassItAndReturnIt() throws Exception {
        Project project = Project.builder().id("PRJ001").name("Project 1").active(true)
                .coordinationEmail("coord@yambo.es").build();
        when(projectService.createProject(eq("Project 1"), eq(null), eq(null), eq(null), eq(null), eq(null), eq(null),
                eq(" coord@yambo.es "))).thenReturn(project);

        mockMvc.perform(post("/projects")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\": \"Project 1\", \"coordinationEmail\": \" coord@yambo.es \"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.coordinationEmail").value("coord@yambo.es"));
    }

    @Test
    @WithMockUser
    void updateProject_WithEmptyCoordinationEmail_ShouldClearIt() throws Exception {
        Project project = Project.builder().id("PRJ001").name("Project 1").active(true).build();
        when(projectService.updateProject(eq("PRJ001"), eq(null), eq(null), eq(null), eq(null), eq(null), eq(null), eq(null),
                eq(""))).thenReturn(project);

        mockMvc.perform(put("/projects/PRJ001")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"coordinationEmail\": \"\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coordinationEmail").doesNotExist());
    }

    @Test
    @WithMockUser
    void updateProject_WithInvalidCoordinationEmail_ShouldReturn400() throws Exception {
        when(projectService.updateProject(eq("PRJ001"), eq(null), eq(null), eq(null), eq(null), eq(null), eq(null), eq(null),
                eq("not-an-email"))).thenThrow(new BadRequestException("Invalid coordination email"));

        mockMvc.perform(put("/projects/PRJ001")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"coordinationEmail\": \"not-an-email\"}"))
                .andExpect(status().isBadRequest());
    }
}
