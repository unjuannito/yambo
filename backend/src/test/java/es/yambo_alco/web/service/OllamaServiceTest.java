package es.yambo_alco.web.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SuppressWarnings("unchecked")
class OllamaServiceTest {

    private HttpClient httpClient;
    private SettingsService settingsService;
    private OllamaService ollamaService;

    @BeforeEach
    void setUp() {
        httpClient = mock(HttpClient.class);
        settingsService = mock(SettingsService.class);
        when(settingsService.getOllamaApiUrl()).thenReturn("http://localhost:11434");
        when(settingsService.getOllamaModel()).thenReturn("phi3:mini");
        ollamaService = new OllamaService(settingsService, httpClient);
    }

    @Test
    void generate_SuccessfulResponse_ShouldReturnText() throws Exception {
        // Given
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn("{\"response\": \"Hello, world!\", \"done\": true}");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);

        // When
        String result = ollamaService.generate("Test prompt");

        // Then
        assertEquals("Hello, world!", result);
        verify(httpClient).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    @Test
    void generate_NonOkStatus_ShouldThrowOllamaException() throws Exception {
        // Given
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(500);
        when(response.body()).thenReturn("Internal Server Error");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);

        // When / Then
        OllamaService.OllamaException exception = assertThrows(OllamaService.OllamaException.class,
                () -> ollamaService.generate("Test prompt"));
        assertTrue(exception.getMessage().contains("500"));
    }

    @Test
    void generate_MissingResponseField_ShouldThrowOllamaException() throws Exception {
        // Given
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn("{\"done\": true}");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);

        // When / Then
        OllamaService.OllamaException exception = assertThrows(OllamaService.OllamaException.class,
                () -> ollamaService.generate("Test prompt"));
        assertTrue(exception.getMessage().contains("missing 'response' field"));
    }

    @Test
    void generate_ConnectionError_ShouldThrowOllamaException() throws Exception {
        // Given
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenThrow(new IOException("Connection refused"));

        // When / Then
        OllamaService.OllamaException exception = assertThrows(OllamaService.OllamaException.class,
                () -> ollamaService.generate("Test prompt"));
        assertTrue(exception.getMessage().contains("Failed to call Ollama API"));
    }

    @Test
    void generate_InterruptedException_ShouldThrowOllamaException() throws Exception {
        // Given
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenThrow(new InterruptedException("Interrupted"));

        // When / Then
        OllamaService.OllamaException exception = assertThrows(OllamaService.OllamaException.class,
                () -> ollamaService.generate("Test prompt"));
        assertTrue(exception.getMessage().contains("Failed to call Ollama API"));
    }

    @Test
    void generate_JsonResponseWithSeoData_ShouldReturnFullResponse() throws Exception {
        // Given
        String seoResponse = """
                {
                  "metaDescription": "Descubre el Proyecto Barrio",
                  "keywords": ["Yambo", "Alcobendas"]
                }
                """;
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn("{\"response\": " + com.fasterxml.jackson.databind.ObjectMapper
                .class.getDeclaredConstructor().newInstance()
                .writeValueAsString(seoResponse) + ", \"done\": true}");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);

        // When
        String result = ollamaService.generate("Generate SEO");

        // Then
        assertNotNull(result);
        assertTrue(result.contains("Proyecto Barrio"));
    }
}
