package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.service.ProductViewService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ProductViewController.class)
@Import(TestSecurityConfig.class)
class ProductViewControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProductViewService productViewService;

    @Test
    void trackView_Anonymous_ShouldReturn200() throws Exception {
        mockMvc.perform(post("/products/PROD001/views")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\":\"test-session-123\"}"))
                .andExpect(status().isOk());

        verify(productViewService).logView(eq("PROD001"), any(), eq("test-session-123"));
    }

    @Test
    @WithMockUser(username = "USER001")
    void trackView_Authenticated_ShouldReturn200() throws Exception {
        mockMvc.perform(post("/products/PROD001/views")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\":null}"))
                .andExpect(status().isOk());

        verify(productViewService).logView(eq("PROD001"), any(), any());
    }

    @Test
    void trackView_NoBody_ShouldReturn200() throws Exception {
        mockMvc.perform(post("/products/PROD001/views"))
                .andExpect(status().isOk());

        verify(productViewService).logView(eq("PROD001"), any(), any());
    }
}
