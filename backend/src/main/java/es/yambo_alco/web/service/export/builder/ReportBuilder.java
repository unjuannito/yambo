package es.yambo_alco.web.service.export.builder;

import es.yambo_alco.web.service.export.model.ProductGroup;
import es.yambo_alco.web.service.export.model.StylePack;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.util.List;
import java.util.Map;

/**
 * Contract for all Excel report builders.
 *
 * <p>Implementations receive a pre-initialised workbook, the grouped order data,
 * contextual metadata, and a shared style pack; they are responsible for adding
 * all required sheets to the workbook.</p>
 */
public interface ReportBuilder {

    /**
     * Populates {@code wb} with the sheets specific to this report type.
     *
     * @param wb                the workbook to write into
     * @param groups            product groups — key is productId
     * @param selectedDropNames drop names to display in titles/subtitles (may be empty)
     * @param logoBytes         PNG logo to embed, or {@code null} if unavailable
     * @param styles            pre-built cell styles for this workbook
     */
    void build(XSSFWorkbook wb,
               Map<String, ProductGroup> groups,
               List<String> selectedDropNames,
               byte[] logoBytes,
               StylePack styles);
}
