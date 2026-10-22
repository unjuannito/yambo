package es.yambo_alco.web.util;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

class EmailIconsTest {

    @ParameterizedTest
    @ValueSource(strings = {
            "triangle-exclamation",
            "arrows-rotate",
            "circle-check",
            "folder-closed",
            "arrow-rotate-left",
            "hourglass",
            "circle-xmark",
            "gear",
            "box-archive",
            "comments",
            "clipboard"
    })
    void get_ShouldReturnSvgContent(String iconName) {
        // When
        String svg = EmailIcons.get(iconName);

        // Then
        assertNotNull(svg);
        assertFalse(svg.isEmpty(), "SVG content should not be empty for: " + iconName);
        assertTrue(svg.startsWith("<svg"), "SVG content should start with <svg tag for: " + iconName);
        assertTrue(svg.contains("</svg>"), "SVG content should contain closing </svg> for: " + iconName);
    }

    @Test
    void get_ShouldCacheResults() {
        // When
        String first = EmailIcons.get("circle-check");
        String second = EmailIcons.get("circle-check");

        // Then
        assertSame(first, second, "Cached results should return the same String instance");
    }

    @Test
    void get_WithNonExistentIcon_ShouldReturnEmptyString() {
        // When
        String result = EmailIcons.get("non-existent-icon");

        // Then
        assertNotNull(result);
        assertEquals("", result);
    }

    @Test
    void get_ShouldContainFillAttribute() {
        // When
        String svg = EmailIcons.get("circle-check");

        // Then
        assertTrue(svg.contains("fill="), "SVG should contain a fill attribute");
    }

    @Test
    void get_ShouldContainInlineStyles() {
        // When – all email icons have vertical-align and margin for email rendering
        String svg = EmailIcons.get("hourglass");

        // Then
        assertTrue(svg.contains("vertical-align:middle"), "SVG should have vertical-align:middle for email layout");
        assertTrue(svg.contains("margin-right:6px"), "SVG should have margin-right for spacing");
    }
}
