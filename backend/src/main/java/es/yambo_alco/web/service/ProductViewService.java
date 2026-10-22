package es.yambo_alco.web.service;

import es.yambo_alco.web.model.ProductView;
import es.yambo_alco.web.repository.ProductViewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ProductViewService {

    private static final int DEDUP_MINUTES = 30;
    private final ProductViewRepository productViewRepository;

    public void logView(String productId, String userId, String sessionId) {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(DEDUP_MINUTES);

        // Deduplicate: skip if same user/session viewed this product within the last 30 minutes
        if (userId != null) {
            if (productViewRepository.existsByProductIdAndUserIdAndViewedAtAfter(productId, userId, threshold)) {
                return;
            }
        } else if (sessionId != null) {
            if (productViewRepository.existsByProductIdAndSessionIdAndViewedAtAfter(productId, sessionId, threshold)) {
                return;
            }
        }

        ProductView view = ProductView.builder()
                .productId(productId)
                .userId(userId)
                .sessionId(sessionId)
                .viewedAt(LocalDateTime.now())
                .build();
        productViewRepository.save(view);
    }
}
