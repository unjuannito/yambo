package es.yambo_alco.web.controller;

import es.yambo_alco.web.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('PREP_RD')")
    public ResponseEntity<ReportService.ReportSummary> getSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(reportService.getReportSummary(startDate, endDate));
    }

    @GetMapping("/orders")
    @PreAuthorize("hasAuthority('PREP_RD')")
    public ResponseEntity<ReportService.OrderAnalytics> getOrderAnalytics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(reportService.getOrderAnalytics(startDate, endDate));
    }

    @GetMapping("/users")
    @PreAuthorize("hasAuthority('PREP_RD')")
    public ResponseEntity<ReportService.UserEngagement> getUserEngagement(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(reportService.getUserEngagement(startDate, endDate));
    }

    @GetMapping("/issues")
    @PreAuthorize("hasAuthority('PREP_RD')")
    public ResponseEntity<ReportService.IssueMetrics> getIssueMetrics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(reportService.getIssueMetrics(startDate, endDate));
    }

    @GetMapping("/products")
    @PreAuthorize("hasAuthority('PREP_RD')")
    public ResponseEntity<ReportService.ProductAnalytics> getProductAnalytics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(reportService.getProductAnalytics(startDate, endDate));
    }
}
