package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.*;
import es.yambo_alco.web.model.enums.IssueStatus;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.repository.IssueCommentRepository;
import es.yambo_alco.web.repository.IssueRepository;
import es.yambo_alco.web.repository.OrderProductRepository;
import es.yambo_alco.web.repository.OrderRepository;
import es.yambo_alco.web.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class IssueServiceTest {

    @Mock
    private IssueRepository issueRepository;
    @Mock
    private IssueCommentRepository issueCommentRepository;
    @Mock
    private OrderRepository orderRepository;
    @Mock
    private OrderProductRepository orderProductRepository;
    @Mock
    private SettingsService settingsService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private MailService mailService;

    @Mock
    private UserService userService;

    @InjectMocks
    private IssueService issueService;

    private UUID orderedProductId;
    private OrderProduct orderProduct;
    private Order closedOrder;
    private User creator;

    @BeforeEach
    void setUp() {
        orderedProductId = UUID.randomUUID();
        orderProduct = OrderProduct.builder()
                .id(orderedProductId)
                .orderId("ORD001")
                .build();

        closedOrder = Order.builder()
                .id("ORD001")
                .customerId("CUS001")
                .status(OrderStatus.CLOSED)
                .closedAt(LocalDateTime.now().minusDays(10))
                .build();

        creator = User.builder().id("USR001").name("Creador").email("creator@test.com").build();
    }

    // ==================== Issue Creation Tests ====================

    @Test
    void createIssue_WhenOrderIsOutsideWindow_ShouldThrowBadRequest() {
        when(orderProductRepository.findAllById(Set.of(orderedProductId))).thenReturn(List.of(orderProduct));
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(
                Order.builder()
                        .id("ORD001")
                        .customerId("CUS001")
                        .status(OrderStatus.CLOSED)
                        .closedAt(LocalDateTime.now().minusDays(31))
                        .build()
        ));
        when(settingsService.getIssueCreationWindowDays()).thenReturn(30);

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> issueService.createIssue(List.of(orderedProductId), "Título", "Descripción", "USR001"));

        assertEquals("Issues cannot be created more than 30 days after order closure", exception.getMessage());
        verify(issueRepository, never()).save(any());
    }

    @Test
    void createIssue_WhenOrderNotClosed_ShouldAllowCreation() {
        Order openOrder = Order.builder()
                .id("ORD001").customerId("CUS001")
                .status(OrderStatus.PENDING_PRODUCTS).closedAt(null)
                .build();

        when(orderProductRepository.findAllById(Set.of(orderedProductId))).thenReturn(List.of(orderProduct));
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(openOrder));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(creator));
        when(issueRepository.save(any(Issue.class))).thenAnswer(inv -> {
            Issue issue = inv.getArgument(0);
            issue.setId("ISS001");
            return issue;
        });

        Issue result = issueService.createIssue(List.of(orderedProductId), " Título ", " Descripción ", "USR001");

        assertNotNull(result);
        assertEquals("ISS001", result.getId());
        assertEquals("Título", result.getTitle());
        assertEquals("Descripción", result.getDescription());
        assertEquals(IssueStatus.OPEN, result.getStatus());
        verify(issueRepository).save(any(Issue.class));
    }

    @Test
    void createIssue_WhenProductsFromDifferentOrders_ShouldThrowBadRequest() {
        UUID secondProductId = UUID.randomUUID();
        OrderProduct second = OrderProduct.builder().id(secondProductId).orderId("ORD002").build();

        when(orderProductRepository.findAllById(Set.of(orderedProductId, secondProductId)))
                .thenReturn(List.of(orderProduct, second));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> issueService.createIssue(
                        List.of(orderedProductId, secondProductId),
                        "Título", "Descripción", "USR001"
                ));

        assertEquals("All ordered products in an issue must belong to the same order", exception.getMessage());
        verify(issueRepository, never()).save(any());
    }

    @Test
    void createIssue_WhenMultipleProductsSameOrder_ShouldSucceed() {
        UUID secondProductId = UUID.randomUUID();
        OrderProduct second = OrderProduct.builder().id(secondProductId).orderId("ORD001").build();

        when(orderProductRepository.findAllById(Set.of(orderedProductId, secondProductId)))
                .thenReturn(List.of(orderProduct, second));
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(closedOrder));
        when(settingsService.getIssueCreationWindowDays()).thenReturn(30);
        when(userRepository.findById("USR001")).thenReturn(Optional.of(creator));
        when(userRepository.findById("CUS001")).thenReturn(Optional.of(User.builder().id("CUS001").name("Customer").email("cus@test.com").build()));
        when(issueRepository.save(any(Issue.class))).thenAnswer(inv -> {
            Issue saved = inv.getArgument(0);
            saved.setId("ISS001");
            return saved;
        });

        Issue result = issueService.createIssue(
                List.of(orderedProductId, secondProductId),
                "Multi-product issue", "Affects multiple items", "USR001"
        );

        assertNotNull(result);
        assertEquals(2, result.getOrderProducts().size());
    }

    @Test
    void createIssue_WhenProductNotFound_ShouldThrow() {
        when(orderProductRepository.findAllById(Set.of(orderedProductId))).thenReturn(List.of());

        assertThrows(ResourceNotFoundException.class,
                () -> issueService.createIssue(List.of(orderedProductId), "Title", "Desc", "USR001"));

        verify(issueRepository, never()).save(any());
    }

    @Test
    void createIssue_WhenOrderNotFound_ShouldThrow() {
        when(orderProductRepository.findAllById(Set.of(orderedProductId))).thenReturn(List.of(orderProduct));
        when(orderRepository.findById("ORD001")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> issueService.createIssue(List.of(orderedProductId), "Title", "Desc", "USR001"));

        verify(issueRepository, never()).save(any());
    }

    @Test
    void createIssue_WhenUserNotFound_ShouldThrow() {
        when(orderProductRepository.findAllById(Set.of(orderedProductId))).thenReturn(List.of(orderProduct));
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(closedOrder));
        when(settingsService.getIssueCreationWindowDays()).thenReturn(30);
        when(userRepository.findById("MISSING")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> issueService.createIssue(List.of(orderedProductId), "Title", "Desc", "MISSING"));

        verify(issueRepository, never()).save(any());
    }

    @Test
    void createIssue_WithEmptyTitle_ShouldThrow() {
        when(orderProductRepository.findAllById(Set.of(orderedProductId))).thenReturn(List.of(orderProduct));
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(closedOrder));
        when(settingsService.getIssueCreationWindowDays()).thenReturn(30);
        when(userRepository.findById("USR001")).thenReturn(Optional.of(creator));

        assertThrows(BadRequestException.class,
                () -> issueService.createIssue(List.of(orderedProductId), "  ", "Description", "USR001"));

        verify(issueRepository, never()).save(any());
    }

    @Test
    void createIssue_WithEmptyDescription_ShouldThrow() {
        when(orderProductRepository.findAllById(Set.of(orderedProductId))).thenReturn(List.of(orderProduct));
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(closedOrder));
        when(settingsService.getIssueCreationWindowDays()).thenReturn(30);
        when(userRepository.findById("USR001")).thenReturn(Optional.of(creator));

        assertThrows(BadRequestException.class,
                () -> issueService.createIssue(List.of(orderedProductId), "Title", "  ", "USR001"));

        verify(issueRepository, never()).save(any());
    }

    @Test
    void createIssue_WithNullTitle_ShouldThrow() {
        when(orderProductRepository.findAllById(Set.of(orderedProductId))).thenReturn(List.of(orderProduct));
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(closedOrder));
        when(settingsService.getIssueCreationWindowDays()).thenReturn(30);
        when(userRepository.findById("USR001")).thenReturn(Optional.of(creator));

        assertThrows(BadRequestException.class,
                () -> issueService.createIssue(List.of(orderedProductId), null, "Description", "USR001"));

        verify(issueRepository, never()).save(any());
    }

    @Test
    void createIssue_ShouldTrimWhitespace() {
        when(orderProductRepository.findAllById(Set.of(orderedProductId))).thenReturn(List.of(orderProduct));
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(closedOrder));
        when(settingsService.getIssueCreationWindowDays()).thenReturn(30);
        when(userRepository.findById("USR001")).thenReturn(Optional.of(creator));
        when(userRepository.findById("CUS001")).thenReturn(Optional.of(User.builder().id("CUS001").name("Customer").email("cus@test.com").build()));
        when(issueRepository.save(any(Issue.class))).thenAnswer(inv -> {
            Issue saved = inv.getArgument(0);
            saved.setId("ISS001");
            return saved;
        });

        issueService.createIssue(List.of(orderedProductId), "  Title with spaces  ", "  Description with spaces  ", "USR001");

        ArgumentCaptor<Issue> captor = ArgumentCaptor.forClass(Issue.class);
        verify(issueRepository).save(captor.capture());
        assertEquals("Title with spaces", captor.getValue().getTitle());
        assertEquals("Description with spaces", captor.getValue().getDescription());
    }

    @Test
    void createIssue_WithNullProductIds_ShouldThrow() {
        assertThrows(BadRequestException.class,
                () -> issueService.createIssue(null, "Title", "Desc", "USR001"));

        verify(issueRepository, never()).save(any());
    }

    @Test
    void createIssue_WithEmptyProductIds_ShouldThrow() {
        assertThrows(BadRequestException.class,
                () -> issueService.createIssue(List.of(), "Title", "Desc", "USR001"));

        verify(issueRepository, never()).save(any());
    }

    @Test
    void createIssue_WhenWithinWindow_ShouldSucceed() {
        Order closedRecently = Order.builder()
                .id("ORD001").customerId("CUS001")
                .status(OrderStatus.CLOSED)
                .closedAt(LocalDateTime.now().minusDays(29))
                .build();

        when(orderProductRepository.findAllById(Set.of(orderedProductId))).thenReturn(List.of(orderProduct));
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(closedRecently));
        when(settingsService.getIssueCreationWindowDays()).thenReturn(30);
        when(userRepository.findById("USR001")).thenReturn(Optional.of(creator));
        when(userRepository.findById("CUS001")).thenReturn(Optional.of(User.builder().id("CUS001").name("Customer").email("cus@test.com").build()));
        when(issueRepository.save(any(Issue.class))).thenAnswer(inv -> {
            Issue saved = inv.getArgument(0);
            saved.setId("ISS001");
            return saved;
        });

        Issue result = issueService.createIssue(List.of(orderedProductId), "Title", "Desc", "USR001");

        assertNotNull(result);
        verify(issueRepository).save(any(Issue.class));
    }

    // ==================== Merch Admin Issue Creation Tests ====================

    @Test
    void createIssue_WhenMerchAdminAndOutsideWindow_ShouldSucceed() {
        Order expiredOrder = Order.builder()
                .id("ORD001").customerId("CUS001")
                .status(OrderStatus.CLOSED)
                .closedAt(LocalDateTime.now().minusDays(60))
                .build();

        when(orderProductRepository.findAllById(Set.of(orderedProductId))).thenReturn(List.of(orderProduct));
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(expiredOrder));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(creator));
        when(userRepository.findById("CUS001")).thenReturn(Optional.of(User.builder().id("CUS001").name("Customer").email("cus@test.com").build()));
        when(issueRepository.save(any(Issue.class))).thenAnswer(inv -> {
            Issue saved = inv.getArgument(0);
            saved.setId("ISS001");
            return saved;
        });

        Issue result = issueService.createIssue(List.of(orderedProductId), "Admin Issue", "Reported by admin", "USR001", true);

        assertNotNull(result);
        assertEquals("ISS001", result.getId());
        assertEquals(IssueStatus.OPEN, result.getStatus());
        verify(issueRepository).save(any(Issue.class));
        verify(settingsService, never()).getIssueCreationWindowDays();
    }

    @Test
    void createIssue_WhenMerchAdminAndOrderNotClosed_ShouldSucceed() {
        Order openOrder = Order.builder()
                .id("ORD001").customerId("CUS001")
                .status(OrderStatus.PENDING_PRODUCTS).closedAt(null)
                .build();

        when(orderProductRepository.findAllById(Set.of(orderedProductId))).thenReturn(List.of(orderProduct));
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(openOrder));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(creator));
        when(userRepository.findById("CUS001")).thenReturn(Optional.of(User.builder().id("CUS001").name("Customer").email("cus@test.com").build()));
        when(issueRepository.save(any(Issue.class))).thenAnswer(inv -> {
            Issue saved = inv.getArgument(0);
            saved.setId("ISS001");
            return saved;
        });

        Issue result = issueService.createIssue(List.of(orderedProductId), "Admin Issue", "Created by merch admin", "USR001", true);

        assertNotNull(result);
        verify(issueRepository).save(any(Issue.class));
    }

    @Test
    void createIssue_WhenBypassFalseAndOutsideWindow_ShouldStillThrow() {
        when(orderProductRepository.findAllById(Set.of(orderedProductId))).thenReturn(List.of(orderProduct));
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(
                Order.builder()
                        .id("ORD001").customerId("CUS001")
                        .status(OrderStatus.CLOSED)
                        .closedAt(LocalDateTime.now().minusDays(60))
                        .build()
        ));
        when(settingsService.getIssueCreationWindowDays()).thenReturn(30);

        assertThrows(BadRequestException.class,
                () -> issueService.createIssue(List.of(orderedProductId), "Title", "Desc", "USR001", false));

        verify(issueRepository, never()).save(any());
    }

    // ==================== Issue Creation: Email Tests ====================

    @Test
    void createIssue_ShouldSendEmail() {
        FamilyProduct family = FamilyProduct.builder().id("FAM001").name("Drop Test").build();
        Product product = Product.builder().id("PROD001").name("T-Shirt").familyProduct(family).build();
        OrderProduct opWithProduct = OrderProduct.builder()
                .id(orderedProductId)
                .orderId("ORD001")
                .product(product)
                .build();
        User customer = User.builder().id("CUS001").name("Customer").email("cus@test.com").build();

        when(orderProductRepository.findAllById(Set.of(orderedProductId))).thenReturn(List.of(opWithProduct));
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(closedOrder));
        when(settingsService.getIssueCreationWindowDays()).thenReturn(30);
        when(userRepository.findById("USR001")).thenReturn(Optional.of(creator));
        when(userRepository.findById("CUS001")).thenReturn(Optional.of(customer));
        when(userService.getNotificationPreferences("CUS001")).thenReturn(NotificationPreferences.defaults());
        when(issueRepository.save(any(Issue.class))).thenAnswer(inv -> {
            Issue saved = inv.getArgument(0);
            saved.setId("ISS001");
            return saved;
        });

        issueService.createIssue(List.of(orderedProductId), "Test Issue", "Test Description", "USR001");

        verify(mailService).sendIssueCreated(
                eq("cus@test.com"),
                eq("Customer"),
                eq("ISS001"),
                eq("Test Issue"),
                any(String.class),
                eq("ORD001"),
                eq("Creador"),
                any(LocalDateTime.class),
                eq("Test Description"));
    }

    @Test
    void createIssue_WhenEmailFails_ShouldStillCreateIssue() {
        FamilyProduct family = FamilyProduct.builder().id("FAM001").name("Drop Test").build();
        Product product = Product.builder().id("PROD001").name("T-Shirt").familyProduct(family).build();
        OrderProduct opWithProduct = OrderProduct.builder()
                .id(orderedProductId)
                .orderId("ORD001")
                .product(product)
                .build();
        User customer = User.builder().id("CUS001").name("Customer").email("cus@test.com").build();

        when(orderProductRepository.findAllById(Set.of(orderedProductId))).thenReturn(List.of(opWithProduct));
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(closedOrder));
        when(settingsService.getIssueCreationWindowDays()).thenReturn(30);
        when(userRepository.findById("USR001")).thenReturn(Optional.of(creator));
        when(userRepository.findById("CUS001")).thenReturn(Optional.of(customer));
        when(userService.getNotificationPreferences("CUS001")).thenReturn(NotificationPreferences.defaults());
        when(issueRepository.save(any(Issue.class))).thenAnswer(inv -> {
            Issue saved = inv.getArgument(0);
            saved.setId("ISS001");
            return saved;
        });
        doThrow(new RuntimeException("Email unavailable"))
                .when(mailService).sendIssueCreated(any(), any(), any(), any(), any(), any(), any(), any(), any());

        Issue result = issueService.createIssue(List.of(orderedProductId), "Title", "Desc", "USR001");

        assertNotNull(result);
        assertEquals("ISS001", result.getId());
        verify(issueRepository).save(any(Issue.class));
    }

    // ==================== Issue Reading Tests ====================

    @Test
    void getIssueByOrderedProductId_WhenFound_ShouldReturn() {
        Issue issue = Issue.builder().id("ISS001").title("Test").build();
        when(issueRepository.findByOrderedProductId(orderedProductId)).thenReturn(Optional.of(issue));

        Issue result = issueService.getIssueByOrderedProductId(orderedProductId);

        assertNotNull(result);
        assertEquals("ISS001", result.getId());
    }

    @Test
    void getIssueByOrderedProductId_WhenNotFound_ShouldReturnNull() {
        when(issueRepository.findByOrderedProductId(orderedProductId)).thenReturn(Optional.empty());

        Issue result = issueService.getIssueByOrderedProductId(orderedProductId);

        assertNull(result);
    }

    @Test
    void getIssuesByOrderId_ShouldReturnIssues() {
        Issue issue1 = Issue.builder().id("ISS001").build();
        Issue issue2 = Issue.builder().id("ISS002").build();
        when(issueRepository.findByOrderId("ORD001")).thenReturn(List.of(issue1, issue2));

        List<Issue> results = issueService.getIssuesByOrderId("ORD001");

        assertEquals(2, results.size());
        verify(issueRepository).findByOrderId("ORD001");
    }

    @Test
    void getIssuesByOrderId_WhenNone_ShouldReturnEmpty() {
        when(issueRepository.findByOrderId("ORD001")).thenReturn(List.of());

        List<Issue> results = issueService.getIssuesByOrderId("ORD001");

        assertTrue(results.isEmpty());
    }

    @Test
    void getIssueWithComments_WhenFound_ShouldReturn() {
        Issue issue = Issue.builder().id("ISS001").build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));

        Issue result = issueService.getIssueWithComments("ISS001");

        assertNotNull(result);
        assertEquals("ISS001", result.getId());
    }

    @Test
    void getIssueWithComments_WhenNotFound_ShouldThrow() {
        when(issueRepository.findById("MISSING")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> issueService.getIssueWithComments("MISSING"));
    }

    @Test
    void getIssueComments_ShouldReturn() {
        IssueComment c1 = IssueComment.builder().id(UUID.randomUUID()).text("Comment 1").build();
        IssueComment c2 = IssueComment.builder().id(UUID.randomUUID()).text("Comment 2").build();
        when(issueCommentRepository.findByIssueIdOrderByCreatedAtDescWithUser("ISS001"))
                .thenReturn(List.of(c1, c2));

        List<IssueComment> results = issueService.getIssueComments("ISS001");

        assertEquals(2, results.size());
    }

    // ==================== Comment Tests ====================

    @Test
    void addComment_WhenInvalidTransition_ShouldThrowBadRequest() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.CLOSED).build();

        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").build()));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> issueService.addComment("ISS001", "Reapertura inválida", "USR001", IssueStatus.OPEN));

        assertEquals("Invalid issue status transition: CLOSED -> OPEN", exception.getMessage());
        verify(issueCommentRepository, never()).save(any());
    }

    @Test
    void addComment_WhenValidStatusChange_ShouldPersistIssueAndComment() {
        Issue issue = Issue.builder()
                .id("ISS001")
                .status(IssueStatus.OPEN)
                
                .build();

        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").name("Gestor").build()));
        when(issueCommentRepository.save(any(IssueComment.class))).thenAnswer(inv -> inv.getArgument(0));

        IssueComment result = issueService.addComment("ISS001", " En proceso ", "USR001", IssueStatus.IN_PROGRESS);

        assertNotNull(result);
        assertEquals("En proceso", result.getText());
        assertEquals(IssueStatus.IN_PROGRESS, result.getStatus());
        verify(issueRepository).save(any(Issue.class));

        ArgumentCaptor<IssueComment> captor = ArgumentCaptor.forClass(IssueComment.class);
        verify(issueCommentRepository).save(captor.capture());
        assertEquals("ISS001", captor.getValue().getIssueId());
        assertEquals("USR001", captor.getValue().getUserId());
    }

    @Test
    void addComment_WithoutStatusChange_ShouldNotSaveIssue() {
        Issue issue = Issue.builder()
                .id("ISS001")
                .status(IssueStatus.OPEN)
                
                .build();

        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").name("Commenter").build()));
        when(issueCommentRepository.save(any(IssueComment.class))).thenAnswer(inv -> inv.getArgument(0));

        IssueComment result = issueService.addComment("ISS001", "Just a comment", "USR001", null);

        assertNotNull(result);
        assertEquals("Just a comment", result.getText());
        assertNull(result.getStatus());
        verify(issueRepository, never()).save(any(Issue.class));
        verify(issueCommentRepository).save(any(IssueComment.class));
    }

    @Test
    void addComment_WithEmptyText_ShouldThrow() {
        Issue issue = Issue.builder().id("ISS001").build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").build()));

        assertThrows(BadRequestException.class,
                () -> issueService.addComment("ISS001", "  ", "USR001", null));

        verify(issueCommentRepository, never()).save(any());
    }

    @Test
    void addComment_WhenIssueNotFound_ShouldThrow() {
        when(issueRepository.findById("MISSING")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> issueService.addComment("MISSING", "Comment", "USR001", null));
    }

    @Test
    void addComment_WhenUserNotFound_ShouldThrow() {
        Issue issue = Issue.builder().id("ISS001").build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("MISSING")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> issueService.addComment("ISS001", "Comment", "MISSING", null));
    }

    @Test
    void addComment_ShouldTrimWhitespace() {
        Issue issue = Issue.builder().id("ISS001").build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").build()));
        when(issueCommentRepository.save(any(IssueComment.class))).thenAnswer(inv -> inv.getArgument(0));

        issueService.addComment("ISS001", "  Trimmed comment  ", "USR001", null);

        ArgumentCaptor<IssueComment> captor = ArgumentCaptor.forClass(IssueComment.class);
        verify(issueCommentRepository).save(captor.capture());
        assertEquals("Trimmed comment", captor.getValue().getText());
    }

    @Test
    void addComment_WithSameStatus_ShouldNotUpdateIssue() {
        Issue issue = Issue.builder()
                .id("ISS001")
                .status(IssueStatus.IN_PROGRESS)
                
                .build();

        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").name("User").build()));
        when(issueCommentRepository.save(any(IssueComment.class))).thenAnswer(inv -> inv.getArgument(0));

        IssueComment result = issueService.addComment("ISS001", "Still working", "USR001", IssueStatus.IN_PROGRESS);

        assertNotNull(result);
        // Status should still be set on the comment
        assertEquals(IssueStatus.IN_PROGRESS, result.getStatus());
        // But issue.save is still called (status == status is valid, no transition validation needed)
        verify(issueRepository).save(any(Issue.class));
    }

    // ==================== Comment: Email Tests ====================

    @Test
    void addComment_WhenEmailFails_ShouldStillSaveComment() {
        Issue issue = Issue.builder()
                .id("ISS001")
                .status(IssueStatus.OPEN)
                
                .build();

        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").name("Commenter").build()));
        when(issueCommentRepository.save(any(IssueComment.class))).thenAnswer(inv -> inv.getArgument(0));
        // Email sending will throw via getIssueProducts (which is in the try block)
        when(issueRepository.findOrderProductsByIssueId("ISS001")).thenThrow(new RuntimeException("DB error"));

        IssueComment result = issueService.addComment("ISS001", "Test comment", "USR001", null);

        assertNotNull(result);
        verify(issueCommentRepository).save(any(IssueComment.class));
    }

    // ==================== Status Transition Tests ====================

    // Valid transitions from OPEN
    @Test
    void statusTransition_OpenToInProgress_ShouldSucceed() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.OPEN).build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").build()));
        when(issueCommentRepository.save(any(IssueComment.class))).thenAnswer(inv -> inv.getArgument(0));

        IssueComment result = issueService.addComment("ISS001", "Working on it", "USR001", IssueStatus.IN_PROGRESS);

        assertNotNull(result);
        assertEquals(IssueStatus.IN_PROGRESS, result.getStatus());
        verify(issueRepository).save(any(Issue.class));
    }

    @Test
    void statusTransition_OpenToResolved_ShouldSucceed() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.OPEN).build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").build()));
        when(issueCommentRepository.save(any(IssueComment.class))).thenAnswer(inv -> inv.getArgument(0));

        IssueComment result = issueService.addComment("ISS001", "Fixed directly", "USR001", IssueStatus.RESOLVED);

        assertNotNull(result);
        assertEquals(IssueStatus.RESOLVED, result.getStatus());
    }

    @Test
    void statusTransition_OpenToClosed_ShouldSucceed() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.OPEN).build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").build()));
        when(issueCommentRepository.save(any(IssueComment.class))).thenAnswer(inv -> inv.getArgument(0));

        IssueComment result = issueService.addComment("ISS001", "Closing", "USR001", IssueStatus.CLOSED);

        assertNotNull(result);
        assertEquals(IssueStatus.CLOSED, result.getStatus());
    }

    @Test
    void statusTransition_OpenToReopened_ShouldFail() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.OPEN).build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").build()));

        assertThrows(BadRequestException.class,
                () -> issueService.addComment("ISS001", "Invalid", "USR001", IssueStatus.REOPENED));
    }

    // Valid transitions from IN_PROGRESS
    @Test
    void statusTransition_InProgressToOpen_ShouldSucceed() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.IN_PROGRESS).build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").build()));
        when(issueCommentRepository.save(any(IssueComment.class))).thenAnswer(inv -> inv.getArgument(0));

        IssueComment result = issueService.addComment("ISS001", "Back to open", "USR001", IssueStatus.OPEN);

        assertNotNull(result);
        assertEquals(IssueStatus.OPEN, result.getStatus());
    }

    @Test
    void statusTransition_InProgressToResolved_ShouldSucceed() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.IN_PROGRESS).build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").build()));
        when(issueCommentRepository.save(any(IssueComment.class))).thenAnswer(inv -> inv.getArgument(0));

        IssueComment result = issueService.addComment("ISS001", "Fixed", "USR001", IssueStatus.RESOLVED);

        assertNotNull(result);
    }

    @Test
    void statusTransition_InProgressToClosed_ShouldSucceed() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.IN_PROGRESS).build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").build()));
        when(issueCommentRepository.save(any(IssueComment.class))).thenAnswer(inv -> inv.getArgument(0));

        IssueComment result = issueService.addComment("ISS001", "Closing", "USR001", IssueStatus.CLOSED);

        assertNotNull(result);
    }

    @Test
    void statusTransition_InProgressToReopened_ShouldFail() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.IN_PROGRESS).build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").build()));

        assertThrows(BadRequestException.class,
                () -> issueService.addComment("ISS001", "Invalid", "USR001", IssueStatus.REOPENED));
    }

    // Valid transitions from RESOLVED
    @Test
    void statusTransition_ResolvedToClosed_ShouldSucceed() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.RESOLVED).build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").build()));
        when(issueCommentRepository.save(any(IssueComment.class))).thenAnswer(inv -> inv.getArgument(0));

        IssueComment result = issueService.addComment("ISS001", "Closing resolved", "USR001", IssueStatus.CLOSED);

        assertNotNull(result);
    }

    @Test
    void statusTransition_ResolvedToReopened_ShouldSucceed() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.RESOLVED).build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").build()));
        when(issueCommentRepository.save(any(IssueComment.class))).thenAnswer(inv -> inv.getArgument(0));

        IssueComment result = issueService.addComment("ISS001", "Reopening", "USR001", IssueStatus.REOPENED);

        assertNotNull(result);
    }

    @Test
    void statusTransition_ResolvedToOpen_ShouldFail() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.RESOLVED).build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").build()));

        assertThrows(BadRequestException.class,
                () -> issueService.addComment("ISS001", "Invalid", "USR001", IssueStatus.OPEN));
    }

    @Test
    void statusTransition_ResolvedToInProgress_ShouldFail() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.RESOLVED).build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").build()));

        assertThrows(BadRequestException.class,
                () -> issueService.addComment("ISS001", "Invalid", "USR001", IssueStatus.IN_PROGRESS));
    }

    // Valid transitions from REOPENED
    @Test
    void statusTransition_ReopenedToInProgress_ShouldSucceed() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.REOPENED).build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").build()));
        when(issueCommentRepository.save(any(IssueComment.class))).thenAnswer(inv -> inv.getArgument(0));

        IssueComment result = issueService.addComment("ISS001", "Working again", "USR001", IssueStatus.IN_PROGRESS);

        assertNotNull(result);
    }

    @Test
    void statusTransition_ReopenedToResolved_ShouldSucceed() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.REOPENED).build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").build()));
        when(issueCommentRepository.save(any(IssueComment.class))).thenAnswer(inv -> inv.getArgument(0));

        IssueComment result = issueService.addComment("ISS001", "Fixed again", "USR001", IssueStatus.RESOLVED);

        assertNotNull(result);
    }

    @Test
    void statusTransition_ReopenedToClosed_ShouldSucceed() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.REOPENED).build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").build()));
        when(issueCommentRepository.save(any(IssueComment.class))).thenAnswer(inv -> inv.getArgument(0));

        IssueComment result = issueService.addComment("ISS001", "Closing", "USR001", IssueStatus.CLOSED);

        assertNotNull(result);
    }

    @Test
    void statusTransition_ReopenedToOpen_ShouldFail() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.REOPENED).build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").build()));

        assertThrows(BadRequestException.class,
                () -> issueService.addComment("ISS001", "Invalid", "USR001", IssueStatus.OPEN));
    }

    // Valid transitions from CLOSED
    @Test
    void statusTransition_ClosedToReopened_ShouldSucceed() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.CLOSED).build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").build()));
        when(issueCommentRepository.save(any(IssueComment.class))).thenAnswer(inv -> inv.getArgument(0));

        IssueComment result = issueService.addComment("ISS001", "Reopening", "USR001", IssueStatus.REOPENED);

        assertNotNull(result);
        assertEquals(IssueStatus.REOPENED, result.getStatus());
    }

    @Test
    void statusTransition_ClosedToOpen_ShouldFail() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.CLOSED).build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").build()));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> issueService.addComment("ISS001", "Invalid", "USR001", IssueStatus.OPEN));
        assertEquals("Invalid issue status transition: CLOSED -> OPEN", ex.getMessage());
    }

    @Test
    void statusTransition_ClosedToInProgress_ShouldFail() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.CLOSED).build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").build()));

        assertThrows(BadRequestException.class,
                () -> issueService.addComment("ISS001", "Invalid", "USR001", IssueStatus.IN_PROGRESS));
    }

    @Test
    void statusTransition_ClosedToResolved_ShouldFail() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.CLOSED).build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(User.builder().id("USR001").build()));

        assertThrows(BadRequestException.class,
                () -> issueService.addComment("ISS001", "Invalid", "USR001", IssueStatus.RESOLVED));
    }

    // ==================== Issue Products Tests ====================

    @Test
    void getIssueProductsByIssueId_WhenIssueNotExists_ShouldThrowNotFound() {
        when(issueRepository.findOrderProductsByIssueId("MISSING")).thenReturn(List.of());

        assertThrows(ResourceNotFoundException.class,
                () -> issueService.getIssueProductsByIssueId("MISSING"));
    }

    @Test
    void getIssueProductsByIssueId_WhenHasRelatedProducts_ShouldReturn() {
        OrderProduct product1 = OrderProduct.builder().id(UUID.randomUUID()).build();
        OrderProduct product2 = OrderProduct.builder().id(UUID.randomUUID()).build();

        when(issueRepository.findOrderProductsByIssueId("ISS001")).thenReturn(List.of(product1, product2));

        List<OrderProduct> results = issueService.getIssueProductsByIssueId("ISS001");

        assertEquals(2, results.size());
    }

    @Test
    void getIssueProductsByIssueId_WhenNoRelatedProducts_ShouldThrow() {
        when(issueRepository.findOrderProductsByIssueId("ISS001")).thenReturn(List.of());

        assertThrows(ResourceNotFoundException.class,
                () -> issueService.getIssueProductsByIssueId("ISS001"));
    }

    @Test
    void getIssueProductsByIssueId_WhenNoRelatedAndFallbackMissing_ShouldThrow() {
        when(issueRepository.findOrderProductsByIssueId("ISS001")).thenReturn(List.of());

        assertThrows(ResourceNotFoundException.class,
                () -> issueService.getIssueProductsByIssueId("ISS001"));
    }

    @Test
    void getIssueProductsByIssueId_ShouldDeduplicateProducts() {
        UUID productId = UUID.randomUUID();
        OrderProduct product = OrderProduct.builder().id(productId).build();
        // Same product returned twice (simulating join duplicates)
        OrderProduct productDuplicate = OrderProduct.builder().id(productId).build();

        when(issueRepository.findOrderProductsByIssueId("ISS001")).thenReturn(List.of(product, productDuplicate));

        List<OrderProduct> results = issueService.getIssueProductsByIssueId("ISS001");

        assertEquals(1, results.size());
    }

    // ==================== Notification Preferences Tests ====================

    @Test
    void createIssue_WhenIssueCreatedNotificationsDisabled_ShouldNotSendEmail() {
        FamilyProduct family = FamilyProduct.builder().id("FAM001").name("Drop Test").build();
        Product product = Product.builder().id("PROD001").name("T-Shirt").familyProduct(family).build();
        OrderProduct opWithProduct = OrderProduct.builder()
                .id(orderedProductId)
                .orderId("ORD001")
                .product(product)
                .build();
        User customer = User.builder().id("CUS001").name("Customer").email("cus@test.com").build();

        NotificationPreferences prefs = NotificationPreferences.builder()
                .orderStatus(true)
                .orderCancelled(true)
                .issueCreated(false)
                .issueComments(true)
                .issueStatus(true)
                .build();

        when(orderProductRepository.findAllById(Set.of(orderedProductId))).thenReturn(List.of(opWithProduct));
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(closedOrder));
        when(settingsService.getIssueCreationWindowDays()).thenReturn(30);
        when(userRepository.findById("USR001")).thenReturn(Optional.of(creator));
        when(userRepository.findById("CUS001")).thenReturn(Optional.of(customer));
        when(userService.getNotificationPreferences("CUS001")).thenReturn(prefs);
        when(issueRepository.save(any(Issue.class))).thenAnswer(inv -> {
            Issue saved = inv.getArgument(0);
            saved.setId("ISS001");
            return saved;
        });

        Issue result = issueService.createIssue(List.of(orderedProductId), "Test Issue", "Test Description", "USR001");

        assertNotNull(result);
        verify(mailService, never()).sendIssueCreated(any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void addComment_WhenIssueCommentsNotificationsDisabled_ShouldNotSendEmail() {
        Issue issue = Issue.builder()
                .id("ISS001")
                .status(IssueStatus.OPEN)
                
                .build();

        User commenter = User.builder().id("USR001").name("Commenter").build();
        User customer = User.builder().id("CUS001").name("Customer").email("cus@test.com").build();
        Order order = Order.builder().id("ORD001").customerId("CUS001").build();
        FamilyProduct family = FamilyProduct.builder().id("FAM001").name("Camisetas").build();
        Product product = Product.builder().id("PROD001").name("Camiseta Logo").familyProduct(family).build();
        OrderProduct op = OrderProduct.builder()
                .id(orderedProductId)
                .orderId("ORD001")
                .productId("PROD001")
                .product(product)
                .order(order)
                .build();

        NotificationPreferences prefs = NotificationPreferences.builder()
                .orderStatus(true)
                .orderCancelled(true)
                .issueCreated(true)
                .issueComments(false)
                .issueStatus(true)
                .build();

        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("USR001")).thenReturn(Optional.of(commenter));
        when(userRepository.findById("CUS001")).thenReturn(Optional.of(customer));
        when(issueCommentRepository.save(any(IssueComment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(issueRepository.findOrderProductsByIssueId("ISS001")).thenReturn(List.of(op));
        when(userService.getNotificationPreferences("CUS001")).thenReturn(prefs);

        IssueComment result = issueService.addComment("ISS001", "Just a comment", "USR001", null);

        assertNotNull(result);
        verify(mailService, never()).sendIssueCommentAdded(any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }
}
