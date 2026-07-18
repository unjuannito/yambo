import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { settingsService } from "~/services/settingsService";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faCircleInfo, faTriangleExclamation, faUpload } from "@fortawesome/free-solid-svg-icons";
import ButtonComponent from "~/components/common/forms/ButtonComponent";

interface PaymentInstructionsProps {
    orderId: string;
    totalAmount: number;
    onClose: () => void;
}

export default function PaymentInstructions({
    orderId,
    totalAmount,
    onClose,
}: PaymentInstructionsProps) {
    const { t } = useTranslation();
    const [iban, setIban] = useState<string>("");
    const [legalName, setLegalName] = useState<string>("");
    const [loading, setLoading] = useState(true);

    const generatePaymentReference = () => {
        const year = new Date().getFullYear();
        return `merch ${year} ${orderId}`;
    };

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settings = await settingsService.getAllSettings();

                const ibanSetting = settings.find((s) => s.key === "bank.iban");
                if (ibanSetting) {
                    setIban(ibanSetting.value);
                }

                const legalNameSetting = settings.find(
                    (s) => s.key === "organization.legal_name",
                );
                if (legalNameSetting) {
                    setLegalName(legalNameSetting.value);
                } else {
                    setLegalName("Yambo ALCO");
                }
            } catch (error) {
                console.error("Error loading payment settings:", error);
                setLegalName("Yambo ALCO");
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, []);

    const paymentReference = generatePaymentReference();

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} ${t('common.copied')}`);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white rounded-3xl p-8 max-w-2xl w-full mx-4">
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yambo-green-500 mx-auto"></div>
                        <p className="mt-4 text-gray-400">
                            {t('orders.loading')}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto bounce-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 text-white p-8 rounded-t-3xl">
                    <div className="flex items-center justify-center mb-3">
                        <FontAwesomeIcon
                            icon={faCircleCheck}
                            className="w-16 h-16"
                        />
                    </div>
                    <h2 className="text-2xl font-extrabold font-display text-center">
                        {t('orders.orderSuccess') || "¡Pedido realizado con éxito!"}
                    </h2>
                    <p className="text-center text-green-100 mt-2">
                        {t('orders.orderNumber')}: {orderId}
                    </p>
                </div>

                {/* Payment Instructions */}
                <div className="p-6 md:p-8 space-y-6">
                    <div className="bg-yambo-green-50/30 border border-yambo-green-200 rounded-2xl p-4">
                        <div className="flex items-start gap-3">
                            <FontAwesomeIcon
                                icon={faCircleInfo}
                                className="w-6 h-6 text-yambo-green-600 flex-shrink-0 mt-1"
                            />
                            <div>
                                <h3 className="font-bold text-yambo-black mb-1">
                                    {t('orders.paymentInstructions') || "Instrucciones de pago"}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {t('orders.paymentInstructionsDesc') || "Para completar tu pedido, realiza una transferencia bancaria con los siguientes datos:"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Payment Details */}
                    <div className="space-y-4">
                        {/* Amount */}
                        <div className="border border-gray-100 rounded-2xl p-5 bg-yambo-green-50/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-400 font-semibold">
                                        {t('orders.totalAmount') || "Importe"}
                                    </p>
                                    <p className="text-3xl font-extrabold font-display text-yambo-black mt-1">
                                        {totalAmount.toFixed(2)} €
                                    </p>
                                </div>
                                <ButtonComponent
                                    variant="neutral"
                                    size="sm"
                                    onClick={() =>
                                        copyToClipboard(
                                            totalAmount.toFixed(2),
                                            t('orders.totalAmount') || "Importe",
                                        )
                                    }
                                >
                                    {t('common.copy')}
                                </ButtonComponent>
                            </div>
                        </div>

                        {/* Beneficiary */}
                        {legalName && (
                            <div className="border border-gray-100 rounded-2xl p-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-400 font-semibold mb-1">
                                            {t('orders.beneficiary') || "Beneficiario"}
                                        </p>
                                        <p className="text-lg font-bold text-yambo-black">
                                            {legalName}
                                        </p>
                                    </div>
                                    <ButtonComponent
                                        variant="neutral"
                                        size="sm"
                                        onClick={() =>
                                            copyToClipboard(
                                                legalName,
                                                t('orders.beneficiary') || "Beneficiario",
                                            )
                                        }
                                    >
                                        {t('common.copy')}
                                    </ButtonComponent>
                                </div>
                            </div>
                        )}

                        {/* IBAN */}
                        {iban && (
                            <div className="border border-gray-100 rounded-2xl p-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-400 font-semibold mb-1">
                                            IBAN
                                        </p>
                                        <p className="text-lg font-mono font-bold text-yambo-black break-all">
                                            {iban}
                                        </p>
                                    </div>
                                    <ButtonComponent
                                        variant="neutral"
                                        size="sm"
                                        onClick={() =>
                                            copyToClipboard(iban, "IBAN")
                                        }
                                        className="ml-2"
                                    >
                                        {t('common.copy')}
                                    </ButtonComponent>
                                </div>
                            </div>
                        )}

                        {/* Payment Reference/Concept */}
                        <div className="border border-amber-200 rounded-2xl p-5 bg-amber-50/50">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm text-yambo-black font-bold">
                                            {t('orders.concept') || "Concepto (IMPORTANTE)"}
                                        </p>
                                        <FontAwesomeIcon
                                            icon={faTriangleExclamation}
                                            className="w-5 h-5 text-amber-500"
                                        />
                                    </div>
                                    <p className="text-lg font-mono font-extrabold text-yambo-black mb-2">
                                        {paymentReference}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {t('orders.conceptHint') || "Es imprescindible incluir este concepto para identificar tu pago"}
                                    </p>
                                </div>
                                <button
                                    onClick={() =>
                                        copyToClipboard(
                                            paymentReference,
                                            t('orders.concept') || "Concepto",
                                        )
                                    }
                                    className="px-4 py-2 text-sm bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-full hover:from-amber-500 hover:to-amber-600 transition-all font-semibold flex-shrink-0"
                                >
                                    {t('common.copy')}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="bg-gray-50/50 rounded-2xl p-5 space-y-2 border border-gray-100">
                        <h4 className="font-bold text-yambo-black">
                            {t('orders.additionalInfo') || "Información adicional:"}
                        </h4>
                        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                            <li>{t('orders.infoProcessed') || "El pedido se procesará una vez confirmemos el pago"}</li>
                            <li>{t('orders.infoEmail') || "Recibirás estas instrucciones y actualizaciones por correo electrónico"}</li>
                            <li>{t('orders.infoStatus') || 'Puedes consultar el estado de tu pedido en "Mis Pedidos"'}</li>
                            <li>{t('orders.infoWeb') || "Las instrucciones de pago también están disponibles en la web"}</li>
                            <li>{t('orders.infoContact') || "Si tienes dudas, contacta con nosotros"}</li>
                        </ul>
                    </div>

                    {/* Upload Receipt Reminder */}
                    <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4">
                        <div className="flex items-start gap-3">
                            <FontAwesomeIcon
                                icon={faUpload}
                                className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1"
                            />
                            <div>
                                <h3 className="font-bold text-yambo-black mb-1">
                                    {t('orders.uploadReceiptReminder') || "Recuerda subir tu justificante de pago"}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {t('orders.uploadReceiptHint') || 'Una vez realizada la transferencia, sube el justificante de pago desde <strong>"Mis Pedidos"</strong> para que podamos verificar tu pago lo antes posible.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex gap-3">
                        <ButtonComponent
                            variant="primary"
                            size="lg"
                            onClick={onClose}
                            className="w-full"
                        >
                            {t('orders.goToMyOrders') || "Ir a Mis Pedidos"}
                        </ButtonComponent>
                    </div>
                </div>
            </div>
        </div>
    );
}
