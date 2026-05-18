package es.yambo_alco.web.service.export;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class ExcelWorkbookHelperTest {

    // ═══════════════════════════════════════════════════════════════
    // getColLetter
    // ═══════════════════════════════════════════════════════════════

    @Test
    void getColLetter_Index0_ShouldReturnA() {
        assertEquals("A", ExcelWorkbookHelper.getColLetter(0));
    }

    @Test
    void getColLetter_Index25_ShouldReturnZ() {
        assertEquals("Z", ExcelWorkbookHelper.getColLetter(25));
    }

    @Test
    void getColLetter_Index26_ShouldReturnAA() {
        assertEquals("AA", ExcelWorkbookHelper.getColLetter(26));
    }

    @Test
    void getColLetter_Index27_ShouldReturnAB() {
        assertEquals("AB", ExcelWorkbookHelper.getColLetter(27));
    }

    @Test
    void getColLetter_Index701_ShouldReturnZZ() {
        // ZZ = 26*27 - 1 = 701
        assertEquals("ZZ", ExcelWorkbookHelper.getColLetter(701));
    }

    // ═══════════════════════════════════════════════════════════════
    // getOrCreateRow
    // ═══════════════════════════════════════════════════════════════

    @Test
    void getOrCreateRow_WhenRowExists_ShouldReturnSameRow() throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            XSSFSheet sheet = wb.createSheet("Test");
            Row existing = sheet.createRow(0);

            Row result = ExcelWorkbookHelper.getOrCreateRow(sheet, 0);

            assertSame(existing, result);
        }
    }

    @Test
    void getOrCreateRow_WhenNoRow_ShouldCreateNewRow() throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            XSSFSheet sheet = wb.createSheet("Test");

            assertNull(sheet.getRow(5)); // confirm absent
            Row result = ExcelWorkbookHelper.getOrCreateRow(sheet, 5);

            assertNotNull(result);
            assertSame(result, sheet.getRow(5));
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // getUniqueSheetName
    // ═══════════════════════════════════════════════════════════════

    @Test
    void getUniqueSheetName_WhenUnique_ShouldReturnSanitizedName() {
        String result = ExcelWorkbookHelper.getUniqueSheetName("Test", Set.of());
        assertEquals("Test", result);
    }

    @Test
    void getUniqueSheetName_WhenConflict_ShouldAppendSuffix2() {
        String result = ExcelWorkbookHelper.getUniqueSheetName("Test", Set.of("Test"));
        assertEquals("Test (2)", result);
    }

    @Test
    void getUniqueSheetName_WhenMultipleConflicts_ShouldAppendNextSuffix() {
        String result = ExcelWorkbookHelper.getUniqueSheetName("Test", Set.of("Test", "Test (2)"));
        assertEquals("Test (3)", result);
    }

    @Test
    void getUniqueSheetName_WhenTooLong_ShouldTruncateTo31Chars() {
        String longName = "A".repeat(40);
        String result = ExcelWorkbookHelper.getUniqueSheetName(longName, Set.of());
        assertEquals(31, result.length());
        assertEquals("A".repeat(31), result);
    }

    @Test
    void getUniqueSheetName_WhenSpecialChars_ShouldReplaceWithDash() {
        String result = ExcelWorkbookHelper.getUniqueSheetName("Test[File]", Set.of());
        assertEquals("Test-File-", result);
    }

    @Test
    void getUniqueSheetName_WithBackslashAndColon_ShouldReplaceWithDash() {
        String result = ExcelWorkbookHelper.getUniqueSheetName("Sheet\\Name:Version", Set.of());
        assertEquals("Sheet-Name-Version", result);
    }
}
