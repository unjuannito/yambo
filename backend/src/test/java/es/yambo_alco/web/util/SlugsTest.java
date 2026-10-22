package es.yambo_alco.web.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SlugsTest {

    @Test
    void slugify_ShouldLowercaseAndJoinWordsWithHyphens() {
        assertThat(Slugs.slugify("Campamento de Verano", "x")).isEqualTo("campamento-de-verano");
    }

    @Test
    void slugify_ShouldStripAccentsAndSymbols() {
        assertThat(Slugs.slugify("¡Excursión a la Peña! (niños)", "x")).isEqualTo("excursion-a-la-pena-ninos");
    }

    @Test
    void slugify_ShouldFallBackWhenNothingUsableIsLeft() {
        assertThat(Slugs.slugify("🎉🎉", "actividad")).isEqualTo("actividad");
        assertThat(Slugs.slugify("   ", "actividad")).isEqualTo("actividad");
        assertThat(Slugs.slugify(null, "actividad")).isEqualTo("actividad");
    }

    @Test
    void slugify_ShouldTruncateWithoutEndingOnAHyphen() {
        String slug = Slugs.slugify("a".repeat(79) + " bcd", "x");

        assertThat(slug).hasSize(79).doesNotEndWith("-");
    }
}
