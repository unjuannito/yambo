package es.yambo_alco.web.service.export.builder;

import es.yambo_alco.web.service.export.model.StylePack;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.slf4j.Logger;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;

class ReportSheetSectionHelperTest {

    @Test
    void addLogo_withNullBytes_returnsZero() throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            XSSFSheet ws = wb.createSheet("test");
            Logger log = Mockito.mock(Logger.class);

            int nextRow = ReportSheetSectionHelper.addLogo(wb, ws, null, log);

            assertThat(nextRow).isEqualTo(0);
        }
    }

    @Test
    void addLogo_withBytes_embedsImageAndReturnsNextRow() throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            XSSFSheet ws = wb.createSheet("test");
            Logger log = Mockito.mock(Logger.class);

            int nextRow = ReportSheetSectionHelper.addLogo(wb, ws, new byte[]{1, 2, 3}, log);

            assertThat(nextRow).isEqualTo(4);
            verifyNoInteractions(log);
        }
    }

    @Test
    void addDropsSubtitle_withDrops_addsRowAndAdvancesIndex() throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            XSSFSheet ws = wb.createSheet("test");
            CellStyle subtitleStyle = wb.createCellStyle();

            int nextRow = ReportSheetSectionHelper.addDropsSubtitle(
                    ws,
                    2,
                    4,
                    List.of("Drop A", "Drop B"),
                    subtitleStyle
            );

            assertThat(nextRow).isEqualTo(3);
            assertThat(ws.getRow(2).getCell(0).getStringCellValue()).isEqualTo("Drops: Drop A, Drop B");
            assertThat(ws.getNumMergedRegions()).isEqualTo(1);
            assertThat(ws.getMergedRegion(0).getFirstRow()).isEqualTo(2);
            assertThat(ws.getMergedRegion(0).getLastColumn()).isEqualTo(4);
        }
    }

    @Test
    void addDropsSubtitle_withoutDrops_doesNothing() throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            XSSFSheet ws = wb.createSheet("test");
            CellStyle subtitleStyle = wb.createCellStyle();

            int nextRow = ReportSheetSectionHelper.addDropsSubtitle(ws, 5, 3, List.of(), subtitleStyle);

            assertThat(nextRow).isEqualTo(5);
            assertThat(ws.getPhysicalNumberOfRows()).isEqualTo(0);
        }
    }

    @Test
    void addTitleAndHeadersAndMeta_buildExpectedRows() throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            XSSFSheet ws = wb.createSheet("test");
            CellStyle titleStyle = wb.createCellStyle();
            CellStyle headerStyle = wb.createCellStyle();

            ReportSheetSectionHelper.addTitleRow(ws, 0, 2, "Titulo", titleStyle);

            assertThat(ws.getRow(0).getCell(0).getStringCellValue()).isEqualTo("Titulo");
            assertThat(ws.getRow(0).getHeightInPoints()).isEqualTo(28f);
            assertThat(ws.getNumMergedRegions()).isEqualTo(1);

            ReportSheetSectionHelper.addHeaderRow(ws, 1, List.of("A", "B", "C"), headerStyle);
            assertThat(ws.getRow(1).getCell(0).getStringCellValue()).isEqualTo("A");
            assertThat(ws.getRow(1).getCell(2).getStringCellValue()).isEqualTo("C");
            assertThat(ws.getRow(1).getHeightInPoints()).isEqualTo(22f);

                StylePack styles = new StylePack();
                styles.metaLabel = (XSSFCellStyle) wb.createCellStyle();
                styles.metaValue = (XSSFCellStyle) wb.createCellStyle();

            int nextRow = ReportSheetSectionHelper.addProductMetaRows(
                    ws,
                    2,
                    new String[][]{{"Drop:", "Drop 1"}, {"Total:", "10"}},
                    styles
            );

            assertThat(nextRow).isEqualTo(4);
            assertThat(ws.getRow(2).getCell(0).getStringCellValue()).isEqualTo("Drop:");
            assertThat(ws.getRow(2).getCell(1).getStringCellValue()).isEqualTo("Drop 1");
            assertThat(ws.getRow(3).getCell(0).getStringCellValue()).isEqualTo("Total:");
            assertThat(ws.getRow(3).getCell(1).getStringCellValue()).isEqualTo("10");
        }
    }
}
