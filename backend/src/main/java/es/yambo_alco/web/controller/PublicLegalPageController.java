package es.yambo_alco.web.controller;

import es.yambo_alco.web.model.LegalPage;
import es.yambo_alco.web.service.LegalPageService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/public/legal")
@RequiredArgsConstructor
public class PublicLegalPageController {

    private final LegalPageService legalPageService;

    @GetMapping
    public ResponseEntity<List<LegalPageResponse>> listPublished() {
        List<LegalPage> pages = legalPageService.getPublishedPages();
        List<LegalPageResponse> response = pages.stream()
                .map(LegalPageResponse::new)
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<LegalPageResponse> getPublished(@PathVariable String id) {
        LegalPage page = legalPageService.getPublishedById(id);
        return ResponseEntity.ok(new LegalPageResponse(page));
    }

    @Data
    public static class LegalPageResponse {
        private String id;
        private String type;
        private String title;
        private String content;
        private int version;
        private java.time.LocalDateTime publishedAt;
        private java.time.LocalDateTime updatedAt;

        public LegalPageResponse(LegalPage page) {
            this.id = page.getId();
            this.type = page.getType();
            this.title = page.getTitle();
            this.content = page.getContent();
            this.version = page.getVersion();
            this.publishedAt = page.getPublishedAt();
            this.updatedAt = page.getUpdatedAt();
        }
    }
}
