package es.yambo_alco.web.model.enums;

import lombok.Getter;

@Getter
public enum OrderStatus {
    PENDING_PAYMENT(0, "PENDIENTE DE PAGO", "#f39c12", "hourglass",
            "Pedido Pendiente de Pago", "emails/order-pending-payment",
            "Hemos recibido tu pedido. Para completar el proceso, realiza el pago.",
            "Pedido Pendiente de Pago"),
    PAYMENT_CONFIRMED(1, "PAGO CONFIRMADO", "#27ae60", "circle-check",
            "Pago Confirmado", "emails/order-confirmed",
            "Tu pago ha sido confirmado y tu pedido será procesado en breve.",
            "Pedido Confirmado"),
    CANCELED(2, "CANCELADO", "#e74c3c", "circle-xmark",
            "Pedido Cancelado", "emails/order-cancelled",
            "Tu pedido ha sido cancelado.",
            "Pedido Cancelado"),
    PENDING_PRODUCTS(3, "PENDIENTE DE PRODUCTOS", "#3498db", "gear",
            "Pedido en Preparación", "emails/order-in-progress",
            "Tu pedido está ahora en preparación. Nuestro equipo está trabajando en él.",
            "Pedido en Preparación"),
    CLOSED(4, "COMPLETADO", "#16a085", "box-archive",
            "Pedido Completado", "emails/order-delivered",
            "¡Buenas noticias! Tu pedido ha sido entregado exitosamente.",
            "Pedido Entregado"),
    CONFIRMING_PAYMENT(5, "CONFIRMANDO PAGO", "#e67e22", "clock",
            "Justificante de Pago Recibido", "emails/order-confirming-payment",
            "Hemos recibido tu justificante de pago. Estamos verificándolo.",
            "Justificante de Pago Recibido");

    private final int value;
    private final String label;
    private final String color;
    private final String icon;
    private final String emailSubject;
    private final String emailTemplate;
    private final String emailIntro;
    /** Título de la cabecera del correo (issue #123, Part 2: layout:decorate; antes vivía como literal en cada .html). */
    private final String emailHeaderTitle;

    OrderStatus(int value, String label, String color, String icon,
                String emailSubject, String emailTemplate, String emailIntro, String emailHeaderTitle) {
        this.value = value;
        this.label = label;
        this.color = color;
        this.icon = icon;
        this.emailSubject = emailSubject;
        this.emailTemplate = emailTemplate;
        this.emailIntro = emailIntro;
        this.emailHeaderTitle = emailHeaderTitle;
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
