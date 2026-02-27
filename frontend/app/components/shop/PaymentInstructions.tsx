import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { settingsService } from "~/services/settingsService";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faCircleInfo, faTriangleExclamation, faUpload } from "@fortawesome/free-solid-svg-icons";

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
    const [iban, setIban] = useState<string>("");
    const [legalName, setLegalName] = useState<string>("");
    const [loading, setLoading] = useState(true);

    const generatePaymentReference = () => {
        const year = new Date().getFullYear();
        return `merch-${year}-${orderId}`;
    };

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settings = await settingsService.getAllSettings();

                // Find IBAN setting
                const ibanSetting = settings.find((s) => s.key === "bank.iban");
                if (ibanSetting) {
                    setIban(ibanSetting.value);
                }

                // Find legal name setting
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
        toast.success(`${label} copiado al portapapeles`);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <p className="mt-4 text-gray-600">
                            Cargando información de pago...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-green-600 text-white p-6 rounded-t-lg">
                    <div className="flex items-center justify-center mb-2">
                        <FontAwesomeIcon
                            icon={faCircleCheck}
                            className="w-16 h-16"
                        />
                    </div>
                    <h2 className="text-2xl font-bold text-center">
                        ¡Pedido realizado con éxito!
                    </h2>
                    <p className="text-center text-green-100 mt-2">
                        ID del pedido: {orderId}
                    </p>
                </div>

                {/* Payment Instructions */}
                <div className="p-6 space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <FontAwesomeIcon
                                icon={faCircleInfo}
                                className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1"
                            />
                            <div>
                                <h3 className="font-semibold text-blue-900 mb-1">
                                    Instrucciones de pago
                                </h3>
                                <p className="text-sm text-blue-800">
                                    Para completar tu pedido, realiza una
                                    transferencia bancaria con los siguientes
                                    datos:
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Payment Details */}
                    <div className="space-y-4">
                        {/* Amount */}
                        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">
                                        Importe
                                    </p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">
                                        {totalAmount.toFixed(2)} €
                                    </p>
                                </div>
                                <button
                                    onClick={() =>
                                        copyToClipboard(
                                            totalAmount.toFixed(2),
                                            "Importe",
                                        )
                                    }
                                    className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    Copiar
                                </button>
                            </div>
                        </div>

                        {/* Beneficiary */}
                        {legalName && (
                            <div className="border border-gray-300 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-600 font-medium mb-1">
                                            Beneficiario
                                        </p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {legalName}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() =>
                                            copyToClipboard(
                                                legalName,
                                                "Beneficiario",
                                            )
                                        }
                                        className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        Copiar
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* IBAN */}
                        {iban && (
                            <div className="border border-gray-300 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-600 font-medium mb-1">
                                            IBAN
                                        </p>
                                        <p className="text-lg font-mono font-semibold text-gray-900 break-all">
                                            {iban}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() =>
                                            copyToClipboard(iban, "IBAN")
                                        }
                                        className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors ml-2"
                                    >
                                        Copiar
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Payment Reference/Concept */}
                        <div className="border border-gray-300 rounded-lg p-4 bg-yellow-50 border-yellow-300">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm text-gray-900 font-medium">
                                            Concepto (IMPORTANTE)
                                        </p>
                                        <FontAwesomeIcon
                                            icon={faTriangleExclamation}
                                            className="w-5 h-5 text-yellow-600"
                                        />
                                    </div>
                                    <p className="text-lg font-mono font-bold text-gray-900 mb-2">
                                        {paymentReference}
                                    </p>
                                    <p className="text-sm text-gray-700">
                                        Es imprescindible incluir este concepto
                                        para identificar tu pago
                                    </p>
                                </div>
                                <button
                                    onClick={() =>
                                        copyToClipboard(
                                            paymentReference,
                                            "Concepto",
                                        )
                                    }
                                    className="px-3 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex-shrink-0"
                                >
                                    Copiar
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <h4 className="font-semibold text-gray-900">
                            Información adicional:
                        </h4>
                        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                            <li>
                                El pedido se procesará una vez confirmemos el
                                pago
                            </li>
                            <li>
                                Recibirás estas instrucciones y actualizaciones
                                por correo electrónico
                            </li>
                            <li>
                                Puedes consultar el estado de tu pedido en "Mis
                                Pedidos"
                            </li>
                            <li>
                                Las instrucciones de pago también están
                                disponibles en la web
                            </li>
                            <li>Si tienes dudas, contacta con nosotros</li>
                        </ul>
                    </div>

                    {/* Upload Receipt Reminder */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <FontAwesomeIcon
                                icon={faUpload}
                                className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1"
                            />
                            <div>
                                <h3 className="font-semibold text-amber-900 mb-1">
                                    Recuerda subir tu justificante de pago
                                </h3>
                                <p className="text-sm text-amber-800">
                                    Una vez realizada la transferencia, sube el
                                    justificante de pago desde{" "}
                                    <strong>"Mis Pedidos"</strong> para que
                                    podamos verificar tu pago lo antes posible.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Ir a Mis Pedidos
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}