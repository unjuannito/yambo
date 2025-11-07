package es.yambo_alco.web.util;

import es.yambo_alco.web.model.User;
import es.yambo_alco.web.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PermissionCheckService {

    private final AuthService authService;

    public boolean hasPermission(String resource, String action) {
        User currentUser = authService.getCurrentUser(false);
        if (currentUser == null) {
            return false;
        }

        return currentUser.getProfiles().stream()
                .flatMap(profile -> profile.getPermissions().stream())
                .anyMatch(permission -> permission.getResource().equals(resource) && permission.getAction().equals(action));
    }
}