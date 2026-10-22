package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.model.Permission;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.repository.PermissionRepository;
import es.yambo_alco.web.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final PermissionRepository permissionRepository;

    @Cacheable(value = "profiles", key = "'all'")
    public List<Profile> getAllProfiles() {
        return profileRepository.findAll();
    }

    public Page<Profile> listProfiles(String query, String search, List<String> permissionIds, Pageable pageable) {
        Specification<Profile> spec = Specification.where(null);

        if (query != null && !query.isBlank()) {
            String pattern = "%" + query.toLowerCase() + "%";
            spec = spec.and((root, q, cb) -> cb.or(
                    cb.like(cb.lower(root.get("id")), pattern),
                    cb.like(cb.lower(root.get("name")), pattern)
            ));
        }

        Page<Profile> profiles = profileRepository.findAll(spec, pageable);

        if (search != null && !search.trim().isEmpty()) {
            String searchLower = search.toLowerCase();
            profiles = profiles.map(profile -> {
                boolean matches = profile.getId().toLowerCase().contains(searchLower) ||
                        (profile.getName() != null && profile.getName().toLowerCase().contains(searchLower));
                return matches ? profile : null;
            });
            List<Profile> filtered = profiles.getContent().stream()
                    .filter(p -> p != null)
                    .collect(Collectors.toList());
            return new org.springframework.data.domain.PageImpl<>(filtered, pageable, filtered.size());
        }

        if (permissionIds != null && !permissionIds.isEmpty()) {
            List<Profile> filtered = profiles.getContent().stream()
                    .filter(profile -> profile.getPermissions().stream()
                            .anyMatch(perm -> permissionIds.contains(perm.getId())))
                    .collect(Collectors.toList());
            return new org.springframework.data.domain.PageImpl<>(filtered, pageable, filtered.size());
        }

        return profiles;
    }

    public Profile getProfileById(String id) {
        return profileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Profile not found: " + id));
    }

    public List<Permission> getAllPermissions() {
        return permissionRepository.findAll();
    }

    @CacheEvict(value = "profiles", allEntries = true)
    @Transactional
    public Profile updateProfilePermissions(String profileId, Set<String> permissionIds) {
        Profile profile = getProfileById(profileId);

        if (profile.isSystem()) {
            throw new BadRequestException("Cannot modify permissions of a system profile");
        }

        Set<Permission> permissions = new HashSet<>();
        for (String permissionId : permissionIds) {
            Permission permission = permissionRepository.findById(permissionId)
                    .orElseThrow(() -> new RuntimeException("Permission not found: " + permissionId));
            permissions.add(permission);
        }

        profile.setPermissions(permissions);
        return profileRepository.save(profile);
    }

    @CacheEvict(value = "profiles", allEntries = true)
    @Transactional
    public Profile updateProfile(String profileId, String name, Set<String> permissionIds) {
        Profile profile = getProfileById(profileId);

        if (profile.isSystem()) {
            throw new BadRequestException("Cannot modify a system profile");
        }

        if (name != null && !name.isBlank()) {
            profile.setName(name);
        }

        if (permissionIds != null) {
            Set<Permission> permissions = new HashSet<>();
            for (String permissionId : permissionIds) {
                Permission permission = permissionRepository.findById(permissionId)
                        .orElseThrow(() -> new RuntimeException("Permission not found: " + permissionId));
                permissions.add(permission);
            }
            profile.setPermissions(permissions);
        }

        return profileRepository.save(profile);
    }

    @CacheEvict(value = "profiles", allEntries = true)
    @Transactional
    public Profile createProfile(String name, Set<String> permissionIds) {
        Set<Permission> permissions = new HashSet<>();
        if (permissionIds != null) {
            for (String permissionId : permissionIds) {
                Permission permission = permissionRepository.findById(permissionId)
                        .orElseThrow(() -> new RuntimeException("Permission not found: " + permissionId));
                permissions.add(permission);
            }
        }

        Profile profile = Profile.builder()
                .id(es.yambo_alco.web.util.IdGenerator.generateId())
                .name(name)
                .permissions(permissions)
                .build();

        return profileRepository.save(profile);
    }

    @CacheEvict(value = "profiles", allEntries = true)
    @Transactional
    public void deleteProfile(String profileId) {
        Profile profile = getProfileById(profileId);
        if (profile.isSystem()) {
            throw new BadRequestException("Cannot delete a system profile");
        }
        profileRepository.delete(profile);
    }
}
