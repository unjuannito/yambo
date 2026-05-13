package es.yambo_alco.web.service.export;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;

import java.util.Set;

/**
 * Stateless utility methods shared across all Excel report builders.
 */
public final class ExcelWorkbookHelper {

    private ExcelWorkbookHelper() {}

    /** Returns the existing row at {@code rowIdx}, or creates a new one if absent. */
    public static Row getOrCreateRow(Sheet sheet, int rowIdx) {
        Row row = sheet.getRow(rowIdx);
        return row != null ? row : sheet.createRow(rowIdx);
    }

    /**
     * Converts a 0-based column index to an Excel column letter (A, B, …, Z, AA, AB, …).
     */
    public static String getColLetter(int index) {
        StringBuilder sb = new StringBuilder();
        int i = index;
        while (i >= 0) {
            sb.insert(0, (char) ('A' + (i % 26)));
            i = i / 26 - 1;
        }
        return sb.toString();
    }

    /**
     * Returns a sheet name derived from {@code name} that is unique within {@code existingNames},
     * sanitised for Excel constraints (max 31 chars, no special characters).
     */
    public static String getUniqueSheetName(String name, Set<String> existingNames) {
        String sanitized = name.replaceAll("[\\\\/:*?\\[\\]]", "-");
        if (sanitized.length() > 31) sanitized = sanitized.substring(0, 31);
        if (!existingNames.contains(sanitized)) return sanitized;

        for (int i = 2; i < 100; i++) {
            String suffix = " (" + i + ")";
            String candidate = sanitized.substring(0, Math.min(sanitized.length(), 31 - suffix.length())) + suffix;
            if (!existingNames.contains(candidate)) return candidate;
        }
        return sanitized;
    }
}
