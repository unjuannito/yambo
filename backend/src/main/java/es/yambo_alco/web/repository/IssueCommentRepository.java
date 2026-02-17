package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.IssueComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface IssueCommentRepository extends JpaRepository<IssueComment, UUID> {

    @Query("""
            SELECT comment
            FROM IssueComment comment
            LEFT JOIN FETCH comment.user
            WHERE comment.issueId = :issueId
            ORDER BY comment.createdAt DESC
            """)
    List<IssueComment> findByIssueIdOrderByCreatedAtDescWithUser(@Param("issueId") String issueId);
}
