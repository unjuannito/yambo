package es.yambo_alco.web.service;

import es.yambo_alco.web.dto.ws.BatchCompleteMessage;
import es.yambo_alco.web.dto.ws.BatchProgressMessage;
import es.yambo_alco.web.model.NominativeInvitation;
import es.yambo_alco.web.model.Order;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.service.OrderService.PendingOrderEmail;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BatchEmailServiceTest {

    @Mock
    private NominativeInvitationService nominativeInvitationService;

    @Mock
    private OrderService orderService;

    @Mock
    private BatchProgressNotifier progressNotifier;

    @InjectMocks
    private BatchEmailService batchEmailService;

    private NominativeInvitation buildInvitation(String email, String token) {
        LocalDateTime now = LocalDateTime.now();
        return NominativeInvitation.builder()
                .email(email)
                .token(token)
                .createdAt(now)
                .expiresAt(now.plusHours(72))
                .build();
    }

    @Test
    void processBatchInvitations_ShouldSendEmailForEachInvitation() {
        List<NominativeInvitation> invitations = List.of(
                buildInvitation("a@test.com", "tok1"),
                buildInvitation("b@test.com", "tok2"));

        batchEmailService.processBatchInvitations("batch-1", "admin", invitations);

        verify(nominativeInvitationService).sendInvitationEmail(eq("a@test.com"), eq("tok1"), eq(72L));
        verify(nominativeInvitationService).sendInvitationEmail(eq("b@test.com"), eq("tok2"), eq(72L));
    }

    @Test
    void processBatchInvitations_ShouldSendProgressForEachEmail() {
        List<NominativeInvitation> invitations = List.of(
                buildInvitation("a@test.com", "tok1"),
                buildInvitation("b@test.com", "tok2"));

        batchEmailService.processBatchInvitations("batch-1", "admin", invitations);

        verify(progressNotifier).sendProgress("admin", "batch-1", 1, 2, "a@test.com", true, null);
        verify(progressNotifier).sendProgress("admin", "batch-1", 2, 2, "b@test.com", true, null);
    }

    @Test
    void processBatchInvitations_ShouldSendCompleteMessage() {
        List<NominativeInvitation> invitations = List.of(
                buildInvitation("a@test.com", "tok1"));

        batchEmailService.processBatchInvitations("batch-1", "admin", invitations);

        verify(progressNotifier).sendComplete(eq("admin"), eq("batch-1"), eq(1), eq(1), eq(0), anyList());
    }

    @Test
    void processBatchInvitations_WhenEmailFails_ShouldRecordFailure() {
        List<NominativeInvitation> invitations = List.of(
                buildInvitation("fail@test.com", "tok1"),
                buildInvitation("ok@test.com", "tok2"));

        doThrow(new RuntimeException("SMTP error"))
                .when(nominativeInvitationService).sendInvitationEmail(eq("fail@test.com"), anyString(), anyLong());

        batchEmailService.processBatchInvitations("batch-1", "admin", invitations);

        verify(progressNotifier).sendProgress("admin", "batch-1", 1, 2, "fail@test.com", false, "SMTP error");
        verify(progressNotifier).sendProgress("admin", "batch-1", 2, 2, "ok@test.com", true, null);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<BatchCompleteMessage.FailureDetail>> failuresCaptor =
                ArgumentCaptor.forClass(List.class);
        verify(progressNotifier).sendComplete(eq("admin"), eq("batch-1"), eq(2), eq(1), eq(1),
                failuresCaptor.capture());

        List<BatchCompleteMessage.FailureDetail> failures = failuresCaptor.getValue();
        assertThat(failures).hasSize(1);
        assertThat(failures.get(0).identifier()).isEqualTo("fail@test.com");
    }

    @Test
    void processBatchInvitations_WithEmptyList_ShouldOnlySendComplete() {
        batchEmailService.processBatchInvitations("batch-1", "admin", List.of());

        verify(nominativeInvitationService, never()).sendInvitationEmail(anyString(), anyString(), anyLong());
        verify(progressNotifier, never()).sendProgress(any(), any(), anyInt(), anyInt(), any(), anyBoolean(), any());
        verify(progressNotifier).sendComplete(eq("admin"), eq("batch-1"), eq(0), eq(0), eq(0), anyList());
    }

    @Test
    void processBatchInvitations_ShouldUseBatchIdInMessages() {
        List<NominativeInvitation> invitations = List.of(
                buildInvitation("a@test.com", "tok1"));

        batchEmailService.processBatchInvitations("my-batch-id", "admin", invitations);

        verify(progressNotifier).sendProgress("admin", "my-batch-id", 1, 1, "a@test.com", true, null);
        verify(progressNotifier).sendComplete(eq("admin"), eq("my-batch-id"), eq(1), eq(1), eq(0), anyList());
    }

    // ---- processBatchOrderEmails tests ----

    @Test
    void processBatchOrderEmails_ShouldSendEmailForEachOrder() {
        Order order1 = Order.builder().id("ORD001").customerId("USER001").build();
        Order order2 = Order.builder().id("ORD002").customerId("USER002").build();
        when(orderService.getOrderById("ORD001")).thenReturn(order1);
        when(orderService.getOrderById("ORD002")).thenReturn(order2);

        List<PendingOrderEmail> pending = List.of(
                new PendingOrderEmail("ORD001", OrderStatus.PENDING_PRODUCTS),
                new PendingOrderEmail("ORD002", OrderStatus.CLOSED));

        batchEmailService.processBatchOrderEmails("batch-1", "admin", pending);

        verify(orderService).sendOrderStatusUpdateEmail(order1, OrderStatus.PENDING_PRODUCTS);
        verify(orderService).sendOrderStatusUpdateEmail(order2, OrderStatus.CLOSED);
    }

    @Test
    void processBatchOrderEmails_ShouldSendProgressAndComplete() {
        Order order = Order.builder().id("ORD001").customerId("USER001").build();
        when(orderService.getOrderById("ORD001")).thenReturn(order);

        List<PendingOrderEmail> pending = List.of(
                new PendingOrderEmail("ORD001", OrderStatus.PENDING_PRODUCTS));

        batchEmailService.processBatchOrderEmails("batch-1", "admin", pending);

        verify(progressNotifier).sendProgress("admin", "batch-1", 1, 1, "ORD001", true, null);
        verify(progressNotifier).sendComplete(eq("admin"), eq("batch-1"), eq(1), eq(1), eq(0), anyList());
    }

    @Test
    void processBatchOrderEmails_WhenUsernameNull_ShouldStillCallNotifier() {
        Order order = Order.builder().id("ORD001").customerId("USER001").build();
        when(orderService.getOrderById("ORD001")).thenReturn(order);

        List<PendingOrderEmail> pending = List.of(
                new PendingOrderEmail("ORD001", OrderStatus.PENDING_PRODUCTS));

        batchEmailService.processBatchOrderEmails("batch-1", null, pending);

        verify(orderService).sendOrderStatusUpdateEmail(order, OrderStatus.PENDING_PRODUCTS);
        verify(progressNotifier).sendProgress(isNull(), eq("batch-1"), eq(1), eq(1), eq("ORD001"), eq(true), isNull());
        verify(progressNotifier).sendComplete(isNull(), eq("batch-1"), eq(1), eq(1), eq(0), anyList());
    }

    @Test
    void processBatchOrderEmails_WhenEmailFails_ShouldRecordFailure() {
        Order order = Order.builder().id("ORD001").customerId("USER001").build();
        when(orderService.getOrderById("ORD001")).thenReturn(order);
        doThrow(new RuntimeException("SMTP error"))
                .when(orderService).sendOrderStatusUpdateEmail(order, OrderStatus.PENDING_PRODUCTS);

        List<PendingOrderEmail> pending = List.of(
                new PendingOrderEmail("ORD001", OrderStatus.PENDING_PRODUCTS));

        batchEmailService.processBatchOrderEmails("batch-1", "admin", pending);

        verify(progressNotifier).sendProgress("admin", "batch-1", 1, 1, "ORD001", false, "SMTP error");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<BatchCompleteMessage.FailureDetail>> failuresCaptor =
                ArgumentCaptor.forClass(List.class);
        verify(progressNotifier).sendComplete(eq("admin"), eq("batch-1"), eq(1), eq(0), eq(1),
                failuresCaptor.capture());

        assertThat(failuresCaptor.getValue()).hasSize(1);
        assertThat(failuresCaptor.getValue().get(0).identifier()).isEqualTo("ORD001");
    }

    @Test
    void processBatchOrderEmails_WithEmptyList_ShouldOnlySendComplete() {
        batchEmailService.processBatchOrderEmails("batch-1", "admin", List.of());

        verify(orderService, never()).getOrderById(any());
        verify(orderService, never()).sendOrderStatusUpdateEmail(any(), any());
        verify(progressNotifier, never()).sendProgress(any(), any(), anyInt(), anyInt(), any(), anyBoolean(), any());
        verify(progressNotifier).sendComplete(eq("admin"), eq("batch-1"), eq(0), eq(0), eq(0), anyList());
    }
}
