package es.yambo_alco.web.dto.ws;

public record BatchProgressMessage(
        String batchId,
        int current,
        int total,
        String item,
        boolean success,
        String errorMessage
) {
}
