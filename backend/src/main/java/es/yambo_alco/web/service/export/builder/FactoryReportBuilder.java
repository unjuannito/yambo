package es.yambo_alco.web.service.export.builder;

import es.yambo_alco.web.service.export.ExportReportType;
import org.springframework.stereotype.Component;

/**
 * Factory production sheet builder.
 *
 * <p>Generates an aggregated, anonymous report suitable for sending to the manufacturer:
 * <ul>
 *   <li>No customer names, emails, order IDs, or prices.</li>
 *   <li>Rows with identical configurations are merged; quantities are summed.</li>
 *   <li>Rows sorted by option definition order (e.g., size S before M before L).</li>
 * </ul>
 *
 * <p>By default this builder is invoked for items with status
 * {@code PENDING_FABRICATION}; see {@code OrderExportService} for the filter logic.</p>
 */
@Component
public class FactoryReportBuilder extends AbstractAggregatedReportBuilder {

    @Override
    protected String getReportTitle() {
        return "Hoja de Fabricación";
    }

    @Override
    protected String getSummarySheetLabel() {
        return "Resumen";
    }

    @Override
    protected boolean includeValidationColumns() {
        return false;
    }

    @Override
    protected ExportReportType getExportReportType() {
        return ExportReportType.FACTORY;
    }
}
