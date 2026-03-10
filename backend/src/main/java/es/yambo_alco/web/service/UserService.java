package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.DeletionObjectType;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.ProjectGroup;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.UserProjectGroup;
import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import es.yambo_alco.web.repository.ProfileRepository;
import es.yambo_alco.web.repository.ProjectGroupRepository;
import es.yambo_alco.web.repository.UserProjectGroupRepository;
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
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final ProfileRepository profileRepository;
	private final ProjectGroupRepository projectGroupRepository;
	private final UserProjectGroupRepository userProjectGroupRepository;
	private final PendingDeletionService pendingDeletionService;

	private static final String MONITOR_PROFILE_ID = "P0000004";
	private static final String COORDINATOR_PROFILE_ID = "P0000005";
	private static final Set<String> ROLE_PROFILE_IDS = Set.of(MONITOR_PROFILE_ID, COORDINATOR_PROFILE_ID);

	@Value("${user.deletion.delay.days:30}")
	private long deletionDelayDays;

	private static final Set<String> ALLOWED_SORT_FIELDS = new HashSet<>(
			List.of("id", "name", "email", "username", "createdAt"));

	public User getUserById(@NonNull String userId) {
		return userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));
	}

	public Page<User> listUsers(String name, String email, Boolean enabled, Set<String> permissions,
			Pageable pageable) {
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

public Page<User> listUsers(String id, String name, String email, Boolean enabled, List<String> permissions,
			List<String> profiles, Pageable pageable) {
		Set<String> perms = permissions == null ? null : permissions.stream().collect(Collectors.toSet());
		Set<String> profileSet = profiles == null ? null : profiles.stream().collect(Collectors.toSet());
		Specification<User> spec = Specification.where(null);
		spec = spec.and(UserSpecifications.idContains(id));
		spec = spec.and(UserSpecifications.nameContains(name));
		spec = spec.and(UserSpecifications.emailContains(email));
		spec = spec.and(UserSpecifications.enabledEquals(enabled));
		if (perms != null && !perms.isEmpty())
			spec = spec.and(UserSpecifications.hasPermissions(perms));
		if (profileSet != null && !profileSet.isEmpty())
			spec = spec.and(UserSpecifications.hasProfiles(profileSet));

		var sanitized = pageable;
		var sort = pageable.getSort();
		if (sort != null && sort.stream().anyMatch(o -> !ALLOWED_SORT_FIELDS.contains(o.getProperty()))) {
			sanitized = Pageable.ofSize(pageable.getPageSize()).withPage(pageable.getPageNumber());
		}

		return userRepository.findAll(spec, sanitized);
	}

	public User updateProfile(@NonNull String userId, @NonNull String name, @NonNull String email,
			String photo, String bio, String funFact) {
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

		if (photo != null) {
			user.setPhoto(photo.trim().isEmpty() ? null : photo.trim());
		}
		if (bio != null) {
			user.setBio(bio.trim().isEmpty() ? null : bio.trim());
		}
		if (funFact != null) {
			user.setFunFact(funFact.trim().isEmpty() ? null : funFact.trim());
		}

		return userRepository.save(user);
	}

	@Transactional
	public User assignGroupRole(@NonNull String userId, @NonNull String groupId,
			@NonNull UserProjectGroupRole role) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));
		ProjectGroup group = projectGroupRepository.findById(groupId)
				.orElseThrow(() -> new ResourceNotFoundException("Group not found"));

		// Coordinators must be assigned to project-level groups (name=null)
		if (role == UserProjectGroupRole.COORDINATOR && group.getName() != null) {
			throw new BadRequestException("Coordinators must be assigned to the project-level group");
		}

		boolean alreadyExists = user.getGroupRoles().stream()
				.anyMatch(gr -> gr.getProjectGroup().getId().equals(groupId) && gr.getRole() == role);
		if (alreadyExists) {
			return user;
		}

		UserProjectGroup upg = UserProjectGroup.builder()
				.user(user)
				.projectGroup(group)
				.role(role)
				.build();
		user.getGroupRoles().add(upg);

		syncRoleProfile(user, role, true);

		return userRepository.save(user);
	}

	@Transactional
	public User removeGroupRole(@NonNull String userId, @NonNull String groupId,
			@NonNull UserProjectGroupRole role) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		user.getGroupRoles().removeIf(
				gr -> gr.getProjectGroup().getId().equals(groupId) && gr.getRole() == role);

		// If no remaining assignments for this role, remove the profile
		boolean hasRemainingRole = user.getGroupRoles().stream()
				.anyMatch(gr -> gr.getRole() == role);
		if (!hasRemainingRole) {
			syncRoleProfile(user, role, false);
		}

		return userRepository.save(user);
	}

	public List<UserProjectGroup> getUserGroupRoles(@NonNull String userId) {
		if (!userRepository.existsById(userId)) {
			throw new ResourceNotFoundException("User not found");
		}
		return userProjectGroupRepository.findByUserId(userId);
	}

	private void syncRoleProfile(User user, UserProjectGroupRole role, boolean shouldHave) {
		String profileId = role == UserProjectGroupRole.MONITOR ? MONITOR_PROFILE_ID : COORDINATOR_PROFILE_ID;
		boolean hasProfile = user.getProfiles().stream()
				.anyMatch(p -> p.getId().equals(profileId));

		if (shouldHave && !hasProfile) {
			Profile profile = profileRepository.findById(profileId)
					.orElseThrow(() -> new ResourceNotFoundException("Role profile not found: " + profileId));
			user.getProfiles().add(profile);
		} else if (!shouldHave && hasProfile) {
			user.getProfiles().removeIf(p -> p.getId().equals(profileId));
		}
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

		// System users must always keep the ADMIN profile
		if (user.isSystem() && !profileIds.contains("ADMIN")) {
			throw new BadRequestException("Cannot remove the ADMIN profile from a system user");
		}

		// Filter out role-managed profiles — these are synced via group role assignments
		Set<String> filteredProfileIds = profileIds.stream()
				.filter(id -> !ROLE_PROFILE_IDS.contains(id))
				.collect(Collectors.toSet());

		Set<Profile> profilesSet = new HashSet<>();
		for (String profileId : filteredProfileIds) {
			Profile profile = profileRepository.findById(profileId)
					.orElseThrow(() -> new ResourceNotFoundException("Profile not found: " + profileId));
			profilesSet.add(profile);
		}

		// Preserve role-managed profiles that the user currently has
		user.getProfiles().stream()
				.filter(p -> ROLE_PROFILE_IDS.contains(p.getId()))
				.forEach(profilesSet::add);

		user.setProfiles(profilesSet);
		return userRepository.save(user);
	}

	public User updateUser(@NonNull String userId, @NonNull String name, @NonNull String email,
			Set<String> profileIds) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		if (!user.getEmail().equals(email)) {
			Optional<User> existingUser = userRepository.findByEmail(email);
			if (existingUser.isPresent()) {
				throw new BadRequestException("Email is already in use");
			}
		}

		user.setName(name);
		user.setEmail(email);

		if (profileIds != null && !profileIds.isEmpty()) {
			// Filter out role-managed profiles
			Set<String> filteredProfileIds = profileIds.stream()
					.filter(id -> !ROLE_PROFILE_IDS.contains(id))
					.collect(Collectors.toSet());

			Set<Profile> profilesSet = new HashSet<>();
			for (String profileId : filteredProfileIds) {
				Profile profile = profileRepository.findById(profileId)
						.orElseThrow(() -> new ResourceNotFoundException("Profile not found: " + profileId));
				profilesSet.add(profile);
			}

			// Preserve role-managed profiles
			user.getProfiles().stream()
					.filter(p -> ROLE_PROFILE_IDS.contains(p.getId()))
					.forEach(profilesSet::add);

			user.setProfiles(profilesSet);
		}

		return userRepository.save(user);
	}

	public void deleteUser(@NonNull String userId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		if (user.isSystem()) {
			throw new BadRequestException("Cannot delete a system user");
		}

		// The user will be disabled immediately and permanently deleted after the delay
		// period
		LocalDateTime scheduledDeletionDate = LocalDateTime.now().plusDays(deletionDelayDays);
		pendingDeletionService.scheduleDeletion(
				DeletionObjectType.USER,
				userId.toString(),
				scheduledDeletionDate);
	}
}
