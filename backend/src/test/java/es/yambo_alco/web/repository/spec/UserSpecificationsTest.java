package es.yambo_alco.web.repository.spec;

import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.enums.UserProjectGroupRole;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserSpecificationsTest {

    @Mock
    private Root<User> root;
    @Mock
    private CriteriaQuery<?> query;
    @Mock
    private CriteriaBuilder cb;
    @Mock
    private Path<String> idPath;
    @Mock
    private Path<String> namePath;
    @Mock
    private Path<String> emailPath;
    @Mock
    private Path<Boolean> enabledPath;
    @Mock
    private Expression<String> lowerIdExpr;
    @Mock
    private Expression<String> lowerNameExpr;
    @Mock
    private Expression<String> lowerEmailExpr;
    @Mock
    private Predicate idPred;
    @Mock
    private Predicate namePred;
    @Mock
    private Predicate emailPred;
    @Mock
    private Predicate enabledPred;
    @Mock
    private Predicate orPred;
    @Mock
    private Join<Object, Object> profileJoin;
    @Mock
    private Join<Object, Object> permJoin;
    @Mock
    private Join<Object, Object> groupRoleJoin;
    @Mock
    private Path<Object> permIdPath;
    @Mock
    private Path<Object> profileIdPath;
    @Mock
    private Path<Object> groupRolePath;

    // ================================================================
    // queryContains
    // ================================================================

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"   ", ""})
    void queryContains_whenNullOrBlank_shouldReturnNull(String value) {
        Specification<User> spec = UserSpecifications.queryContains(value);
        Predicate result = spec.toPredicate(root, query, cb);

        assertNull(result);
    }

    @SuppressWarnings("unchecked")
    @Test
    void queryContains_whenValidQuery_shouldReturnOrPredicate() {
        String validQuery = "john";

        when(root.get("id")).thenReturn((Path) idPath);
        when(root.get("name")).thenReturn((Path) namePath);
        when(root.get("email")).thenReturn((Path) emailPath);
        when(cb.lower(idPath)).thenReturn((Expression) lowerIdExpr);
        when(cb.lower(namePath)).thenReturn((Expression) lowerNameExpr);
        when(cb.lower(emailPath)).thenReturn((Expression) lowerEmailExpr);
        when(cb.like(lowerIdExpr, "%john%")).thenReturn(idPred);
        when(cb.like(lowerNameExpr, "%john%")).thenReturn(namePred);
        when(cb.like(lowerEmailExpr, "%john%")).thenReturn(emailPred);
        when(cb.or(idPred, namePred, emailPred)).thenReturn(orPred);

        Specification<User> spec = UserSpecifications.queryContains(validQuery);
        Predicate result = spec.toPredicate(root, query, cb);

        assertSame(orPred, result);
        verify(root).get("id");
        verify(root).get("name");
        verify(root).get("email");
        verify(cb).lower(idPath);
        verify(cb).lower(namePath);
        verify(cb).lower(emailPath);
        verify(cb).like(lowerIdExpr, "%john%");
        verify(cb).like(lowerNameExpr, "%john%");
        verify(cb).like(lowerEmailExpr, "%john%");
        verify(cb).or(idPred, namePred, emailPred);
        verifyNoMoreInteractions(cb);
    }

    @SuppressWarnings("unchecked")
    @Test
    void queryContains_shouldUseCaseInsensitivePattern() {
        String mixedCaseQuery = "John_Doe";

        when(root.get("id")).thenReturn((Path) idPath);
        when(root.get("name")).thenReturn((Path) namePath);
        when(root.get("email")).thenReturn((Path) emailPath);
        when(cb.lower(idPath)).thenReturn((Expression) lowerIdExpr);
        when(cb.lower(namePath)).thenReturn((Expression) lowerNameExpr);
        when(cb.lower(emailPath)).thenReturn((Expression) lowerEmailExpr);
        when(cb.like(lowerIdExpr, "%john_doe%")).thenReturn(idPred);
        when(cb.like(lowerNameExpr, "%john_doe%")).thenReturn(namePred);
        when(cb.like(lowerEmailExpr, "%john_doe%")).thenReturn(emailPred);
        when(cb.or(idPred, namePred, emailPred)).thenReturn(orPred);

        Specification<User> spec = UserSpecifications.queryContains(mixedCaseQuery);
        Predicate result = spec.toPredicate(root, query, cb);

        assertSame(orPred, result);
        verify(cb).like(lowerIdExpr, "%john_doe%");
        verify(cb).like(lowerNameExpr, "%john_doe%");
        verify(cb).like(lowerEmailExpr, "%john_doe%");
    }

    // ================================================================
    // idContains
    // ================================================================

    @Test
    void idContains_whenNull_shouldReturnNull() {
        Specification<User> spec = UserSpecifications.idContains(null);
        Predicate result = spec.toPredicate(root, query, cb);

        assertNull(result);
    }

    @SuppressWarnings("unchecked")
    @Test
    void idContains_whenValid_shouldReturnLikePredicate() {
        when(root.get("id")).thenReturn((Path) idPath);
        when(cb.lower(idPath)).thenReturn((Expression) lowerIdExpr);
        when(cb.like(lowerIdExpr, "%abc%")).thenReturn(idPred);

        Specification<User> spec = UserSpecifications.idContains("abc");
        Predicate result = spec.toPredicate(root, query, cb);

        assertSame(idPred, result);
        verify(root).get("id");
        verify(cb).lower(idPath);
        verify(cb).like(lowerIdExpr, "%abc%");
    }

    @SuppressWarnings("unchecked")
    @Test
    void idContains_shouldConvertToLowerCase() {
        when(root.get("id")).thenReturn((Path) idPath);
        when(cb.lower(idPath)).thenReturn((Expression) lowerIdExpr);
        when(cb.like(lowerIdExpr, "%user123%")).thenReturn(idPred);

        Specification<User> spec = UserSpecifications.idContains("USER123");
        spec.toPredicate(root, query, cb);

        verify(cb).like(lowerIdExpr, "%user123%");
    }

    // ================================================================
    // nameContains
    // ================================================================

    @Test
    void nameContains_whenNull_shouldReturnNull() {
        Specification<User> spec = UserSpecifications.nameContains(null);
        Predicate result = spec.toPredicate(root, query, cb);

        assertNull(result);
    }

    @SuppressWarnings("unchecked")
    @Test
    void nameContains_whenValid_shouldReturnLikePredicate() {
        when(root.get("name")).thenReturn((Path) namePath);
        when(cb.lower(namePath)).thenReturn((Expression) lowerNameExpr);
        when(cb.like(lowerNameExpr, "%alice%")).thenReturn(namePred);

        Specification<User> spec = UserSpecifications.nameContains("alice");
        Predicate result = spec.toPredicate(root, query, cb);

        assertSame(namePred, result);
        verify(root).get("name");
        verify(cb).lower(namePath);
        verify(cb).like(lowerNameExpr, "%alice%");
    }

    @SuppressWarnings("unchecked")
    @Test
    void nameContains_shouldConvertToLowerCase() {
        when(root.get("name")).thenReturn((Path) namePath);
        when(cb.lower(namePath)).thenReturn((Expression) lowerNameExpr);
        when(cb.like(lowerNameExpr, "%alice%")).thenReturn(namePred);

        Specification<User> spec = UserSpecifications.nameContains("Alice");
        spec.toPredicate(root, query, cb);

        verify(cb).like(lowerNameExpr, "%alice%");
    }

    // ================================================================
    // emailContains
    // ================================================================

    @Test
    void emailContains_whenNull_shouldReturnNull() {
        Specification<User> spec = UserSpecifications.emailContains(null);
        Predicate result = spec.toPredicate(root, query, cb);

        assertNull(result);
    }

    @SuppressWarnings("unchecked")
    @Test
    void emailContains_whenValid_shouldReturnLikePredicate() {
        when(root.get("email")).thenReturn((Path) emailPath);
        when(cb.lower(emailPath)).thenReturn((Expression) lowerEmailExpr);
        when(cb.like(lowerEmailExpr, "%test@example.com%")).thenReturn(emailPred);

        Specification<User> spec = UserSpecifications.emailContains("test@example.com");
        Predicate result = spec.toPredicate(root, query, cb);

        assertSame(emailPred, result);
        verify(root).get("email");
        verify(cb).lower(emailPath);
        verify(cb).like(lowerEmailExpr, "%test@example.com%");
    }

    @SuppressWarnings("unchecked")
    @Test
    void emailContains_shouldConvertToLowerCase() {
        when(root.get("email")).thenReturn((Path) emailPath);
        when(cb.lower(emailPath)).thenReturn((Expression) lowerEmailExpr);
        when(cb.like(lowerEmailExpr, "%test@example.com%")).thenReturn(emailPred);

        Specification<User> spec = UserSpecifications.emailContains("TEST@EXAMPLE.COM");
        spec.toPredicate(root, query, cb);

        verify(cb).like(lowerEmailExpr, "%test@example.com%");
    }

    // ================================================================
    // enabledEquals
    // ================================================================

    @Test
    void enabledEquals_whenNull_shouldReturnNull() {
        Specification<User> spec = UserSpecifications.enabledEquals(null);
        Predicate result = spec.toPredicate(root, query, cb);

        assertNull(result);
    }

    @SuppressWarnings("unchecked")
    @Test
    void enabledEquals_whenTrue_shouldReturnEqualPredicate() {
        when(root.get("enabled")).thenReturn((Path) enabledPath);
        when(cb.equal(enabledPath, true)).thenReturn(enabledPred);

        Specification<User> spec = UserSpecifications.enabledEquals(true);
        Predicate result = spec.toPredicate(root, query, cb);

        assertSame(enabledPred, result);
        verify(root).get("enabled");
        verify(cb).equal(enabledPath, true);
    }

    @SuppressWarnings("unchecked")
    @Test
    void enabledEquals_whenFalse_shouldReturnEqualPredicate() {
        when(root.get("enabled")).thenReturn((Path) enabledPath);
        when(cb.equal(enabledPath, false)).thenReturn(enabledPred);

        Specification<User> spec = UserSpecifications.enabledEquals(false);
        Predicate result = spec.toPredicate(root, query, cb);

        assertSame(enabledPred, result);
        verify(root).get("enabled");
        verify(cb).equal(enabledPath, false);
    }

    // ================================================================
    // hasPermissions
    // ================================================================

    @Test
    void hasPermissions_whenNull_shouldReturnNull() {
        Specification<User> spec = UserSpecifications.hasPermissions(null);
        Predicate result = spec.toPredicate(root, query, cb);

        assertNull(result);
    }

    @Test
    void hasPermissions_whenEmpty_shouldReturnNull() {
        Specification<User> spec = UserSpecifications.hasPermissions(Set.of());
        Predicate result = spec.toPredicate(root, query, cb);

        assertNull(result);
    }

    @SuppressWarnings("unchecked")
    @Test
    void hasPermissions_whenSinglePermission_shouldJoinAndUseIn() {
        Set<String> permissions = Set.of("EDIT");
        Predicate inPred = mock(Predicate.class);

        when(root.join("profiles", JoinType.LEFT)).thenReturn(profileJoin);
        when(profileJoin.join("permissions", JoinType.LEFT)).thenReturn(permJoin);
        when(permJoin.get("id")).thenReturn(permIdPath);
        when(permIdPath.in(permissions)).thenReturn(inPred);

        Specification<User> spec = UserSpecifications.hasPermissions(permissions);
        Predicate result = spec.toPredicate(root, query, cb);

        assertNotNull(result);
        verify(root).join("profiles", JoinType.LEFT);
        verify(profileJoin).join("permissions", JoinType.LEFT);
        verify(permJoin).get("id");
    }

    @SuppressWarnings("unchecked")
    @Test
    void hasPermissions_whenMultiplePermissions_shouldReturnInPredicate() {
        Set<String> permissions = Set.of("EDIT", "VIEW", "DELETE");
        Predicate inPred = mock(Predicate.class);

        when(root.join("profiles", JoinType.LEFT)).thenReturn(profileJoin);
        when(profileJoin.join("permissions", JoinType.LEFT)).thenReturn(permJoin);
        when(permJoin.get("id")).thenReturn(permIdPath);
        when(permIdPath.in(permissions)).thenReturn(inPred);

        Specification<User> spec = UserSpecifications.hasPermissions(permissions);
        Predicate result = spec.toPredicate(root, query, cb);

        assertNotNull(result);
        verify(permJoin.get("id")).in(permissions);
    }

    // ================================================================
    // hasProfiles
    // ================================================================

    @Test
    void hasProfiles_whenNull_shouldReturnNull() {
        Specification<User> spec = UserSpecifications.hasProfiles(null);
        Predicate result = spec.toPredicate(root, query, cb);

        assertNull(result);
    }

    @Test
    void hasProfiles_whenEmpty_shouldReturnNull() {
        Specification<User> spec = UserSpecifications.hasProfiles(Set.of());
        Predicate result = spec.toPredicate(root, query, cb);

        assertNull(result);
    }

    @SuppressWarnings("unchecked")
    @Test
    void hasProfiles_whenValid_shouldJoinAndUseIn() {
        Set<String> profiles = Set.of("ADMIN");
        Predicate inPred = mock(Predicate.class);

        when(root.join("profiles", JoinType.LEFT)).thenReturn(profileJoin);
        when(profileJoin.get("id")).thenReturn((Path) profileIdPath);
        when(profileIdPath.in(profiles)).thenReturn(inPred);

        Specification<User> spec = UserSpecifications.hasProfiles(profiles);
        Predicate result = spec.toPredicate(root, query, cb);

        assertNotNull(result);
        verify(root).join("profiles", JoinType.LEFT);
        verify(profileJoin).get("id");
    }

    @SuppressWarnings("unchecked")
    @Test
    void hasProfiles_whenMultiple_shouldReturnInPredicate() {
        Set<String> profiles = Set.of("ADMIN", "USER", "MODERATOR");

        when(root.join("profiles", JoinType.LEFT)).thenReturn(profileJoin);
        when(profileJoin.get("id")).thenReturn((Path) profileIdPath);

        Specification<User> spec = UserSpecifications.hasProfiles(profiles);
        spec.toPredicate(root, query, cb);

        verify(profileJoin.get("id")).in(profiles);
    }

    // ================================================================
    // hasGroupRole
    // ================================================================

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"   ", ""})
    void hasGroupRole_whenNullOrBlank_shouldReturnNull(String value) {
        Specification<User> spec = UserSpecifications.hasGroupRole(value);
        Predicate result = spec.toPredicate(root, query, cb);

        assertNull(result);
    }

    @SuppressWarnings("unchecked")
    @Test
    void hasGroupRole_whenAny_shouldReturnIsNotNull() {
        Predicate isNotNullPred = mock(Predicate.class);

        when(root.join("groupRoles", JoinType.INNER)).thenReturn(groupRoleJoin);
        when(groupRoleJoin.get("role")).thenReturn((Path) groupRolePath);
        when(groupRolePath.isNotNull()).thenReturn(isNotNullPred);

        Specification<User> spec = UserSpecifications.hasGroupRole("ANY");
        Predicate result = spec.toPredicate(root, query, cb);

        assertSame(isNotNullPred, result);
        verify(query).distinct(true);
        verify(groupRolePath).isNotNull();
    }

    @SuppressWarnings("unchecked")
    @Test
    void hasGroupRole_whenAnyLowerCase_shouldReturnIsNotNull() {
        Predicate isNotNullPred = mock(Predicate.class);

        when(root.join("groupRoles", JoinType.INNER)).thenReturn(groupRoleJoin);
        when(groupRoleJoin.get("role")).thenReturn((Path) groupRolePath);
        when(groupRolePath.isNotNull()).thenReturn(isNotNullPred);

        Specification<User> spec = UserSpecifications.hasGroupRole("any");
        Predicate result = spec.toPredicate(root, query, cb);

        assertSame(isNotNullPred, result);
        verify(query).distinct(true);
        verify(groupRolePath).isNotNull();
    }

    @SuppressWarnings("unchecked")
    @Test
    void hasGroupRole_whenMonitor_shouldReturnEqualPredicate() {
        Predicate roleEqualPred = mock(Predicate.class);

        when(root.join("groupRoles", JoinType.INNER)).thenReturn(groupRoleJoin);
        when(groupRoleJoin.get("role")).thenReturn((Path) groupRolePath);
        when(cb.equal(groupRolePath, UserProjectGroupRole.MONITOR)).thenReturn(roleEqualPred);

        Specification<User> spec = UserSpecifications.hasGroupRole("MONITOR");
        Predicate result = spec.toPredicate(root, query, cb);

        assertSame(roleEqualPred, result);
        verify(query).distinct(true);
        verify(cb).equal(groupRolePath, UserProjectGroupRole.MONITOR);
    }

    @SuppressWarnings("unchecked")
    @Test
    void hasGroupRole_whenCoordinator_shouldReturnEqualPredicate() {
        Predicate roleEqualPred = mock(Predicate.class);

        when(root.join("groupRoles", JoinType.INNER)).thenReturn(groupRoleJoin);
        when(groupRoleJoin.get("role")).thenReturn((Path) groupRolePath);
        when(cb.equal(groupRolePath, UserProjectGroupRole.COORDINATOR)).thenReturn(roleEqualPred);

        Specification<User> spec = UserSpecifications.hasGroupRole("COORDINATOR");
        Predicate result = spec.toPredicate(root, query, cb);

        assertSame(roleEqualPred, result);
        verify(query).distinct(true);
        verify(cb).equal(groupRolePath, UserProjectGroupRole.COORDINATOR);
    }

    @SuppressWarnings("unchecked")
    @Test
    void hasGroupRole_whenLowerCaseRole_shouldStillWork() {
        Predicate roleEqualPred = mock(Predicate.class);

        when(root.join("groupRoles", JoinType.INNER)).thenReturn(groupRoleJoin);
        when(groupRoleJoin.get("role")).thenReturn((Path) groupRolePath);
        when(cb.equal(groupRolePath, UserProjectGroupRole.MONITOR)).thenReturn(roleEqualPred);

        Specification<User> spec = UserSpecifications.hasGroupRole("monitor");
        Predicate result = spec.toPredicate(root, query, cb);

        assertSame(roleEqualPred, result);
        verify(cb).equal(groupRolePath, UserProjectGroupRole.MONITOR);
    }

    // ================================================================
    // Specification factory method sanity (not executing the lambda)
    // ================================================================

    @Test
    void queryContains_shouldReturnNonNullSpecification() {
        Specification<User> spec = UserSpecifications.queryContains("test");
        assertNotNull(spec);
    }

    @Test
    void idContains_shouldReturnNonNullSpecification() {
        Specification<User> spec = UserSpecifications.idContains("test");
        assertNotNull(spec);
    }

    @Test
    void nameContains_shouldReturnNonNullSpecification() {
        Specification<User> spec = UserSpecifications.nameContains("test");
        assertNotNull(spec);
    }

    @Test
    void emailContains_shouldReturnNonNullSpecification() {
        Specification<User> spec = UserSpecifications.emailContains("test");
        assertNotNull(spec);
    }

    @Test
    void enabledEquals_shouldReturnNonNullSpecification() {
        Specification<User> spec = UserSpecifications.enabledEquals(true);
        assertNotNull(spec);
    }

    @Test
    void hasPermissions_shouldReturnNonNullSpecification() {
        Specification<User> spec = UserSpecifications.hasPermissions(Set.of("EDIT"));
        assertNotNull(spec);
    }

    @Test
    void hasProfiles_shouldReturnNonNullSpecification() {
        Specification<User> spec = UserSpecifications.hasProfiles(Set.of("ADMIN"));
        assertNotNull(spec);
    }

    @Test
    void hasGroupRole_shouldReturnNonNullSpecification() {
        Specification<User> spec = UserSpecifications.hasGroupRole("MONITOR");
        assertNotNull(spec);
    }
}
