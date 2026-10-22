package es.yambo_alco.web.service.export.builder;

import es.yambo_alco.web.service.export.ExportReportType;
import org.springframework.stereotype.Component;

/**
 * Warehouse receiving / checklist sheet builder.
 *
 * <p>Identical structure to {@link FactoryReportBuilder} but appends three blank columns
 * after "Cantidad" to support manual validation workflows:
 * <ul>
 *   <li><strong>Recibido</strong> — quantity actually received (fill manually)</li>
 *   <li><strong>OK</strong>       — acceptance check (fill manually)</li>
 *   <li><strong>Notas</strong>    — free-text notes (fill manually)</li>
 * </ul>
 *
 * <p>By default this builder is invoked for items with status
 * {@code TO_BE_DELIVERED}; see {@code OrderExportService} for the filter logic.</p>
 */
@Component
public class WarehouseReportBuilder extends AbstractAggregatedReportBuilder {

    @Override
    protected String getReportTitle() {
        return "Hoja de Recepción de Almacén";
    }

    @Override
    protected String getSummarySheetLabel() {
        return "Resumen";
    }

    @Override
    protected boolean includeValidationColumns() {
        return true;
    }

    @Override
    protected ExportReportType getExportReportType() {
        return ExportReportType.WAREHOUSE;
    }
}
