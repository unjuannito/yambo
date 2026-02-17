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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
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

    @InjectMocks
    private IssueService issueService;

    private UUID orderedProductId;
    private OrderProduct orderProduct;

    @BeforeEach
    void setUp() {
        orderedProductId = UUID.randomUUID();
        orderProduct = OrderProduct.builder()
                .id(orderedProductId)
                .orderId("ORD001")
                .build();
    }

    @Test
    void createIssue_WhenOrderIsOutsideWindow_ShouldThrowBadRequest() {
        when(orderProductRepository.findAllById(Set.of(orderedProductId))).thenReturn(List.of(orderProduct));
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(
                Order.builder()
                        .id("ORD001")
                        .customerId("CUS001")
                        .status(OrderStatus.DELIVERED)
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
        User creator = User.builder().id("USR001").name("Creador").build();

        when(orderProductRepository.findAllById(Set.of(orderedProductId))).thenReturn(List.of(orderProduct));
        when(orderRepository.findById("ORD001")).thenReturn(Optional.of(
                Order.builder()
                        .id("ORD001")
                        .customerId("CUS001")
                        .status(OrderStatus.IN_PROGRESS)
                        .closedAt(null)
                        .build()
        ));
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
                        "Título",
                        "Descripción",
                        "USR001"
                ));

        assertEquals("All ordered products in an issue must belong to the same order", exception.getMessage());
        verify(issueRepository, never()).save(any());
    }

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
                .orderedProductId(orderedProductId)
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
    void getIssueProductsByIssueId_WhenIssueNotExists_ShouldThrowNotFound() {
        when(issueRepository.findOrderProductsByIssueId("MISSING")).thenReturn(List.of());
        when(issueRepository.findById("MISSING")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> issueService.getIssueProductsByIssueId("MISSING"));
    }
}
