package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.FamilyProduct;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.repository.FamilyProductRepository;
import es.yambo_alco.web.repository.ProfileRepository;
import es.yambo_alco.web.repository.spec.FamilyProductSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class FamilyProductService {

    private final FamilyProductRepository familyProductRepository;
    private final ProfileRepository profileRepository;

    @Transactional
    public FamilyProduct createFamilyProduct(@NonNull String name, @NonNull LocalDateTime endTms, 
                                             Set<String> profileIds) {
        // Validate name uniqueness
        if (familyProductRepository.existsByName(name)) {
            throw new BadRequestException("Family product name already exists");
        }

        // Validate end date is in the future
        if (endTms.isBefore(LocalDateTime.now())) {
            throw new BadRequestException("End date must be in the future");
        }

        // Validate and fetch profiles
        Set<Profile> profiles = new HashSet<>();
        if (profileIds != null && !profileIds.isEmpty()) {
            for (String profileId : profileIds) {
                Profile profile = profileRepository.findById(profileId)
                        .orElseThrow(() -> new ResourceNotFoundException("Profile not found: " + profileId));
                profiles.add(profile);
            }
        }

        FamilyProduct familyProduct = FamilyProduct.builder()
                .name(name)
                .endTms(endTms)
                .profiles(profiles)
                .build();

        return familyProductRepository.save(familyProduct);
    }

    public FamilyProduct getFamilyProductById(@NonNull String id) {
        return familyProductRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Family product not found"));
    }

    public Page<FamilyProduct> listFamilyProducts(String name, Boolean active, String profileId,
                                                   @NonNull Pageable pageable) {
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

        return familyProductRepository.findAll(spec, pageable);
    }

    @Transactional
    public FamilyProduct updateFamilyProduct(@NonNull String id, String name, LocalDateTime endTms) {
        FamilyProduct familyProduct = getFamilyProductById(id);

        if (name != null && !name.trim().isEmpty()) {
            if (!name.equals(familyProduct.getName()) && familyProductRepository.existsByName(name)) {
                throw new BadRequestException("Family product name already exists");
            }
            familyProduct.setName(name.trim());
        }

        if (endTms != null) {
            familyProduct.setEndTms(endTms);
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
    public FamilyProduct assignProfilesToFamily(@NonNull String familyId, @NonNull Set<String> profileIds) {
        FamilyProduct familyProduct = getFamilyProductById(familyId);

        // Validate and fetch profiles
        Set<Profile> profiles = new HashSet<>();
        for (String profileId : profileIds) {
            Profile profile = profileRepository.findById(profileId)
                    .orElseThrow(() -> new ResourceNotFoundException("Profile not found: " + profileId));
            profiles.add(profile);
        }

        familyProduct.setProfiles(profiles);
        return familyProductRepository.save(familyProduct);
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
}
