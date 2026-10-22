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
    private record ProductSheetLayout(List<String> headers, int fixedStartLength, int qtyColIdx, int priceColIdx, int subtotalColIdx) {}

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
                DateTimeFormatter.ofPattern("d 'de' MMMM 'de' yyyy", Locale.of("es", "ES")));
        ReportSheetSectionHelper.addTitleRow(ws, currentRow, 4, "Pedido para Fabricación — " + dateStr, styles.getTitle());
        currentRow++;

        // ── Subtitle: selected drops ──
        currentRow = ReportSheetSectionHelper.addDropsSubtitle(ws, currentRow, 4, selectedDropNames, styles.getSubtitle());

        // ── Note about excluded statuses ──
        ReportSheetSectionHelper.addMergedRow(ws, currentRow, 4,
            "Nota: Se excluyen automáticamente los pedidos con estado 'Pendiente de Pago' y 'Cancelado'.",
            styles.getNote());
        currentRow++;

        currentRow++; // blank row

        // ── Table header ──
        int headerRowNum = currentRow;
        List<String> headers = List.of("Producto", "Drop", "Unidades Totales", "Precio Unitario Medio (€)", "Importe Total (€)");
        ReportSheetSectionHelper.addHeaderRow(ws, headerRowNum, headers, styles.getHeader());
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

            CellStyle dataStyle   = idx % 2 == 0 ? styles.getDataAlt1()   : styles.getDataAlt2();
            CellStyle currStyle   = idx % 2 == 0 ? styles.getCurrencyAlt1() : styles.getCurrencyAlt2();
            CellStyle centerStyle = idx % 2 == 0 ? styles.getCenterAlt1()  : styles.getCenterAlt2();

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

        Cell t0 = totalsRow.createCell(0); t0.setCellValue("TOTALES"); t0.setCellStyle(styles.getTotalsLabel());
        totalsRow.createCell(1).setCellStyle(styles.getTotals());

        Cell t2 = totalsRow.createCell(2);
        t2.setCellFormula("SUM(C" + (dataStartRow + 1) + ":C" + (lastDataRow + 1) + ")");
        t2.setCellStyle(styles.getTotalsCenter());
        totalsRow.createCell(3).setCellStyle(styles.getTotals());

        Cell t4 = totalsRow.createCell(4);
        t4.setCellFormula("SUM(E" + (dataStartRow + 1) + ":E" + (lastDataRow + 1) + ")");
        t4.setCellStyle(styles.getTotalsCurrency());

        currentRow += 2;

        // ── Statistics section ──
        Row statsTitle = ExcelWorkbookHelper.getOrCreateRow(ws, currentRow);
        Cell statsTitleCell = statsTitle.createCell(0);
        statsTitleCell.setCellValue("Estadísticas");
        statsTitleCell.setCellStyle(styles.getSectionTitle());
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
            Cell label = row.createCell(0); label.setCellValue(stat[0]); label.setCellStyle(styles.getStatLabel());
            Cell value = row.createCell(1); value.setCellValue(stat[1]); value.setCellStyle(styles.getStatValue());
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
        ProductSheetLayout layout = buildProductSheetLayout(configColumns);

        int currentRow = 0;

        // ── Product title ──
        ReportSheetSectionHelper.addTitleRow(ws, currentRow, Math.max(layout.headers().size() - 1, 0), group.productName, styles.getProductTitle());
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
        ReportSheetSectionHelper.addHeaderRow(ws, headerRowNum, layout.headers(), styles.getHeader());
        currentRow++;

        // ── Data rows ──
        int dataStartRow = currentRow;

        List<ProductGroupItem> sortedItems = group.items.stream()
            .sorted(Comparator.comparing(ProductGroupItem::clientName)
                .thenComparing(ProductGroupItem::orderId))
            .toList();
        currentRow = writeProductDataRows(ws, sortedItems, configColumns, productOptions, styles, layout, currentRow);

        int lastDataRow = currentRow - 1;

        // ── Totals row ──
        writeProductTotalsRow(ws, styles, layout, dataStartRow, lastDataRow, currentRow);

        // ── Column widths ──
        applyProductSheetColumnWidths(ws, layout, configColumns.size());

        // ── Freeze & auto-filter ──
        ws.createFreezePane(1, headerRowNum + 1);
        if (lastDataRow >= headerRowNum) {
            ws.setAutoFilter(new CellRangeAddress(headerRowNum, lastDataRow, 0, layout.headers().size() - 1));
        }
    }

    private ProductSheetLayout buildProductSheetLayout(List<ConfigColumn> configColumns) {
        String[] fixedStart = {"Nº Pedido", "Cliente", "Email", "Estado Producto", "Fecha"};
        String[] fixedEnd = {"Cantidad", "Precio Unitario (€)", "Subtotal (€)"};

        List<String> headers = new ArrayList<>();
        Collections.addAll(headers, fixedStart);
        configColumns.forEach(c -> headers.add(c.label()));
        Collections.addAll(headers, fixedEnd);

        int qtyColIdx = fixedStart.length + configColumns.size();
        int priceColIdx = qtyColIdx + 1;
        int subtotalColIdx = priceColIdx + 1;
        return new ProductSheetLayout(headers, fixedStart.length, qtyColIdx, priceColIdx, subtotalColIdx);
    }

    private int writeProductDataRows(XSSFSheet ws,
                                     List<ProductGroupItem> sortedItems,
                                     List<ConfigColumn> configColumns,
                                     List<ProductOption> productOptions,
                                     StylePack styles,
                                     ProductSheetLayout layout,
                                     int startRow) {
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        int currentRow = startRow;

        for (int idx = 0; idx < sortedItems.size(); idx++) {
            ProductGroupItem item = sortedItems.get(idx);
            Row row = ExcelWorkbookHelper.getOrCreateRow(ws, currentRow);
            int excelRow = currentRow + 1;

            CellStyle dataStyle = idx % 2 == 0 ? styles.getDataAlt1() : styles.getDataAlt2();
            CellStyle centerStyle = idx % 2 == 0 ? styles.getCenterAlt1() : styles.getCenterAlt2();
            CellStyle currStyle = idx % 2 == 0 ? styles.getCurrencyAlt1() : styles.getCurrencyAlt2();
            CellStyle dateStyle = idx % 2 == 0 ? styles.getDateAlt1() : styles.getDateAlt2();
            CellStyle boldCenterStyle = idx % 2 == 0 ? styles.getBoldCenterAlt1() : styles.getBoldCenterAlt2();

            writeProductFixedColumns(row, item, dateFmt, dataStyle, centerStyle, dateStyle);
            writeProductConfigColumns(row, item, configColumns, productOptions, layout.fixedStartLength(), centerStyle);
            writeProductAmounts(row, item, layout, excelRow, currStyle, boldCenterStyle);
            currentRow++;
        }

        return currentRow;
    }

    private void writeProductFixedColumns(Row row,
                                          ProductGroupItem item,
                                          DateTimeFormatter dateFmt,
                                          CellStyle dataStyle,
                                          CellStyle centerStyle,
                                          CellStyle dateStyle) {
        Cell c0 = row.createCell(0); c0.setCellValue(item.orderId()); c0.setCellStyle(dataStyle);
        Cell c1 = row.createCell(1); c1.setCellValue(item.clientName()); c1.setCellStyle(dataStyle);
        Cell c2 = row.createCell(2); c2.setCellValue(item.clientEmail()); c2.setCellStyle(dataStyle);
        Cell c3 = row.createCell(3); c3.setCellValue(resolveOrderStatus(item.orderStatus())); c3.setCellStyle(centerStyle);

        Cell c4 = row.createCell(4);
        if (item.orderDate() != null) {
            c4.setCellValue(item.orderDate().format(dateFmt));
        }
        c4.setCellStyle(dateStyle);
    }

    private void writeProductConfigColumns(Row row,
                                           ProductGroupItem item,
                                           List<ConfigColumn> configColumns,
                                           List<ProductOption> productOptions,
                                           int fixedStartLength,
                                           CellStyle centerStyle) {
        for (int colIdx = 0; colIdx < configColumns.size(); colIdx++) {
            ConfigColumn col = configColumns.get(colIdx);
            Cell cell = row.createCell(fixedStartLength + colIdx);
            cell.setCellValue(ConfigAggregator.resolveConfigValue(col, item.configParsed().get(col.key()), productOptions));
            cell.setCellStyle(centerStyle);
        }
    }

    private void writeProductAmounts(Row row,
                                     ProductGroupItem item,
                                     ProductSheetLayout layout,
                                     int excelRow,
                                     CellStyle currStyle,
                                     CellStyle boldCenterStyle) {
        Cell qtyCell = row.createCell(layout.qtyColIdx());
        qtyCell.setCellValue(item.quantity());
        qtyCell.setCellStyle(boldCenterStyle);

        Cell priceCell = row.createCell(layout.priceColIdx());
        priceCell.setCellValue(item.unitPrice().doubleValue());
        priceCell.setCellStyle(currStyle);

        Cell subtotalCell = row.createCell(layout.subtotalColIdx());
        subtotalCell.setCellFormula(ExcelWorkbookHelper.getColLetter(layout.qtyColIdx()) + excelRow
                + "*" + ExcelWorkbookHelper.getColLetter(layout.priceColIdx()) + excelRow);
        subtotalCell.setCellStyle(currStyle);
    }

    private void writeProductTotalsRow(XSSFSheet ws,
                                       StylePack styles,
                                       ProductSheetLayout layout,
                                       int dataStartRow,
                                       int lastDataRow,
                                       int totalsRowIdx) {
        Row totalsRow = ExcelWorkbookHelper.getOrCreateRow(ws, totalsRowIdx);

        if (layout.qtyColIdx() > 0) {
            Cell labelCell = totalsRow.createCell(layout.qtyColIdx() - 1);
            labelCell.setCellValue("TOTALES:");
            labelCell.setCellStyle(styles.getTotalsLabelRight());
        }
        for (int c = 0; c < layout.qtyColIdx() - 1; c++) {
            totalsRow.createCell(c).setCellStyle(styles.getTotals());
        }

        Cell qtyTotalCell = totalsRow.createCell(layout.qtyColIdx());
        qtyTotalCell.setCellFormula("SUM(" + ExcelWorkbookHelper.getColLetter(layout.qtyColIdx()) + (dataStartRow + 1)
                + ":" + ExcelWorkbookHelper.getColLetter(layout.qtyColIdx()) + (lastDataRow + 1) + ")");
        qtyTotalCell.setCellStyle(styles.getTotalsCenter());

        Cell priceTotalCell = totalsRow.createCell(layout.priceColIdx());
        if (dataStartRow <= lastDataRow) {
            priceTotalCell.setCellFormula("AVERAGE(" + ExcelWorkbookHelper.getColLetter(layout.priceColIdx()) + (dataStartRow + 1)
                    + ":" + ExcelWorkbookHelper.getColLetter(layout.priceColIdx()) + (lastDataRow + 1) + ")");
        }
        priceTotalCell.setCellStyle(styles.getTotalsCurrency());

        Cell subtotalTotalCell = totalsRow.createCell(layout.subtotalColIdx());
        subtotalTotalCell.setCellFormula("SUM(" + ExcelWorkbookHelper.getColLetter(layout.subtotalColIdx()) + (dataStartRow + 1)
                + ":" + ExcelWorkbookHelper.getColLetter(layout.subtotalColIdx()) + (lastDataRow + 1) + ")");
        subtotalTotalCell.setCellStyle(styles.getTotalsCurrency());
    }

    private void applyProductSheetColumnWidths(XSSFSheet ws, ProductSheetLayout layout, int configColumnCount) {
        int[] fixedStartWidths = {14, 24, 28, 18, 14};
        int[] fixedEndWidths = {12, 18, 18};

        for (int i = 0; i < layout.headers().size(); i++) {
            int width;
            if (i < layout.fixedStartLength()) {
                width = fixedStartWidths[i];
            } else if (i < layout.fixedStartLength() + configColumnCount) {
                width = 18;
            } else {
                width = fixedEndWidths[i - layout.fixedStartLength() - configColumnCount];
            }
            ws.setColumnWidth(i, width * 256);
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
