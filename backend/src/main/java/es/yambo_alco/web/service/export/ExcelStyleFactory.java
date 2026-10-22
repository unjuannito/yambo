package es.yambo_alco.web.service.export;

import es.yambo_alco.web.service.export.model.StylePack;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.*;

/**
 * Factory for creating the branded {@link StylePack} used by all Excel report builders.
 *
 * <p>Call {@link #createStyles(XSSFWorkbook)} once per workbook; the resulting
 * {@link StylePack} is shared across every sheet builder for that workbook.</p>
 */
public final class ExcelStyleFactory {

    private static final String FONT_FAMILY = "Calibri";

    // ── Brand color palette ──
    protected static final byte[] BRAND_PRIMARY      = {(byte) 0x8B, (byte) 0x5C, (byte) 0xF6};
    protected static final byte[] BRAND_PRIMARY_DARK = {(byte) 0x7C, (byte) 0x3A, (byte) 0xED};
    protected static final byte[] BRAND_LIGHT        = {(byte) 0xF5, (byte) 0xF3, (byte) 0xFF};
    protected static final byte[] TOTALS_BG          = {(byte) 0xFE, (byte) 0xF3, (byte) 0xC7};
    protected static final byte[] TOTALS_FONT_COLOR  = {(byte) 0x92, (byte) 0x40, (byte) 0x0E};
    protected static final byte[] BORDER_COLOR       = {(byte) 0xD1, (byte) 0xD5, (byte) 0xDB};
    protected static final byte[] GRAY_600           = {(byte) 0x6B, (byte) 0x72, (byte) 0x80};
    protected static final byte[] GRAY_400           = {(byte) 0x9C, (byte) 0xA3, (byte) 0xAF};
    protected static final byte[] DARK_TEXT          = {(byte) 0x37, (byte) 0x41, (byte) 0x51};

    private ExcelStyleFactory() {}

    public static XSSFColor xssfColor(byte[] rgb) {
        return new XSSFColor(rgb, null);
    }

    public static StylePack createStyles(XSSFWorkbook wb) {
        StylePack s = new StylePack();

        // ── Fonts ──
        XSSFFont titleFont = wb.createFont();
        titleFont.setFontName(FONT_FAMILY);
        titleFont.setFontHeightInPoints((short) 16);
        titleFont.setBold(true);
        titleFont.setColor(xssfColor(BRAND_PRIMARY_DARK));

        XSSFFont productTitleFont = wb.createFont();
        productTitleFont.setFontName(FONT_FAMILY);
        productTitleFont.setFontHeightInPoints((short) 14);
        productTitleFont.setBold(true);
        productTitleFont.setColor(xssfColor(BRAND_PRIMARY_DARK));

        XSSFFont sectionTitleFont = wb.createFont();
        sectionTitleFont.setFontName(FONT_FAMILY);
        sectionTitleFont.setFontHeightInPoints((short) 13);
        sectionTitleFont.setBold(true);
        sectionTitleFont.setColor(xssfColor(BRAND_PRIMARY_DARK));

        XSSFFont headerFont = wb.createFont();
        headerFont.setFontName(FONT_FAMILY);
        headerFont.setFontHeightInPoints((short) 11);
        headerFont.setBold(true);
        headerFont.setColor(new XSSFColor(new byte[]{(byte) 0xFF, (byte) 0xFF, (byte) 0xFF}, null));

        XSSFFont subtitleFont = wb.createFont();
        subtitleFont.setFontName(FONT_FAMILY);
        subtitleFont.setFontHeightInPoints((short) 11);
        subtitleFont.setItalic(true);
        subtitleFont.setColor(xssfColor(GRAY_600));

        XSSFFont noteFont = wb.createFont();
        noteFont.setFontName(FONT_FAMILY);
        noteFont.setFontHeightInPoints((short) 9);
        noteFont.setItalic(true);
        noteFont.setColor(xssfColor(GRAY_400));

        XSSFFont dataFont = wb.createFont();
        dataFont.setFontName(FONT_FAMILY);
        dataFont.setFontHeightInPoints((short) 10);

        XSSFFont dataBoldFont = wb.createFont();
        dataBoldFont.setFontName(FONT_FAMILY);
        dataBoldFont.setFontHeightInPoints((short) 10);
        dataBoldFont.setBold(true);

        XSSFFont totalsFont = wb.createFont();
        totalsFont.setFontName(FONT_FAMILY);
        totalsFont.setFontHeightInPoints((short) 11);
        totalsFont.setBold(true);
        totalsFont.setColor(xssfColor(TOTALS_FONT_COLOR));

        XSSFFont totals10Font = wb.createFont();
        totals10Font.setFontName(FONT_FAMILY);
        totals10Font.setFontHeightInPoints((short) 10);
        totals10Font.setBold(true);
        totals10Font.setColor(xssfColor(TOTALS_FONT_COLOR));

        XSSFFont metaLabelFont = wb.createFont();
        metaLabelFont.setFontName(FONT_FAMILY);
        metaLabelFont.setFontHeightInPoints((short) 10);
        metaLabelFont.setBold(true);
        metaLabelFont.setColor(xssfColor(DARK_TEXT));

        XSSFFont metaValueFont = wb.createFont();
        metaValueFont.setFontName(FONT_FAMILY);
        metaValueFont.setFontHeightInPoints((short) 10);

        XSSFFont statLabelFont = wb.createFont();
        statLabelFont.setFontName(FONT_FAMILY);
        statLabelFont.setFontHeightInPoints((short) 10);
        statLabelFont.setColor(xssfColor(DARK_TEXT));

        XSSFFont statValueFont = wb.createFont();
        statValueFont.setFontName(FONT_FAMILY);
        statValueFont.setFontHeightInPoints((short) 10);
        statValueFont.setBold(true);

        // ── Data formats ──
        short currencyFmt = wb.createDataFormat().getFormat("#,##0.00 €");
        short dateFmt     = wb.createDataFormat().getFormat("DD/MM/YYYY");

        // ── Title ──
        s.setTitle(wb.createCellStyle());
        s.getTitle().setFont(titleFont);

        // ── Product title ──
        s.setProductTitle(wb.createCellStyle());
        s.getProductTitle().setFont(productTitleFont);

        // ── Section title ──
        s.setSectionTitle(wb.createCellStyle());
        s.getSectionTitle().setFont(sectionTitleFont);

        // ── Subtitle ──
        s.setSubtitle(wb.createCellStyle());
        s.getSubtitle().setFont(subtitleFont);

        // ── Note ──
        s.setNote(wb.createCellStyle());
        s.getNote().setFont(noteFont);

        // ── Header ──
        s.setHeader(wb.createCellStyle());
        s.getHeader().setFont(headerFont);
        s.getHeader().setFillForegroundColor(xssfColor(BRAND_PRIMARY));
        s.getHeader().setFillPattern(FillPatternType.SOLID_FOREGROUND);
        s.getHeader().setAlignment(HorizontalAlignment.CENTER);
        s.getHeader().setVerticalAlignment(VerticalAlignment.CENTER);
        s.getHeader().setWrapText(true);
        applyThinBorders(s.getHeader());

        // ── Data alternating rows ──
        s.setDataAlt1(createDataStyle(wb, dataFont, BRAND_LIGHT, null, HorizontalAlignment.LEFT));
        s.setDataAlt2(createDataStyle(wb, dataFont, null, null, HorizontalAlignment.LEFT));

        s.setCenterAlt1(createDataStyle(wb, dataFont, BRAND_LIGHT, null, HorizontalAlignment.CENTER));
        s.setCenterAlt2(createDataStyle(wb, dataFont, null, null, HorizontalAlignment.CENTER));

        s.setCurrencyAlt1(createDataStyle(wb, dataFont, BRAND_LIGHT, currencyFmt, HorizontalAlignment.RIGHT));
        s.setCurrencyAlt2(createDataStyle(wb, dataFont, null, currencyFmt, HorizontalAlignment.RIGHT));

        s.setDateAlt1(createDataStyle(wb, dataFont, BRAND_LIGHT, dateFmt, HorizontalAlignment.CENTER));
        s.setDateAlt2(createDataStyle(wb, dataFont, null, dateFmt, HorizontalAlignment.CENTER));

        s.setBoldCenterAlt1(createDataStyle(wb, dataBoldFont, BRAND_LIGHT, null, HorizontalAlignment.CENTER));
        s.setBoldCenterAlt2(createDataStyle(wb, dataBoldFont, null, null, HorizontalAlignment.CENTER));

        // ── Totals ──
        s.setTotals(createTotalsStyle(wb, totalsFont, null));

        s.setTotalsLabel(createTotalsStyle(wb, totalsFont, null));
        s.getTotalsLabel().setAlignment(HorizontalAlignment.LEFT);

        s.setTotalsLabelRight(createTotalsStyle(wb, totals10Font, null));
        s.getTotalsLabelRight().setAlignment(HorizontalAlignment.RIGHT);

        s.setTotalsCenter(createTotalsStyle(wb, totalsFont, null));
        s.getTotalsCenter().setAlignment(HorizontalAlignment.CENTER);

        s.setTotalsCurrency(createTotalsStyle(wb, totalsFont, currencyFmt));
        s.getTotalsCurrency().setAlignment(HorizontalAlignment.RIGHT);

        // ── Meta ──
        s.setMetaLabel(wb.createCellStyle());
        s.getMetaLabel().setFont(metaLabelFont);

        s.setMetaValue(wb.createCellStyle());
        s.getMetaValue().setFont(metaValueFont);

        // ── Stats ──
        s.setStatLabel(wb.createCellStyle());
        s.getStatLabel().setFont(statLabelFont);

        s.setStatValue(wb.createCellStyle());
        s.getStatValue().setFont(statValueFont);

        return s;
    }

    public static XSSFCellStyle createDataStyle(XSSFWorkbook wb, XSSFFont font, byte[] fillColor,
                                                 Short dataFormat, HorizontalAlignment alignment) {
        XSSFCellStyle style = wb.createCellStyle();
        style.setFont(font);
        if (fillColor != null) {
            style.setFillForegroundColor(xssfColor(fillColor));
            style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        }
        if (dataFormat != null) {
            style.setDataFormat(dataFormat);
        }
        style.setAlignment(alignment);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        applyThinBorders(style);
        return style;
    }

    public static XSSFCellStyle createTotalsStyle(XSSFWorkbook wb, XSSFFont font, Short dataFormat) {
        XSSFCellStyle style = wb.createCellStyle();
        style.setFont(font);
        style.setFillForegroundColor(xssfColor(TOTALS_BG));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        if (dataFormat != null) {
            style.setDataFormat(dataFormat);
        }
        applyThinBorders(style);
        return style;
    }

    public static void applyThinBorders(XSSFCellStyle style) {
        XSSFColor borderColor = xssfColor(BORDER_COLOR);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setTopBorderColor(borderColor);
        style.setBottomBorderColor(borderColor);
        style.setLeftBorderColor(borderColor);
        style.setRightBorderColor(borderColor);
    }
}
