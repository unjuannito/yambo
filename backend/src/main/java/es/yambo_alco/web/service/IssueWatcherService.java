package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.Issue;
import es.yambo_alco.web.model.IssueComment;
import es.yambo_alco.web.model.IssueWatcher;
import es.yambo_alco.web.model.OrderProduct;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.IssueCommentRepository;
import es.yambo_alco.web.repository.IssueRepository;
import es.yambo_alco.web.repository.IssueWatcherRepository;
import es.yambo_alco.web.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class IssueWatcherService {

    private static final Logger log = LoggerFactory.getLogger(IssueWatcherService.class);
    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final IssueWatcherRepository issueWatcherRepository;
    private final IssueRepository issueRepository;
    private final UserRepository userRepository;
    private final IssueCommentRepository issueCommentRepository;
    private final MailService mailService;

    @Transactional(readOnly = true)
    public List<IssueWatcher> getWatchers(String issueId) {
        issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Issue not found: " + issueId));
        return issueWatcherRepository.findByIssueId(issueId);
    }

    @Transactional
    public IssueWatcher addWatcher(String issueId, String email, String userId) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Issue not found: " + issueId));

        if (email == null || email.isBlank() || !EMAIL_PATTERN.matcher(email.trim()).matches()) {
            throw new BadRequestException("Invalid email address");
        }
        String normalizedEmail = email.trim().toLowerCase();

        if (userId != null && !userId.isBlank()) {
            userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        }

        if (issueWatcherRepository.existsByIssueIdAndEmail(issueId, normalizedEmail)) {
            return issueWatcherRepository.findByIssueIdAndEmail(issueId, normalizedEmail).orElseThrow();
        }

        IssueWatcher watcher = IssueWatcher.builder()
                .issueId(issueId)
                .email(normalizedEmail)
                .userId(userId != null && !userId.isBlank() ? userId : null)
                .build();

        try {
            IssueWatcher createdWatcher = issueWatcherRepository.save(watcher);
            notifyNewWatcherWithIssueThread(issue, createdWatcher);
            return createdWatcher;
        } catch (DataIntegrityViolationException e) {
            log.warn("Duplicate watcher attempt for issue {} email {}", issueId, normalizedEmail);
            return issueWatcherRepository.findByIssueIdAndEmail(issueId, normalizedEmail).orElseThrow();
        }
    }

    private void notifyNewWatcherWithIssueThread(Issue issue, IssueWatcher watcher) {
        try {
            String watcherName = resolveWatcherName(watcher);
            String productName = buildProductNames(issueRepository.findOrderProductsByIssueId(issue.getId()));

            List<IssueComment> comments = new ArrayList<>(
                    issueCommentRepository.findByIssueIdOrderByCreatedAtDescWithUser(issue.getId()));
            Collections.reverse(comments);

            String threadMarkdown = buildThreadMarkdown(issue, comments);

            mailService.sendIssueWatcherAdded(
                    watcher.getEmail(),
                    watcherName,
                    issue.getId(),
                    issue.getTitle(),
                    productName,
                    threadMarkdown,
                    LocalDateTime.now());
        } catch (Exception e) {
            log.error("Failed to send thread email to new watcher {} for issue {}", watcher.getEmail(), issue.getId(), e);
        }
    }

    private String resolveWatcherName(IssueWatcher watcher) {
        if (watcher.getUser() != null && watcher.getUser().getName() != null && !watcher.getUser().getName().isBlank()) {
            return watcher.getUser().getName();
        }
        if (watcher.getUserId() != null && !watcher.getUserId().isBlank()) {
            return userRepository.findById(watcher.getUserId())
                    .map(User::getName)
                    .filter(name -> !name.isBlank())
                    .orElse(watcher.getEmail());
        }
        return watcher.getEmail();
    }

    private String buildThreadMarkdown(Issue issue, List<IssueComment> comments) {
        StringBuilder sb = new StringBuilder();
        sb.append("### Descripcion inicial\n\n");
        sb.append(issue.getDescription() == null || issue.getDescription().isBlank()
                ? "_Sin descripcion_"
                : issue.getDescription().trim());
        sb.append("\n\n");

        sb.append("### Hilo de comentarios\n\n");
        if (comments.isEmpty()) {
            sb.append("_No hay comentarios todavia._\n");
            return sb.toString();
        }

        for (IssueComment comment : comments) {
            String author = comment.getUser() != null && comment.getUser().getName() != null && !comment.getUser().getName().isBlank()
                    ? comment.getUser().getName()
                    : comment.getUserId();
            sb.append("- **")
                    .append(author)
                    .append("** · ")
                    .append(comment.getCreatedAt())
                    .append("\n");

            if (comment.getStatus() != null) {
                sb.append("  - Estado: ")
                        .append(comment.getStatus().name())
                        .append("\n");
            }

            sb.append("\n")
                    .append(comment.getText() == null || comment.getText().isBlank()
                            ? "_Sin texto_"
                            : comment.getText().trim())
                    .append("\n\n");
        }
        return sb.toString();
    }

    private String buildProductNames(List<OrderProduct> orderedProducts) {
        List<String> names = orderedProducts.stream()
                .map(op -> {
                    if (op.getProduct() == null) {
                        return null;
                    }
                    String familyName = op.getProduct().getFamilyProduct() != null
                            ? op.getProduct().getFamilyProduct().getName()
                            : null;
                    String productName = op.getProduct().getName();
                    if (familyName != null && !familyName.isBlank() && productName != null && !productName.isBlank()) {
                        return familyName + " - " + productName;
                    }
                    if (productName != null && !productName.isBlank()) {
                        return productName;
                    }
                    return familyName;
                })
                .filter(name -> name != null && !name.isBlank())
                .distinct()
                .toList();

        if (names.isEmpty()) {
            return "Productos del pedido";
        }
        if (names.size() == 1) {
            return names.get(0);
        }
        return names.get(0) + " (y " + (names.size() - 1) + " mas)";
    }

    @Transactional
    public void removeWatcher(String issueId, String email) {
        issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Issue not found: " + issueId));

        if (email == null || email.isBlank()) {
            throw new BadRequestException("Email is required");
        }
        issueWatcherRepository.deleteByIssueIdAndEmail(issueId, email.trim().toLowerCase());
    }
}
