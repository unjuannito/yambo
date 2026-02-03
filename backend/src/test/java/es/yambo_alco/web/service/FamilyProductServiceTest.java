package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.FamilyProduct;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.Project;
import es.yambo_alco.web.repository.FamilyProductRepository;
import es.yambo_alco.web.repository.ProfileRepository;
import es.yambo_alco.web.repository.ProjectRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
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
}
