import { useTranslation } from "react-i18next";
import { Modal } from "~/components/common/Modal";
import { IssueForm } from "./IssueForm";
import type { IssueReportWindowModel } from "~/types/issueType";

type CreateIssueModalProps = Readonly<{
    issueWindow: IssueReportWindowModel | null;
    onClose: () => void;
    onSuccess: () => void;
}>;

export function CreateIssueModal({ issueWindow, onClose, onSuccess }: CreateIssueModalProps) {
    const { t } = useTranslation();
    return (
        <Modal
            isOpen={!!issueWindow}
            onClose={onClose}
            title={issueWindow ? `${t('issues.createIssue')} · ${t('orders.orderNumber')} #${issueWindow.orderId}` : t('issues.createIssue')}
            size="lg"
        >
            {issueWindow && (
                <>
                    <p className="text-sm text-gray-400 mb-4">
                        {t('issues.selectProducts') || "Selecciona uno o varios productos de este pedido para asociarlos a la incidencia."}
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
