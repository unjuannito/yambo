import type { ExportReportType } from "~/services/exportService";
import type { FamilyProduct } from "~/services/familyProductService";
import { Modal } from "~/components/common/Modal";
import MultiSelectComponent from "~/components/common/forms/MultiSelectComponent";
import ButtonComponent from "~/components/common/forms/ButtonComponent";

interface ExportOrdersModalProps {
    readonly isOpen: boolean;
    readonly isExporting: boolean;
    readonly reportType: ExportReportType;
    readonly onReportTypeChange: (type: ExportReportType) => void;
    readonly selectedDropIds: string[];
    readonly onSelectedDropIdsChange: (ids: string[]) => void;
    readonly drops: FamilyProduct[];
    readonly onClose: () => void;
    readonly onExport: () => void;
}

export function ExportOrdersModal({
    isOpen,
    isExporting,
    reportType,
    onReportTypeChange,
    selectedDropIds,
    onSelectedDropIdsChange,
    drops,
    onClose,
    onExport,
}: ExportOrdersModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                if (!isExporting) onClose();
            }}
            title="Exportar pedidos"
            size="md"
            footer={
                <>
                    <ButtonComponent
                        variant="secondary"
                        onClick={onClose}
                        disabled={isExporting}
                    >
                        Cancelar
                    </ButtonComponent>
                    <ButtonComponent
                        variant="primary"
                        onClick={onExport}
                        isLoading={isExporting}
                    >
                        Exportar
                    </ButtonComponent>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                {/* Report type selector */}
                <div>
                    <p className="text-xs font-medium text-gray-400 mb-2">Tipo de informe</p>
                    <div className="flex gap-1 bg-gray-800 rounded-xl p-1">
                        {([
                            { value: 'FULL',      label: 'Completo' },
                            { value: 'FACTORY',   label: 'Fábrica' },
                            { value: 'WAREHOUSE', label: 'Almacén' },
                        ] as { value: ExportReportType; label: string }[]).map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => onReportTypeChange(opt.value)}
                                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150 ${
                                    reportType === opt.value
                                        ? 'bg-violet-600 text-white shadow-sm'
                                        : 'text-gray-400 hover:text-gray-200'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        {reportType === 'FULL' && 'Informe detallado: cliente, precio, estado y configuración por pedido.'}
                        {reportType === 'FACTORY' && 'Solo configuraciones y cantidades agrupadas. Sin datos de clientes ni precios.'}
                        {reportType === 'WAREHOUSE' && 'Configuraciones agrupadas con columnas de validación en blanco (Recibido / OK / Notas).'}
                    </p>
                </div>

                <MultiSelectComponent
                    label="Filtrar por Colecciones"
                    value={selectedDropIds}
                    options={drops.map((drop) => ({
                        value: drop.id,
                        label: drop.name,
                    }))}
                    placeholder="Todas las colecciones"
                    name="selectedDrops"
                    onChange={(e) => {
                        const select = e.target as HTMLSelectElement;
                        const values = Array.from(select.selectedOptions).map(
                            (opt) => opt.value,
                        );
                        onSelectedDropIdsChange(values);
                    }}
                />
                <div className="text-xs text-gray-500">
                    Se excluyen automáticamente los pedidos pendientes de pago y cancelados.
                </div>
            </div>
        </Modal>
    );
}
