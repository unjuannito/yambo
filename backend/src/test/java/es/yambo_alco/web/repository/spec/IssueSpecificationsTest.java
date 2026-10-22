package es.yambo_alco.web.repository.spec;

import es.yambo_alco.web.model.Issue;
import es.yambo_alco.web.model.enums.IssueStatus;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IssueSpecificationsTest {

    @Mock
    private Root<Issue> root;

    @Mock
    private CriteriaQuery<?> query;

    @Mock
    private CriteriaBuilder cb;

    // ──────────────────────────────────────────────
    // queryContains
    // ──────────────────────────────────────────────

    @Test
    void queryContains_withNullQuery_shouldReturnNullPredicate() {
        Specification<Issue> spec = IssueSpecifications.queryContains(null);
        Predicate result = spec.toPredicate(root, query, cb);
        assertThat(result).isNull();
    }

    @Test
    void queryContains_withBlankQuery_shouldReturnNullPredicate() {
        Specification<Issue> spec = IssueSpecifications.queryContains("   ");
        Predicate result = spec.toPredicate(root, query, cb);
        assertThat(result).isNull();
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void queryContains_withValidQuery_shouldReturnOrPredicateAcrossIdTitleAndCreatedBy() {
        String searchTerm = "test";
        String expectedPattern = "%test%";

        Path idPath = mock(Path.class);
        Path titlePath = mock(Path.class);
        Path createdByPath = mock(Path.class);
        Predicate idPredicate = mock(Predicate.class);
        Predicate titlePredicate = mock(Predicate.class);
        Predicate createdByPredicate = mock(Predicate.class);
        Predicate orPredicate = mock(Predicate.class);

        when(root.get("id")).thenReturn(idPath);
        when(root.get("title")).thenReturn(titlePath);
        when(root.get("createdBy")).thenReturn(createdByPath);
        when(cb.lower(idPath)).thenReturn(idPath);
        when(cb.lower(titlePath)).thenReturn(titlePath);
        when(cb.lower(createdByPath)).thenReturn(createdByPath);
        when(cb.like(idPath, expectedPattern)).thenReturn(idPredicate);
        when(cb.like(titlePath, expectedPattern)).thenReturn(titlePredicate);
        when(cb.like(createdByPath, expectedPattern)).thenReturn(createdByPredicate);
        when(cb.or(idPredicate, titlePredicate, createdByPredicate)).thenReturn(orPredicate);

        Specification<Issue> spec = IssueSpecifications.queryContains(searchTerm);
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(orPredicate);
        verify(cb).lower(idPath);
        verify(cb).lower(titlePath);
        verify(cb).lower(createdByPath);
        verify(cb).like(idPath, expectedPattern);
        verify(cb).like(titlePath, expectedPattern);
        verify(cb).like(createdByPath, expectedPattern);
        verify(cb).or(idPredicate, titlePredicate, createdByPredicate);
    }

    // ──────────────────────────────────────────────
    // idContains
    // ──────────────────────────────────────────────

    @Test
    void idContains_withNullId_shouldReturnNullPredicate() {
        Specification<Issue> spec = IssueSpecifications.idContains(null);
        Predicate result = spec.toPredicate(root, query, cb);
        assertThat(result).isNull();
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void idContains_withValidId_shouldReturnLikePredicate() {
        String id = "ISSUE-42";
        String expectedPattern = "%issue-42%";

        Path idPath = mock(Path.class);
        Predicate likePredicate = mock(Predicate.class);

        when(root.get("id")).thenReturn(idPath);
        when(cb.lower(idPath)).thenReturn(idPath);
        when(cb.like(idPath, expectedPattern)).thenReturn(likePredicate);

        Specification<Issue> spec = IssueSpecifications.idContains(id);
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(likePredicate);
        verify(cb).lower(idPath);
        verify(cb).like(idPath, expectedPattern);
    }

    // ──────────────────────────────────────────────
    // titleContains
    // ──────────────────────────────────────────────

    @Test
    void titleContains_withNullTitle_shouldReturnNullPredicate() {
        Specification<Issue> spec = IssueSpecifications.titleContains(null);
        Predicate result = spec.toPredicate(root, query, cb);
        assertThat(result).isNull();
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void titleContains_withValidTitle_shouldReturnLikePredicate() {
        String title = "Bug Found";
        String expectedPattern = "%bug found%";

        Path titlePath = mock(Path.class);
        Predicate likePredicate = mock(Predicate.class);

        when(root.get("title")).thenReturn(titlePath);
        when(cb.lower(titlePath)).thenReturn(titlePath);
        when(cb.like(titlePath, expectedPattern)).thenReturn(likePredicate);

        Specification<Issue> spec = IssueSpecifications.titleContains(title);
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(likePredicate);
        verify(cb).lower(titlePath);
        verify(cb).like(titlePath, expectedPattern);
    }

    // ──────────────────────────────────────────────
    // createdByEquals
    // ──────────────────────────────────────────────

    @Test
    void createdByEquals_withNullUserId_shouldReturnNullPredicate() {
        Specification<Issue> spec = IssueSpecifications.createdByEquals(null);
        Predicate result = spec.toPredicate(root, query, cb);
        assertThat(result).isNull();
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void createdByEquals_withValidUserId_shouldReturnEqualPredicate() {
        String userId = "user123";

        Path createdByPath = mock(Path.class);
        Predicate equalPredicate = mock(Predicate.class);

        when(root.get("createdBy")).thenReturn(createdByPath);
        when(cb.equal(createdByPath, userId)).thenReturn(equalPredicate);

        Specification<Issue> spec = IssueSpecifications.createdByEquals(userId);
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(equalPredicate);
        verify(cb).equal(createdByPath, userId);
    }

    // ──────────────────────────────────────────────
    // statusEquals
    // ──────────────────────────────────────────────

    @Test
    void statusEquals_withNullStatus_shouldReturnNullPredicate() {
        Specification<Issue> spec = IssueSpecifications.statusEquals(null);
        Predicate result = spec.toPredicate(root, query, cb);
        assertThat(result).isNull();
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void statusEquals_withValidStatus_shouldReturnEqualPredicate() {
        IssueStatus status = IssueStatus.OPEN;

        Path statusPath = mock(Path.class);
        Predicate equalPredicate = mock(Predicate.class);

        when(root.get("status")).thenReturn(statusPath);
        when(cb.equal(statusPath, status)).thenReturn(equalPredicate);

        Specification<Issue> spec = IssueSpecifications.statusEquals(status);
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(equalPredicate);
        verify(cb).equal(statusPath, status);
    }

    // ──────────────────────────────────────────────
    // statusIn
    // ──────────────────────────────────────────────

    @Test
    void statusIn_withNullList_shouldReturnNullPredicate() {
        Specification<Issue> spec = IssueSpecifications.statusIn(null);
        Predicate result = spec.toPredicate(root, query, cb);
        assertThat(result).isNull();
    }

    @Test
    void statusIn_withEmptyList_shouldReturnNullPredicate() {
        Specification<Issue> spec = IssueSpecifications.statusIn(Collections.emptyList());
        Predicate result = spec.toPredicate(root, query, cb);
        assertThat(result).isNull();
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void statusIn_withValidList_shouldReturnInPredicate() {
        List<IssueStatus> statuses = List.of(IssueStatus.OPEN, IssueStatus.IN_PROGRESS);

        Path statusPath = mock(Path.class);
        CriteriaBuilder.In inPredicate = mock(CriteriaBuilder.In.class);

        when(root.get("status")).thenReturn(statusPath);
        when(statusPath.in(statuses)).thenReturn(inPredicate);

        Specification<Issue> spec = IssueSpecifications.statusIn(statuses);
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(inPredicate);
        verify(statusPath).in(statuses);
    }

    // ──────────────────────────────────────────────
    // createdAfter
    // ──────────────────────────────────────────────

    @Test
    void createdAfter_withNullDate_shouldReturnNullPredicate() {
        Specification<Issue> spec = IssueSpecifications.createdAfter(null);
        Predicate result = spec.toPredicate(root, query, cb);
        assertThat(result).isNull();
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void createdAfter_withValidDate_shouldReturnGreaterThanOrEqualPredicate() {
        LocalDateTime date = LocalDateTime.of(2024, 1, 1, 0, 0);

        Path createdAtPath = mock(Path.class);
        Predicate predicate = mock(Predicate.class);

        when(root.get("createdAt")).thenReturn(createdAtPath);
        when(cb.greaterThanOrEqualTo(createdAtPath, date)).thenReturn(predicate);

        Specification<Issue> spec = IssueSpecifications.createdAfter(date);
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(predicate);
        verify(cb).greaterThanOrEqualTo(createdAtPath, date);
    }

    // ──────────────────────────────────────────────
    // createdBefore
    // ──────────────────────────────────────────────

    @Test
    void createdBefore_withNullDate_shouldReturnNullPredicate() {
        Specification<Issue> spec = IssueSpecifications.createdBefore(null);
        Predicate result = spec.toPredicate(root, query, cb);
        assertThat(result).isNull();
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void createdBefore_withValidDate_shouldReturnLessThanOrEqualPredicate() {
        LocalDateTime date = LocalDateTime.of(2024, 12, 31, 23, 59);

        Path createdAtPath = mock(Path.class);
        Predicate predicate = mock(Predicate.class);

        when(root.get("createdAt")).thenReturn(createdAtPath);
        when(cb.lessThanOrEqualTo(createdAtPath, date)).thenReturn(predicate);

        Specification<Issue> spec = IssueSpecifications.createdBefore(date);
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(predicate);
        verify(cb).lessThanOrEqualTo(createdAtPath, date);
    }

    // ──────────────────────────────────────────────
    // createdBetween
    // ──────────────────────────────────────────────

    @Test
    void createdBetween_withBothNull_shouldReturnNullPredicate() {
        Specification<Issue> spec = IssueSpecifications.createdBetween(null, null);
        Predicate result = spec.toPredicate(root, query, cb);
        assertThat(result).isNull();
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void createdBetween_withNullStart_shouldReturnLessThanOrEqualPredicate() {
        LocalDateTime endDate = LocalDateTime.of(2024, 12, 31, 23, 59);

        Path createdAtPath = mock(Path.class);
        Predicate predicate = mock(Predicate.class);

        when(root.get("createdAt")).thenReturn(createdAtPath);
        when(cb.lessThanOrEqualTo(createdAtPath, endDate)).thenReturn(predicate);

        Specification<Issue> spec = IssueSpecifications.createdBetween(null, endDate);
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(predicate);
        verify(cb).lessThanOrEqualTo(createdAtPath, endDate);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void createdBetween_withNullEnd_shouldReturnGreaterThanOrEqualPredicate() {
        LocalDateTime startDate = LocalDateTime.of(2024, 1, 1, 0, 0);

        Path createdAtPath = mock(Path.class);
        Predicate predicate = mock(Predicate.class);

        when(root.get("createdAt")).thenReturn(createdAtPath);
        when(cb.greaterThanOrEqualTo(createdAtPath, startDate)).thenReturn(predicate);

        Specification<Issue> spec = IssueSpecifications.createdBetween(startDate, null);
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(predicate);
        verify(cb).greaterThanOrEqualTo(createdAtPath, startDate);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void createdBetween_withBothDates_shouldReturnBetweenPredicate() {
        LocalDateTime startDate = LocalDateTime.of(2024, 1, 1, 0, 0);
        LocalDateTime endDate = LocalDateTime.of(2024, 12, 31, 23, 59);

        Path createdAtPath = mock(Path.class);
        Predicate predicate = mock(Predicate.class);

        when(root.get("createdAt")).thenReturn(createdAtPath);
        when(cb.between(createdAtPath, startDate, endDate)).thenReturn(predicate);

        Specification<Issue> spec = IssueSpecifications.createdBetween(startDate, endDate);
        Predicate result = spec.toPredicate(root, query, cb);

        assertThat(result).isSameAs(predicate);
        verify(cb).between(createdAtPath, startDate, endDate);
    }
}
