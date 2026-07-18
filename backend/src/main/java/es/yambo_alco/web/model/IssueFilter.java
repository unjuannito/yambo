package es.yambo_alco.web.model;

import es.yambo_alco.web.model.enums.IssueStatus;
import java.time.LocalDateTime;
import java.util.List;

public record IssueFilter(
    String query,
    String issueId,
    String title,
    String userId,
    List<IssueStatus> statuses,
    LocalDateTime startDate,
    LocalDateTime endDate
) {}
