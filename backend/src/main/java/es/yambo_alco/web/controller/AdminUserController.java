package es.yambo_alco.web.controller;

import es.yambo_alco.web.controller.UserController.UserResponse;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.service.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort.Direction;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasAuthority('LIST_USERS')")
    public ResponseEntity<Page<User>> listUsers(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(required = false) String permissions,
            @RequestParam(required = false) String roles,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "ASC") String direction) {
        Set<String> perms = null;
        if (permissions != null && !permissions.isBlank()) {
            perms = Arrays.stream(permissions.split(",")).map(String::trim).filter(s -> !s.isEmpty())
                    .collect(Collectors.toSet());
        }
        List<String> rolesList = null;
        if (roles != null && !roles.isBlank()) {
            rolesList = Arrays.stream(roles.split(",")).map(String::trim).filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());
        }

        Direction dir = "DESC".equalsIgnoreCase(direction) ? Direction.DESC : Direction.ASC;
        PageRequest pr = (sortBy == null || sortBy.isBlank()) ? PageRequest.of(page, size)
                : PageRequest.of(page, size, dir, sortBy);

        Page<User> users = userService.listUsers(name, email, enabled, perms == null ? null : List.copyOf(perms),
                rolesList, pr);
        return ResponseEntity.ok(users);
    }

    @PutMapping("/roles")
    @PreAuthorize("hasAuthority('MANAGE_USERS')")
    public ResponseEntity<UserResponse> updateUserRoles(@RequestParam Long userId,
            @Valid @RequestBody UpdateRolesRequest request) {
        User updatedUser = userService.updateUserRoles(userId, request.getRoleIds());
        UserResponse response = new UserResponse(updatedUser);
        return ResponseEntity.ok(response);
    }

    @Data
    public static class UpdateRolesRequest {
        @NotEmpty(message = "At least one role must be specified")
        private Set<String> roleIds;
    }

    @PutMapping("/profile")
    @PreAuthorize("hasAuthority('MANAGE_USERS')")
    public ResponseEntity<UserResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        User userToUpdate = userService.getUserById(request.getId());

        User updatedUser = userService.updateProfile(userToUpdate.getId(), request.getName(), request.getEmail());
        UserResponse response = new UserResponse(updatedUser);
        return ResponseEntity.ok(response);
    }

    @Data
    public static class UpdateProfileRequest {
        @NotNull(message = "User ID cannot be null")
        private Long id;

        @NotBlank(message = "Name cannot be blank")
        @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
        private String name;

        @NotBlank(message = "Email cannot be blank")
        @Email(message = "Email should be valid")
        private String email;
    }
}