package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.DeletionObjectType;
import es.yambo_alco.web.model.Staff;
import es.yambo_alco.web.model.NotificationPreferences;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.ProjectGroup;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.UserFilter;
import es.yambo_alco.web.model.UserProjectGroup;
import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import es.yambo_alco.web.repository.ProfileRepository;
import es.yambo_alco.web.repository.ProjectGroupRepository;
import es.yambo_alco.web.repository.StaffRepository;
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
	private final AccessGrantService accessGrantService;
	private final StaffRepository staffRepository;
	private final UploadedFileService uploadedFileService;

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


	public Page<User> listUsers(UserFilter filter, Pageable pageable) {
		Set<String> perms = filter.permissions() == null ? null : filter.permissions().stream().collect(Collectors.toSet());
		Set<String> profileSet = filter.profiles() == null ? null : filter.profiles().stream().collect(Collectors.toSet());
		Specification<User> spec = Specification.where(null);
		spec = spec.and(UserSpecifications.queryContains(filter.query()));
		spec = spec.and(UserSpecifications.idContains(filter.id()));
		spec = spec.and(UserSpecifications.nameContains(filter.name()));
		spec = spec.and(UserSpecifications.emailContains(filter.email()));
		spec = spec.and(UserSpecifications.enabledEquals(filter.enabled()));
		if (perms != null && !perms.isEmpty())
			spec = spec.and(UserSpecifications.hasPermissions(perms));
		if (profileSet != null && !profileSet.isEmpty())
			spec = spec.and(UserSpecifications.hasProfiles(profileSet));
		if (filter.role() != null && !filter.role().isBlank())
			spec = spec.and(UserSpecifications.hasGroupRole(filter.role()));
		if (filter.staff() != null && filter.staff())
			spec = spec.and(UserSpecifications.isStaff());

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
			String normalizedEmail = email.trim().toLowerCase();
			if (!normalizedEmail.equals(user.getEmail()) && userRepository.existsByEmail(normalizedEmail)) {
				throw new BadRequestException("Email already in use");
			}
			user.setEmail(normalizedEmail);
		}

		return userRepository.save(user);
	}

	/**
	 * Updates the staff-only data. Null fields are left untouched; blank fields are cleared.
	 */
	@Transactional
	public User updateStaff(@NonNull String userId, @NonNull StaffUpdate update) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		if (!user.isStaff()) {
			throw new BadRequestException(
					"Only staff (marked manually or with a MONITOR or COORDINATOR role) can have staff data (photo, bio, fun fact, nickname, Instagram link, public visibility)");
		}

		Staff staff = ensureStaff(user);
		if (update.getPhoto() != null) {
			String newPhoto = blankToNull(update.getPhoto());
			if (staff.getPhoto() != null && !staff.getPhoto().equals(newPhoto)) {
				uploadedFileService.deleteOwnedByUrl(staff.getPhoto(), userId);
			}
			staff.setPhoto(newPhoto);
		}
		if (update.getBio() != null) {
			staff.setBio(blankToNull(update.getBio()));
		}
		if (update.getFunFact() != null) {
			staff.setFunFact(blankToNull(update.getFunFact()));
		}
		if (update.getNickname() != null) {
			staff.setNickname(blankToNull(update.getNickname()));
		}
		if (update.getPublicVisible() != null) {
			setPublicVisible(staff, update.getPublicVisible());
		}
		if (update.getInstagramUrl() != null) {
			staff.setInstagramUrl(blankToNull(update.getInstagramUrl()));
		}

		return userRepository.save(user);
	}

	/**
	 * Deletes the staff card: photo (and its file), nickname, bio and fun fact, and hides it from
	 * the public site. Someone who is still staff keeps an empty card; otherwise the row is removed.
	 */
	@Transactional
	public User deleteStaffData(@NonNull String userId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));
		Staff staff = user.getStaff();
		if (staff == null) {
			return user;
		}

		uploadedFileService.deleteOwnedByUrl(staff.getPhoto(), userId);
		if (!user.isStaff()) {
			user.setStaff(null);
			staffRepository.delete(staff);
			return user;
		}

		staff.setPhoto(null);
		staff.setBio(null);
		staff.setFunFact(null);
		staff.setNickname(null);
		staff.setInstagramUrl(null);
		setPublicVisible(staff, false);
		return userRepository.save(user);
	}

	/** Removes the staff data of users who stopped being staff before the given moment. */
	@Transactional
	public int purgeStaffInactiveSince(@NonNull LocalDateTime cutoff) {
		List<Staff> expired = staffRepository.findByInactiveSinceBefore(cutoff);
		for (Staff staff : expired) {
			uploadedFileService.deleteOwnedByUrl(staff.getPhoto(), staff.getUserId());
			if (staff.getUser() != null) {
				staff.getUser().setStaff(null);
			}
			staffRepository.delete(staff);
		}
		return expired.size();
	}

	/**
	 * Staff update made by an admin. Appearing on the public site is the staff member's own
	 * decision: an admin can hide someone else's card but not make it public.
	 */
	@Transactional
	public User updateStaffByAdmin(@NonNull String adminId, @NonNull String userId, @NonNull StaffUpdate update) {
		if (Boolean.TRUE.equals(update.getPublicVisible()) && !adminId.equals(userId)) {
			User user = userRepository.findById(userId)
					.orElseThrow(() -> new ResourceNotFoundException("User not found"));
			if (!user.isPubliclyVisibleStaff()) {
				throw new BadRequestException("Only the staff member can make their own card public");
			}
		}
		return updateStaff(userId, update);
	}

	/**
	 * Marks (or unmarks) a user as staff by hand, regardless of group roles.
	 * Unmarking keeps the staff data; the user stays staff while holding a MONITOR/COORDINATOR group role.
	 */
	@Transactional
	public User setManualStaff(@NonNull String userId, boolean manual) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		if (!manual && user.getStaff() == null) {
			return user;
		}
		ensureStaff(user).setManual(manual);
		if (manual) {
			user.getStaff().setInactiveSince(null);
		}
		hideIfNoLongerStaff(user);

		return userRepository.save(user);
	}

	private Staff ensureStaff(User user) {
		if (user.getStaff() == null) {
			user.setStaff(Staff.builder().user(user).build());
		}
		return user.getStaff();
	}

	/**
	 * Leaving the staff withdraws the public opt-in (coming back does not republish the card)
	 * and starts the retention period of the now inactive data.
	 */
	private void hideIfNoLongerStaff(User user) {
		Staff staff = user.getStaff();
		if (staff != null && !user.isStaff()) {
			setPublicVisible(staff, false);
			if (staff.getInactiveSince() == null) {
				staff.setInactiveSince(LocalDateTime.now());
			}
		}
	}

	/** Keeps the opt-in date in sync: set when the card becomes public, cleared when it stops being so. */
	private static void setPublicVisible(Staff staff, boolean publicVisible) {
		if (publicVisible && !staff.isPublicVisible()) {
			staff.setPublicVisibleAt(LocalDateTime.now());
		} else if (!publicVisible) {
			staff.setPublicVisibleAt(null);
		}
		staff.setPublicVisible(publicVisible);
	}

	private static String blankToNull(String value) {
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

	@Transactional
	public User assignGroupRole(@NonNull String userId, @NonNull String groupId,
			@NonNull UserProjectGroupRole role) {
		// Sin grantedBy: usado por invitaciones (registran su propio grant INVITATION)
		return assignGroupRole(userId, groupId, role, null);
	}

	@Transactional
	public User assignGroupRole(@NonNull String userId, @NonNull String groupId,
			@NonNull UserProjectGroupRole role, String grantedBy) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));
		ProjectGroup group = projectGroupRepository.findById(groupId)
				.orElseThrow(() -> new ResourceNotFoundException("Group not found"));

		// Coordinators and Parents must be assigned to project-level groups (name=null)
		if ((role == UserProjectGroupRole.COORDINATOR || role == UserProjectGroupRole.PARENT)
				&& group.getName() != null) {
			throw new BadRequestException(
					role == UserProjectGroupRole.COORDINATOR ? "Coordinators" : "Parents"
							+ " must be assigned to the project-level group");
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
		// Getting a MONITOR/COORDINATOR role promotes the user to staff
		if (role.isStaff()) {
			ensureStaff(user).setInactiveSince(null);
		}

		User saved = userRepository.save(user);

		// Origen: asignación manual por una persona (grantedBy != null)
		if (grantedBy != null) {
			accessGrantService.recordManualGroupRoleGrant(userId, groupId, role, grantedBy);
		}

		return saved;
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
		hideIfNoLongerStaff(user);

		User saved = userRepository.save(user);

		// Historial: la concesión de este rol de grupo queda revocada
		accessGrantService.revokeGroupRoleGrants(userId, groupId, role);

		return saved;
	}

	public List<UserProjectGroup> getUserGroupRoles(@NonNull String userId) {
		if (!userRepository.existsById(userId)) {
			throw new ResourceNotFoundException("User not found");
		}
		return userProjectGroupRepository.findByUserId(userId);
	}

	private void syncRoleProfile(User user, UserProjectGroupRole role, boolean shouldHave) {
		// Parents don't have a synced profile
		if (role == UserProjectGroupRole.PARENT) {
			return;
		}
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
		// Sin grantedBy: usado por flujos internos (sin auditoría de quién)
		return updateUserProfiles(userId, profileIds, null);
	}

	public User updateUserProfiles(@NonNull String userId, Set<String> profileIds, String grantedBy) {
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

		// Historial: revocar perfiles quitados (no role-managed)
		Set<String> before = user.getProfiles().stream()
				.filter(p -> !ROLE_PROFILE_IDS.contains(p.getId()))
				.map(Profile::getId)
				.collect(Collectors.toSet());
		Set<String> after = filteredProfileIds;
		for (String removedId : before) {
			if (!after.contains(removedId)) {
				accessGrantService.revokeProfileGrants(userId, removedId);
			}
		}

		user.setProfiles(profilesSet);
		User saved = userRepository.save(user);

		// Historial: registrar perfiles añadidos (origen MANUAL, quién = grantedBy)
		for (String addedId : after) {
			if (!before.contains(addedId)) {
				accessGrantService.recordManualProfileGrant(userId, addedId, grantedBy);
			}
		}

		return saved;
	}

	public User updateUser(@NonNull String userId, @NonNull String name, @NonNull String email,
			Set<String> profileIds) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ResourceNotFoundException("User not found"));

		if (!user.getEmail().equals(email.toLowerCase())) {
			Optional<User> existingUser = userRepository.findByEmail(email);
			if (existingUser.isPresent()) {
				throw new BadRequestException("Email is already in use");
			}
		}

		user.setName(name);
		user.setEmail(email.toLowerCase());

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

	public NotificationPreferences getNotificationPreferences(@NonNull String userId) {
		User user = getUserById(userId);
		NotificationPreferences prefs = user.getNotificationPreferences();
		return prefs != null ? prefs : NotificationPreferences.defaults();
	}

	@Transactional
	public NotificationPreferences updateNotificationPreferences(@NonNull String userId,
			@NonNull NotificationPreferences prefs) {
		User user = getUserById(userId);
		user.setNotificationPreferences(prefs);
		userRepository.save(user);
		return prefs;
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
