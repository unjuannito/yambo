package es.yambo_alco.web.service;

import es.yambo_alco.web.model.Permission;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.repository.PermissionRepository;
import es.yambo_alco.web.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final PermissionRepository permissionRepository;

    public List<Profile> getAllProfiles() {
        return profileRepository.findAll();
    }

    public Profile getProfileById(String id) {
        return profileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Profile not found: " + id));
    }

    public List<Permission> getAllPermissions() {
        return permissionRepository.findAll();
    }

    @Transactional
    public Profile updateProfilePermissions(String profileId, Set<String> permissionIds) {
        Profile profile = getProfileById(profileId);
        
        Set<Permission> permissions = new HashSet<>();
        for (String permissionId : permissionIds) {
            Permission permission = permissionRepository.findById(permissionId)
                    .orElseThrow(() -> new RuntimeException("Permission not found: " + permissionId));
            permissions.add(permission);
        }
        
        profile.setPermissions(permissions);
        return profileRepository.save(profile);
    }

    @Transactional
    public Profile createProfile(String profileId, Set<String> permissionIds) {
        if (profileRepository.existsById(profileId)) {
            throw new RuntimeException("Profile already exists: " + profileId);
        }

        Set<Permission> permissions = new HashSet<>();
        if (permissionIds != null) {
            for (String permissionId : permissionIds) {
                Permission permission = permissionRepository.findById(permissionId)
                        .orElseThrow(() -> new RuntimeException("Permission not found: " + permissionId));
                permissions.add(permission);
            }
        }

        Profile profile = Profile.builder()
                .id(profileId)
                .permissions(permissions)
                .build();

        return profileRepository.save(profile);
    }

    @Transactional
    public void deleteProfile(String profileId) {
        Profile profile = getProfileById(profileId);
        profileRepository.delete(profile);
    }
}
