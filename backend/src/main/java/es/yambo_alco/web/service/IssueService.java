package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.*;
import es.yambo_alco.web.model.enums.IssueStatus;
import es.yambo_alco.web.repository.IssueCommentRepository;
import es.yambo_alco.web.repository.IssueRepository;
import es.yambo_alco.web.repository.OrderRepository;
import es.yambo_alco.web.repository.OrderProductRepository;
import es.yambo_alco.web.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.ArrayList;
import java.time.LocalDateTime;
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

    @Transactional
    public Issue createIssue(List<UUID> orderedProductIds, String title, String description, String createdBy) {
        if (orderedProductIds == null || orderedProductIds.isEmpty()) {
            throw new BadRequestException("At least one ordered product is required");
        }

        Set<UUID> uniqueOrderedProductIds = new LinkedHashSet<>(orderedProductIds);
        List<OrderProduct> orderedProducts = new ArrayList<>(orderProductRepository.findAllById(uniqueOrderedProductIds));
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
        validateIssueCreationWindow(order);

        // Validate user exists
        User user = userRepository.findById(createdBy)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + createdBy));

        // Validate title and description
        if (title == null || title.trim().isEmpty()) {
            throw new BadRequestException("Issue title cannot be empty");
        }
        if (description == null || description.trim().isEmpty()) {
            throw new BadRequestException("Issue description cannot be empty");
        }

        UUID primaryOrderedProductId = orderedProducts.get(0).getId();

        Issue issue = Issue.builder()
            .orderedProductId(primaryOrderedProductId)
                .title(title.trim())
                .description(description.trim())
                .status(IssueStatus.OPEN)
                .createdBy(createdBy)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
            .orderProducts(new LinkedHashSet<>(orderedProducts))
                .build();

        Issue savedIssue = issueRepository.save(issue);

        // Send email notification to customer
        try {
            User customer = userRepository.findById(order.getCustomerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
            String productName = buildProductNames(orderedProducts);
            mailService.sendIssueCreated(
                    customer.getEmail(),
                    customer.getName(),
                    savedIssue.getId(),
                    savedIssue.getTitle(),
                    productName,
                    order.getId(),
                    user.getName(),
                    savedIssue.getCreatedAt()
            );
        } catch (Exception e) {
            log.error("Failed to send issue created email for issue: {}", savedIssue.getId(), e);
            // Don't fail the request if email fails
        }

        return savedIssue;
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

    @Transactional
    public IssueComment addComment(String issueId, String text, String userId, IssueStatus status) {
        // Validate issue exists
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Issue not found: " + issueId));

        // Validate user exists
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
            issue.setUpdatedAt(LocalDateTime.now());
            issueRepository.save(issue);
        }

        IssueComment comment = IssueComment.builder()
                .issueId(issueId)
                .userId(userId)
            .text(normalizedText)
                .status(status)
                .createdAt(LocalDateTime.now())
                .build();

        IssueComment savedComment = issueCommentRepository.save(comment);

        // Send email notification to customer (if comment is not from customer)
        try {
                List<OrderProduct> issueProducts = getIssueProducts(issue);
                OrderProduct primaryOrderProduct = issueProducts.get(0);
                Order order = primaryOrderProduct.getOrder();
            User customer = userRepository.findById(order.getCustomerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
                String productName = buildProductNames(issueProducts);

            // Don't send email to the comment author
            if (!userId.equals(customer.getId())) {
                mailService.sendIssueCommentAdded(
                        customer.getEmail(),
                        customer.getName(),
                        issue.getId(),
                        issue.getTitle(),
                        productName,
                        user.getName(),
                        savedComment.getText(),
                        savedComment.getCreatedAt(),
                        status != null && previousStatus != status ? previousStatus : null,
                        status != null && previousStatus != status ? status : null
                );
            }
        } catch (Exception e) {
            log.error("Failed to send issue comment email for issue: {}", issueId, e);
            // Don't fail the request if email fails
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

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Issue not found: " + issueId));

        OrderProduct fallback = orderProductRepository.findById(issue.getOrderedProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Ordered product not found"));
        return List.of(fallback);
    }

    private void validateStatusTransition(IssueStatus currentStatus, IssueStatus newStatus) {
        if (currentStatus == newStatus) {
            return;
        }

        EnumSet<IssueStatus> allowedTransitions = switch (currentStatus) {
            case OPEN -> EnumSet.of(IssueStatus.IN_PROGRESS, IssueStatus.RESOLVED, IssueStatus.CLOSED);
            case IN_PROGRESS -> EnumSet.of(IssueStatus.OPEN, IssueStatus.RESOLVED, IssueStatus.CLOSED);
            case RESOLVED -> EnumSet.of(IssueStatus.CLOSED, IssueStatus.REOPENED);
            case REOPENED -> EnumSet.of(IssueStatus.IN_PROGRESS, IssueStatus.RESOLVED, IssueStatus.CLOSED);
            case CLOSED -> EnumSet.of(IssueStatus.REOPENED);
        };

        if (!allowedTransitions.contains(newStatus)) {
            throw new BadRequestException(
                    "Invalid issue status transition: " + currentStatus + " -> " + newStatus
            );
        }
    }

    private List<OrderProduct> getIssueProducts(Issue issue) {
        return getIssueProductsByIssueId(issue.getId());
    }

    private void validateIssueCreationWindow(Order order) {
        if (order == null || order.getClosedAt() == null) {
            return;
        }

        int issueCreationWindowDays = settingsService.getIssueCreationWindowDays();
        LocalDateTime deadline = order.getClosedAt().plusDays(issueCreationWindowDays);
        if (LocalDateTime.now().isAfter(deadline)) {
            throw new BadRequestException(
                "Issues cannot be created more than " + issueCreationWindowDays + " days after order closure"
            );
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
