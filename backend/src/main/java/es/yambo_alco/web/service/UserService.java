package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Role;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.RoleRepository;
import es.yambo_alco.web.repository.UserRepository;
import es.yambo_alco.web.repository.spec.UserSpecifications;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final RoleRepository roleRepository;

	private static final Set<String> ALLOWED_SORT_FIELDS = new HashSet<>(List.of("id", "name", "email", "username", "createdAt"));

	public User getUserById(Long userId) {
		return userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));
	}


	public Page<User> listUsers(String name, String email, Boolean enabled, Set<String> permissions, Pageable pageable) {
		Specification<User> spec = Specification.where(null);
		spec = spec.and(UserSpecifications.nameContains(name));
		spec = spec.and(UserSpecifications.emailContains(email));
		spec = spec.and(UserSpecifications.enabledEquals(enabled));
		if (permissions != null && !permissions.isEmpty()) {
			spec = spec.and(UserSpecifications.hasPermissions(permissions));
		}

		var sort = pageable.getSort();
		var sanitized = pageable;
		if (sort != null && sort.stream().anyMatch(o -> !ALLOWED_SORT_FIELDS.contains(o.getProperty()))) {
			sanitized = Pageable.ofSize(pageable.getPageSize()).withPage(pageable.getPageNumber());
		}

		return userRepository.findAll(spec, sanitized);
	}

	public Page<User> listUsers(String name, String email, Boolean enabled, List<String> permissions, Pageable pageable) {
		Set<String> perms = permissions == null ? null : permissions.stream().collect(Collectors.toSet());
		return listUsers(name, email, enabled, perms, pageable);
	}

	public Page<User> listUsers(String name, String email, Boolean enabled, List<String> permissions, List<String> roles, Pageable pageable) {
		Set<String> perms = permissions == null ? null : permissions.stream().collect(Collectors.toSet());
		Set<String> roleSet = roles == null ? null : roles.stream().collect(Collectors.toSet());
		Specification<User> spec = Specification.where(null);
		spec = spec.and(UserSpecifications.nameContains(name));
		spec = spec.and(UserSpecifications.emailContains(email));
		spec = spec.and(UserSpecifications.enabledEquals(enabled));
		if (perms != null && !perms.isEmpty()) spec = spec.and(UserSpecifications.hasPermissions(perms));
		if (roleSet != null && !roleSet.isEmpty()) spec = spec.and(UserSpecifications.hasRoles(roleSet));

		var sanitized = pageable;
		var sort = pageable.getSort();
		if (sort != null && sort.stream().anyMatch(o -> !ALLOWED_SORT_FIELDS.contains(o.getProperty()))) {
			sanitized = Pageable.ofSize(pageable.getPageSize()).withPage(pageable.getPageNumber());
		}

		return userRepository.findAll(spec, sanitized);
	}

	public User updateProfile(Long userId, String name, String email) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		if (name != null && !name.trim().isEmpty()) {
			user.setName(name.trim());
		}
		if (email != null && !email.trim().isEmpty()) {
			if (!email.equals(user.getEmail()) && userRepository.existsByEmail(email)) {
				throw new BadRequestException("Email already in use");
			}
			user.setEmail(email.trim());
		}

		user.setUpdatedAt(LocalDateTime.now());
		return userRepository.save(user);
	}

	public void changePassword(Long userId, String oldPassword, String newPassword) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
			throw new BadRequestException("Old password is incorrect");
		}

		user.setPassword(passwordEncoder.encode(newPassword));
		user.setUpdatedAt(LocalDateTime.now());
		userRepository.save(user);
	}

	public User updateUserRoles(Long userId, Set<String> roleIds) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		if (roleIds == null || roleIds.isEmpty()) {
			throw new BadRequestException("At least one role must be specified");
		}

		Set<Role> roles = new HashSet<>();
		for (String roleId : roleIds) {
			Role role = roleRepository.findById(roleId)
					.orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleId));
			roles.add(role);
		}

		user.setRoles(roles);
		user.setUpdatedAt(LocalDateTime.now());
		return userRepository.save(user);
	}

	public void deleteUser(Long userId) {
		// Verify user exists before scheduling deletion
		userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));
		
		// Schedule deletion instead of immediate deletion
		// The user will be disabled immediately and permanently deleted after the delay period
		LocalDateTime scheduledDeletionDate = LocalDateTime.now().plusDays(deletionDelayDays);
		pendingDeletionService.scheduleDeletion(
			DeletionObjectType.USER, 
			userId.toString(), 
			scheduledDeletionDate
		);
	}
}
