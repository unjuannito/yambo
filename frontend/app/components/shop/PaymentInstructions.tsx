import { useState } from "react";

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
    const [iban] = useState<string>("ES00 0000 0000 0000 0000 0000");
    const [legalName] = useState<string>("Yambo ALCO");

    const generatePaymentReference = () => {
        const year = new Date().getFullYear();
        return `merch-${year}-${orderId}`;
    };

    const paymentReference = generatePaymentReference();

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        alert(`${label} copiado al portapapeles`);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-green-600 text-white p-6 rounded-t-lg">
                    <div className="flex items-center justify-center mb-2">
                        <svg
                            className="w-16 h-16"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
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
                            <svg
                                className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
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
                                        <svg
                                            className="w-5 h-5 text-yellow-600"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
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
