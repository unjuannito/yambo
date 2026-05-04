package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.model.Issue;
import es.yambo_alco.web.model.IssueComment;
import es.yambo_alco.web.model.Order;
import es.yambo_alco.web.model.OrderProduct;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.IssueStatus;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.service.IssueService;
import es.yambo_alco.web.service.IssueWatcherService;
import es.yambo_alco.web.service.OrderService;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = IssueController.class)
@Import(TestSecurityConfig.class)
class IssueControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IssueService issueService;

    @MockitoBean
    private OrderService orderService;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private IssueWatcherService issueWatcherService;

    @MockitoBean
    private PermissionCheckService permissionCheckService;

    private User currentUser;
    private UUID orderedProductId;

    @BeforeEach
    void setUp() {
        orderedProductId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        currentUser = User.builder()
                .id("USR001")
                .name("Test User")
                .email("test@yambo.es")
                .build();

        when(permissionCheckService.hasPermission(anyString(), anyString())).thenReturn(true);
        when(authService.getCurrentUser(true)).thenReturn(currentUser);
    }

    @Test
    @WithMockUser
    void createIssue_WithValidRequest_ShouldReturnCreated() throws Exception {
        Issue issue = Issue.builder()
                .id("ISS00001")
                .title("Problema de talla")
                .description("La talla no coincide")
                .status(IssueStatus.OPEN)
                .createdBy("USR001")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        OrderProduct related = OrderProduct.builder()
                .id(orderedProductId)
                .orderId("ORD00001")
                .productId("PROD0001")
                .price(new BigDecimal("10.00"))
                .quantity(1)
                .build();

        when(issueService.createIssue(anyList(), eq("Problema de talla"), eq("La talla no coincide"), eq("USR001"), eq(true)))
                .thenReturn(issue);
        when(issueService.getIssueProductsByIssueId("ISS00001")).thenReturn(List.of(related));

        String requestBody = """
                {
                  "orderedProductIds": ["11111111-1111-1111-1111-111111111111"],
                  "title": "Problema de talla",
                  "description": "La talla no coincide"
                }
                """;

        mockMvc.perform(post("/issues")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("ISS00001"))
                .andExpect(jsonPath("$.orderedProductIds[0]").value("11111111-1111-1111-1111-111111111111"))
                .andExpect(jsonPath("$.status").value("OPEN"));
    }

    @Test
    @WithMockUser
    void createIssue_WithoutProducts_ShouldReturnBadRequest() throws Exception {
        String requestBody = """
                {
                  "title": "Problema",
                  "description": "Detalle"
                }
                """;

        mockMvc.perform(post("/issues")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest());

        verify(issueService, never()).createIssue(anyList(), anyString(), anyString(), anyString(), anyBoolean());
    }

    @Test
    @WithMockUser
    void getIssue_WithExistingIssue_ShouldReturnDetail() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        Issue issue = Issue.builder()
                .id("ISS00001")
                .title("Problema")
                .description("Detalle")
                .status(IssueStatus.OPEN)
                .createdBy("USR001")
                .createdAt(now)
                .updatedAt(now)
                .build();

        IssueComment comment = IssueComment.builder()
                .id(UUID.fromString("22222222-2222-2222-2222-222222222222"))
                .issueId("ISS00001")
                .userId("USR001")
                .text("Primer comentario")
                .createdAt(now)
                .build();

        OrderProduct related = OrderProduct.builder()
                .id(orderedProductId)
                .orderId("ORD00001")
                .productId("PROD0001")
                .build();

        when(issueService.getIssueWithComments("ISS00001")).thenReturn(issue);
        when(issueService.getIssueProductsByIssueId("ISS00001")).thenReturn(List.of(related));
        when(issueService.getIssueComments("ISS00001")).thenReturn(List.of(comment));

        mockMvc.perform(get("/issues/ISS00001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("ISS00001"))
                .andExpect(jsonPath("$.comments.length()").value(1))
                .andExpect(jsonPath("$.comments[0].text").value("Primer comentario"));
    }

    @Test
    @WithMockUser
    void getIssuesByOrder_ShouldReturnIssuesList() throws Exception {
        Issue issue = Issue.builder()
                .id("ISS00001")
                .title("Problema")
                .description("Detalle")
                .status(IssueStatus.OPEN)
                .createdBy("USR001")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Order order = Order.builder()
                .id("ORD00001")
                .customerId("USR001")
                .status(OrderStatus.CLOSED)
                .build();

        OrderProduct related = OrderProduct.builder()
                .id(orderedProductId)
                .orderId("ORD00001")
                .productId("PROD0001")
                .build();

        when(orderService.getOrderById("ORD00001")).thenReturn(order);
        when(issueService.getIssuesByOrderId("ORD00001")).thenReturn(List.of(issue));
        when(issueService.getIssueProductsByIssueId("ISS00001")).thenReturn(List.of(related));

        mockMvc.perform(get("/issues/order/ORD00001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value("ISS00001"));
    }

    @Test
    @WithMockUser
    void createIssue_WhenMerchAdmin_ShouldCallServiceWithBypassTrue() throws Exception {
        Issue issue = Issue.builder()
                .id("ISS00001")
                .title("Admin Issue")
                .description("Created by merch admin")
                .status(IssueStatus.OPEN)
                .createdBy("USR001")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        OrderProduct related = OrderProduct.builder()
                .id(orderedProductId)
                .orderId("ORD00001")
                .productId("PROD0001")
                .price(new BigDecimal("10.00"))
                .quantity(1)
                .build();

        when(permissionCheckService.hasPermission("issue", "update")).thenReturn(true);
        when(issueService.createIssue(anyList(), anyString(), anyString(), eq("USR001"), eq(true)))
                .thenReturn(issue);
        when(issueService.getIssueProductsByIssueId("ISS00001")).thenReturn(List.of(related));

        String requestBody = """
                {
                  "orderedProductIds": ["11111111-1111-1111-1111-111111111111"],
                  "title": "Admin Issue",
                  "description": "Created by merch admin"
                }
                """;

        mockMvc.perform(post("/issues")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated());

        verify(issueService).createIssue(anyList(), anyString(), anyString(), eq("USR001"), eq(true));
    }

    @Test
    @WithMockUser
    void createIssue_WhenRegularUser_ShouldCallServiceWithBypassFalse() throws Exception {
        Issue issue = Issue.builder()
                .id("ISS00001")
                .title("User Issue")
                .description("Created by regular user")
                .status(IssueStatus.OPEN)
                .createdBy("USR001")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        OrderProduct related = OrderProduct.builder()
                .id(orderedProductId)
                .orderId("ORD00001")
                .productId("PROD0001")
                .price(new BigDecimal("10.00"))
                .quantity(1)
                .build();

        when(permissionCheckService.hasPermission("issue", "update")).thenReturn(false);
        when(issueService.createIssue(anyList(), anyString(), anyString(), eq("USR001"), eq(false)))
                .thenReturn(issue);
        when(issueService.getIssueProductsByIssueId("ISS00001")).thenReturn(List.of(related));

        String requestBody = """
                {
                  "orderedProductIds": ["11111111-1111-1111-1111-111111111111"],
                  "title": "User Issue",
                  "description": "Created by regular user"
                }
                """;

        mockMvc.perform(post("/issues")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated());

        verify(issueService).createIssue(anyList(), anyString(), anyString(), eq("USR001"), eq(false));
    }

    @Test
    @WithMockUser
    void addComment_WithStatusButWithoutUpdatePermission_ShouldReturnForbidden() throws Exception {
        Issue issue = Issue.builder()
                .id("ISS00001")
                .build();

        when(issueService.getIssueWithComments("ISS00001")).thenReturn(issue);
        when(permissionCheckService.hasPermission("issue", "update")).thenReturn(false);

        String requestBody = """
                {
                  "text": "Nuevo comentario",
                  "status": "IN_PROGRESS"
                }
                """;

        mockMvc.perform(post("/issues/ISS00001/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.type").value("FORBIDDEN"))
                .andExpect(jsonPath("$.status").value(403));

        verify(issueService, never()).addComment(anyString(), anyString(), anyString(), eq(IssueStatus.IN_PROGRESS));
    }

    @Test
    @WithMockUser
    void addComment_WithValidRequest_ShouldReturnCreated() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        Issue issue = Issue.builder()
                .id("ISS00001")
                .build();

        IssueComment createdComment = IssueComment.builder()
                .id(UUID.fromString("33333333-3333-3333-3333-333333333333"))
                .issueId("ISS00001")
                .userId("USR001")
                .text("Comentario válido")
                .status(IssueStatus.IN_PROGRESS)
                .createdAt(now)
                .build();

        when(issueService.getIssueWithComments("ISS00001")).thenReturn(issue);
        when(issueService.addComment("ISS00001", "Comentario válido", "USR001", IssueStatus.IN_PROGRESS))
                .thenReturn(createdComment);

        String requestBody = """
                {
                  "text": "Comentario válido",
                  "status": "IN_PROGRESS"
                }
                """;

        mockMvc.perform(post("/issues/ISS00001/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.issueId").value("ISS00001"))
                .andExpect(jsonPath("$.text").value("Comentario válido"))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }
}
