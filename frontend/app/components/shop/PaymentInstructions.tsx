import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { settingsService } from "~/services/settingsService";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faTriangleExclamation, faXmark } from "@fortawesome/free-solid-svg-icons";
import ButtonComponent from "~/components/common/forms/ButtonComponent";

interface PaymentInstructionsProps {
    orderId: string;
    totalAmount: number;
    onClose: () => void;
    onOpenTicket?: () => void;
}

const CONTACT_EMAIL = "yamboalcobendas@gmail.com";

export default function PaymentInstructions({
    orderId,
    totalAmount,
    onClose,
    onOpenTicket,
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
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70]">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto bounce-in">
                {/* Header compacto */}
                <div className="relative bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 text-white p-5 rounded-t-3xl">
                    <button type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-all"
                        aria-label={t("common.close")}
                    >
                        <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <FontAwesomeIcon icon={faCircleCheck} className="w-8 h-8 shrink-0" />
                        <div>
                            <h2 className="text-xl font-extrabold font-display">
                                {t('orders.orderSuccess') || "¡Pedido realizado con éxito!"}
                            </h2>
                            <p className="text-sm text-green-100">Pedido #{orderId}</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                    {/* Importe */}
                    <div className="text-center py-1">
                        <p className="text-sm text-gray-400 font-semibold">
                            {t('orders.totalAmount') || "Importe"}
                        </p>
                        <p className="text-3xl font-extrabold font-display text-yambo-black mt-1">
                            {totalAmount.toFixed(2)} €
                        </p>
                    </div>

                    {/* Datos bancarios — tarjeta única con tap-to-copy */}
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2">
                        {legalName && (
                            <div>
                                <p className="text-xs text-gray-400 font-semibold">
                                    {t('orders.beneficiary') || "Beneficiario"}
                                </p>
                                <p
                                    className="text-base font-bold text-yambo-black cursor-pointer"
                                    onClick={() => copyToClipboard(legalName, t('orders.beneficiary') || "Beneficiario")}
                                    title="Toca para copiar"
                                >
                                    {legalName}
                                </p>
                            </div>
                        )}
                        {iban && (
                            <div>
                                <p className="text-xs text-gray-400 font-semibold">IBAN</p>
                                <p
                                    className="text-sm font-mono font-bold text-yambo-black break-all cursor-pointer"
                                    onClick={() => copyToClipboard(iban, "IBAN")}
                                    title="Toca para copiar"
                                >
                                    {iban}
                                </p>
                            </div>
                        )}
                        <p className="text-[10px] text-gray-400 italic">Toca los datos para copiar</p>
                    </div>

                    {/* Concepto / Referencia */}
                    <div className="border border-amber-200 rounded-2xl p-4 bg-amber-50/50">
                        <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm text-yambo-black font-bold">
                                        {t('orders.concept') || "Concepto (IMPORTANTE)"}
                                    </p>
                                    <FontAwesomeIcon
                                        icon={faTriangleExclamation}
                                        className="w-4 h-4 text-amber-500 shrink-0"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <p className="text-base font-mono font-extrabold text-yambo-black break-all">
                                        {paymentReference}
                                    </p>
                                    <button type="button"
                                        onClick={() => copyToClipboard(paymentReference, t('orders.concept') || "Concepto")}
                                        className="px-3 py-1 text-xs bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-full hover:from-amber-500 hover:to-amber-600 transition-all font-semibold shrink-0"
                                    >
                                        {t('common.copy')}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {t('orders.conceptHint') || "Imprescindible para identificar tu pago"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Info post-pago + contacto */}
                    <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 space-y-2">
                        <div className="flex items-start gap-2">
                            <span className="text-sm shrink-0 mt-0.5">✅</span>
                            <p className="text-sm text-gray-600">Procesaremos el pedido al confirmar el pago</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="text-sm shrink-0 mt-0.5">📧</span>
                            <p className="text-sm text-gray-600">Te avisaremos por email</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="text-sm shrink-0 mt-0.5">📎</span>
                            <p className="text-sm text-gray-600">
                                Sube el justificante desde <strong>"Mis Pedidos"</strong> para validarlo
                            </p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="text-sm shrink-0 mt-0.5">❓</span>
                            <p className="text-sm text-gray-600">
                                Dudas:{" "}
                                {onOpenTicket ? (
                                    <>
                                        <button type="button"
                                            onClick={onOpenTicket}
                                            className="text-yambo-green-600 underline font-medium hover:text-yambo-green-700"
                                        >
                                            abre un ticket
                                        </button>
                                        {" o "}
                                    </>
                                ) : null}
                                <a
                                    href={`mailto:${CONTACT_EMAIL}`}
                                    className="text-yambo-green-600 underline font-medium hover:text-yambo-green-700"
                                >
                                    {CONTACT_EMAIL}
                                </a>
                            </p>
                        </div>
                    </div>

                    {/* Action Button */}
                    <ButtonComponent
                        variant="primary"
                        size="lg"
                        onClick={onClose}
                        className="w-full"
                    >
                        {t('orders.goToMyOrders') || "✓ Hecho, volver a Mis Pedidos"}
                    </ButtonComponent>
                </div>
            </div>
        </div>
    );
}
