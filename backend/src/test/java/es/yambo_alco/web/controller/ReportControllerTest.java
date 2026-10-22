package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.service.ReportService;
import es.yambo_alco.web.service.ReportService.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = ReportController.class)
@Import(TestSecurityConfig.class)
class ReportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ReportService reportService;

    @Test
    @WithMockUser(authorities = "PREP_RD")
    void getProductAnalytics_ShouldReturnProductData() throws Exception {
        ProductAnalytics analytics = new ProductAnalytics(
                25L, 5L, new BigDecimal("1250.00"),
                List.of(new ProductRanking("P1", "Camiseta", 10, new BigDecimal("500.00"))),
                List.of(new ProductRanking("P1", "Camiseta", 10, new BigDecimal("500.00"))),
                List.of(new FamilyProductSales("F1", "Drop Verano", 20, new BigDecimal("1000.00"))),
                List.of(new TimeSeriesPoint("2026-03-01", 5)),
                List.of(new TimeSeriesDecimalPoint("2026-03-01", new BigDecimal("250.00"))),
                Map.of("OPEN", 10L, "DELIVERED", 15L),
                50L, 3L,
                List.of(new ProductFunnel("P1", "Camiseta", 30, 10, 33.3))
        );

        when(reportService.getProductAnalytics(any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(analytics);

        mockMvc.perform(get("/reports/products")
                        .param("startDate", "2026-01-01")
                        .param("endDate", "2026-03-09"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalProductsSold").value(25))
                .andExpect(jsonPath("$.uniqueProductsSold").value(5))
                .andExpect(jsonPath("$.totalProductRevenue").value(1250.00))
                .andExpect(jsonPath("$.topProductsByQuantity[0].productName").value("Camiseta"))
                .andExpect(jsonPath("$.topProductsByQuantity[0].quantity").value(10))
                .andExpect(jsonPath("$.salesByFamily[0].familyName").value("Drop Verano"))
                .andExpect(jsonPath("$.totalViews").value(50))
                .andExpect(jsonPath("$.conversionFunnel[0].conversionRate").value(33.3));
    }

    @Test
    @WithMockUser(authorities = "PREP_RD")
    void getSummary_ShouldIncludeProducts() throws Exception {
        OrderAnalytics orders = new OrderAnalytics(0, BigDecimal.ZERO, BigDecimal.ZERO,
                null, Map.of(), List.of(), List.of());
        UserEngagement users = new UserEngagement(0, 0, 0, 0, 0.0, List.of(), List.of());
        IssueMetrics issues = new IssueMetrics(0, 0, 0, null, Map.of(), List.of());
        ProductAnalytics products = new ProductAnalytics(
                0, 0, BigDecimal.ZERO,
                List.of(), List.of(), List.of(),
                List.of(), List.of(), Map.of(),
                0L, 0L, null);

        ReportSummary summary = new ReportSummary(orders, users, issues, products);

        when(reportService.getReportSummary(any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(summary);

        mockMvc.perform(get("/reports/summary")
                        .param("startDate", "2026-01-01")
                        .param("endDate", "2026-03-09"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.products").exists())
                .andExpect(jsonPath("$.products.totalProductsSold").value(0));
    }
}
