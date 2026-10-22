package es.yambo_alco.web.util;

import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.PermissionAction;
import es.yambo_alco.web.model.enums.PermissionResource;
import es.yambo_alco.web.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PermissionCheckService {

    private final AuthService authService;

    /**
     * Check if the current user has the specified permission.
     * @param resource the resource name (will be converted to PermissionResource enum)
     * @param action the action name (will be converted to PermissionAction enum)
     * @return true if the user has the permission, false otherwise
     */
    public boolean hasPermission(String resource, String action) {
        User currentUser = authService.getCurrentUser(false);
        if (currentUser == null) {
            return false;
        }

        PermissionResource permResource;
        PermissionAction permAction;
        try {
            permResource = PermissionResource.fromValue(resource);
            permAction = PermissionAction.fromValue(action);
        } catch (IllegalArgumentException e) {
            return false;
        }

        return currentUser.getProfiles().stream()
                .flatMap(profile -> profile.getPermissions().stream())
                .anyMatch(permission -> permission.getResource() == permResource && permission.getAction() == permAction);
    }

    /**
     * Check if the current user has the specified permission using enum types.
     * @param resource the PermissionResource enum
     * @param action the PermissionAction enum
     * @return true if the user has the permission, false otherwise
     */
    public boolean hasPermission(PermissionResource resource, PermissionAction action) {
        User currentUser = authService.getCurrentUser(false);
        if (currentUser == null) {
            return false;
        }

        return currentUser.getProfiles().stream()
                .flatMap(profile -> profile.getPermissions().stream())
                .anyMatch(permission -> permission.getResource() == resource && permission.getAction() == action);
    }
}