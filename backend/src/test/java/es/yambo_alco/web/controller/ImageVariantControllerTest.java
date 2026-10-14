package es.yambo_alco.web.controller;

import es.yambo_alco.web.config.TestSecurityConfig;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.service.ImageVariantService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ImageVariantController.class)
@Import(TestSecurityConfig.class)
class ImageVariantControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ImageVariantService imageVariantService;

    @TempDir
    Path tempDir;

    @Test
    @WithAnonymousUser
    void getVariant_ShouldServeTheWebpWithALongCache() throws Exception {
        Path variant = Files.writeString(tempDir.resolve("foto.jpg.webp"), "webp-bytes");
        when(imageVariantService.variant("foto_abc12345.jpg", 480)).thenReturn(Optional.of(variant));

        mockMvc.perform(get("/uploads/_w/480/foto_abc12345.jpg"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/webp"))
                .andExpect(header().string("Cache-Control", "max-age=31536000, public, immutable"))
                .andExpect(content().string("webp-bytes"));
    }

    @Test
    @WithAnonymousUser
    void getVariant_ShouldRedirectToTheOriginalWhenItCannotBeConverted() throws Exception {
        when(imageVariantService.variant("logo_abc12345.svg", 480)).thenReturn(Optional.empty());

        mockMvc.perform(get("/uploads/_w/480/logo_abc12345.svg"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "../../logo_abc12345.svg"));
    }

    @Test
    @WithAnonymousUser
    void getVariant_ShouldAnswerNotFoundForUnknownWidthsOrFiles() throws Exception {
        when(imageVariantService.variant("foto_abc12345.jpg", 481))
                .thenThrow(new ResourceNotFoundException("Unsupported image width: 481"));

        mockMvc.perform(get("/uploads/_w/481/foto_abc12345.jpg"))
                .andExpect(status().isNotFound());
    }
}
