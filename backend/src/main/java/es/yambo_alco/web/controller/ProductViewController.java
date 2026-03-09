package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.User;
import es.yambo_alco.web.service.ProductViewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/products")
@RequiredArgsConstructor
public class ProductViewController {

    private final ProductViewService productViewService;

    @PostMapping("/{id}/views")
    public ResponseEntity<Void> trackView(
            @PathVariable String id,
            @RequestBody(required = false) ViewRequest request,
            Authentication authentication) {

        String userId = null;
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            userId = user.getId();
        }

        String sessionId = request != null ? request.sessionId() : null;
        productViewService.logView(id, userId, sessionId);

        return ResponseEntity.ok().build();
    }

    public record ViewRequest(String sessionId) {}
}
