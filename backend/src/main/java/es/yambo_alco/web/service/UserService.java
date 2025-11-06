package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.DeletionObjectType;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.ProfileRepository;
import es.yambo_alco.web.repository.UserRepository;
import es.yambo_alco.web.repository.spec.UserSpecifications;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.lang.NonNull;
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
	private final ProfileRepository profileRepository;
	private final PendingDeletionService pendingDeletionService;

	@Value("${user.deletion.delay.days:30}")
	private long deletionDelayDays;

	private static final Set<String> ALLOWED_SORT_FIELDS = new HashSet<>(List.of("id", "name", "email", "username", "createdAt"));

	public User getUserById(@NonNull String userId) {
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

	public Page<User> listUsers(String name, String email, Boolean enabled, List<String> permissions, List<String> profiles, Pageable pageable) {
		Set<String> perms = permissions == null ? null : permissions.stream().collect(Collectors.toSet());
		Set<String> profileSet = profiles == null ? null : profiles.stream().collect(Collectors.toSet());
		Specification<User> spec = Specification.where(null);
		spec = spec.and(UserSpecifications.nameContains(name));
		spec = spec.and(UserSpecifications.emailContains(email));
		spec = spec.and(UserSpecifications.enabledEquals(enabled));
		if (perms != null && !perms.isEmpty()) spec = spec.and(UserSpecifications.hasPermissions(perms));
		if (profileSet != null && !profileSet.isEmpty()) spec = spec.and(UserSpecifications.hasProfiles(profileSet));

		var sanitized = pageable;
		var sort = pageable.getSort();
		if (sort != null && sort.stream().anyMatch(o -> !ALLOWED_SORT_FIELDS.contains(o.getProperty()))) {
			sanitized = Pageable.ofSize(pageable.getPageSize()).withPage(pageable.getPageNumber());
		}

		return userRepository.findAll(spec, sanitized);
	}

	public User updateProfile(@NonNull String userId, @NonNull String name, @NonNull String email) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		if (!name.trim().isEmpty()) {
			user.setName(name.trim());
		}
		if (!email.trim().isEmpty()) {
			if (!email.equals(user.getEmail()) && userRepository.existsByEmail(email)) {
				throw new BadRequestException("Email already in use");
			}
			user.setEmail(email.trim());
		}

		return userRepository.save(user);
	}

	public void changePassword(@NonNull String userId, String oldPassword, String newPassword) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
			throw new BadRequestException("Old password is incorrect");
		}

		user.setPassword(passwordEncoder.encode(newPassword));
		userRepository.save(user);
	}

	public User updateUserProfiles(@NonNull String userId, Set<String> profileIds) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		if (profileIds == null || profileIds.isEmpty()) {
			throw new BadRequestException("At least one profile must be specified");
		}

		Set<Profile> profilesSet = new HashSet<>();
		for (String profileId : profileIds) {
			Profile profile = profileRepository.findById(profileId)
					.orElseThrow(() -> new ResourceNotFoundException("Profile not found: " + profileId));
			profilesSet.add(profile);
		}

		user.setProfiles(profilesSet);
		return userRepository.save(user);
	}

	public void deleteUser(@NonNull String userId) {
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
