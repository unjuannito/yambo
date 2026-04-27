package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.IssueWatcher;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IssueWatcherRepository extends JpaRepository<IssueWatcher, UUID> {

    List<IssueWatcher> findByIssueId(String issueId);

    Optional<IssueWatcher> findByIssueIdAndEmail(String issueId, String email);

    void deleteByIssueIdAndEmail(String issueId, String email);

    boolean existsByIssueIdAndEmail(String issueId, String email);
}
