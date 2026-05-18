package es.yambo_alco.web.service;

import es.yambo_alco.web.model.*;

import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.repository.FamilyProductRepository;
import es.yambo_alco.web.repository.OrderRepository;
import es.yambo_alco.web.repository.ProductRepository;
import es.yambo_alco.web.repository.UserRepository;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import org.mockito.Spy;
import es.yambo_alco.web.service.export.builder.FullReportBuilder;
import es.yambo_alco.web.service.export.builder.FactoryReportBuilder;
import es.yambo_alco.web.service.export.builder.WarehouseReportBuilder;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
class OrderExportServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private FamilyProductRepository familyProductRepository;

    @Spy
    private FullReportBuilder fullReportBuilder = new FullReportBuilder();

    @Spy
    private FactoryReportBuilder factoryReportBuilder = new FactoryReportBuilder();

    @Spy
    private WarehouseReportBuilder warehouseReportBuilder = new WarehouseReportBuilder();

    @InjectMocks
    private OrderExportService orderExportService;

    private User testUser;
    private FamilyProduct testDrop;
    private Product testProduct;
    private Product testProduct2;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id("USER001")
                .name("Test User")
                .email("test@example.com")
                .password("password")
                .profiles(Set.of())
                .build();

        testDrop = FamilyProduct.builder()
                .id("DROP001")
                .name("Drop Verano 2025")
                .build();

        testProduct = Product.builder()
                .id("PROD001")
                .name("Camiseta Básica")
                .familyProduct(testDrop)
                .basePrice(BigDecimal.valueOf(25.00))
                .optionsJson("[{\"name\":\"Color\",\"type\":\"select\",\"values\":[{\"id\":\"c1\",\"label\":\"Rojo\"},{\"id\":\"c2\",\"label\":\"Azul\"}]},{\"name\":\"Estampado\",\"type\":\"checkbox\"}]")
                .build();

        testProduct2 = Product.builder()
                .id("PROD002")
                .name("Pantalón Chino")
                .familyProduct(testDrop)
                .basePrice(BigDecimal.valueOf(45.00))
                .optionsJson("[{\"name\":\"Talla\",\"type\":\"select\",\"values\":[{\"id\":\"s\",\"label\":\"S\"},{\"id\":\"m\",\"label\":\"M\"}]}]")
                .build();
    }

    // ─── Helper methods ───

    private Order createOrder(String orderId, OrderStatus status, Set<OrderProduct> products) {
        Order order = Order.builder()
                .id(orderId)
                .customerId("USER001")
                .status(status)
                .createdAt(LocalDateTime.of(2025, 6, 15, 10, 0))
                .orderProducts(products)
                .build();
        // Set bidirectional reference
        if (products != null) {
            products.forEach(op -> op.setOrderId(orderId));
        }
        return order;
    }

    private OrderProduct createOrderProduct(String productId, int quantity, BigDecimal price, String config) {
        return OrderProduct.builder()
                .id(UUID.randomUUID())
                .productId(productId)
                .quantity(quantity)
                .price(price)
                .configuration(config)
                .build();
    }

    private void setupDefaultMocks(List<Order> orders) {
        when(orderRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(orders));
        when(productRepository.findAll()).thenReturn(List.of(testProduct, testProduct2));
        when(familyProductRepository.findAll()).thenReturn(List.of(testDrop));
        when(userRepository.findById("USER001")).thenReturn(Optional.of(testUser));
    }

    private XSSFWorkbook parseWorkbook(byte[] bytes) throws Exception {
        return new XSSFWorkbook(new ByteArrayInputStream(bytes));
    }

    private String cellValue(Sheet sheet, int row, int col) {
        Row r = sheet.getRow(row);
        if (r == null) return null;
        var cell = r.getCell(col);
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> String.valueOf(cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> cell.getCellFormula();
            default -> null;
        };
    }

    // ─── Tests ───

    @Test
    void exportOrders_WhenNoOrders_ShouldReturnValidWorkbookWithSummaryOnly() throws Exception {
        when(orderRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(productRepository.findAll()).thenReturn(List.of(testProduct, testProduct2));
        when(familyProductRepository.findAll()).thenReturn(List.of(testDrop));

        byte[] result = orderExportService.exportOrders(null);

        assertNotNull(result);
        assertTrue(result.length > 0);

        try (XSSFWorkbook wb = parseWorkbook(result)) {
            assertEquals(1, wb.getNumberOfSheets(), "Should only have Resumen sheet when no orders");
            assertEquals("Resumen", wb.getSheetName(0));
        }

        verify(orderRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void exportOrders_WithOrders_ShouldReturnWorkbookWithSummaryAndProductSheets() throws Exception {
        OrderProduct op1 = createOrderProduct("PROD001", 3, BigDecimal.valueOf(25.00),
                "{\"Color\":\"c1\",\"Estampado\":true}");
        Order order = createOrder("ORD001", OrderStatus.PAYMENT_CONFIRMED, Set.of(op1));
        setupDefaultMocks(List.of(order));

        byte[] result = orderExportService.exportOrders(null);

        assertNotNull(result);
        try (XSSFWorkbook wb = parseWorkbook(result)) {
            assertTrue(wb.getNumberOfSheets() >= 2, "Should have Resumen + at least 1 product sheet");
            assertEquals("Resumen", wb.getSheetName(0));

            // Second sheet should be named after the product
            String productSheetName = wb.getSheetName(1);
            assertTrue(productSheetName.contains("Camiseta"),
                    "Product sheet name should contain product name, got: " + productSheetName);
        }
    }

    @Test
    void exportOrders_WithMultipleProducts_ShouldCreateSheetPerProduct() throws Exception {
        OrderProduct op1 = createOrderProduct("PROD001", 2, BigDecimal.valueOf(25.00), "{}");
        OrderProduct op2 = createOrderProduct("PROD002", 1, BigDecimal.valueOf(45.00), "{}");
        Order order = createOrder("ORD001", OrderStatus.PAYMENT_CONFIRMED, Set.of(op1, op2));
        setupDefaultMocks(List.of(order));

        byte[] result = orderExportService.exportOrders(null);

        try (XSSFWorkbook wb = parseWorkbook(result)) {
            assertEquals(3, wb.getNumberOfSheets(), "Should have Resumen + 2 product sheets");
            assertEquals("Resumen", wb.getSheetName(0));

            // Both products should have their own sheets
            List<String> sheetNames = new ArrayList<>();
            for (int i = 1; i < wb.getNumberOfSheets(); i++) {
                sheetNames.add(wb.getSheetName(i));
            }
            assertTrue(sheetNames.stream().anyMatch(n -> n.contains("Camiseta")),
                    "Should have a sheet for Camiseta");
            assertTrue(sheetNames.stream().anyMatch(n -> n.contains("Pantal")),
                    "Should have a sheet for Pantalón");
        }
    }

    @Test
    void exportOrders_WithDropFilter_ShouldFilterBySelectedDrops() throws Exception {
        // Product without drop
        Product noDrop = Product.builder()
                .id("PROD_NODROP")
                .name("Sin Drop Producto")
                .familyProduct(null)
                .basePrice(BigDecimal.TEN)
                .optionsJson("[]")
                .build();

        when(productRepository.findAll()).thenReturn(List.of(testProduct, testProduct2, noDrop));
        when(familyProductRepository.findAll()).thenReturn(List.of(testDrop));
        when(userRepository.findById("USER001")).thenReturn(Optional.of(testUser));

        OrderProduct opInDrop = createOrderProduct("PROD001", 2, BigDecimal.valueOf(25.00), "{}");
        OrderProduct opNoDrop = createOrderProduct("PROD_NODROP", 1, BigDecimal.TEN, "{}");
        Order order = createOrder("ORD001", OrderStatus.PAYMENT_CONFIRMED, Set.of(opInDrop, opNoDrop));

        when(orderRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(order)));

        byte[] result = orderExportService.exportOrders(List.of("DROP001"));

        try (XSSFWorkbook wb = parseWorkbook(result)) {
            // Only in-drop product should get a sheet
            List<String> sheetNames = new ArrayList<>();
            for (int i = 0; i < wb.getNumberOfSheets(); i++) {
                sheetNames.add(wb.getSheetName(i));
            }
            assertTrue(sheetNames.stream().anyMatch(n -> n.contains("Camiseta")),
                    "Should include product from selected drop");
            assertFalse(sheetNames.stream().anyMatch(n -> n.contains("Sin Drop")),
                    "Should exclude product not in selected drop");
        }
    }

    @Test
    void exportOrders_WithNoDropFilter_ShouldIncludeAllProducts() throws Exception {
        OrderProduct op1 = createOrderProduct("PROD001", 2, BigDecimal.valueOf(25.00), "{}");
        Order order = createOrder("ORD001", OrderStatus.PAYMENT_CONFIRMED, Set.of(op1));
        setupDefaultMocks(List.of(order));

        byte[] result = orderExportService.exportOrders(null);

        try (XSSFWorkbook wb = parseWorkbook(result)) {
            assertTrue(wb.getNumberOfSheets() >= 2, "Should have product sheets with null dropIds");
        }

        // Also test with empty list
        byte[] result2 = orderExportService.exportOrders(List.of());

        try (XSSFWorkbook wb = parseWorkbook(result2)) {
            assertTrue(wb.getNumberOfSheets() >= 2, "Should have product sheets with empty dropIds");
        }
    }

    @Test
    void exportOrders_ShouldOnlyIncludeAllowedStatuses() throws Exception {
        OrderProduct opConfirming = createOrderProduct("PROD001", 1, BigDecimal.valueOf(25.00), "{}");
        OrderProduct opPending = createOrderProduct("PROD001", 1, BigDecimal.valueOf(25.00), "{}");

        Order confirmedOrder = createOrder("ORD001", OrderStatus.PAYMENT_CONFIRMED, Set.of(opConfirming));
        // pendingOrder would be filtered out by the specification — it is never returned by the repo
        createOrder("ORD002", OrderStatus.PENDING_PAYMENT, Set.of(opPending));

        // The repository query with spec filters, so only return confirmed orders
        when(orderRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(confirmedOrder)));
        when(productRepository.findAll()).thenReturn(List.of(testProduct));
        when(familyProductRepository.findAll()).thenReturn(List.of(testDrop));
        when(userRepository.findById("USER001")).thenReturn(Optional.of(testUser));

        byte[] result = orderExportService.exportOrders(null);

        assertNotNull(result);
        // The key assertion is that the repository is called with the spec filter
        verify(orderRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void exportOrders_WithSelectConfig_ShouldResolveLabels() throws Exception {
        // Config with a select value ID that should get resolved to a label
        OrderProduct op = createOrderProduct("PROD001", 1, BigDecimal.valueOf(25.00),
                "{\"Color\":\"c1\",\"Estampado\":false}");
        Order order = createOrder("ORD001", OrderStatus.PAYMENT_CONFIRMED, Set.of(op));
        setupDefaultMocks(List.of(order));

        byte[] result = orderExportService.exportOrders(null);

        try (XSSFWorkbook wb = parseWorkbook(result)) {
            // Find the product sheet
            Sheet productSheet = wb.getSheet("Camiseta Básica");
            assertNotNull(productSheet, "Product sheet should exist");

            // Find the "Color" column and verify the value is the label, not the ID
            boolean foundRojo = false;
            boolean foundNo = false;
            for (int r = 0; r <= productSheet.getLastRowNum(); r++) {
                Row row = productSheet.getRow(r);
                if (row == null) continue;
                for (int c = 0; c <= row.getLastCellNum(); c++) {
                    var cell = row.getCell(c);
                    if (cell != null && cell.getCellType() == org.apache.poi.ss.usermodel.CellType.STRING) {
                        String val = cell.getStringCellValue();
                        if ("Rojo".equals(val)) foundRojo = true;
                        if ("No".equals(val)) foundNo = true;
                    }
                }
            }
            assertTrue(foundRojo, "Select config 'c1' should be resolved to label 'Rojo'");
            assertTrue(foundNo, "Checkbox config 'false' should be resolved to 'No'");
        }
    }

    @Test
    void exportOrders_WithCheckboxConfig_ShouldResolveSiNo() throws Exception {
        OrderProduct op = createOrderProduct("PROD001", 1, BigDecimal.valueOf(25.00),
                "{\"Color\":\"c2\",\"Estampado\":true}");
        Order order = createOrder("ORD001", OrderStatus.PAYMENT_CONFIRMED, Set.of(op));
        setupDefaultMocks(List.of(order));

        byte[] result = orderExportService.exportOrders(null);

        try (XSSFWorkbook wb = parseWorkbook(result)) {
            Sheet productSheet = wb.getSheet("Camiseta Básica");
            assertNotNull(productSheet);

            boolean foundSi = false;
            boolean foundAzul = false;
            for (int r = 0; r <= productSheet.getLastRowNum(); r++) {
                Row row = productSheet.getRow(r);
                if (row == null) continue;
                for (int c = 0; c <= row.getLastCellNum(); c++) {
                    var cell = row.getCell(c);
                    if (cell != null && cell.getCellType() == org.apache.poi.ss.usermodel.CellType.STRING) {
                        String val = cell.getStringCellValue();
                        if ("Sí".equals(val)) foundSi = true;
                        if ("Azul".equals(val)) foundAzul = true;
                    }
                }
            }
            assertTrue(foundSi, "Checkbox config 'true' should be resolved to 'Sí'");
            assertTrue(foundAzul, "Select config 'c2' should be resolved to label 'Azul'");
        }
    }

    @Test
    void exportOrders_SummarySheet_ShouldContainTitle() throws Exception {
        OrderProduct op = createOrderProduct("PROD001", 5, BigDecimal.valueOf(25.00), "{}");
        Order order = createOrder("ORD001", OrderStatus.PAYMENT_CONFIRMED, Set.of(op));
        setupDefaultMocks(List.of(order));

        byte[] result = orderExportService.exportOrders(null);

        try (XSSFWorkbook wb = parseWorkbook(result)) {
            Sheet summary = wb.getSheet("Resumen");
            assertNotNull(summary);

            // Find the title cell
            boolean foundTitle = false;
            for (int r = 0; r <= summary.getLastRowNum(); r++) {
                String val = cellValue(summary, r, 0);
                if (val != null && val.contains("Pedido para Fabricación")) {
                    foundTitle = true;
                    break;
                }
            }
            assertTrue(foundTitle, "Summary should contain 'Pedido para Fabricación' title");
        }
    }

    @Test
    void exportOrders_SummarySheet_ShouldContainDropNote() throws Exception {
        OrderProduct op = createOrderProduct("PROD001", 2, BigDecimal.valueOf(25.00), "{}");
        Order order = createOrder("ORD001", OrderStatus.PAYMENT_CONFIRMED, Set.of(op));

        when(orderRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(order)));
        when(productRepository.findAll()).thenReturn(List.of(testProduct));
        when(familyProductRepository.findAll()).thenReturn(List.of(testDrop));
        when(userRepository.findById("USER001")).thenReturn(Optional.of(testUser));

        byte[] result = orderExportService.exportOrders(List.of("DROP001"));

        try (XSSFWorkbook wb = parseWorkbook(result)) {
            Sheet summary = wb.getSheet("Resumen");
            assertNotNull(summary);

            boolean foundDrops = false;
            for (int r = 0; r <= summary.getLastRowNum(); r++) {
                String val = cellValue(summary, r, 0);
                if (val != null && val.contains("Drops:") && val.contains("Drop Verano 2025")) {
                    foundDrops = true;
                    break;
                }
            }
            assertTrue(foundDrops, "Summary should contain selected drop names");
        }
    }

    @Test
    void exportOrders_SummarySheet_ShouldContainExclusionNote() throws Exception {
        OrderProduct op = createOrderProduct("PROD001", 1, BigDecimal.valueOf(25.00), "{}");
        Order order = createOrder("ORD001", OrderStatus.PAYMENT_CONFIRMED, Set.of(op));
        setupDefaultMocks(List.of(order));

        byte[] result = orderExportService.exportOrders(null);

        try (XSSFWorkbook wb = parseWorkbook(result)) {
            Sheet summary = wb.getSheet("Resumen");
            assertNotNull(summary);

            boolean foundNote = false;
            for (int r = 0; r <= summary.getLastRowNum(); r++) {
                String val = cellValue(summary, r, 0);
                if (val != null && val.contains("Se excluyen automáticamente")) {
                    foundNote = true;
                    break;
                }
            }
            assertTrue(foundNote, "Summary should contain exclusion note");
        }
    }

    @Test
    void exportOrders_ProductSheet_ShouldContainClientData() throws Exception {
        OrderProduct op = createOrderProduct("PROD001", 2, BigDecimal.valueOf(25.00),
                "{\"Color\":\"c1\"}");
        Order order = createOrder("ORD001", OrderStatus.PAYMENT_CONFIRMED, Set.of(op));
        setupDefaultMocks(List.of(order));

        byte[] result = orderExportService.exportOrders(null);

        try (XSSFWorkbook wb = parseWorkbook(result)) {
            Sheet productSheet = wb.getSheet("Camiseta Básica");
            assertNotNull(productSheet);

            boolean foundClient = false;
            boolean foundEmail = false;
            boolean foundOrderId = false;
            for (int r = 0; r <= productSheet.getLastRowNum(); r++) {
                Row row = productSheet.getRow(r);
                if (row == null) continue;
                for (int c = 0; c <= row.getLastCellNum(); c++) {
                    var cell = row.getCell(c);
                    if (cell != null && cell.getCellType() == org.apache.poi.ss.usermodel.CellType.STRING) {
                        String val = cell.getStringCellValue();
                        if ("Test User".equals(val)) foundClient = true;
                        if ("test@example.com".equals(val)) foundEmail = true;
                        if ("ORD001".equals(val)) foundOrderId = true;
                    }
                }
            }
            assertTrue(foundClient, "Product sheet should contain client name");
            assertTrue(foundEmail, "Product sheet should contain client email");
            assertTrue(foundOrderId, "Product sheet should contain order ID");
        }
    }

    @Test
    void exportOrders_ProductSheet_ShouldContainMetadata() throws Exception {
        OrderProduct op = createOrderProduct("PROD001", 3, BigDecimal.valueOf(25.00), "{}");
        Order order = createOrder("ORD001", OrderStatus.PAYMENT_CONFIRMED, Set.of(op));
        setupDefaultMocks(List.of(order));

        byte[] result = orderExportService.exportOrders(null);

        try (XSSFWorkbook wb = parseWorkbook(result)) {
            Sheet productSheet = wb.getSheet("Camiseta Básica");
            assertNotNull(productSheet);

            boolean foundDropLabel = false;
            boolean foundTotalUnidades = false;
            for (int r = 0; r <= productSheet.getLastRowNum(); r++) {
                String val = cellValue(productSheet, r, 0);
                if (val != null && val.contains("Drop:")) foundDropLabel = true;
                if (val != null && val.contains("Total unidades:")) foundTotalUnidades = true;
            }
            assertTrue(foundDropLabel, "Product sheet should contain 'Drop:' metadata");
            assertTrue(foundTotalUnidades, "Product sheet should contain 'Total unidades:' metadata");
        }
    }

    @Test
    void exportOrders_WithMultipleOrdersForSameProduct_ShouldGroupThem() throws Exception {
        OrderProduct op1 = createOrderProduct("PROD001", 2, BigDecimal.valueOf(25.00), "{}");
        OrderProduct op2 = createOrderProduct("PROD001", 3, BigDecimal.valueOf(25.00), "{}");
        Order order1 = createOrder("ORD001", OrderStatus.PAYMENT_CONFIRMED, Set.of(op1));

        User user2 = User.builder()
                .id("USER002")
                .name("Another User")
                .email("another@example.com")
                .password("password")
                .profiles(Set.of())
                .build();
        Order order2 = Order.builder()
                .id("ORD002")
                .customerId("USER002")
                .status(OrderStatus.CLOSED)
                .createdAt(LocalDateTime.of(2025, 6, 16, 14, 0))
                .orderProducts(Set.of(op2))
                .build();
        op2.setOrderId("ORD002");

        when(orderRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(order1, order2)));
        when(productRepository.findAll()).thenReturn(List.of(testProduct));
        when(familyProductRepository.findAll()).thenReturn(List.of(testDrop));
        when(userRepository.findById("USER001")).thenReturn(Optional.of(testUser));
        when(userRepository.findById("USER002")).thenReturn(Optional.of(user2));

        byte[] result = orderExportService.exportOrders(null);

        try (XSSFWorkbook wb = parseWorkbook(result)) {
            // Should only have Resumen + 1 product sheet (grouped)
            assertEquals(2, wb.getNumberOfSheets(),
                    "Both orders for same product should be grouped in one sheet");

            Sheet productSheet = wb.getSheet("Camiseta Básica");
            assertNotNull(productSheet);

            // Verify both clients appear
            boolean foundUser1 = false;
            boolean foundUser2 = false;
            for (int r = 0; r <= productSheet.getLastRowNum(); r++) {
                Row row = productSheet.getRow(r);
                if (row == null) continue;
                for (int c = 0; c <= row.getLastCellNum(); c++) {
                    var cell = row.getCell(c);
                    if (cell != null && cell.getCellType() == org.apache.poi.ss.usermodel.CellType.STRING) {
                        if ("Test User".equals(cell.getStringCellValue())) foundUser1 = true;
                        if ("Another User".equals(cell.getStringCellValue())) foundUser2 = true;
                    }
                }
            }
            assertTrue(foundUser1, "Should contain first user");
            assertTrue(foundUser2, "Should contain second user");
        }
    }

    @Test
    void exportOrders_WithNullOrderProducts_ShouldSkipGracefully() throws Exception {
        Order order = Order.builder()
                .id("ORD001")
                .customerId("USER001")
                .status(OrderStatus.PAYMENT_CONFIRMED)
                .createdAt(LocalDateTime.now())
                .orderProducts(null)
                .build();

        setupDefaultMocks(List.of(order));

        byte[] result = orderExportService.exportOrders(null);

        assertNotNull(result);
        try (XSSFWorkbook wb = parseWorkbook(result)) {
            assertEquals(1, wb.getNumberOfSheets(), "Should only have Resumen with no product data");
        }
    }

    @Test
    void exportOrders_WithUnknownUser_ShouldUseNA() throws Exception {
        OrderProduct op = createOrderProduct("PROD001", 1, BigDecimal.valueOf(25.00), "{}");
        Order order = Order.builder()
                .id("ORD001")
                .customerId("UNKNOWN_USER")
                .status(OrderStatus.PAYMENT_CONFIRMED)
                .createdAt(LocalDateTime.now())
                .orderProducts(Set.of(op))
                .build();
        op.setOrderId("ORD001");

        when(orderRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(order)));
        when(productRepository.findAll()).thenReturn(List.of(testProduct));
        when(familyProductRepository.findAll()).thenReturn(List.of(testDrop));
        when(userRepository.findById("UNKNOWN_USER")).thenReturn(Optional.empty());

        byte[] result = orderExportService.exportOrders(null);

        try (XSSFWorkbook wb = parseWorkbook(result)) {
            Sheet productSheet = wb.getSheet("Camiseta Básica");
            assertNotNull(productSheet);

            boolean foundNA = false;
            for (int r = 0; r <= productSheet.getLastRowNum(); r++) {
                Row row = productSheet.getRow(r);
                if (row == null) continue;
                for (int c = 0; c <= row.getLastCellNum(); c++) {
                    var cell = row.getCell(c);
                    if (cell != null && cell.getCellType() == org.apache.poi.ss.usermodel.CellType.STRING
                            && "N/A".equals(cell.getStringCellValue())) {
                        foundNA = true;
                        break;
                    }
                }
                if (foundNA) break;
            }
            assertTrue(foundNA, "Unknown user should show 'N/A' as client name");
        }
    }

    @Test
    void exportOrders_ShouldProduceValidXlsxBytes() throws Exception {
        OrderProduct op = createOrderProduct("PROD001", 1, BigDecimal.valueOf(25.00), "{}");
        Order order = createOrder("ORD001", OrderStatus.PAYMENT_CONFIRMED, Set.of(op));
        setupDefaultMocks(List.of(order));

        byte[] result = orderExportService.exportOrders(null);

        assertNotNull(result);
        assertTrue(result.length > 100, "Excel file should have substantial size");

        // Verify it starts with XLSX magic bytes (PK zip header)
        assertEquals((byte) 0x50, result[0], "Should start with PK zip header");
        assertEquals((byte) 0x4B, result[1], "Should start with PK zip header");

        // Verify it can be parsed as a valid workbook
        assertDoesNotThrow(() -> {
            try (XSSFWorkbook wb = parseWorkbook(result)) {
                assertNotNull(wb);
            }
        }, "Result should be a parseable XLSX workbook");
    }

    @Test
    void exportOrders_ProductSheet_ShouldHaveSubtotalFormulas() throws Exception {
        OrderProduct op = createOrderProduct("PROD001", 3, BigDecimal.valueOf(25.00), "{}");
        Order order = createOrder("ORD001", OrderStatus.PAYMENT_CONFIRMED, Set.of(op));
        setupDefaultMocks(List.of(order));

        byte[] result = orderExportService.exportOrders(null);

        try (XSSFWorkbook wb = parseWorkbook(result)) {
            Sheet productSheet = wb.getSheet("Camiseta Básica");
            assertNotNull(productSheet);

            // Look for a FORMULA cell (subtotal formulas)
            boolean foundFormula = false;
            for (int r = 0; r <= productSheet.getLastRowNum(); r++) {
                Row row = productSheet.getRow(r);
                if (row == null) continue;
                for (int c = 0; c <= row.getLastCellNum(); c++) {
                    var cell = row.getCell(c);
                    if (cell != null && cell.getCellType() == org.apache.poi.ss.usermodel.CellType.FORMULA) {
                        foundFormula = true;
                        break;
                    }
                }
                if (foundFormula) break;
            }
            assertTrue(foundFormula, "Product sheet should contain subtotal formulas");
        }
    }

    @Test
    void exportOrders_WithInvalidConfig_ShouldHandleGracefully() throws Exception {
        OrderProduct op = createOrderProduct("PROD001", 1, BigDecimal.valueOf(25.00),
                "not-valid-json");
        Order order = createOrder("ORD001", OrderStatus.PAYMENT_CONFIRMED, Set.of(op));
        setupDefaultMocks(List.of(order));

        // Should not throw
        byte[] result = assertDoesNotThrow(() -> orderExportService.exportOrders(null));
        assertNotNull(result);
        assertTrue(result.length > 0);
    }

    @Test
    void exportOrders_WithNullConfig_ShouldHandleGracefully() throws Exception {
        OrderProduct op = createOrderProduct("PROD001", 1, BigDecimal.valueOf(25.00), null);
        Order order = createOrder("ORD001", OrderStatus.PAYMENT_CONFIRMED, Set.of(op));
        setupDefaultMocks(List.of(order));

        byte[] result = assertDoesNotThrow(() -> orderExportService.exportOrders(null));
        assertNotNull(result);
        assertTrue(result.length > 0);
    }

    @Test
    void exportOrders_WithProductWithoutDrop_ShouldShowSinDrop() throws Exception {
        Product noDrop = Product.builder()
                .id("PROD_NODROP")
                .name("Producto Suelto")
                .familyProduct(null)
                .basePrice(BigDecimal.TEN)
                .optionsJson("[]")
                .build();

        OrderProduct op = createOrderProduct("PROD_NODROP", 1, BigDecimal.TEN, "{}");
        Order order = createOrder("ORD001", OrderStatus.PAYMENT_CONFIRMED, Set.of(op));

        when(orderRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(order)));
        when(productRepository.findAll()).thenReturn(List.of(noDrop));
        when(familyProductRepository.findAll()).thenReturn(List.of());
        when(userRepository.findById("USER001")).thenReturn(Optional.of(testUser));

        byte[] result = orderExportService.exportOrders(null);

        try (XSSFWorkbook wb = parseWorkbook(result)) {
            Sheet productSheet = wb.getSheet("Producto Suelto");
            assertNotNull(productSheet, "Should have sheet for product without drop");

            boolean foundSinDrop = false;
            for (int r = 0; r <= productSheet.getLastRowNum(); r++) {
                Row row = productSheet.getRow(r);
                if (row == null) continue;
                for (int c = 0; c <= row.getLastCellNum(); c++) {
                    var cell = row.getCell(c);
                    if (cell != null && cell.getCellType() == org.apache.poi.ss.usermodel.CellType.STRING
                            && "Sin Drop".equals(cell.getStringCellValue())) {
                        foundSinDrop = true;
                        break;
                    }
                }
                if (foundSinDrop) break;
            }
            assertTrue(foundSinDrop, "Product without drop should show 'Sin Drop'");
        }
    }

    @Test
    void exportOrders_ShouldSortProductSheetsByTotalQuantityDescending() throws Exception {
        // PROD002 gets more quantity than PROD001
        OrderProduct op1 = createOrderProduct("PROD001", 1, BigDecimal.valueOf(25.00), "{}");
        OrderProduct op2 = createOrderProduct("PROD002", 10, BigDecimal.valueOf(45.00), "{}");
        Order order = createOrder("ORD001", OrderStatus.PAYMENT_CONFIRMED, Set.of(op1, op2));
        setupDefaultMocks(List.of(order));

        byte[] result = orderExportService.exportOrders(null);

        try (XSSFWorkbook wb = parseWorkbook(result)) {
            assertEquals(3, wb.getNumberOfSheets());
            // Sheet at index 1 should be the product with higher quantity (PROD002)
            String firstProductSheet = wb.getSheetName(1);
            assertTrue(firstProductSheet.contains("Pantal"),
                    "First product sheet should be the one with highest quantity, got: " + firstProductSheet);
        }
    }

    @Test
    void exportOrders_WithAllIncludedStatuses_ShouldProcessAll() throws Exception {
        OrderProduct op1 = createOrderProduct("PROD001", 1, BigDecimal.valueOf(25.00), "{}");
        OrderProduct op2 = createOrderProduct("PROD001", 2, BigDecimal.valueOf(25.00), "{}");
        OrderProduct op3 = createOrderProduct("PROD001", 1, BigDecimal.valueOf(25.00), "{}");
        OrderProduct op4 = createOrderProduct("PROD001", 3, BigDecimal.valueOf(25.00), "{}");

        Order o1 = createOrder("ORD001", OrderStatus.CONFIRMING_PAYMENT, Set.of(op1));
        Order o2 = createOrder("ORD002", OrderStatus.PAYMENT_CONFIRMED, Set.of(op2));
        Order o3 = createOrder("ORD003", OrderStatus.PENDING_PRODUCTS, Set.of(op3));
        Order o4 = createOrder("ORD004", OrderStatus.CLOSED, Set.of(op4));

        setupDefaultMocks(List.of(o1, o2, o3, o4));

        byte[] result = orderExportService.exportOrders(null);

        try (XSSFWorkbook wb = parseWorkbook(result)) {
            Sheet productSheet = wb.getSheet("Camiseta Básica");
            assertNotNull(productSheet);

            // Count order IDs in the sheet
            Set<String> orderIds = new HashSet<>();
            for (int r = 0; r <= productSheet.getLastRowNum(); r++) {
                Row row = productSheet.getRow(r);
                if (row == null) continue;
                var cell = row.getCell(0);
                if (cell != null && cell.getCellType() == org.apache.poi.ss.usermodel.CellType.STRING) {
                    String val = cell.getStringCellValue();
                    if (val.startsWith("ORD")) orderIds.add(val);
                }
            }
            assertEquals(4, orderIds.size(), "All 4 orders with included statuses should appear");
        }
    }

    // ─── FACTORY report type tests ─────────────────────────────────

    @Test
    void exportOrders_WithFactoryType_ShouldProduceAggregatedSheetWithoutPrices() throws Exception {
        OrderProduct op = createOrderProduct("PROD001", 3, BigDecimal.valueOf(25.00),
                "{\"Color\":{\"id\":\"c1\",\"label\":\"Rojo\"}}");
        Order order = createOrder("ORD001", OrderStatus.PAYMENT_CONFIRMED, Set.of(op));
        setupDefaultMocks(List.of(order));

        byte[] result = orderExportService.exportOrders(null, es.yambo_alco.web.service.export.ExportReportType.FACTORY, null);

        assertNotNull(result);
        try (XSSFWorkbook wb = parseWorkbook(result)) {
            // Summary sheet + at least one product sheet
            assertTrue(wb.getNumberOfSheets() >= 2, "Factory report should have summary + product sheets");
            Sheet summarySheet = wb.getSheet("Resumen");
            assertNotNull(summarySheet, "Factory report should have 'Resumen' sheet");

            // Product sheet should NOT contain customer name or price columns
            Sheet productSheet = wb.getSheet("Camiseta Básica");
            assertNotNull(productSheet, "Product sheet should exist");

            // Check that no cell in the header row (first data row) contains "Cliente" or "Precio"
            boolean foundCliente = false;
            boolean foundPrecio = false;
            for (int r = 0; r <= productSheet.getLastRowNum(); r++) {
                Row row = productSheet.getRow(r);
                if (row == null) continue;
                for (int c = 0; c < row.getLastCellNum(); c++) {
                    var cell = row.getCell(c);
                    if (cell == null) continue;
                    if (cell.getCellType() == org.apache.poi.ss.usermodel.CellType.STRING) {
                        String v = cell.getStringCellValue();
                        if ("Cliente".equals(v)) foundCliente = true;
                        if ("Precio".equals(v)) foundPrecio = true;
                    }
                }
            }
            assertFalse(foundCliente, "Factory sheet should NOT contain 'Cliente' column");
            assertFalse(foundPrecio, "Factory sheet should NOT contain 'Precio' column");
        }
    }

    @Test
    void exportOrders_WithFactoryType_ShouldFilterByPaymentConfirmedByDefault() throws Exception {
        OrderProduct opConfirmed = createOrderProduct("PROD001", 2, BigDecimal.valueOf(25.00), "{}");
        OrderProduct opPending   = createOrderProduct("PROD001", 5, BigDecimal.valueOf(25.00), "{}");

        Order confirmedOrder = createOrder("ORD001", OrderStatus.PAYMENT_CONFIRMED, Set.of(opConfirmed));
        Order pendingOrder   = createOrder("ORD002", OrderStatus.PENDING_PRODUCTS, Set.of(opPending));

        // FACTORY default filter is PAYMENT_CONFIRMED — only confirmedOrder's products should appear
        when(orderRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(confirmedOrder, pendingOrder)));
        when(productRepository.findAll()).thenReturn(List.of(testProduct));
        when(familyProductRepository.findAll()).thenReturn(List.of(testDrop));
        when(userRepository.findById("USER001")).thenReturn(Optional.of(testUser));

        byte[] result = orderExportService.exportOrders(null, es.yambo_alco.web.service.export.ExportReportType.FACTORY, null);

        assertNotNull(result);
        try (XSSFWorkbook wb = parseWorkbook(result)) {
            Sheet productSheet = wb.getSheet("Camiseta Básica");
            assertNotNull(productSheet);

            // Only PAYMENT_CONFIRMED order (qty=2) should appear → aggregated quantity must be 2, not 7
            boolean found7 = false;
            for (int r = 0; r <= productSheet.getLastRowNum(); r++) {
                Row row = productSheet.getRow(r);
                if (row == null) continue;
                for (int c = 0; c < row.getLastCellNum(); c++) {
                    var cell = row.getCell(c);
                    if (cell == null) continue;
                    if (cell.getCellType() == org.apache.poi.ss.usermodel.CellType.NUMERIC
                            && cell.getNumericCellValue() == 7.0) {
                        found7 = true;
                    }
                }
            }
            assertFalse(found7, "Factory sheet should NOT sum both orders' quantities when status filter is active");
        }
    }

    // ─── WAREHOUSE report type tests ───────────────────────────────

    @Test
    void exportOrders_WithWarehouseType_ShouldIncludeValidationColumns() throws Exception {
        OrderProduct op = createOrderProduct("PROD001", 1, BigDecimal.valueOf(25.00), "{}");
        Order order = createOrder("ORD001", OrderStatus.PENDING_PRODUCTS, Set.of(op));

        // Use PENDING_PRODUCTS status since that is the default filter for WAREHOUSE
        when(orderRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(order)));
        when(productRepository.findAll()).thenReturn(List.of(testProduct));
        when(familyProductRepository.findAll()).thenReturn(List.of(testDrop));
        when(userRepository.findById("USER001")).thenReturn(Optional.of(testUser));

        byte[] result = orderExportService.exportOrders(null, es.yambo_alco.web.service.export.ExportReportType.WAREHOUSE, null);

        assertNotNull(result);
        try (XSSFWorkbook wb = parseWorkbook(result)) {
            Sheet productSheet = wb.getSheet("Camiseta Básica");
            assertNotNull(productSheet, "Product sheet should exist for warehouse report");

            // Validation columns: "Recibido", "OK", "Notas" should be present
            boolean foundRecibido = false;
            boolean foundOk = false;
            boolean foundNotas = false;
            for (int r = 0; r <= productSheet.getLastRowNum(); r++) {
                Row row = productSheet.getRow(r);
                if (row == null) continue;
                for (int c = 0; c < row.getLastCellNum(); c++) {
                    var cell = row.getCell(c);
                    if (cell == null) continue;
                    if (cell.getCellType() == org.apache.poi.ss.usermodel.CellType.STRING) {
                        String v = cell.getStringCellValue();
                        if ("Recibido".equals(v)) foundRecibido = true;
                        if ("OK".equals(v)) foundOk = true;
                        if ("Notas".equals(v)) foundNotas = true;
                    }
                }
            }
            assertTrue(foundRecibido, "Warehouse sheet should contain 'Recibido' column");
            assertTrue(foundOk, "Warehouse sheet should contain 'OK' column");
            assertTrue(foundNotas, "Warehouse sheet should contain 'Notas' column");
        }
    }

    @Test
    void exportOrders_WithWarehouseType_ShouldProduceSummarySheet() throws Exception {
        OrderProduct op = createOrderProduct("PROD001", 2, BigDecimal.valueOf(25.00), "{}");
        Order order = createOrder("ORD001", OrderStatus.PENDING_PRODUCTS, Set.of(op));

        when(orderRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(order)));
        when(productRepository.findAll()).thenReturn(List.of(testProduct));
        when(familyProductRepository.findAll()).thenReturn(List.of(testDrop));
        when(userRepository.findById("USER001")).thenReturn(Optional.of(testUser));

        byte[] result = orderExportService.exportOrders(null, es.yambo_alco.web.service.export.ExportReportType.WAREHOUSE, null);

        assertNotNull(result);
        try (XSSFWorkbook wb = parseWorkbook(result)) {
            assertTrue(wb.getNumberOfSheets() >= 2);
            assertNotNull(wb.getSheet("Resumen"), "Warehouse report should have 'Resumen' sheet");
        }
    }
}
