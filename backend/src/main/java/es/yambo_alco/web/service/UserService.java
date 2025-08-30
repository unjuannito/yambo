package es.yambo_alco.web.service;

import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.UserRepository;
import es.yambo_alco.web.repository.spec.UserSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UserService {

	private final UserRepository userRepository;

	private static final Set<String> ALLOWED_SORT_FIELDS = new HashSet<>(List.of("id", "name", "email", "username", "createdAt"));

	public UserService(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	public Page<User> listUsers(String name, String email, Boolean enabled, Set<String> permissions, Pageable pageable) {
		Specification<User> spec = Specification.where(null);
		spec = spec.and(UserSpecifications.nameContains(name));
		spec = spec.and(UserSpecifications.emailContains(email));
		spec = spec.and(UserSpecifications.enabledEquals(enabled));
		if (permissions != null && !permissions.isEmpty()) {
			spec = spec.and(UserSpecifications.hasPermissions(permissions));
		}
	// if caller supplied roles in the permissions set, they won't be used; roles have separate param in controller
	// roles filtering is handled by an overload below that accepts roles list

		// sanitize pageable sort property names
		var sort = pageable.getSort();
		var sanitized = pageable;
		if (sort != null && sort.stream().anyMatch(o -> !ALLOWED_SORT_FIELDS.contains(o.getProperty()))) {
			// rebuild pageable with default sort if unsafe
			sanitized = Pageable.ofSize(pageable.getPageSize()).withPage(pageable.getPageNumber());
		}

		return userRepository.findAll(spec, sanitized);
	}

	// convenience bridge used by controller previously expecting different signature
	public Page<User> listUsers(String name, String email, Boolean enabled, List<String> permissions, org.springframework.data.domain.Pageable pageable) {
		Set<String> perms = permissions == null ? null : permissions.stream().collect(Collectors.toSet());
		return listUsers(name, email, enabled, perms, pageable);
	}

	public Page<User> listUsers(String name, String email, Boolean enabled, List<String> permissions, List<String> roles, org.springframework.data.domain.Pageable pageable) {
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
}
