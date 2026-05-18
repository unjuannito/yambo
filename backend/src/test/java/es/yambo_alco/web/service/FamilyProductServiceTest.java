package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.FamilyProduct;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.Project;
import es.yambo_alco.web.model.enums.FamilyProductStatus;

import es.yambo_alco.web.service.FamilyProductService.FamilyProductUpdateResult;
import es.yambo_alco.web.service.OrderService.PendingOrderEmail;
import es.yambo_alco.web.repository.FamilyProductRepository;
import es.yambo_alco.web.repository.ProfileRepository;
import es.yambo_alco.web.repository.ProjectRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class FamilyProductServiceTest {

    @Mock
    private FamilyProductRepository familyProductRepository;

    @Mock
    private ProfileRepository profileRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private OrderService orderService;

    @Mock
    private BatchEmailService batchEmailService;

    @InjectMocks
    private FamilyProductService familyProductService;

    @Test
    void createFamilyProduct_WhenStartAfterEnd_ShouldThrowException() {
        LocalDateTime start = LocalDateTime.now().plusDays(2);
        LocalDateTime end = LocalDateTime.now().plusDays(1);

        BadRequestException exception = assertThrows(BadRequestException.class,
                                () -> familyProductService.createFamilyProduct("Drop", start, end, null));

        assertEquals("Start date must be before end date", exception.getMessage());
        verify(familyProductRepository, never()).save(any());
    }

    @Test
    void createFamilyProduct_WhenValid_ShouldCreate() {
        LocalDateTime start = LocalDateTime.now().minusDays(1);
        LocalDateTime end = LocalDateTime.now().plusDays(10);
        Project project = Project.builder().id("PRJ001").build();

        when(familyProductRepository.existsByName("Drop")).thenReturn(false);
                when(profileRepository.save(any(Profile.class))).thenAnswer(invocation -> {
                        Profile p = invocation.getArgument(0);
                        p.setId("BASIC");
                        return p;
                });
        when(projectRepository.findById("PRJ001")).thenReturn(Optional.of(project));
        when(familyProductRepository.save(any(FamilyProduct.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FamilyProduct result = familyProductService.createFamilyProduct(
                "Drop",
                start,
                end,
                Set.of("PRJ001")
        );

        assertEquals("Drop", result.getName());
        assertEquals(start, result.getStartTms());
        assertEquals(end, result.getEndTms());
                assertNotNull(result.getProfile());
                assertEquals("BASIC", result.getProfile().getId());
        assertEquals(1, result.getProjects().size());
        verify(familyProductRepository).save(any(FamilyProduct.class));
    }

    @Test
    void updateFamilyProduct_WhenStartAfterEnd_ShouldThrowException() {
        FamilyProduct familyProduct = FamilyProduct.builder()
                .id("FAM001")
                .name("Drop")
                .startTms(LocalDateTime.now())
                .endTms(LocalDateTime.now().plusDays(1))
                .build();

        when(familyProductRepository.findById("FAM001")).thenReturn(Optional.of(familyProduct));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> familyProductService.updateFamilyProduct(
                        "FAM001",
                        null,
                        LocalDateTime.now().plusDays(3),
                        LocalDateTime.now().plusDays(2),
                        null
                ));

        assertEquals("Start date must be before end date", exception.getMessage());
        verify(familyProductRepository, never()).save(any());
    }

    @Test
    void assignProjectsToFamily_WhenProjectMissing_ShouldThrowException() {
        FamilyProduct familyProduct = FamilyProduct.builder().id("FAM001").build();
        when(familyProductRepository.findById("FAM001")).thenReturn(Optional.of(familyProduct));
        when(projectRepository.findById("PRJ404")).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> familyProductService.assignProjectsToFamily("FAM001", Set.of("PRJ404")));

        assertEquals("Project not found: PRJ404", exception.getMessage());
    }

    // Status transition tests

    @Test
    void updateFamilyProductStatus_SameStatus_ShouldReturnWithoutChanges() {
        FamilyProduct fp = FamilyProduct.builder()
                .id("FAM001").status(FamilyProductStatus.OPEN).build();
        when(familyProductRepository.findById("FAM001")).thenReturn(Optional.of(fp));

        FamilyProductUpdateResult result = familyProductService.updateFamilyProductStatus("FAM001", FamilyProductStatus.OPEN);

        assertEquals(FamilyProductStatus.OPEN, result.familyProduct().getStatus());
        assertTrue(result.pendingEmails().isEmpty());
        verify(familyProductRepository, never()).save(any());
        verify(orderService, never()).updateOrderStatusByFamilyProduct(any(), any());
    }

    @Test
    void updateFamilyProductStatus_OpenToOrderClosed_ShouldSucceed() {
        FamilyProduct fp = FamilyProduct.builder()
                .id("FAM001").status(FamilyProductStatus.OPEN).build();
        when(familyProductRepository.findById("FAM001")).thenReturn(Optional.of(fp));
        when(familyProductRepository.save(any(FamilyProduct.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderService.updateOrderStatusByFamilyProduct("FAM001", FamilyProductStatus.ORDER_CLOSED))
                .thenReturn(List.of());

        FamilyProductUpdateResult result = familyProductService.updateFamilyProductStatus("FAM001", FamilyProductStatus.ORDER_CLOSED);

        assertEquals(FamilyProductStatus.ORDER_CLOSED, result.familyProduct().getStatus());
        assertTrue(result.pendingEmails().isEmpty());
        verify(orderService).updateOrderStatusByFamilyProduct("FAM001", FamilyProductStatus.ORDER_CLOSED);
    }

    @Test
    void updateFamilyProductStatus_OpenToCanceled_ShouldSucceed() {
        FamilyProduct fp = FamilyProduct.builder()
                .id("FAM001").status(FamilyProductStatus.OPEN).build();
        when(familyProductRepository.findById("FAM001")).thenReturn(Optional.of(fp));
        when(familyProductRepository.save(any(FamilyProduct.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderService.updateOrderStatusByFamilyProduct("FAM001", FamilyProductStatus.CANCELED))
                .thenReturn(List.of());

        FamilyProductUpdateResult result = familyProductService.updateFamilyProductStatus("FAM001", FamilyProductStatus.CANCELED);

        assertEquals(FamilyProductStatus.CANCELED, result.familyProduct().getStatus());
        verify(orderService).updateOrderStatusByFamilyProduct("FAM001", FamilyProductStatus.CANCELED);
    }

    @Test
    void updateFamilyProductStatus_OpenToPendingFabrication_ShouldThrow() {
        FamilyProduct fp = FamilyProduct.builder()
                .id("FAM001").status(FamilyProductStatus.OPEN).build();
        when(familyProductRepository.findById("FAM001")).thenReturn(Optional.of(fp));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> familyProductService.updateFamilyProductStatus("FAM001", FamilyProductStatus.PENDING_FABRICATION));

        assertTrue(ex.getMessage().contains("Cannot transition from OPEN to PENDING_FABRICATION"));
    }

    @Test
    void updateFamilyProductStatus_OrderClosedToPendingFabrication_ShouldSucceed() {
        FamilyProduct fp = FamilyProduct.builder()
                .id("FAM001").status(FamilyProductStatus.ORDER_CLOSED).build();
        when(familyProductRepository.findById("FAM001")).thenReturn(Optional.of(fp));
        when(familyProductRepository.save(any(FamilyProduct.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderService.updateOrderStatusByFamilyProduct("FAM001", FamilyProductStatus.PENDING_FABRICATION))
                .thenReturn(List.of(new PendingOrderEmail("ORD001", es.yambo_alco.web.model.enums.OrderStatus.PENDING_PRODUCTS)));

        FamilyProductUpdateResult result = familyProductService.updateFamilyProductStatus("FAM001", FamilyProductStatus.PENDING_FABRICATION);

        assertEquals(FamilyProductStatus.PENDING_FABRICATION, result.familyProduct().getStatus());
        assertEquals(1, result.pendingEmails().size());
    }

    @Test
    void updateFamilyProductStatus_DeliveredToAnything_ShouldThrow() {
        FamilyProduct fp = FamilyProduct.builder()
                .id("FAM001").status(FamilyProductStatus.DELIVERED).build();
        when(familyProductRepository.findById("FAM001")).thenReturn(Optional.of(fp));

        assertThrows(BadRequestException.class,
                () -> familyProductService.updateFamilyProductStatus("FAM001", FamilyProductStatus.OPEN));
    }

    @Test
    void updateFamilyProductStatus_CanceledToAnything_ShouldThrow() {
        FamilyProduct fp = FamilyProduct.builder()
                .id("FAM001").status(FamilyProductStatus.CANCELED).build();
        when(familyProductRepository.findById("FAM001")).thenReturn(Optional.of(fp));

        assertThrows(BadRequestException.class,
                () -> familyProductService.updateFamilyProductStatus("FAM001", FamilyProductStatus.OPEN));
    }

    @Test
    void updateFamilyProductStatus_PendingFabricationToToBeDelivered_ShouldSucceed() {
        FamilyProduct fp = FamilyProduct.builder()
                .id("FAM001").status(FamilyProductStatus.PENDING_FABRICATION).build();
        when(familyProductRepository.findById("FAM001")).thenReturn(Optional.of(fp));
        when(familyProductRepository.save(any(FamilyProduct.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderService.updateOrderStatusByFamilyProduct("FAM001", FamilyProductStatus.TO_BE_DELIVERED))
                .thenReturn(List.of());

        FamilyProductUpdateResult result = familyProductService.updateFamilyProductStatus("FAM001", FamilyProductStatus.TO_BE_DELIVERED);

        assertEquals(FamilyProductStatus.TO_BE_DELIVERED, result.familyProduct().getStatus());
    }

    @Test
    void updateFamilyProductStatus_ToBeDeliveredToDelivered_ShouldSucceed() {
        FamilyProduct fp = FamilyProduct.builder()
                .id("FAM001").status(FamilyProductStatus.TO_BE_DELIVERED).build();
        when(familyProductRepository.findById("FAM001")).thenReturn(Optional.of(fp));
        when(familyProductRepository.save(any(FamilyProduct.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderService.updateOrderStatusByFamilyProduct("FAM001", FamilyProductStatus.DELIVERED))
                .thenReturn(List.of());

        FamilyProductUpdateResult result = familyProductService.updateFamilyProductStatus("FAM001", FamilyProductStatus.DELIVERED);

        assertEquals(FamilyProductStatus.DELIVERED, result.familyProduct().getStatus());
    }

    // closeExpiredDrops tests

    @Test
    void closeExpiredDrops_WhenExpiredOpenDrops_ShouldCloseAndPropagate() {
        FamilyProduct drop1 = FamilyProduct.builder()
                .id("FAM001").status(FamilyProductStatus.OPEN)
                .endTms(LocalDateTime.now().minusHours(1)).build();
        FamilyProduct drop2 = FamilyProduct.builder()
                .id("FAM002").status(FamilyProductStatus.OPEN)
                .endTms(LocalDateTime.now().minusDays(1)).build();

        when(familyProductRepository.findByStatusAndEndTmsBefore(eq(FamilyProductStatus.OPEN), any(LocalDateTime.class)))
                .thenReturn(List.of(drop1, drop2));
        when(familyProductRepository.save(any(FamilyProduct.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderService.updateOrderStatusByFamilyProduct("FAM001", FamilyProductStatus.ORDER_CLOSED))
                .thenReturn(List.of(new PendingOrderEmail("ORD001", es.yambo_alco.web.model.enums.OrderStatus.PENDING_PRODUCTS)));
        when(orderService.updateOrderStatusByFamilyProduct("FAM002", FamilyProductStatus.ORDER_CLOSED))
                .thenReturn(List.of());

        familyProductService.closeExpiredDrops();

        assertEquals(FamilyProductStatus.ORDER_CLOSED, drop1.getStatus());
        assertEquals(FamilyProductStatus.ORDER_CLOSED, drop2.getStatus());
        verify(familyProductRepository, times(2)).save(any(FamilyProduct.class));
        verify(orderService).updateOrderStatusByFamilyProduct("FAM001", FamilyProductStatus.ORDER_CLOSED);
        verify(orderService).updateOrderStatusByFamilyProduct("FAM002", FamilyProductStatus.ORDER_CLOSED);
        verify(batchEmailService).processBatchOrderEmails(anyString(), isNull(), anyList());
    }

    @Test
    void closeExpiredDrops_WhenNoExpiredDrops_ShouldDoNothing() {
        when(familyProductRepository.findByStatusAndEndTmsBefore(eq(FamilyProductStatus.OPEN), any(LocalDateTime.class)))
                .thenReturn(List.of());

        familyProductService.closeExpiredDrops();

        verify(familyProductRepository, never()).save(any());
        verify(orderService, never()).updateOrderStatusByFamilyProduct(any(), any());
        verify(batchEmailService, never()).processBatchOrderEmails(any(), any(), anyList());
    }
}
