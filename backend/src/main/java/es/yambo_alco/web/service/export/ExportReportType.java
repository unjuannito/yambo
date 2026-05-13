package es.yambo_alco.web.service.export;

public enum ExportReportType {
    /** Full order detail: all fields, one sheet per product, per-row (no aggregation). */
    FULL,
    /** Factory production sheet: anonymous, aggregated by config, no prices. */
    FACTORY,
    /** Warehouse receiving sheet: same as FACTORY + blank validation columns. */
    WAREHOUSE
}
