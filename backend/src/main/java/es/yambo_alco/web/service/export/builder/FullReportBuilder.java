package es.yambo_alco.web.service.export.builder;

import es.yambo_alco.web.model.ProductOption;
import es.yambo_alco.web.model.enums.OrderStatus;
import es.yambo_alco.web.service.export.ConfigAggregator;
import es.yambo_alco.web.service.export.ExcelWorkbookHelper;
import es.yambo_alco.web.service.export.ExportReportType;
import es.yambo_alco.web.service.export.model.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Builds the full-detail report: one "Resumen" summary sheet and one sheet per product,
 * with a row per order-product line (no aggregation). Includes all business fields:
 * order ID, customer name/email, prices, product status, and dates.
 */
@Component
public class FullReportBuilder implements ReportBuilder {

    private static final Logger log = LoggerFactory.getLogger(FullReportBuilder.class);

    private static final Map<OrderStatus, String> ORDER_STATUS_LABELS = Map.of(
            OrderStatus.PENDING_PAYMENT,   "Pendiente de Pago",
            OrderStatus.CONFIRMING_PAYMENT, "Confirmando Pago",
            OrderStatus.PAYMENT_CONFIRMED, "Pago Confirmado",
            OrderStatus.CANCELED,          "Cancelado",
            OrderStatus.PENDING_PRODUCTS,  "Pendiente de Productos",
            OrderStatus.CLOSED,            "Completado"
    );

    // ════════════════════════════════════════════════════════
    // ReportBuilder
    // ════════════════════════════════════════════════════════

    @Override
    public void build(XSSFWorkbook wb, Map<String, ProductGroup> groups,
                      List<String> selectedDropNames, byte[] logoBytes, StylePack styles) {
        createSummarySheet(wb, groups, selectedDropNames, logoBytes, styles);

        Set<String> usedNames = new HashSet<>();
        usedNames.add("Resumen");

        List<ProductGroup> sortedGroups = groups.values().stream()
                .sorted(Comparator.comparingInt(ProductGroup::totalQty).reversed())
                .toList();

        for (ProductGroup group : sortedGroups) {
            String sheetName = ExcelWorkbookHelper.getUniqueSheetName(group.productName, usedNames);
            usedNames.add(sheetName);
            createProductSheet(wb, group, sheetName, styles);
        }
    }

    // ════════════════════════════════════════════════════════
    // Summary Sheet
    // ════════════════════════════════════════════════════════

    private void createSummarySheet(XSSFWorkbook wb, Map<String, ProductGroup> groups,
                                    List<String> selectedDropNames, byte[] logoBytes,
                                    StylePack styles) {
        XSSFSheet ws = wb.createSheet("Resumen");
        ws.setDefaultColumnWidth(18);

        int currentRow = 0;

        // ── Logo ──
        currentRow = ReportSheetSectionHelper.addLogo(wb, ws, logoBytes, log);

        // ── Title ──
        String dateStr = LocalDateTime.now().format(
                DateTimeFormatter.ofPattern("d 'de' MMMM 'de' yyyy", new Locale("es", "ES")));
        ReportSheetSectionHelper.addTitleRow(ws, currentRow, 4, "Pedido para Fabricación — " + dateStr, styles.title);
        currentRow++;

        // ── Subtitle: selected drops ──
        currentRow = ReportSheetSectionHelper.addDropsSubtitle(ws, currentRow, 4, selectedDropNames, styles.subtitle);

        // ── Note about excluded statuses ──
        ReportSheetSectionHelper.addMergedRow(ws, currentRow, 4,
            "Nota: Se excluyen automáticamente los pedidos con estado 'Pendiente de Pago' y 'Cancelado'.",
            styles.note);
        currentRow++;

        currentRow++; // blank row

        // ── Table header ──
        int headerRowNum = currentRow;
        List<String> headers = List.of("Producto", "Drop", "Unidades Totales", "Precio Unitario Medio (€)", "Importe Total (€)");
        ReportSheetSectionHelper.addHeaderRow(ws, headerRowNum, headers, styles.header);
        currentRow++;

        // ── Data rows ──
        List<ProductGroup> sortedGroups = groups.values().stream()
                .sorted(Comparator.comparingInt(ProductGroup::totalQty).reversed())
                .toList();

        int dataStartRow = currentRow;
        int idx = 0;
        for (ProductGroup g : sortedGroups) {
            Row row = ExcelWorkbookHelper.getOrCreateRow(ws, currentRow);
            int qty = g.totalQty();
            BigDecimal totalRevenue = g.totalRevenue();
            BigDecimal avgPrice = qty > 0
                    ? totalRevenue.divide(BigDecimal.valueOf(qty), 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            CellStyle dataStyle   = idx % 2 == 0 ? styles.dataAlt1   : styles.dataAlt2;
            CellStyle currStyle   = idx % 2 == 0 ? styles.currencyAlt1 : styles.currencyAlt2;
            CellStyle centerStyle = idx % 2 == 0 ? styles.centerAlt1  : styles.centerAlt2;

            Cell c0 = row.createCell(0); c0.setCellValue(g.productName);            c0.setCellStyle(dataStyle);
            Cell c1 = row.createCell(1); c1.setCellValue(g.dropName);               c1.setCellStyle(centerStyle);
            Cell c2 = row.createCell(2); c2.setCellValue(qty);                      c2.setCellStyle(centerStyle);
            Cell c3 = row.createCell(3); c3.setCellValue(avgPrice.doubleValue());   c3.setCellStyle(currStyle);
            Cell c4 = row.createCell(4); c4.setCellValue(totalRevenue.doubleValue()); c4.setCellStyle(currStyle);

            currentRow++;
            idx++;
        }

        int lastDataRow = currentRow - 1;

        // ── Totals row ──
        Row totalsRow = ExcelWorkbookHelper.getOrCreateRow(ws, currentRow);

        Cell t0 = totalsRow.createCell(0); t0.setCellValue("TOTALES"); t0.setCellStyle(styles.totalsLabel);
        totalsRow.createCell(1).setCellStyle(styles.totals);

        Cell t2 = totalsRow.createCell(2);
        t2.setCellFormula("SUM(C" + (dataStartRow + 1) + ":C" + (lastDataRow + 1) + ")");
        t2.setCellStyle(styles.totalsCenter);
        totalsRow.createCell(3).setCellStyle(styles.totals);

        Cell t4 = totalsRow.createCell(4);
        t4.setCellFormula("SUM(E" + (dataStartRow + 1) + ":E" + (lastDataRow + 1) + ")");
        t4.setCellStyle(styles.totalsCurrency);

        currentRow += 2;

        // ── Statistics section ──
        Row statsTitle = ExcelWorkbookHelper.getOrCreateRow(ws, currentRow);
        Cell statsTitleCell = statsTitle.createCell(0);
        statsTitleCell.setCellValue("Estadísticas");
        statsTitleCell.setCellStyle(styles.sectionTitle);
        currentRow++;

        Set<String> uniqueOrders = new HashSet<>();
        int totalUnits = 0;
        BigDecimal totalRevAll = BigDecimal.ZERO;
        for (ProductGroup g : groups.values()) {
            for (ProductGroupItem item : g.items) {
                uniqueOrders.add(item.orderId());
                totalUnits += item.quantity();
                totalRevAll = totalRevAll.add(item.unitPrice().multiply(BigDecimal.valueOf(item.quantity())));
            }
        }

        String[][] stats = {
                {"Total de productos distintos", String.valueOf(groups.size())},
                {"Total de pedidos (únicos)",    String.valueOf(uniqueOrders.size())},
                {"Total de unidades",            String.valueOf(totalUnits)},
                {"Ingresos totales",             totalRevAll.setScale(2, RoundingMode.HALF_UP) + " €"},
        };
        for (String[] stat : stats) {
            Row row = ExcelWorkbookHelper.getOrCreateRow(ws, currentRow);
            Cell label = row.createCell(0); label.setCellValue(stat[0]); label.setCellStyle(styles.statLabel);
            Cell value = row.createCell(1); value.setCellValue(stat[1]); value.setCellStyle(styles.statValue);
            currentRow++;
        }

        // ── Column widths & freeze ──
        ws.setColumnWidth(0, 32 * 256);
        ws.setColumnWidth(1, 20 * 256);
        ws.setColumnWidth(2, 18 * 256);
        ws.setColumnWidth(3, 26 * 256);
        ws.setColumnWidth(4, 20 * 256);
        ws.createFreezePane(0, headerRowNum + 1);
    }

    // ════════════════════════════════════════════════════════
    // Per-Product Sheet
    // ════════════════════════════════════════════════════════

    private void createProductSheet(XSSFWorkbook wb, ProductGroup group, String sheetName, StylePack styles) {
        XSSFSheet ws = wb.createSheet(sheetName);

        List<ProductOption> productOptions = group.product != null ? group.product.getOptions() : List.of();
        if (productOptions == null) productOptions = List.of();

        List<ConfigColumn> configColumns = ConfigAggregator.getConfigColumns(productOptions, group.items, ExportReportType.FULL);

        // ── Column layout ──
        String[] fixedStart = {"Nº Pedido", "Cliente", "Email", "Estado Producto", "Fecha"};
        String[] fixedEnd   = {"Cantidad", "Precio Unitario (€)", "Subtotal (€)"};

        List<String> allHeaders = new ArrayList<>();
        Collections.addAll(allHeaders, fixedStart);
        configColumns.forEach(c -> allHeaders.add(c.label()));
        Collections.addAll(allHeaders, fixedEnd);

        int qtyColIdx      = fixedStart.length + configColumns.size();
        int priceColIdx    = qtyColIdx + 1;
        int subtotalColIdx = priceColIdx + 1;

        int currentRow = 0;

        // ── Product title ──
        ReportSheetSectionHelper.addTitleRow(ws, currentRow, Math.max(allHeaders.size() - 1, 0), group.productName, styles.productTitle);
        ExcelWorkbookHelper.getOrCreateRow(ws, currentRow).setHeightInPoints(24);
        currentRow++;

        // ── Product metadata ──
        String[][] meta = {
                {"Drop:",           group.dropName},
                {"Total unidades:", String.valueOf(group.totalQty())},
                {"Total pedidos:",  String.valueOf(group.items.size())},
        };
        currentRow = ReportSheetSectionHelper.addProductMetaRows(ws, currentRow, meta, styles);

        currentRow++; // blank separator

        // ── Column headers ──
        int headerRowNum = currentRow;
        ReportSheetSectionHelper.addHeaderRow(ws, headerRowNum, allHeaders, styles.header);
        currentRow++;

        // ── Data rows ──
        int dataStartRow = currentRow;

        List<ProductGroupItem> sortedItems = group.items.stream()
                .sorted(Comparator.comparing(ProductGroupItem::clientName)
                        .thenComparing(ProductGroupItem::orderId))
                .toList();

        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        int idx = 0;

        for (ProductGroupItem item : sortedItems) {
            Row row = ExcelWorkbookHelper.getOrCreateRow(ws, currentRow);
            int excelRow = currentRow + 1;

            CellStyle dataStyle      = idx % 2 == 0 ? styles.dataAlt1       : styles.dataAlt2;
            CellStyle centerStyle    = idx % 2 == 0 ? styles.centerAlt1     : styles.centerAlt2;
            CellStyle currStyle      = idx % 2 == 0 ? styles.currencyAlt1   : styles.currencyAlt2;
            CellStyle dateStyle      = idx % 2 == 0 ? styles.dateAlt1       : styles.dateAlt2;
            CellStyle boldCenterStyle = idx % 2 == 0 ? styles.boldCenterAlt1 : styles.boldCenterAlt2;

            // Fixed start
            Cell c0 = row.createCell(0); c0.setCellValue(item.orderId());                          c0.setCellStyle(dataStyle);
            Cell c1 = row.createCell(1); c1.setCellValue(item.clientName());                       c1.setCellStyle(dataStyle);
            Cell c2 = row.createCell(2); c2.setCellValue(item.clientEmail());                      c2.setCellStyle(dataStyle);
            Cell c3 = row.createCell(3); c3.setCellValue(resolveOrderStatus(item.orderStatus())); c3.setCellStyle(centerStyle);
            Cell c4 = row.createCell(4);
            if (item.orderDate() != null) c4.setCellValue(item.orderDate().format(dateFmt));
            c4.setCellStyle(dateStyle);

            // Config columns
            for (int colIdx = 0; colIdx < configColumns.size(); colIdx++) {
                ConfigColumn col = configColumns.get(colIdx);
                Cell cell = row.createCell(fixedStart.length + colIdx);
                cell.setCellValue(ConfigAggregator.resolveConfigValue(col, item.configParsed().get(col.key()), productOptions));
                cell.setCellStyle(centerStyle);
            }

            // Quantity
            Cell qtyCell = row.createCell(qtyColIdx);
            qtyCell.setCellValue(item.quantity());
            qtyCell.setCellStyle(boldCenterStyle);

            // Unit price
            Cell priceCell = row.createCell(priceColIdx);
            priceCell.setCellValue(item.unitPrice().doubleValue());
            priceCell.setCellStyle(currStyle);

            // Subtotal formula
            Cell subtotalCell = row.createCell(subtotalColIdx);
            subtotalCell.setCellFormula(ExcelWorkbookHelper.getColLetter(qtyColIdx) + excelRow
                    + "*" + ExcelWorkbookHelper.getColLetter(priceColIdx) + excelRow);
            subtotalCell.setCellStyle(currStyle);

            currentRow++;
            idx++;
        }

        int lastDataRow = currentRow - 1;

        // ── Totals row ──
        Row totalsRow = ExcelWorkbookHelper.getOrCreateRow(ws, currentRow);

        if (qtyColIdx > 0) {
            Cell labelCell = totalsRow.createCell(qtyColIdx - 1);
            labelCell.setCellValue("TOTALES:");
            labelCell.setCellStyle(styles.totalsLabelRight);
        }
        for (int c = 0; c < qtyColIdx - 1; c++) {
            totalsRow.createCell(c).setCellStyle(styles.totals);
        }

        Cell qtyTotalCell = totalsRow.createCell(qtyColIdx);
        qtyTotalCell.setCellFormula("SUM(" + ExcelWorkbookHelper.getColLetter(qtyColIdx) + (dataStartRow + 1)
                + ":" + ExcelWorkbookHelper.getColLetter(qtyColIdx) + (lastDataRow + 1) + ")");
        qtyTotalCell.setCellStyle(styles.totalsCenter);

        Cell priceTotalCell = totalsRow.createCell(priceColIdx);
        if (dataStartRow <= lastDataRow) {
            priceTotalCell.setCellFormula("AVERAGE(" + ExcelWorkbookHelper.getColLetter(priceColIdx) + (dataStartRow + 1)
                    + ":" + ExcelWorkbookHelper.getColLetter(priceColIdx) + (lastDataRow + 1) + ")");
        }
        priceTotalCell.setCellStyle(styles.totalsCurrency);

        Cell subtotalTotalCell = totalsRow.createCell(subtotalColIdx);
        subtotalTotalCell.setCellFormula("SUM(" + ExcelWorkbookHelper.getColLetter(subtotalColIdx) + (dataStartRow + 1)
                + ":" + ExcelWorkbookHelper.getColLetter(subtotalColIdx) + (lastDataRow + 1) + ")");
        subtotalTotalCell.setCellStyle(styles.totalsCurrency);

        // ── Column widths ──
        int[] fixedStartWidths = {14, 24, 28, 18, 14};
        int[] fixedEndWidths   = {12, 18, 18};
        for (int i = 0; i < allHeaders.size(); i++) {
            int width;
            if (i < fixedStart.length) {
                width = fixedStartWidths[i];
            } else if (i < fixedStart.length + configColumns.size()) {
                width = 18;
            } else {
                width = fixedEndWidths[i - fixedStart.length - configColumns.size()];
            }
            ws.setColumnWidth(i, width * 256);
        }

        // ── Freeze & auto-filter ──
        ws.createFreezePane(1, headerRowNum + 1);
        if (lastDataRow >= headerRowNum) {
            ws.setAutoFilter(new CellRangeAddress(headerRowNum, lastDataRow, 0, allHeaders.size() - 1));
        }
    }

    // ════════════════════════════════════════════════════════
    // Helpers
    // ════════════════════════════════════════════════════════

    private static String resolveOrderStatus(OrderStatus status) {
        if (status == null) return "—";
        return ORDER_STATUS_LABELS.getOrDefault(status, status.name());
    }
}
