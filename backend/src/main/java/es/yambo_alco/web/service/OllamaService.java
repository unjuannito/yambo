package es.yambo_alco.web.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Slf4j
@Service
public class OllamaService {

    private final SettingsService settingsService;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    @Autowired
    public OllamaService(SettingsService settingsService) {
        this.settingsService = settingsService;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    // Constructor for testing with injectable HttpClient
    OllamaService(SettingsService settingsService, HttpClient httpClient) {
        this.settingsService = settingsService;
        this.httpClient = httpClient;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Sends a prompt to the Ollama API and returns the generated text response.
     *
     * @param prompt The prompt to send to the AI model
     * @return The generated text response
     * @throws OllamaException if the API call fails
     */
    public String generate(String prompt) {
        String apiUrl = settingsService.getOllamaApiUrl();
        String model = settingsService.getOllamaModel();

        try {
            JsonNode requestBody = objectMapper.createObjectNode()
                    .put("model", model)
                    .put("prompt", prompt)
                    .put("stream", false);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl + "/api/generate"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
                    .timeout(Duration.ofSeconds(60))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new OllamaException("Ollama API returned status " + response.statusCode() + ": " + response.body());
            }

            JsonNode responseJson = objectMapper.readTree(response.body());
            if (!responseJson.has("response")) {
                throw new OllamaException("Ollama API response missing 'response' field");
            }

            return responseJson.get("response").asText();

        } catch (OllamaException e) {
            throw e;
        } catch (Exception e) {
            throw new OllamaException("Failed to call Ollama API: " + e.getMessage(), e);
        }
    }

    public static class OllamaException extends RuntimeException {
        public OllamaException(String message) {
            super(message);
        }

        public OllamaException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
