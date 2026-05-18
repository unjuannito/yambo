package es.yambo_alco.web.service.export.model;

import org.apache.poi.xssf.usermodel.XSSFCellStyle;

/**
 * Holds all named cell styles for a single workbook.
 * Created once per workbook by {@link es.yambo_alco.web.service.export.ExcelStyleFactory}
 * and shared across all sheet builders.
 */
public class StylePack {
    public XSSFCellStyle title;
    public XSSFCellStyle productTitle;
    public XSSFCellStyle sectionTitle;
    public XSSFCellStyle subtitle;
    public XSSFCellStyle note;
    public XSSFCellStyle header;
    public XSSFCellStyle dataAlt1;
    public XSSFCellStyle dataAlt2;
    public XSSFCellStyle centerAlt1;
    public XSSFCellStyle centerAlt2;
    public XSSFCellStyle currencyAlt1;
    public XSSFCellStyle currencyAlt2;
    public XSSFCellStyle dateAlt1;
    public XSSFCellStyle dateAlt2;
    public XSSFCellStyle boldCenterAlt1;
    public XSSFCellStyle boldCenterAlt2;
    public XSSFCellStyle totals;
    public XSSFCellStyle totalsLabel;
    public XSSFCellStyle totalsLabelRight;
    public XSSFCellStyle totalsCenter;
    public XSSFCellStyle totalsCurrency;
    public XSSFCellStyle metaLabel;
    public XSSFCellStyle metaValue;
    public XSSFCellStyle statLabel;
    public XSSFCellStyle statValue;
}
