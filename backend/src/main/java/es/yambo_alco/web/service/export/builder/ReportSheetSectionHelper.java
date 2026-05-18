package es.yambo_alco.web.service.export.builder;

import es.yambo_alco.web.service.export.ExcelWorkbookHelper;
import es.yambo_alco.web.service.export.model.StylePack;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;

import java.util.List;

final class ReportSheetSectionHelper {

    private ReportSheetSectionHelper() {
    }

    static int addLogo(XSSFWorkbook wb, XSSFSheet ws, byte[] logoBytes, Logger log) {
        if (logoBytes == null) {
            return 0;
        }

        try {
            int pictureIdx = wb.addPicture(logoBytes, Workbook.PICTURE_TYPE_PNG);
            CreationHelper helper = wb.getCreationHelper();
            Drawing<?> drawing = ws.createDrawingPatriarch();
            ClientAnchor anchor = helper.createClientAnchor();
            anchor.setCol1(0);
            anchor.setRow1(0);
            anchor.setCol2(1);
            anchor.setRow2(3);
            drawing.createPicture(anchor, pictureIdx);
            ExcelWorkbookHelper.getOrCreateRow(ws, 0).setHeightInPoints(30);
            ExcelWorkbookHelper.getOrCreateRow(ws, 1).setHeightInPoints(30);
            ExcelWorkbookHelper.getOrCreateRow(ws, 2).setHeightInPoints(30);
            return 4;
        } catch (Exception e) {
            log.warn("Could not embed logo in Excel: {}", e.getMessage());
            return 0;
        }
    }

    static void addMergedRow(XSSFSheet ws, int rowIdx, int colTo, String text, CellStyle style) {
        Row row = ExcelWorkbookHelper.getOrCreateRow(ws, rowIdx);
        Cell cell = row.createCell(0);
        cell.setCellValue(text);
        cell.setCellStyle(style);
        ws.addMergedRegion(new CellRangeAddress(rowIdx, rowIdx, 0, colTo));
    }

    static int addDropsSubtitle(XSSFSheet ws, int rowIdx, int colTo, List<String> selectedDropNames, CellStyle subtitleStyle) {
        if (selectedDropNames.isEmpty()) {
            return rowIdx;
        }

        addMergedRow(ws, rowIdx, colTo, "Drops: " + String.join(", ", selectedDropNames), subtitleStyle);
        return rowIdx + 1;
    }

    static void addTitleRow(XSSFSheet ws, int rowIdx, int colTo, String titleText, CellStyle titleStyle) {
        Row titleRow = ExcelWorkbookHelper.getOrCreateRow(ws, rowIdx);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue(titleText);
        titleCell.setCellStyle(titleStyle);
        ws.addMergedRegion(new CellRangeAddress(rowIdx, rowIdx, 0, colTo));
        titleRow.setHeightInPoints(28);
    }

    static int addProductMetaRows(XSSFSheet ws, int startRow, String[][] meta, StylePack styles) {
        int rowIdx = startRow;
        for (String[] m : meta) {
            Row row = ExcelWorkbookHelper.getOrCreateRow(ws, rowIdx);
            Cell label = row.createCell(0);
            label.setCellValue(m[0]);
            label.setCellStyle(styles.metaLabel);
            Cell value = row.createCell(1);
            value.setCellValue(m[1]);
            value.setCellStyle(styles.metaValue);
            rowIdx++;
        }
        return rowIdx;
    }

    static void addHeaderRow(XSSFSheet ws, int rowIdx, List<String> headers, CellStyle headerStyle) {
        Row headerRow = ExcelWorkbookHelper.getOrCreateRow(ws, rowIdx);
        headerRow.setHeightInPoints(22);
        for (int i = 0; i < headers.size(); i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers.get(i));
            cell.setCellStyle(headerStyle);
        }
    }
}
