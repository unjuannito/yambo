package es.yambo_alco.web.dto.ws;

import java.util.List;

public record BatchCompleteMessage(
        String batchId,
        int total,
        int sent,
        int failed,
        List<FailureDetail> failures
) {
    public record FailureDetail(String identifier, String error) {
    }
}
