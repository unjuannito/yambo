import { Modal } from "~/components/common/Modal";
import { IssueForm } from "./IssueForm";
import type { IssueReportWindowModel } from "~/types/issueType";

type CreateIssueModalProps = Readonly<{
    issueWindow: IssueReportWindowModel | null;
    onClose: () => void;
    onSuccess: () => void;
}>;

export function CreateIssueModal({ issueWindow, onClose, onSuccess }: CreateIssueModalProps) {
    return (
        <Modal
            isOpen={!!issueWindow}
            onClose={onClose}
            title={issueWindow ? `Nueva incidencia · Pedido #${issueWindow.orderId}` : "Nueva incidencia"}
            size="lg"
        >
            {issueWindow && (
                <>
                    <p className="text-sm text-gray-400 mb-4">
                        Selecciona uno o varios productos de este pedido para asociarlos a la incidencia.
                    </p>
                    <IssueForm
                        orderedProducts={issueWindow.orderedProducts}
                        initialSelectedOrderedProductIds={issueWindow.initialSelectedOrderedProductIds}
                        onSuccess={onSuccess}
                        onCancel={onClose}
                    />
                </>
            )}
        </Modal>
    );
}
