package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Issue;
import es.yambo_alco.web.model.IssueComment;
import es.yambo_alco.web.model.Order;
import es.yambo_alco.web.model.OrderProduct;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.IssueStatus;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.repository.IssueCommentRepository;
import es.yambo_alco.web.repository.IssueRepository;
import es.yambo_alco.web.repository.OrderProductRepository;
import es.yambo_alco.web.repository.OrderRepository;
import es.yambo_alco.web.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Comprehensive Issue Service Tests")
class IssueServiceTest_Comprehensive {

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

    private OrderProduct testOrderProduct;
    private Order testOrder;
    private User testUser;
    private String testOrderId = "ORD001";
    private String testUserId = "USER001";
    private UUID testProductId;

    @BeforeEach
    void setUp() {
        testProductId = UUID.randomUUID();
        testOrderProduct = OrderProduct.builder()
                .id(testProductId)
                .orderId(testOrderId)
                .build();

        testOrder = Order.builder()
                .id(testOrderId)
                .customerId(testUserId)
                .status(OrderStatus.CLOSED)
                .closedAt(LocalDateTime.now().minusDays(10))
                .build();

        testUser = User.builder()
                .id(testUserId)
                .name("Test User")
                .email("test@example.com")
                .build();
    }

    // ==================== Issue Creation Tests ====================

    @Test
    @DisplayName("Should create issue with single product")
    void createIssue_SingleProduct_Success() {
        User creator = User.builder().id("CREATOR01").name("Creator").build();

        when(orderProductRepository.findAllById(Set.of(testProductId))).thenReturn(List.of(testOrderProduct));
        when(orderRepository.findById(testOrderId)).thenReturn(Optional.of(testOrder));
        when(settingsService.getIssueCreationWindowDays()).thenReturn(30);
        when(userRepository.findById("CREATOR01")).thenReturn(Optional.of(creator));
        when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));
        when(issueRepository.save(any(Issue.class))).thenAnswer(inv -> {
            Issue saved = inv.getArgument(0);
            saved.setId("ISS001");
            return saved;
        });

        Issue result = issueService.createIssue(
                List.of(testProductId),
                "Test Issue",
                "Test Description",
                "CREATOR01"
        );

        assertNotNull(result);
        assertEquals("ISS001", result.getId());
        assertEquals("Test Issue", result.getTitle());
        assertEquals(testProductId, result.getOrderedProductId());
        assertEquals(IssueStatus.OPEN, result.getStatus());
        verify(issueRepository).save(any(Issue.class));
    }

    @Test
    @DisplayName("Should create issue with multiple products from same order")
    void createIssue_MultipleProducts_Success() {
        UUID product2Id = UUID.randomUUID();
        OrderProduct product2 = OrderProduct.builder().id(product2Id).orderId(testOrderId).build();
        User creator = User.builder().id("CREATOR01").name("Creator").build();

        when(orderProductRepository.findAllById(Set.of(testProductId, product2Id)))
                .thenReturn(List.of(testOrderProduct, product2));
        when(orderRepository.findById(testOrderId)).thenReturn(Optional.of(testOrder));
        when(settingsService.getIssueCreationWindowDays()).thenReturn(30);
        when(userRepository.findById("CREATOR01")).thenReturn(Optional.of(creator));
        when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));
        when(issueRepository.save(any(Issue.class))).thenAnswer(inv -> {
            Issue saved = inv.getArgument(0);
            saved.setId("ISS001");
            return saved;
        });

        Issue result = issueService.createIssue(
                List.of(testProductId, product2Id),
                "Multi-product issue",
                "Affects multiple items",
                "CREATOR01"
        );

        assertNotNull(result);
        assertEquals(2, result.getOrderProducts().size());
    }

    @Test
    @DisplayName("Should reject issue from different orders")
    void createIssue_DifferentOrders_Fails() {
        UUID product2Id = UUID.randomUUID();
        OrderProduct product2 = OrderProduct.builder().id(product2Id).orderId("ORD002").build();

        when(orderProductRepository.findAllById(Set.of(testProductId, product2Id)))
                .thenReturn(List.of(testOrderProduct, product2));

        BadRequestException ex = assertThrows(
                BadRequestException.class,
                () -> issueService.createIssue(
                        List.of(testProductId, product2Id),
                        "Title",
                        "Desc",
                        "CREATOR01"
                )
        );

        assertEquals("All ordered products in an issue must belong to the same order", ex.getMessage());
        verify(issueRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should reject issue outside creation window")
    void createIssue_OutsideWindow_Fails() {
        Order closedOrder = Order.builder()
                .id(testOrderId)
                .customerId(testUserId)
                .status(OrderStatus.CLOSED)
                .closedAt(LocalDateTime.now().minusDays(40))
                .build();

        when(orderProductRepository.findAllById(Set.of(testProductId))).thenReturn(List.of(testOrderProduct));
        when(orderRepository.findById(testOrderId)).thenReturn(Optional.of(closedOrder));
        when(settingsService.getIssueCreationWindowDays()).thenReturn(30);

        BadRequestException ex = assertThrows(
                BadRequestException.class,
                () -> issueService.createIssue(
                        List.of(testProductId),
                        "Title",
                        "Desc",
                        "CREATOR01"
                )
        );

        assertEquals("Issues cannot be created more than 30 days after order closure", ex.getMessage());
        verify(issueRepository, never()).save(any());
    }

    @ParameterizedTest(name = "Empty {0} should be rejected")
    @ValueSource(strings = {"", "  ", "\t", "\n"})
    @DisplayName("Should reject empty title")
    void createIssue_EmptyTitle_Fails(String emptyTitle) {
        when(orderProductRepository.findAllById(Set.of(testProductId))).thenReturn(List.of(testOrderProduct));
        when(orderRepository.findById(testOrderId)).thenReturn(Optional.of(testOrder));
        when(settingsService.getIssueCreationWindowDays()).thenReturn(30);
        when(userRepository.findById("CREATOR01")).thenReturn(Optional.of(User.builder().id("CREATOR01").name("Creator").build()));

        assertThrows(
                BadRequestException.class,
                () -> issueService.createIssue(
                        List.of(testProductId),
                        emptyTitle,
                        "Description",
                        "CREATOR01"
                )
        );

        verify(issueRepository, never()).save(any());
    }

    @ParameterizedTest(name = "Empty {0} should be rejected")
    @ValueSource(strings = {"", "  ", "\t", "\n"})
    @DisplayName("Should reject empty description")
    void createIssue_EmptyDescription_Fails(String emptyDesc) {
        when(orderProductRepository.findAllById(Set.of(testProductId))).thenReturn(List.of(testOrderProduct));
        when(orderRepository.findById(testOrderId)).thenReturn(Optional.of(testOrder));
        when(settingsService.getIssueCreationWindowDays()).thenReturn(30);
        when(userRepository.findById("CREATOR01")).thenReturn(Optional.of(User.builder().id("CREATOR01").name("Creator").build()));

        assertThrows(
                BadRequestException.class,
                () -> issueService.createIssue(
                        List.of(testProductId),
                        "Title",
                        emptyDesc,
                        "CREATOR01"
                )
        );

        verify(issueRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should trim whitespace from text fields")
    void createIssue_TrimsWhitespace() {
        User creator = User.builder().id("CREATOR01").name("Creator").build();

        when(orderProductRepository.findAllById(Set.of(testProductId))).thenReturn(List.of(testOrderProduct));
        when(orderRepository.findById(testOrderId)).thenReturn(Optional.of(testOrder));
        when(settingsService.getIssueCreationWindowDays()).thenReturn(30);
        when(userRepository.findById("CREATOR01")).thenReturn(Optional.of(creator));
        when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));
        when(issueRepository.save(any(Issue.class))).thenAnswer(inv -> {
            Issue saved = inv.getArgument(0);
            saved.setId("ISS001");
            return saved;
        });

        issueService.createIssue(
                List.of(testProductId),
                "  Title with spaces  ",
                "  Description with spaces  ",
                "CREATOR01"
        );

        ArgumentCaptor<Issue> captor = ArgumentCaptor.forClass(Issue.class);
        verify(issueRepository).save(captor.capture());
        assertEquals("Title with spaces", captor.getValue().getTitle());
        assertEquals("Description with spaces", captor.getValue().getDescription());
    }

    @Test
    @DisplayName("Should throw exception if ordered product not found")
    void createIssue_ProductNotFound_Fails() {
        when(orderProductRepository.findAllById(Set.of(testProductId))).thenReturn(List.of());

        assertThrows(
                ResourceNotFoundException.class,
                () -> issueService.createIssue(List.of(testProductId), "Title", "Desc", "CREATOR01")
        );

        verify(issueRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should throw exception if order not found")
    void createIssue_OrderNotFound_Fails() {
        when(orderProductRepository.findAllById(Set.of(testProductId))).thenReturn(List.of(testOrderProduct));
        when(orderRepository.findById(testOrderId)).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> issueService.createIssue(List.of(testProductId), "Title", "Desc", "CREATOR01")
        );

        verify(issueRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should throw exception if user not found")
    void createIssue_UserNotFound_Fails() {
        when(orderProductRepository.findAllById(Set.of(testProductId))).thenReturn(List.of(testOrderProduct));
        when(orderRepository.findById(testOrderId)).thenReturn(Optional.of(testOrder));
        when(settingsService.getIssueCreationWindowDays()).thenReturn(30);
        when(userRepository.findById("MISSING")).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> issueService.createIssue(List.of(testProductId), "Title", "Desc", "MISSING")
        );

        verify(issueRepository, never()).save(any());
    }

    // ==================== Issue Reading Tests ====================

    @Test
    @DisplayName("Should retrieve issue by ordered product ID")
    void getIssueByOrderedProductId_Found() {
        Issue issue = Issue.builder().id("ISS001").orderedProductId(testProductId).title("Test").build();
        when(issueRepository.findByOrderedProductId(testProductId)).thenReturn(Optional.of(issue));

        Issue result = issueService.getIssueByOrderedProductId(testProductId);

        assertNotNull(result);
        assertEquals("ISS001", result.getId());
    }

    @Test
    @DisplayName("Should return null when issue not found by product ID")
    void getIssueByOrderedProductId_NotFound() {
        when(issueRepository.findByOrderedProductId(testProductId)).thenReturn(Optional.empty());

        Issue result = issueService.getIssueByOrderedProductId(testProductId);

        assertEquals(null, result);
    }

    @Test
    @DisplayName("Should retrieve all issues for order")
    void getIssuesByOrderId_Success() {
        Issue issue1 = Issue.builder().id("ISS001").orderedProductId(testProductId).build();
        Issue issue2 = Issue.builder().id("ISS002").orderedProductId(UUID.randomUUID()).build();

        when(issueRepository.findByOrderId(testOrderId)).thenReturn(List.of(issue1, issue2));

        List<Issue> results = issueService.getIssuesByOrderId(testOrderId);

        assertEquals(2, results.size());
        verify(issueRepository).findByOrderId(testOrderId);
    }

    @Test
    @DisplayName("Should return empty list when no issues for order")
    void getIssuesByOrderId_Empty() {
        when(issueRepository.findByOrderId(testOrderId)).thenReturn(List.of());

        List<Issue> results = issueService.getIssuesByOrderId(testOrderId);

        assertTrue(results.isEmpty());
    }

    @Test
    @DisplayName("Should retrieve issue with comments")
    void getIssueWithComments_Success() {
        Issue issue = Issue.builder().id("ISS001").build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));

        Issue result = issueService.getIssueWithComments("ISS001");

        assertNotNull(result);
        assertEquals("ISS001", result.getId());
    }

    @Test
    @DisplayName("Should throw exception when issue not found")
    void getIssueWithComments_NotFound() {
        when(issueRepository.findById("MISSING")).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> issueService.getIssueWithComments("MISSING")
        );
    }

    // ==================== Comment Tests ====================

    @Test
    @DisplayName("Should add comment without status change")
    void addComment_NoStatusChange() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.OPEN).orderedProductId(testProductId).build();
        User commenter = User.builder().id("COMMENTER01").name("Commenter").build();
        IssueComment savedComment = IssueComment.builder()
                .id(UUID.randomUUID())
                .issueId("ISS001")
                .text("Test comment")
                .build();

        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("COMMENTER01")).thenReturn(Optional.of(commenter));
        when(issueCommentRepository.save(any(IssueComment.class))).thenReturn(savedComment);

        IssueComment result = issueService.addComment("ISS001", "Test comment", "COMMENTER01", null);

        assertNotNull(result);
        assertEquals("Test comment", result.getText());
        verify(issueCommentRepository).save(any(IssueComment.class));
    }

    @Test
    @DisplayName("Should add comment with status change")
    void addComment_WithStatusChange() {
        Issue issue = Issue.builder()
                .id("ISS001")
                .status(IssueStatus.OPEN)
                .orderedProductId(testProductId)
                .build();
        User commenter = User.builder().id("COMMENTER01").name("Commenter").build();
        IssueComment savedComment = IssueComment.builder()
                .id(UUID.randomUUID())
                .issueId("ISS001")
                .text("Fixed")
                .status(IssueStatus.RESOLVED)
                .build();

        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("COMMENTER01")).thenReturn(Optional.of(commenter));
        when(issueCommentRepository.save(any(IssueComment.class))).thenReturn(savedComment);

        IssueComment result = issueService.addComment("ISS001", "Fixed", "COMMENTER01", IssueStatus.RESOLVED);

        assertNotNull(result);
        assertEquals("Fixed", result.getText());
        verify(issueRepository).save(any(Issue.class));
    }

    @Test
    @DisplayName("Should reject empty comment")
    void addComment_EmptyText_Fails() {
        Issue issue = Issue.builder().id("ISS001").build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("COMMENTER01")).thenReturn(Optional.of(User.builder().id("COMMENTER01").build()));

        assertThrows(
                BadRequestException.class,
                () -> issueService.addComment("ISS001", "  ", "COMMENTER01", null)
        );

        verify(issueCommentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should throw exception if issue not found")
    void addComment_IssueNotFound_Fails() {
        when(issueRepository.findById("MISSING")).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> issueService.addComment("MISSING", "Comment", "COMMENTER01", null)
        );
    }

    @Test
    @DisplayName("Should throw exception if user not found")
    void addComment_UserNotFound_Fails() {
        Issue issue = Issue.builder().id("ISS001").build();
        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("MISSING")).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> issueService.addComment("ISS001", "Comment", "MISSING", null)
        );
    }

    @Test
    @DisplayName("Should trim whitespace from comment")
    void addComment_TrimsWhitespace() {
        Issue issue = Issue.builder().id("ISS001").build();
        User commenter = User.builder().id("COMMENTER01").build();
        IssueComment savedComment = IssueComment.builder()
                .id(UUID.randomUUID())
                .issueId("ISS001")
                .text("Trimmed comment")
                .build();

        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("COMMENTER01")).thenReturn(Optional.of(commenter));
        when(issueCommentRepository.save(any(IssueComment.class))).thenReturn(savedComment);

        issueService.addComment("ISS001", "  Trimmed comment  ", "COMMENTER01", null);

        ArgumentCaptor<IssueComment> captor = ArgumentCaptor.forClass(IssueComment.class);
        verify(issueCommentRepository).save(captor.capture());
        assertEquals("Trimmed comment", captor.getValue().getText());
    }

    // ==================== Status Transition Tests ====================

    @Test
    @DisplayName("Should allow transition from OPEN to IN_PROGRESS")
    void statusTransition_OpenToProgress_Success() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.OPEN).orderedProductId(testProductId).build();
        User commenter = User.builder().id("COMMENTER01").build();

        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("COMMENTER01")).thenReturn(Optional.of(commenter));
        when(issueCommentRepository.save(any(IssueComment.class))).thenAnswer(inv -> inv.getArgument(0));

        IssueComment result = issueService.addComment("ISS001", "Working on it", "COMMENTER01", IssueStatus.IN_PROGRESS);

        assertNotNull(result);
        assertEquals(IssueStatus.IN_PROGRESS, result.getStatus());
    }

    @Test
    @DisplayName("Should allow transition from IN_PROGRESS to RESOLVED")
    void statusTransition_ProgressToResolved_Success() {
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.IN_PROGRESS).build();
        User commenter = User.builder().id("COMMENTER01").build();

        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("COMMENTER01")).thenReturn(Optional.of(commenter));
        when(issueCommentRepository.save(any(IssueComment.class))).thenAnswer(inv -> inv.getArgument(0));

        IssueComment result = issueService.addComment("ISS001", "Fixed", "COMMENTER01", IssueStatus.RESOLVED);

        assertNotNull(result);
    }

    @Test
    @DisplayName("Should reject invalid status transition")
    void statusTransition_Invalid_Fails() {
        // CLOSED does not allow transition to OPEN
        Issue issue = Issue.builder().id("ISS001").status(IssueStatus.CLOSED).build();
        User commenter = User.builder().id("COMMENTER01").build();

        when(issueRepository.findById("ISS001")).thenReturn(Optional.of(issue));
        when(userRepository.findById("COMMENTER01")).thenReturn(Optional.of(commenter));

        assertThrows(
                BadRequestException.class,
                () -> issueService.addComment("ISS001", "Reopening", "COMMENTER01", IssueStatus.OPEN)
        );

        verify(issueCommentRepository, never()).save(any());
    }

    // ==================== Comment Retrieval Tests ====================

    @Test
    @DisplayName("Should retrieve issue comments")
    void getIssueComments_Success() {
        IssueComment comment1 = IssueComment.builder().id(UUID.randomUUID()).text("Comment 1").build();
        IssueComment comment2 = IssueComment.builder().id(UUID.randomUUID()).text("Comment 2").build();

        when(issueCommentRepository.findByIssueIdOrderByCreatedAtDescWithUser("ISS001"))
                .thenReturn(List.of(comment1, comment2));

        List<IssueComment> results = issueService.getIssueComments("ISS001");

        assertEquals(2, results.size());
    }

    @Test
    @DisplayName("Should get issue products by issue ID")
    void getIssueProducts_Success() {
        OrderProduct product1 = OrderProduct.builder().id(UUID.randomUUID()).build();
        OrderProduct product2 = OrderProduct.builder().id(UUID.randomUUID()).build();

        when(issueRepository.findOrderProductsByIssueId("ISS001")).thenReturn(List.of(product1, product2));

        List<OrderProduct> results = issueService.getIssueProductsByIssueId("ISS001");

        assertEquals(2, results.size());
    }
}
