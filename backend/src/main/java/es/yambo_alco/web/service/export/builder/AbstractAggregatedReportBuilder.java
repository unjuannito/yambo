package es.yambo_alco.web.service.export.builder;

import es.yambo_alco.web.model.ProductOption;
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

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Base class for aggregated report builders (Factory and Warehouse).
 *
 * <p>These reports share the same structure: an anonymous summary sheet and
 * one aggregated per-product sheet. Subclasses customise:
 * <ul>
 *   <li>The report title shown in the header</li>
 *   <li>Whether blank validation columns (Recibido / OK / Notas) are appended</li>
 * </ul>
 *
 * <p>Customer information and prices are intentionally excluded from all sheets
 * produced by this builder.</p>
 */
abstract class AbstractAggregatedReportBuilder implements ReportBuilder {

    private record ProductSheetLayout(List<String> headers, int qtyColIdx, int validationStartIdx) {}

    private static final Logger log = LoggerFactory.getLogger(AbstractAggregatedReportBuilder.class);

    /** Title string embedded in the workbook header (e.g., "Hoja de Fabricación"). */
    protected abstract String getReportTitle();

    /** Name of the summary sheet tab. */
    protected abstract String getSummarySheetLabel();

    /**
     * When {@code true}, three blank columns are appended after "Cantidad":
     * Recibido, OK, and Notas (intended for manual warehouse validation).
     */
    protected abstract boolean includeValidationColumns();

    /** The report type used to filter excluded option columns. */
    protected abstract ExportReportType getExportReportType();

    // ════════════════════════════════════════════════════════
    // ReportBuilder
    // ════════════════════════════════════════════════════════

    @Override
    public void build(XSSFWorkbook wb, Map<String, ProductGroup> groups,
                      List<String> selectedDropNames, byte[] logoBytes, StylePack styles) {
        createSummarySheet(wb, groups, selectedDropNames, logoBytes, styles);

        Set<String> usedNames = new HashSet<>();
        usedNames.add(getSummarySheetLabel());

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
    // Summary Sheet — anonymous (no prices)
    // ════════════════════════════════════════════════════════

    private void createSummarySheet(XSSFWorkbook wb, Map<String, ProductGroup> groups,
                                    List<String> selectedDropNames, byte[] logoBytes,
                                    StylePack styles) {
        XSSFSheet ws = wb.createSheet(getSummarySheetLabel());
        ws.setDefaultColumnWidth(18);

        int currentRow = 0;

        // ── Logo ──
        currentRow = ReportSheetSectionHelper.addLogo(wb, ws, logoBytes, log);

        // ── Title ──
        String dateStr = LocalDateTime.now().format(
            DateTimeFormatter.ofPattern("d 'de' MMMM 'de' yyyy", Locale.of("es", "ES")));
        ReportSheetSectionHelper.addTitleRow(ws, currentRow, 2, getReportTitle() + " — " + dateStr, styles.title);
        currentRow++;

        // ── Subtitle: selected drops ──
        currentRow = ReportSheetSectionHelper.addDropsSubtitle(ws, currentRow, 2, selectedDropNames, styles.subtitle);

        currentRow++; // blank row

        // ── Table header — no price columns ──
        int headerRowNum = currentRow;
        List<String> headers = List.of("Producto", "Drop", "Unidades Totales");
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

            CellStyle dataStyle   = idx % 2 == 0 ? styles.dataAlt1  : styles.dataAlt2;
            CellStyle centerStyle = idx % 2 == 0 ? styles.centerAlt1 : styles.centerAlt2;

            Cell c0 = row.createCell(0); c0.setCellValue(g.productName); c0.setCellStyle(dataStyle);
            Cell c1 = row.createCell(1); c1.setCellValue(g.dropName);    c1.setCellStyle(centerStyle);
            Cell c2 = row.createCell(2); c2.setCellValue(qty);           c2.setCellStyle(centerStyle);

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

        // ── Column widths & freeze ──
        ws.setColumnWidth(0, 32 * 256);
        ws.setColumnWidth(1, 20 * 256);
        ws.setColumnWidth(2, 18 * 256);
        ws.createFreezePane(0, headerRowNum + 1);
    }

    // ════════════════════════════════════════════════════════
    // Per-Product Sheet — aggregated, anonymous
    // ════════════════════════════════════════════════════════

    private void createProductSheet(XSSFWorkbook wb, ProductGroup group,
                                    String sheetName, StylePack styles) {
        XSSFSheet ws = wb.createSheet(sheetName);

        List<ProductOption> productOptions = group.product != null ? group.product.getOptions() : List.of();
        if (productOptions == null) productOptions = List.of();

        List<ConfigColumn> configColumns = ConfigAggregator.getConfigColumns(productOptions, group.items, getExportReportType());
        List<AggregatedProductRow> aggregated = ConfigAggregator.aggregate(group.items, configColumns, productOptions);

        ProductSheetLayout layout = buildProductSheetLayout(configColumns);

        int currentRow = 0;

        // ── Product title ──
        ReportSheetSectionHelper.addTitleRow(ws, currentRow, Math.max(layout.headers().size() - 1, 0), group.productName, styles.productTitle);
        ExcelWorkbookHelper.getOrCreateRow(ws, currentRow).setHeightInPoints(24);
        currentRow++;

        // ── Product metadata ──
        String[][] meta = {
                {"Drop:",          group.dropName},
                {"Total unidades:", String.valueOf(group.totalQty())},
                {"Variantes:",     String.valueOf(aggregated.size())},
        };
        currentRow = ReportSheetSectionHelper.addProductMetaRows(ws, currentRow, meta, styles);

        currentRow++; // blank separator

        // ── Column headers ──
        int headerRowNum = currentRow;
        ReportSheetSectionHelper.addHeaderRow(ws, headerRowNum, layout.headers(), styles.header);
        currentRow++;

        // ── Aggregated data rows ──
        int dataStartRow = currentRow;
        currentRow = writeAggregatedRows(ws, aggregated, layout, styles, currentRow);

        int lastDataRow = currentRow - 1;

        // ── Totals row ──
        writeTotalsRow(ws, layout, styles, dataStartRow, lastDataRow, currentRow);

        // ── Column widths ──
        applyColumnWidths(ws, configColumns.size(), layout);

        // ── Freeze & auto-filter ──
        ws.createFreezePane(0, headerRowNum + 1);
        if (lastDataRow >= headerRowNum) {
            ws.setAutoFilter(new CellRangeAddress(headerRowNum, lastDataRow, 0, layout.headers().size() - 1));
        }
    }

    private ProductSheetLayout buildProductSheetLayout(List<ConfigColumn> configColumns) {
        List<String> headers = new ArrayList<>(configColumns.stream().map(ConfigColumn::label).toList());
        headers.add("Cantidad");

        int qtyColIdx = headers.size() - 1;
        int validationStartIdx = -1;
        if (includeValidationColumns()) {
            validationStartIdx = headers.size();
            headers.add("Recibido");
            headers.add("OK");
            headers.add("Notas");
        }

        return new ProductSheetLayout(headers, qtyColIdx, validationStartIdx);
    }

    private int writeAggregatedRows(XSSFSheet ws,
                                    List<AggregatedProductRow> aggregated,
                                    ProductSheetLayout layout,
                                    StylePack styles,
                                    int startRow) {
        int currentRow = startRow;
        int idx = 0;

        for (AggregatedProductRow agg : aggregated) {
            Row row = ExcelWorkbookHelper.getOrCreateRow(ws, currentRow);
            CellStyle centerStyle = idx % 2 == 0 ? styles.centerAlt1 : styles.centerAlt2;
            CellStyle boldCenterStyle = idx % 2 == 0 ? styles.boldCenterAlt1 : styles.boldCenterAlt2;

            int colIdx = 0;
            for (String resolved : agg.configValues.values()) {
                Cell cell = row.createCell(colIdx++);
                cell.setCellValue(resolved);
                cell.setCellStyle(centerStyle);
            }

            Cell qtyCell = row.createCell(layout.qtyColIdx());
            qtyCell.setCellValue(agg.totalQuantity);
            qtyCell.setCellStyle(boldCenterStyle);

            fillValidationColumns(row, layout, centerStyle);

            currentRow++;
            idx++;
        }

        return currentRow;
    }

    private void fillValidationColumns(Row row, ProductSheetLayout layout, CellStyle cellStyle) {
        if (!includeValidationColumns()) {
            return;
        }
        for (int v = layout.validationStartIdx(); v < layout.headers().size(); v++) {
            row.createCell(v).setCellStyle(cellStyle);
        }
    }

    private void writeTotalsRow(XSSFSheet ws,
                                ProductSheetLayout layout,
                                StylePack styles,
                                int dataStartRow,
                                int lastDataRow,
                                int totalsRowIdx) {
        Row totalsRow = ExcelWorkbookHelper.getOrCreateRow(ws, totalsRowIdx);

        if (layout.qtyColIdx() > 0) {
            for (int c = 0; c < layout.qtyColIdx() - 1; c++) {
                totalsRow.createCell(c).setCellStyle(styles.totals);
            }
            Cell labelCell = totalsRow.createCell(layout.qtyColIdx() - 1);
            labelCell.setCellValue("TOTALES:");
            labelCell.setCellStyle(styles.totalsLabelRight);
        }

        Cell qtyTotalCell = totalsRow.createCell(layout.qtyColIdx());
        qtyTotalCell.setCellFormula("SUM(" + ExcelWorkbookHelper.getColLetter(layout.qtyColIdx()) + (dataStartRow + 1)
                + ":" + ExcelWorkbookHelper.getColLetter(layout.qtyColIdx()) + (lastDataRow + 1) + ")");
        qtyTotalCell.setCellStyle(styles.totalsCenter);

        if (includeValidationColumns()) {
            for (int v = layout.validationStartIdx(); v < layout.headers().size(); v++) {
                totalsRow.createCell(v).setCellStyle(styles.totals);
            }
        }
    }

    private void applyColumnWidths(XSSFSheet ws, int configColumnCount, ProductSheetLayout layout) {
        for (int i = 0; i < layout.headers().size(); i++) {
            if (i < configColumnCount) {
                ws.setColumnWidth(i, 20 * 256);
            } else if (i == layout.qtyColIdx()) {
                ws.setColumnWidth(i, 12 * 256);
            } else if (includeValidationColumns() && i == layout.headers().size() - 1) {
                ws.setColumnWidth(i, 25 * 256);
            } else {
                ws.setColumnWidth(i, 14 * 256);
            }
        }
    }
}
