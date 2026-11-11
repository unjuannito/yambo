package es.yambo_alco.web.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MarkdownServiceTest {

    private final MarkdownService service = new MarkdownService();

    @Test
    void toSafeHtml_KeepsRelativeUploadedImageSrc() {
        // The editor's own upload flow (and admins pasting an external URL) both produce
        // img src values: relative "/uploads/..." paths from our own file storage, or
        // absolute http(s) URLs. Both must survive Jsoup's safelist cleaning.
        String html = service.toSafeHtml("![foto](/uploads/test.jpg)");

        assertThat(html).contains("src=\"/uploads/test.jpg\"");
    }

    @Test
    void toSafeHtml_KeepsAbsoluteHttpsImageSrc() {
        String html = service.toSafeHtml("![foto](https://example.com/foto.jpg)");

        assertThat(html).contains("src=\"https://example.com/foto.jpg\"");
    }

    @Test
    void toSafeHtml_RendersBasicMarkdownFormatting() {
        String html = service.toSafeHtml("**hola** mundo");

        assertThat(html).contains("<strong>hola</strong>");
    }

    @Test
    void toSafeHtml_ReturnsEmptyForBlank() {
        assertThat(service.toSafeHtml(null)).isEmpty();
        assertThat(service.toSafeHtml("  ")).isEmpty();
    }

    @Test
    void toPlainText_StripsFormatting() {
        String text = service.toPlainText("**hola** [mundo](https://example.com)");

        assertThat(text).isEqualTo("hola mundo");
    }
}
