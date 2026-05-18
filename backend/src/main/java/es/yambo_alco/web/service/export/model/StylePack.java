package es.yambo_alco.web.service.export.model;

import lombok.Getter;
import lombok.Setter;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;

/**
 * Holds all named cell styles for a single workbook.
 * Created once per workbook by {@link es.yambo_alco.web.service.export.ExcelStyleFactory}
 * and shared across all sheet builders.
 */
public class StylePack {
    @Getter @Setter private XSSFCellStyle title;
    @Getter @Setter private XSSFCellStyle productTitle;
    @Getter @Setter private XSSFCellStyle sectionTitle;
    @Getter @Setter private XSSFCellStyle subtitle;
    @Getter @Setter private XSSFCellStyle note;
    @Getter @Setter private XSSFCellStyle header;
    @Getter @Setter private XSSFCellStyle dataAlt1;
    @Getter @Setter private XSSFCellStyle dataAlt2;
    @Getter @Setter private XSSFCellStyle centerAlt1;
    @Getter @Setter private XSSFCellStyle centerAlt2;
    @Getter @Setter private XSSFCellStyle currencyAlt1;
    @Getter @Setter private XSSFCellStyle currencyAlt2;
    @Getter @Setter private XSSFCellStyle dateAlt1;
    @Getter @Setter private XSSFCellStyle dateAlt2;
    @Getter @Setter private XSSFCellStyle boldCenterAlt1;
    @Getter @Setter private XSSFCellStyle boldCenterAlt2;
    @Getter @Setter private XSSFCellStyle totals;
    @Getter @Setter private XSSFCellStyle totalsLabel;
    @Getter @Setter private XSSFCellStyle totalsLabelRight;
    @Getter @Setter private XSSFCellStyle totalsCenter;
    @Getter @Setter private XSSFCellStyle totalsCurrency;
    @Getter @Setter private XSSFCellStyle metaLabel;
    @Getter @Setter private XSSFCellStyle metaValue;
    @Getter @Setter private XSSFCellStyle statLabel;
    @Getter @Setter private XSSFCellStyle statValue;
}
