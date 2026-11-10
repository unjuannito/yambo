package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.Notice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface NoticeRepository extends JpaRepository<Notice, String> {

    List<Notice> findAllByOrderByPinnedDescPublishedAtDesc();

    /** Not expired — for the dashboard "latest announcements" widget (any logged-in user). */
    @Query("SELECT n FROM Notice n WHERE n.expiresAt IS NULL OR n.expiresAt > :now "
            + "ORDER BY n.pinned DESC, n.publishedAt DESC")
    List<Notice> findActive(@Param("now") LocalDateTime now);

    /** Not expired and public — for the public board (issue #133, no login). */
    @Query("SELECT n FROM Notice n WHERE n.isPublic = true AND (n.expiresAt IS NULL OR n.expiresAt > :now) "
            + "ORDER BY n.pinned DESC, n.publishedAt DESC")
    List<Notice> findActivePublic(@Param("now") LocalDateTime now);

    Optional<Notice> findBySlugAndIsPublicTrue(String slug);

    Optional<Notice> findByIdAndIsPublicTrue(String id);

    boolean existsBySlug(String slug);
}
