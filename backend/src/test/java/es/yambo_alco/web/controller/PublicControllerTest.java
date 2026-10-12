package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.Activity;
import es.yambo_alco.web.model.Staff;
import es.yambo_alco.web.model.UserProjectGroup;
import es.yambo_alco.web.model.ProjectGroup;
import es.yambo_alco.web.model.Project;
import es.yambo_alco.web.model.SeoMetadata;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.ActivityStatus;
import es.yambo_alco.web.model.enums.SeoEntityType;
import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import es.yambo_alco.web.repository.ActivityRepository;
import es.yambo_alco.web.repository.ProjectGroupRepository;
import es.yambo_alco.web.repository.ProjectRepository;
import es.yambo_alco.web.repository.UserRepository;
import es.yambo_alco.web.service.ActivityWaitlistService;
import es.yambo_alco.web.service.SeoMetadataService;
import es.yambo_alco.web.service.SettingsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PublicController.class)
@Import(TestSecurityConfig.class)
@SuppressWarnings("null")
class PublicControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SettingsService settingsService;

    @MockitoBean
    private ProjectRepository projectRepository;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private ProjectGroupRepository projectGroupRepository;

    @MockitoBean
    private ActivityRepository activityRepository;

    @MockitoBean
    private SeoMetadataService seoMetadataService;

    @MockitoBean
    private ActivityWaitlistService activityWaitlistService;

    @Test
    @WithAnonymousUser
    void getProjectSeo_WhenSeoExists_ShouldReturnSeoMetadata() throws Exception {
        // Given
        Project project = Project.builder().id("PRJ001").name("Barrio").active(true).build();
        SeoMetadata seo = SeoMetadata.builder()
                .id("SEO001")
                .entityType(SeoEntityType.PROJECT)
                .entityId("PRJ001")
                .metaDescription("Descubre el Proyecto Barrio en Alcobendas.")
                .keywords("[\"Yambo\",\"Alcobendas\",\"ocio educativo\"]")
                .ogDescription("Ocio educativo para niños en Alcobendas")
                .slug("proyecto-barrio")
                .build();

        when(projectRepository.findById("PRJ001")).thenReturn(Optional.of(project));
        when(seoMetadataService.getByEntity(SeoEntityType.PROJECT, "PRJ001")).thenReturn(Optional.of(seo));

        // When / Then
        mockMvc.perform(get("/public/projects/PRJ001/seo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metaDescription").value("Descubre el Proyecto Barrio en Alcobendas."))
                .andExpect(jsonPath("$.keywords[0]").value("Yambo"))
                .andExpect(jsonPath("$.keywords[1]").value("Alcobendas"))
                .andExpect(jsonPath("$.slug").value("proyecto-barrio"));
    }

    @Test
    @WithAnonymousUser
    void getProjectSeo_WhenSeoNotFound_ShouldReturn404() throws Exception {
        // Given
        Project project = Project.builder().id("PRJ001").name("Barrio").active(true).build();
        when(projectRepository.findById("PRJ001")).thenReturn(Optional.of(project));
        when(seoMetadataService.getByEntity(SeoEntityType.PROJECT, "PRJ001")).thenReturn(Optional.empty());

        // When / Then
        mockMvc.perform(get("/public/projects/PRJ001/seo"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithAnonymousUser
    void getProjectSeo_WhenProjectNotFound_ShouldReturn404() throws Exception {
        // Given
        when(projectRepository.findById("PRJ404")).thenReturn(Optional.empty());

        // When / Then
        mockMvc.perform(get("/public/projects/PRJ404/seo"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithAnonymousUser
    void getProjectDetail_WithSeo_ShouldIncludeSeoInResponse() throws Exception {
        // Given
        Project project = Project.builder().id("PRJ001").name("Barrio").active(true)
                .season("2025-2026").description("Test description").build();
        SeoMetadata seo = SeoMetadata.builder()
                .id("SEO001")
                .entityType(SeoEntityType.PROJECT)
                .entityId("PRJ001")
                .keywords("[\"Yambo\"]")
                .slug("proyecto-barrio")
                .build();

        when(projectRepository.findById("PRJ001")).thenReturn(Optional.of(project));
        when(projectGroupRepository.findByProjectId("PRJ001")).thenReturn(Collections.emptyList());
        when(userRepository.findPublicStaffByProjectId("PRJ001")).thenReturn(Collections.emptyList());
        when(seoMetadataService.getByEntity(SeoEntityType.PROJECT, "PRJ001")).thenReturn(Optional.of(seo));

        // When / Then
        mockMvc.perform(get("/public/projects/PRJ001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("PRJ001"))
                .andExpect(jsonPath("$.name").value("Barrio"))
                .andExpect(jsonPath("$.seo.slug").value("proyecto-barrio"));
    }

    @Test
    @WithAnonymousUser
    void getProjectDetail_WithoutSeo_ShouldReturnNullSeo() throws Exception {
        // Given
        Project project = Project.builder().id("PRJ001").name("Barrio").active(true).build();

        when(projectRepository.findById("PRJ001")).thenReturn(Optional.of(project));
        when(projectGroupRepository.findByProjectId("PRJ001")).thenReturn(Collections.emptyList());
        when(userRepository.findPublicStaffByProjectId("PRJ001")).thenReturn(Collections.emptyList());
        when(seoMetadataService.getByEntity(SeoEntityType.PROJECT, "PRJ001")).thenReturn(Optional.empty());

        // When / Then
        mockMvc.perform(get("/public/projects/PRJ001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("PRJ001"))
                .andExpect(jsonPath("$.seo").doesNotExist());
    }

    // ── Coordination email ──────────────────────────────────────────────

    @Test
    @WithAnonymousUser
    void getProjectDetail_ShouldIncludeOwnCoordinationEmail() throws Exception {
        Project project = Project.builder().id("PRJ001").name("Barrio").active(true)
                .coordinationEmail("barrio@yambo.es").build();

        when(projectRepository.findById("PRJ001")).thenReturn(Optional.of(project));
        when(projectGroupRepository.findByProjectId("PRJ001")).thenReturn(Collections.emptyList());
        when(userRepository.findPublicStaffByProjectId("PRJ001")).thenReturn(Collections.emptyList());
        when(seoMetadataService.getByEntity(SeoEntityType.PROJECT, "PRJ001")).thenReturn(Optional.empty());

        mockMvc.perform(get("/public/projects/PRJ001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coordinationEmail").value("barrio@yambo.es"));
    }

    @Test
    @WithAnonymousUser
    void getProjectDetail_WithoutCoordinationEmail_ShouldReturnNull() throws Exception {
        Project project = Project.builder().id("PRJ001").name("Barrio").active(true).build();

        when(projectRepository.findById("PRJ001")).thenReturn(Optional.of(project));
        when(projectGroupRepository.findByProjectId("PRJ001")).thenReturn(Collections.emptyList());
        when(userRepository.findPublicStaffByProjectId("PRJ001")).thenReturn(Collections.emptyList());
        when(seoMetadataService.getByEntity(SeoEntityType.PROJECT, "PRJ001")).thenReturn(Optional.empty());

        mockMvc.perform(get("/public/projects/PRJ001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.coordinationEmail").doesNotExist());
    }

    @Test
    @WithAnonymousUser
    void getActiveProjects_ShouldKeepEachEmailWithItsProject() throws Exception {
        Project first = Project.builder().id("PRJ001").name("Barrio").active(true)
                .coordinationEmail("barrio@yambo.es").build();
        Project second = Project.builder().id("PRJ002").name("Campamento").active(true)
                .coordinationEmail("campa@yambo.es").build();
        Project third = Project.builder().id("PRJ003").name("Sin correo").active(true).build();

        when(projectRepository.findByActiveTrue()).thenReturn(List.of(first, second, third));

        mockMvc.perform(get("/public/projects/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("PRJ001"))
                .andExpect(jsonPath("$[0].coordinationEmail").value("barrio@yambo.es"))
                .andExpect(jsonPath("$[1].id").value("PRJ002"))
                .andExpect(jsonPath("$[1].coordinationEmail").value("campa@yambo.es"))
                .andExpect(jsonPath("$[2].id").value("PRJ003"))
                .andExpect(jsonPath("$[2].coordinationEmail").doesNotExist());
    }

    @Test
    @WithAnonymousUser
    void getFeaturedProjects_ShouldIncludeCoordinationEmail() throws Exception {
        Project project = Project.builder().id("PRJ001").name("Barrio").active(true).featured(true)
                .coordinationEmail("barrio@yambo.es").build();

        when(projectRepository.findByActiveTrueAndFeaturedTrue()).thenReturn(List.of(project));

        mockMvc.perform(get("/public/projects/featured"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].coordinationEmail").value("barrio@yambo.es"));
    }

    // ── GET /public/activities ──────────────────────────────────────────

    @Test
    @WithAnonymousUser
    void getPublicActivities_ShouldReturnActivitiesWithEndDate() throws Exception {
        // Given
        Project project = Project.builder().id("PRJ001").name("Barrio").build();
        User manager = User.builder().id("U0001").name("Monitor")
                .email("m@example.com").password("pass").staff(Staff.builder().photo("/uploads/m.jpg").manual(true).publicVisible(true).build()).profiles(Set.of()).build();

        Activity singleDay = Activity.builder()
                .id("ACT001").name("Taller").description("Un taller")
                .date(LocalDateTime.of(2026, 3, 20, 10, 0))
                .status(ActivityStatus.PLANNED).isPublic(true)
                .project(project).manager(manager)
                .build();

        Activity multiDay = Activity.builder()
                .id("ACT002").name("Los Juegos de Yambo").description("Campamento")
                .date(LocalDateTime.of(2026, 3, 16, 10, 0))
                .endDate(LocalDateTime.of(2026, 3, 18, 18, 0))
                .status(ActivityStatus.OPEN_REGISTRATION).isPublic(true)
                .project(project).manager(manager)
                .build();

        when(activityRepository.findByIsPublicTrueOrderByDateDesc())
                .thenReturn(List.of(singleDay, multiDay));

        // When / Then
        mockMvc.perform(get("/public/activities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value("ACT001"))
                .andExpect(jsonPath("$[0].name").value("Taller"))
                .andExpect(jsonPath("$[0].endDate").isEmpty())
                .andExpect(jsonPath("$[0].status.value").value("PLANNED"))
                .andExpect(jsonPath("$[0].project.id").value("PRJ001"))
                .andExpect(jsonPath("$[0].manager.name").value("Monitor"))
                .andExpect(jsonPath("$[1].id").value("ACT002"))
                .andExpect(jsonPath("$[1].name").value("Los Juegos de Yambo"))
                .andExpect(jsonPath("$[1].date").value("2026-03-16T10:00:00"))
                .andExpect(jsonPath("$[1].endDate").value("2026-03-18T18:00:00"))
                .andExpect(jsonPath("$[1].status.value").value("OPEN_REGISTRATION"));
    }

    @Test
    @WithAnonymousUser
    void getPublicActivities_WhenEmpty_ShouldReturnEmptyList() throws Exception {
        // Given
        when(activityRepository.findByIsPublicTrueOrderByDateDesc()).thenReturn(List.of());

        // When / Then
        mockMvc.perform(get("/public/activities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // ── GET /public/activities/{id} ─────────────────────────────────────

    @Test
    @WithAnonymousUser
    void getPublicActivity_WhenFound_ShouldReturnActivityDetail() throws Exception {
        // Given
        Project project = Project.builder().id("PRJ001").name("Barrio").build();
        User manager = User.builder().id("U0001").name("Monitor")
                .email("m@example.com").password("pass").staff(Staff.builder().photo("/uploads/m.jpg").manual(true).publicVisible(true).build()).profiles(Set.of()).build();

        Activity activity = Activity.builder()
                .id("ACT001").name("Taller de Navidad").description("Un taller navideño")
                .image("/uploads/act.jpg").location("Local Yambo").price(new java.math.BigDecimal("5.00"))
                .date(LocalDateTime.of(2026, 12, 20, 10, 0))
                .endDate(LocalDateTime.of(2026, 12, 20, 18, 0))
                .status(ActivityStatus.PLANNED).isPublic(true)
                .project(project).manager(manager)
                .build();

        SeoMetadata seo = SeoMetadata.builder()
                .id("SEO002").entityType(SeoEntityType.ACTIVITY).entityId("ACT001")
                .metaDescription("Taller de Navidad en Yambo Alcobendas")
                .keywords("[\"Navidad\",\"Yambo\",\"Alcobendas\"]")
                .ogDescription("Ven al taller navideño de Yambo")
                .slug("taller-de-navidad")
                .build();

        when(activityRepository.findByIdAndIsPublicTrue("ACT001")).thenReturn(Optional.of(activity));
        when(seoMetadataService.getByEntity(SeoEntityType.ACTIVITY, "ACT001")).thenReturn(Optional.of(seo));

        // When / Then
        mockMvc.perform(get("/public/activities/ACT001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("ACT001"))
                .andExpect(jsonPath("$.name").value("Taller de Navidad"))
                .andExpect(jsonPath("$.description").value("Un taller navideño"))
                .andExpect(jsonPath("$.image").value("/uploads/act.jpg"))
                .andExpect(jsonPath("$.location").value("Local Yambo"))
                .andExpect(jsonPath("$.price").value(5.00))
                .andExpect(jsonPath("$.date").value("2026-12-20T10:00:00"))
                .andExpect(jsonPath("$.endDate").value("2026-12-20T18:00:00"))
                .andExpect(jsonPath("$.status.value").value("PLANNED"))
                .andExpect(jsonPath("$.project.id").value("PRJ001"))
                .andExpect(jsonPath("$.manager.name").value("Monitor"))
                .andExpect(jsonPath("$.seo.metaDescription").value("Taller de Navidad en Yambo Alcobendas"))
                .andExpect(jsonPath("$.seo.keywords[0]").value("Navidad"))
                .andExpect(jsonPath("$.seo.slug").value("taller-de-navidad"));
    }

    @Test
    @WithAnonymousUser
    void getPublicActivity_WhenNotFound_ShouldReturn404() throws Exception {
        // Given
        when(activityRepository.findByIdAndIsPublicTrue("ACT404")).thenReturn(Optional.empty());

        // When / Then
        mockMvc.perform(get("/public/activities/ACT404"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithAnonymousUser
    void getPublicActivity_WithoutSeo_ShouldReturnNullSeo() throws Exception {
        // Given
        Project project = Project.builder().id("PRJ001").name("Barrio").build();
        User manager = User.builder().id("U0001").name("Monitor")
                .email("m@example.com").password("pass").staff(Staff.builder().photo("/uploads/m.jpg").manual(true).publicVisible(true).build()).profiles(Set.of()).build();

        Activity activity = Activity.builder()
                .id("ACT003").name("Sin SEO").description("Sin metadata")
                .date(LocalDateTime.of(2026, 5, 1, 10, 0))
                .status(ActivityStatus.OPEN_REGISTRATION).isPublic(true)
                .project(project).manager(manager)
                .build();

        when(activityRepository.findByIdAndIsPublicTrue("ACT003")).thenReturn(Optional.of(activity));
        when(seoMetadataService.getByEntity(SeoEntityType.ACTIVITY, "ACT003")).thenReturn(Optional.empty());

        // When / Then
        mockMvc.perform(get("/public/activities/ACT003"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("ACT003"))
                .andExpect(jsonPath("$.seo").doesNotExist());
    }

    @Test
    @WithAnonymousUser
    void getPublicActivity_WhenCancelled_ShouldReturnActivity() throws Exception {
        // Given
        Project project = Project.builder().id("PRJ001").name("Barrio").build();
        User manager = User.builder().id("U0001").name("Monitor")
                .email("m@example.com").password("pass").staff(Staff.builder().photo("/uploads/m.jpg").manual(true).publicVisible(true).build()).profiles(Set.of()).build();

        Activity activity = Activity.builder()
                .id("ACT004").name("Cancelada").description("Actividad cancelada")
                .date(LocalDateTime.of(2026, 1, 15, 10, 0))
                .status(ActivityStatus.CANCELLED).isPublic(true)
                .project(project).manager(manager)
                .build();

        when(activityRepository.findByIdAndIsPublicTrue("ACT004")).thenReturn(Optional.of(activity));
        when(seoMetadataService.getByEntity(SeoEntityType.ACTIVITY, "ACT004")).thenReturn(Optional.empty());

        // When / Then
        mockMvc.perform(get("/public/activities/ACT004"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("ACT004"))
                .andExpect(jsonPath("$.status.value").value("CANCELLED"));
    }

    // ── GET /public/activities/{id} — public access ─────────────────────

    @Test
    void getPublicActivity_WithoutAuth_ShouldStillReturnOk() throws Exception {
        // Given
        Project project = Project.builder().id("PRJ001").name("Barrio").build();
        User manager = User.builder().id("U0001").name("Monitor")
                .email("m@example.com").password("pass").staff(Staff.builder().photo("/uploads/m.jpg").manual(true).publicVisible(true).build()).profiles(Set.of()).build();

        Activity activity = Activity.builder()
                .id("ACT005").name("Pública").description("Acceso público")
                .date(LocalDateTime.of(2026, 6, 1, 10, 0))
                .status(ActivityStatus.OPEN_REGISTRATION).isPublic(true)
                .project(project).manager(manager)
                .build();

        when(activityRepository.findByIdAndIsPublicTrue("ACT005")).thenReturn(Optional.of(activity));
        when(seoMetadataService.getByEntity(SeoEntityType.ACTIVITY, "ACT005")).thenReturn(Optional.empty());

        // When / Then (no @WithAnonymousUser — verifies no auth is required)
        mockMvc.perform(get("/public/activities/ACT005"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("ACT005"));
    }

    // ── Public visibility opt-in ────────────────────────────────────────

    @Test
    @WithAnonymousUser
    void getStaff_ShouldOnlyReturnPubliclyVisibleStaff() throws Exception {
        // Given
        User visible = User.builder().id("U0001").name("Visible").email("v@example.com").password("pass")
                .staff(Staff.builder().manual(true).publicVisible(true).nickname("Vis").build()).build();
        User hidden = User.builder().id("U0002").name("Hidden").email("h@example.com").password("pass")
                .staff(Staff.builder().manual(true).build()).build();

        when(userRepository.findPublicStaff()).thenReturn(List.of(visible, hidden));

        // When / Then
        mockMvc.perform(get("/public/staff"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value("U0001"))
                .andExpect(jsonPath("$[0].nickname").value("Vis"));
    }

    @Test
    @WithAnonymousUser
    void getProjectDetail_ShouldOnlyReturnPubliclyVisibleStaff() throws Exception {
        // Given
        Project project = Project.builder().id("PRJ001").name("Barrio").build();
        User visible = User.builder().id("U0001").name("Visible").email("v@example.com").password("pass")
                .staff(Staff.builder().manual(true).publicVisible(true).build()).build();
        User hidden = User.builder().id("U0002").name("Hidden").email("h@example.com").password("pass")
                .staff(Staff.builder().manual(true).build()).build();

        when(projectRepository.findById("PRJ001")).thenReturn(Optional.of(project));
        when(projectGroupRepository.findByProjectId("PRJ001")).thenReturn(Collections.emptyList());
        when(userRepository.findPublicStaffByProjectId("PRJ001")).thenReturn(List.of(visible, hidden));
        when(seoMetadataService.getByEntity(SeoEntityType.PROJECT, "PRJ001")).thenReturn(Optional.empty());

        // When / Then
        mockMvc.perform(get("/public/projects/PRJ001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.staff.length()").value(1))
                .andExpect(jsonPath("$.staff[0].id").value("U0001"));
    }

    @Test
    @WithAnonymousUser
    void getPublicActivity_ShouldHideManagerWhoIsNotPubliclyVisible() throws Exception {
        // Given — staff member who has not opted in to appear on the public site
        User manager = User.builder().id("U0001").name("Monitor").email("m@example.com").password("pass")
                .staff(Staff.builder().photo("/uploads/m.jpg").manual(true).build()).build();
        Activity activity = Activity.builder()
                .id("ACT006").name("Pública").date(LocalDateTime.of(2026, 6, 1, 10, 0))
                .status(ActivityStatus.OPEN_REGISTRATION).isPublic(true).manager(manager)
                .build();

        when(activityRepository.findByIdAndIsPublicTrue("ACT006")).thenReturn(Optional.of(activity));
        when(seoMetadataService.getByEntity(SeoEntityType.ACTIVITY, "ACT006")).thenReturn(Optional.empty());

        // When / Then
        mockMvc.perform(get("/public/activities/ACT006"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.manager").doesNotExist());
    }

    @Test
    @WithAnonymousUser
    void getPublicActivity_ShouldShowVisibleManagerByNickname() throws Exception {
        // Given
        User manager = User.builder().id("U0001").name("Nombre Completo").email("m@example.com").password("pass")
                .staff(Staff.builder().photo("/uploads/m.jpg").nickname("Moni").manual(true).publicVisible(true).build())
                .build();
        Activity activity = Activity.builder()
                .id("ACT007").name("Pública").date(LocalDateTime.of(2026, 6, 1, 10, 0))
                .status(ActivityStatus.OPEN_REGISTRATION).isPublic(true).manager(manager)
                .build();

        when(activityRepository.findByIdAndIsPublicTrue("ACT007")).thenReturn(Optional.of(activity));
        when(seoMetadataService.getByEntity(SeoEntityType.ACTIVITY, "ACT007")).thenReturn(Optional.empty());

        // When / Then
        mockMvc.perform(get("/public/activities/ACT007"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.manager.name").value("Moni"))
                .andExpect(jsonPath("$.manager.photo").value("/uploads/m.jpg"));
    }

    @Test
    @WithAnonymousUser
    void getStaff_ShouldOnlyExposeStaffRolesOfActiveProjects() throws Exception {
        // Given — monitor in an active project, plus a role in a finished project and a PARENT role
        Project active = Project.builder().id("PRJ001").name("Barrio").build();
        Project finished = Project.builder().id("PRJ002").name("Antiguo").active(false).build();
        User current = User.builder().id("U0001").name("Actual").email("a@example.com").password("pass")
                .staff(Staff.builder().publicVisible(true).build()).build();
        current.getGroupRoles().add(groupRole(current, "G1", active, UserProjectGroupRole.MONITOR));
        current.getGroupRoles().add(groupRole(current, "G2", finished, UserProjectGroupRole.COORDINATOR));
        current.getGroupRoles().add(groupRole(current, "G3", active, UserProjectGroupRole.PARENT));
        User former = User.builder().id("U0002").name("Antiguo").email("o@example.com").password("pass")
                .staff(Staff.builder().publicVisible(true).build()).build();
        former.getGroupRoles().add(groupRole(former, "G2", finished, UserProjectGroupRole.MONITOR));

        when(userRepository.findPublicStaff()).thenReturn(List.of(current, former));

        // When / Then
        mockMvc.perform(get("/public/staff"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value("U0001"))
                .andExpect(jsonPath("$[0].role").value("MONITOR"))
                .andExpect(jsonPath("$[0].groups.length()").value(1))
                .andExpect(jsonPath("$[0].groups[0].projectName").value("Barrio"));
    }

    private static UserProjectGroup groupRole(User user, String groupId, Project project, UserProjectGroupRole role) {
        return UserProjectGroup.builder()
                .user(user)
                .projectGroup(ProjectGroup.builder().id(groupId).project(project).build())
                .role(role)
                .build();
    }
}
