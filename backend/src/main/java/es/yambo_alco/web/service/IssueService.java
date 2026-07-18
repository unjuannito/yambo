package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.*;
import es.yambo_alco.web.model.enums.IssueStatus;
import es.yambo_alco.web.model.FamilyProductWatcher;
import es.yambo_alco.web.model.IssueWatcher;
import es.yambo_alco.web.repository.FamilyProductWatcherRepository;
import es.yambo_alco.web.repository.IssueCommentRepository;
import es.yambo_alco.web.repository.IssueRepository;
import es.yambo_alco.web.repository.IssueWatcherRepository;
import es.yambo_alco.web.repository.OrderRepository;
import es.yambo_alco.web.repository.OrderProductRepository;
import es.yambo_alco.web.repository.UserRepository;
import es.yambo_alco.web.repository.spec.IssueSpecifications;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.ArrayList;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class IssueService {

    private static final Logger log = LoggerFactory.getLogger(IssueService.class);

    private final IssueRepository issueRepository;
    private final IssueCommentRepository issueCommentRepository;
    private final OrderRepository orderRepository;
    private final OrderProductRepository orderProductRepository;
    private final SettingsService settingsService;
    private final UserRepository userRepository;
    private final MailService mailService;
    private final UserService userService;
    private final IssueWatcherRepository issueWatcherRepository;
    private final FamilyProductWatcherRepository familyProductWatcherRepository;

    @Transactional
    public Issue createIssue(List<UUID> orderedProductIds, String title, String description, String createdBy) {
        return doCreateIssue(orderedProductIds, title, description, createdBy, false);
    }

    @Transactional
    public Issue createIssue(List<UUID> orderedProductIds, String title, String description, String createdBy,
            boolean bypassWindowValidation) {
        return doCreateIssue(orderedProductIds, title, description, createdBy, bypassWindowValidation);
    }

    private Issue doCreateIssue(List<UUID> orderedProductIds, String title, String description, String createdBy,
            boolean bypassWindowValidation) {
        if (orderedProductIds == null || orderedProductIds.isEmpty()) {
            throw new BadRequestException("At least one ordered product is required");
        }

        Set<UUID> uniqueOrderedProductIds = new LinkedHashSet<>(orderedProductIds);
        List<OrderProduct> orderedProducts = new ArrayList<>(
                orderProductRepository.findAllById(uniqueOrderedProductIds));
        if (orderedProducts.size() != uniqueOrderedProductIds.size()) {
            throw new ResourceNotFoundException("One or more ordered products were not found");
        }

        String orderId = orderedProducts.get(0).getOrderId();
        boolean allBelongToSameOrder = orderedProducts.stream().allMatch(op -> orderId.equals(op.getOrderId()));
        if (!allBelongToSameOrder) {
            throw new BadRequestException("All ordered products in an issue must belong to the same order");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        if (!bypassWindowValidation) {
            validateIssueCreationWindow(order);
        }

        User user = userRepository.findById(createdBy)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + createdBy));

        if (title == null || title.trim().isEmpty()) {
            throw new BadRequestException("Issue title cannot be empty");
        }
        if (description == null || description.trim().isEmpty()) {
            throw new BadRequestException("Issue description cannot be empty");
        }

        Issue issue = Issue.builder()
                .title(title.trim())
                .description(description.trim())
                .status(IssueStatus.OPEN)
                .createdBy(createdBy)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .orderProducts(new LinkedHashSet<>(orderedProducts))
                .build();

        Issue savedIssue = issueRepository.save(issue);
        sendIssueCreatedEmails(savedIssue, order, user, orderedProducts);
        return savedIssue;
    }

    private void sendIssueCreatedEmails(Issue savedIssue, Order order, User creator, List<OrderProduct> orderedProducts) {
        try {
            User customer = userRepository.findById(order.getCustomerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
            String productName = buildProductNames(orderedProducts);
            NotificationPreferences prefs = userService.getNotificationPreferences(customer.getId());
            if (!prefs.isIssueCreated()) {
                log.info("Skipping issue created email for issue {}: user {} has disabled issue created notifications",
                        savedIssue.getId(), customer.getId());
            } else {
                mailService.sendIssueCreated(
                        customer.getEmail(),
                        customer.getName(),
                        savedIssue.getId(),
                        savedIssue.getTitle(),
                        productName,
                        order.getId(),
                        creator.getName(),
                        savedIssue.getCreatedAt(),
                        savedIssue.getDescription());
            }
            Set<String> notifiedEmails = new HashSet<>();
            notifiedEmails.add(customer.getEmail().toLowerCase());
            notifyIssueCreatedDropWatchers(savedIssue, order, creator, orderedProducts, productName, notifiedEmails);
        } catch (Exception e) {
            log.error("Failed to send issue created email for issue: {}", savedIssue.getId(), e);
        }
    }

    private void notifyIssueCreatedDropWatchers(Issue savedIssue, Order order, User creator,
            List<OrderProduct> orderedProducts, String productName, Set<String> notifiedEmails) {
        Set<String> dropIds = new HashSet<>();
        for (OrderProduct op : orderedProducts) {
            if (op.getProduct() != null && op.getProduct().getFamilyProduct() != null) {
                dropIds.add(op.getProduct().getFamilyProduct().getId());
            }
        }
        for (String dropId : dropIds) {
            List<FamilyProductWatcher> dropWatchers = familyProductWatcherRepository.findByFamilyProductId(dropId);
            for (FamilyProductWatcher watcher : dropWatchers) {
                if (notifiedEmails.add(watcher.getEmail())) {
                    String watcherName = watcher.getUser() != null ? watcher.getUser().getName() : watcher.getEmail();
                    mailService.sendIssueCreated(
                            watcher.getEmail(),
                            watcherName,
                            savedIssue.getId(),
                            savedIssue.getTitle(),
                            productName,
                            order.getId(),
                            creator.getName(),
                            savedIssue.getCreatedAt(),
                            savedIssue.getDescription());
                }
            }
        }
    }

    @Transactional(readOnly = true)
    public Issue getIssueByOrderedProductId(UUID orderedProductId) {
        return issueRepository.findByOrderedProductId(orderedProductId)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<Issue> getIssuesByOrderId(String orderId) {
        return issueRepository.findByOrderId(orderId);
    }

    @Transactional(readOnly = true)
    public Page<Issue> listIssues(IssueFilter filter, Pageable pageable) {
        Specification<Issue> spec = Specification.where(IssueSpecifications.queryContains(filter.query()))
                .and(IssueSpecifications.idContains(filter.issueId()))
                .and(IssueSpecifications.titleContains(filter.title()))
                .and(IssueSpecifications.createdByEquals(filter.userId()))
                .and(IssueSpecifications.statusIn(filter.statuses()))
                .and(IssueSpecifications.createdBetween(filter.startDate(), filter.endDate()));
        return issueRepository.findAll(spec, pageable);
    }

    @Transactional
    public IssueComment addComment(String issueId, String text, String userId, IssueStatus status) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Issue not found: " + issueId));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        String normalizedText = text == null ? "" : text.trim();
        IssueStatus previousStatus = issue.getStatus();

        if (normalizedText.isEmpty()) {
            throw new BadRequestException("Comment text cannot be empty");
        }

        if (status != null) {
            validateStatusTransition(previousStatus, status);
            issue.setStatus(status);
        }
        // Always update updatedAt when there's activity (comment = update too)
        issue.setUpdatedAt(LocalDateTime.now());
        issueRepository.save(issue);

        IssueComment comment = IssueComment.builder()
                .issueId(issueId)
                .userId(userId)
                .text(normalizedText)
                .status(status)
                .createdAt(LocalDateTime.now())
                .build();

        IssueComment savedComment = issueCommentRepository.save(comment);

        try {
            List<OrderProduct> issueProducts = getIssueProducts(issue);
            OrderProduct primaryOrderProduct = issueProducts.get(0);
            Order order = primaryOrderProduct.getOrder();
            User customer = userRepository.findById(order.getCustomerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
            String productName = buildProductNames(issueProducts);
            boolean hasStatusChange = status != null && previousStatus != status;

            // Track already-notified emails to avoid duplicates
            Set<String> notifiedEmails = new HashSet<>();
            // Track the comment author email to skip it
            String authorEmail = user.getEmail() != null ? user.getEmail().toLowerCase() : null;
            String customerEmail = customer.getEmail() != null ? customer.getEmail().toLowerCase() : null;

            if (customerEmail != null) {
                notifiedEmails.add(customerEmail);
            }

            // Notify the customer (respecting their notification preferences)
            if (!userId.equals(customer.getId())) {
                NotificationPreferences prefs = userService.getNotificationPreferences(customer.getId());

                if (hasStatusChange && !prefs.isIssueStatus()) {
                    log.info("Skipping issue status change email for issue {}: user {} has disabled issue status notifications",
                            issueId, customer.getId());
                } else if (!hasStatusChange && !prefs.isIssueComments()) {
                    log.info("Skipping issue comment email for issue {}: user {} has disabled issue comment notifications",
                            issueId, customer.getId());
                } else if (hasStatusChange && !prefs.isIssueComments() && !prefs.isIssueStatus()) {
                    log.info("Skipping issue comment+status email for issue {}: user {} has disabled both notifications",
                            issueId, customer.getId());
                } else {
                    mailService.sendIssueCommentAdded(
                            customer.getEmail(),
                            customer.getName(),
                            issue.getId(),
                            issue.getTitle(),
                            productName,
                            user.getName(),
                            savedComment.getText(),
                            savedComment.getCreatedAt(),
                            hasStatusChange ? previousStatus : null,
                            hasStatusChange ? status : null);
                }
            }

            // Notify issue-level watchers
            List<IssueWatcher> issueWatchers = issueWatcherRepository.findByIssueId(issueId);
            for (IssueWatcher watcher : issueWatchers) {
                if (watcher.getEmail().equals(authorEmail)) continue;
                if (!notifiedEmails.add(watcher.getEmail())) continue;
                String watcherName = watcher.getUser() != null ? watcher.getUser().getName() : watcher.getEmail();
                mailService.sendIssueCommentAdded(
                        watcher.getEmail(),
                        watcherName,
                        issue.getId(),
                        issue.getTitle(),
                        productName,
                        user.getName(),
                        savedComment.getText(),
                        savedComment.getCreatedAt(),
                        hasStatusChange ? previousStatus : null,
                        hasStatusChange ? status : null);
            }

            // Notify drop-level watchers
            Set<String> dropIds = new HashSet<>();
            for (OrderProduct op : issueProducts) {
                if (op.getProduct() != null && op.getProduct().getFamilyProduct() != null) {
                    dropIds.add(op.getProduct().getFamilyProduct().getId());
                }
            }
            for (String dropId : dropIds) {
                List<FamilyProductWatcher> dropWatchers = familyProductWatcherRepository.findByFamilyProductId(dropId);
                for (FamilyProductWatcher watcher : dropWatchers) {
                    if (watcher.getEmail().equals(authorEmail)) continue;
                    if (!notifiedEmails.add(watcher.getEmail())) continue;
                    String watcherName = watcher.getUser() != null ? watcher.getUser().getName() : watcher.getEmail();
                    mailService.sendIssueCommentAdded(
                            watcher.getEmail(),
                            watcherName,
                            issue.getId(),
                            issue.getTitle(),
                            productName,
                            user.getName(),
                            savedComment.getText(),
                            savedComment.getCreatedAt(),
                            hasStatusChange ? previousStatus : null,
                            hasStatusChange ? status : null);
                }
            }
        } catch (Exception e) {
            log.error("Failed to send issue comment email for issue: {}", issueId, e);
        }

        return savedComment;
    }

    @Transactional(readOnly = true)
    public Issue getIssueWithComments(String issueId) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Issue not found: " + issueId));
        return issue;
    }

    @Transactional(readOnly = true)
    public List<IssueComment> getIssueComments(String issueId) {
        return issueCommentRepository.findByIssueIdOrderByCreatedAtDescWithUser(issueId);
    }

    @Transactional(readOnly = true)
    public List<OrderProduct> getIssueProductsByIssueId(String issueId) {
        List<OrderProduct> relatedProducts = issueRepository.findOrderProductsByIssueId(issueId).stream()
                .collect(LinkedHashMap<UUID, OrderProduct>::new,
                        (map, item) -> map.putIfAbsent(item.getId(), item),
                        LinkedHashMap::putAll)
                .values()
                .stream()
                .toList();
        if (!relatedProducts.isEmpty()) {
            return relatedProducts;
        }

        if (!issueRepository.existsById(issueId)) {
            throw new ResourceNotFoundException("Issue not found: " + issueId);
        }
        throw new ResourceNotFoundException("No products found for issue: " + issueId);
    }

    private void validateStatusTransition(IssueStatus currentStatus, IssueStatus newStatus) {
        if (currentStatus == newStatus) {
            return;
        }

        EnumSet<IssueStatus> allowedTransitions = switch (currentStatus) {
            case OPEN -> EnumSet.of(IssueStatus.IN_PROGRESS, IssueStatus.CLOSED);
            case IN_PROGRESS -> EnumSet.of(IssueStatus.OPEN, IssueStatus.CLOSED);
            case CLOSED -> EnumSet.of(IssueStatus.OPEN);
        };

        if (!allowedTransitions.contains(newStatus)) {
            throw new BadRequestException(
                    "Invalid issue status transition: " + currentStatus + " -> " + newStatus);
        }
    }

    private List<OrderProduct> getIssueProducts(Issue issue) {
        return getIssueProductsByIssueId(issue.getId());
    }

    @Transactional
    public Issue updateIssueProducts(String issueId, List<UUID> orderedProductIds) {
        if (orderedProductIds == null || orderedProductIds.isEmpty()) {
            throw new BadRequestException("At least one ordered product is required");
        }

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Issue not found: " + issueId));

        Set<UUID> uniqueOrderedProductIds = new LinkedHashSet<>(orderedProductIds);
        List<OrderProduct> orderedProducts = new ArrayList<>(
                orderProductRepository.findAllById(uniqueOrderedProductIds));
        if (orderedProducts.size() != uniqueOrderedProductIds.size()) {
            throw new ResourceNotFoundException("One or more ordered products were not found");
        }

        String orderId = orderedProducts.get(0).getOrderId();
        boolean allBelongToSameOrder = orderedProducts.stream().allMatch(op -> orderId.equals(op.getOrderId()));
        if (!allBelongToSameOrder) {
            throw new BadRequestException("All ordered products in an issue must belong to the same order");
        }

        issue.setOrderProducts(new LinkedHashSet<>(orderedProducts));
        issue.setUpdatedAt(LocalDateTime.now());
        return issueRepository.save(issue);
    }

    private void validateIssueCreationWindow(Order order) {
        if (order == null || order.getClosedAt() == null) {
            return;
        }

        int issueCreationWindowDays = settingsService.getIssueCreationWindowDays();
        LocalDateTime deadline = order.getClosedAt().plusDays(issueCreationWindowDays);
        if (LocalDateTime.now().isAfter(deadline)) {
            throw new BadRequestException(
                    "Issues cannot be created more than " + issueCreationWindowDays + " days after order closure");
        }
    }

    private String buildProductNames(List<OrderProduct> orderedProducts) {
        List<String> names = orderedProducts.stream()
                .map(op -> op.getProduct().getFamilyProduct().getName() + " - " + op.getProduct().getName())
                .distinct()
                .toList();

        if (names.isEmpty()) {
            return "Productos del pedido";
        }

        if (names.size() == 1) {
            return names.get(0);
        }

        return names.get(0) + " (y " + (names.size() - 1) + " más)";
    }
}
