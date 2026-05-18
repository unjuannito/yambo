package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.FamilyProduct;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.Project;
import es.yambo_alco.web.model.enums.FamilyProductStatus;
import es.yambo_alco.web.service.OrderService.PendingOrderEmail;
import es.yambo_alco.web.repository.FamilyProductRepository;
import es.yambo_alco.web.repository.ProfileRepository;
import es.yambo_alco.web.repository.ProjectRepository;
import es.yambo_alco.web.repository.spec.FamilyProductSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FamilyProductService {

    private final FamilyProductRepository familyProductRepository;
    private final ProfileRepository profileRepository;
    private final ProjectRepository projectRepository;
    private final OrderService orderService;
    private final BatchEmailService batchEmailService;

    public record FamilyProductUpdateResult(FamilyProduct familyProduct, List<PendingOrderEmail> pendingEmails) {}

    @Transactional
    public FamilyProduct createFamilyProduct(@NonNull String name, @NonNull LocalDateTime startTms,
            @NonNull LocalDateTime endTms,
            Set<String> projectIds) {
        if (familyProductRepository.existsByName(name)) {
            throw new BadRequestException("Family product name already exists");
        }

        if (startTms.isAfter(endTms)) {
            throw new BadRequestException("Start date must be before end date");
        }

        Profile profile = createProfileForFamily(name);
        Set<Project> projects = resolveProjects(projectIds);

        FamilyProduct familyProduct = FamilyProduct.builder()
                .name(name)
                .startTms(startTms)
                .endTms(endTms)
                .profile(profile)
                .projects(projects)
                .build();

        return familyProductRepository.save(familyProduct);
    }

    public FamilyProduct getFamilyProductById(@NonNull String id) {
        return familyProductRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Family product not found"));
    }

    public Page<FamilyProduct> listFamilyProducts(String name, Boolean active, String profileId,
            Set<String> userProfileIds, @NonNull Pageable pageable) {
        Specification<FamilyProduct> spec = Specification.where(null);

        if (name != null) {
            spec = spec.and(FamilyProductSpecifications.nameContains(name));
        }
        if (active != null) {
            if (active) {
                spec = spec.and(FamilyProductSpecifications.active());
            } else {
                spec = spec.and(FamilyProductSpecifications.expired());
            }
        }
        if (profileId != null) {
            spec = spec.and(FamilyProductSpecifications.hasProfileId(profileId));
        }
        if (userProfileIds != null) {
            spec = spec.and(FamilyProductSpecifications.hasAnyProfile(userProfileIds));
        }

        return familyProductRepository.findAll(spec, pageable);
    }

    @Transactional
    public FamilyProduct updateFamilyProduct(@NonNull String id, String name, LocalDateTime startTms,
            LocalDateTime endTms, Set<String> projectIds) {
        FamilyProduct familyProduct = getFamilyProductById(id);

        if (name != null && !name.trim().isEmpty()) {
            if (!name.equals(familyProduct.getName()) && familyProductRepository.existsByName(name)) {
                throw new BadRequestException("Family product name already exists");
            }
            familyProduct.setName(name.trim());
            if (familyProduct.getProfile() != null) {
                familyProduct.getProfile().setName(name.trim());
            }
        }

        if (startTms != null) {
            familyProduct.setStartTms(startTms);
        }

        if (endTms != null) {
            familyProduct.setEndTms(endTms);
        }

        if (familyProduct.getStartTms() != null && familyProduct.getEndTms() != null
                && familyProduct.getStartTms().isAfter(familyProduct.getEndTms())) {
            throw new BadRequestException("Start date must be before end date");
        }

        if (projectIds != null) {
            familyProduct.setProjects(resolveProjects(projectIds));
        }

        return familyProductRepository.save(familyProduct);
    }

    @Transactional
    public void deleteFamilyProduct(@NonNull String id) {
        FamilyProduct familyProduct = getFamilyProductById(id);
        // TODO: Check if family has associated products and handle accordingly
        familyProductRepository.delete(familyProduct);
    }

    @Transactional
    public FamilyProduct assignProfileToFamily(@NonNull String familyId, @NonNull String profileId) {
        FamilyProduct familyProduct = getFamilyProductById(familyId);
        Profile profile = profileRepository.findById(profileId)
                .orElseThrow(() -> new ResourceNotFoundException("Profile not found: " + profileId));
        familyProduct.setProfile(profile);
        return familyProductRepository.save(familyProduct);
    }

    @Transactional
    public FamilyProduct assignProjectsToFamily(@NonNull String familyId, @NonNull Set<String> projectIds) {
        FamilyProduct familyProduct = getFamilyProductById(familyId);
        familyProduct.setProjects(resolveProjects(projectIds));
        return familyProductRepository.save(familyProduct);
    }

    private Profile createProfileForFamily(String familyName) {
        Profile profile = Profile.builder()
                .name(familyName)
                .permissions(Set.of())
                .build();
        return profileRepository.save(profile);
    }

    private Set<Project> resolveProjects(Set<String> projectIds) {
        Set<Project> projects = new HashSet<>();
        if (projectIds != null && !projectIds.isEmpty()) {
            for (String projectId : projectIds) {
                Project project = projectRepository.findById(projectId)
                        .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + projectId));
                projects.add(project);
            }
        }
        return projects;
    }

    public List<FamilyProduct> getActiveFamilyProducts() {
        Specification<FamilyProduct> spec = FamilyProductSpecifications.active();
        return familyProductRepository.findAll(spec);
    }

    public List<FamilyProduct> getExpiredFamilyProducts() {
        Specification<FamilyProduct> spec = FamilyProductSpecifications.expired();
        return familyProductRepository.findAll(spec);
    }

    public List<FamilyProduct> getFamilyProductsByProfile(@NonNull String profileId) {
        Specification<FamilyProduct> spec = FamilyProductSpecifications.hasProfileId(profileId);
        return familyProductRepository.findAll(spec);
    }

    /**
     * Update family product status and propagate to all order products.
     * Validates allowed status transitions.
     */
    @Transactional
    public FamilyProductUpdateResult updateFamilyProductStatus(@NonNull String id, @NonNull FamilyProductStatus status) {
        FamilyProduct familyProduct = getFamilyProductById(id);

        FamilyProductStatus currentStatus = familyProduct.getStatus();
        if (currentStatus == status) {
            return new FamilyProductUpdateResult(familyProduct, List.of());
        }

        validateStatusTransition(currentStatus, status);

        familyProduct.setStatus(status);
        FamilyProduct saved = familyProductRepository.save(familyProduct);

        // Propagate status change to orders
        List<PendingOrderEmail> pendingEmails = orderService.updateOrderStatusByFamilyProduct(id, status);

        return new FamilyProductUpdateResult(saved, pendingEmails);
    }

    /**
     * Close expired OPEN drops.
     * Called by the scheduler when endTms has passed and the status is still OPEN.
     */
    @Transactional
    public void closeExpiredDrops() {
        List<FamilyProduct> expiredDrops = familyProductRepository
                .findByStatusAndEndTmsBefore(FamilyProductStatus.OPEN, LocalDateTime.now());

        List<PendingOrderEmail> allPendingEmails = new ArrayList<>();

        for (FamilyProduct drop : expiredDrops) {
            drop.setStatus(FamilyProductStatus.ORDER_CLOSED);
            familyProductRepository.save(drop);

            List<PendingOrderEmail> pendingEmails = orderService.updateOrderStatusByFamilyProduct(drop.getId(), FamilyProductStatus.ORDER_CLOSED);
            allPendingEmails.addAll(pendingEmails);
        }

        if (!allPendingEmails.isEmpty()) {
            String batchId = UUID.randomUUID().toString();
            batchEmailService.processBatchOrderEmails(batchId, null, allPendingEmails);
        }
    }

    private void validateStatusTransition(FamilyProductStatus from, FamilyProductStatus to) {
        boolean valid = switch (from) {
            case OPEN -> to == FamilyProductStatus.ORDER_CLOSED || to == FamilyProductStatus.CANCELED;
            case ORDER_CLOSED -> to == FamilyProductStatus.PENDING_FABRICATION || to == FamilyProductStatus.CANCELED;
            case PENDING_FABRICATION -> to == FamilyProductStatus.TO_BE_DELIVERED || to == FamilyProductStatus.CANCELED;
            case TO_BE_DELIVERED -> to == FamilyProductStatus.DELIVERED || to == FamilyProductStatus.CANCELED;
            case DELIVERED, CANCELED -> false;
        };

        if (!valid) {
            throw new BadRequestException(
                    String.format("Cannot transition from %s to %s", from, to));
        }
    }
}
