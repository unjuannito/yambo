package es.yambo_alco.web.model.enums;

import lombok.Getter;

@Getter
public enum OrderStatus {
    PENDING_PAYMENT(0, "PENDIENTE DE PAGO", "#f39c12", "⏳",
            "Pedido Pendiente de Pago", "emails/order-pending-payment",
            "Hemos recibido tu pedido. Para completar el proceso, realiza el pago."),
    PAYMENT_CONFIRMED(1, "PAGO CONFIRMADO", "#27ae60", "✓",
            "Pago Confirmado", "emails/order-confirmed",
            "Tu pago ha sido confirmado y tu pedido será procesado en breve."),
    CANCELED(2, "CANCELADO", "#e74c3c", "✕",
            "Pedido Cancelado", "emails/order-cancelled",
            "Tu pedido ha sido cancelado."),
    PENDING_PRODUCTS(3, "PENDIENTE DE PRODUCTOS", "#3498db", "⚙",
            "Pedido en Preparación", "emails/order-in-progress",
            "Tu pedido está ahora en preparación. Nuestro equipo está trabajando en él."),
    CLOSED(4, "COMPLETADO", "#16a085", "📦",
            "Pedido Completado", "emails/order-delivered",
            "¡Buenas noticias! Tu pedido ha sido entregado exitosamente.");

    private final int value;
    private final String label;
    private final String color;
    private final String icon;
    private final String emailSubject;
    private final String emailTemplate;
    private final String emailIntro;

    OrderStatus(int value, String label, String color, String icon,
                String emailSubject, String emailTemplate, String emailIntro) {
        this.value = value;
        this.label = label;
        this.color = color;
        this.icon = icon;
        this.emailSubject = emailSubject;
        this.emailTemplate = emailTemplate;
        this.emailIntro = emailIntro;
    }

    public static OrderStatus fromValue(int value) {
        for (OrderStatus status : OrderStatus.values()) {
            if (status.value == value) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown OrderStatus value: " + value);
    }
}
