import type { Order } from "~/services/orderService";
import type { FileRecord } from "~/types/fileType";
import { Modal } from "~/components/common/Modal";
import FileUploader from "~/components/common/FileUploader";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";

interface UploadReceiptModalProps {
    readonly order: Order | null;
    readonly isUploading: boolean;
    readonly onUploaded: (file: FileRecord) => void;
    readonly onRequestClose: () => void;
}

export function UploadReceiptModal({
    order,
    isUploading,
    onUploaded,
    onRequestClose,
}: UploadReceiptModalProps) {
    return (
        <Modal
            isOpen={!!order}
            onClose={() => { if (!isUploading) onRequestClose(); }}
            title={order ? `Subir justificante · Pedido #${order.id}` : "Subir justificante"}
            size="md"
        >
            {order && (
                <div className="space-y-4">
                    <div className="bg-yambo-green-50/50 border border-yambo-green-100 rounded-2xl p-4">
                        <p className="text-sm text-yambo-green-800">
                            Sube el justificante de pago para el pedido{" "}
                            <strong>#{order.id}</strong> del cliente{" "}
                            <strong>{order.user?.name}</strong>.
                            El pedido pasará a estado &quot;Verificando pago&quot;.
                        </p>
                    </div>
                    {isUploading ? (
                        <div className="text-center py-8">
                            <LoadingSpinner size="lg" message="Subiendo justificante..." />
                        </div>
                    ) : (
                        <FileUploader
                            onUpload={onUploaded}
                            accept="image/*,application/pdf"
                            label="Justificante de pago"
                            maxSizeMb={10}
                        />
                    )}
                    <div className="text-xs text-gray-400">
                        Formatos aceptados: imágenes (JPG, PNG) y PDF. Tamaño máximo: 10 MB.
                    </div>
                </div>
            )}
        </Modal>
    );
}
