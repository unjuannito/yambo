package es.yambo_alco.web.util;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;

@SuppressWarnings("null")
class IdGeneratorTest {

    private static final Pattern ALPHANUMERIC_PATTERN = Pattern.compile("^[A-Za-z0-9]{8}$");

    @Test
    void generateId_ShouldReturnEightCharacterString() {
        // When
        String id = IdGenerator.generateId();

        // Then
        assertNotNull(id);
        assertEquals(8, id.length());
    }

    @Test
    void generateId_ShouldReturnAlphanumericCharactersOnly() {
        // When
        String id = IdGenerator.generateId();

        // Then
        assertTrue(ALPHANUMERIC_PATTERN.matcher(id).matches(),
                "Generated ID should contain only alphanumeric characters: " + id);
    }

    @Test
    void generateId_ShouldGenerateUniqueIds() {
        // Given
        Set<String> generatedIds = new HashSet<>();
        int numberOfIds = 1000;

        // When
        for (int i = 0; i < numberOfIds; i++) {
            generatedIds.add(IdGenerator.generateId());
        }

        // Then
        assertEquals(numberOfIds, generatedIds.size(),
                "All generated IDs should be unique");
    }

    @Test
    void generateId_ShouldNotReturnNull() {
        // When
        String id = IdGenerator.generateId();

        // Then
        assertNotNull(id);
        assertFalse(id.isEmpty());
    }

    @Test
    void generateId_MultipleCalls_ShouldReturnDifferentIds() {
        // When
        String id1 = IdGenerator.generateId();
        String id2 = IdGenerator.generateId();
        String id3 = IdGenerator.generateId();

        // Then
        assertNotEquals(id1, id2);
        assertNotEquals(id1, id3);
        assertNotEquals(id2, id3);
    }

    @Test
    void generateId_ShouldContainUppercaseLetters() {
        // Given
        boolean foundUppercase = false;
        int attempts = 100; // Try multiple times to account for randomness

        // When
        for (int i = 0; i < attempts && !foundUppercase; i++) {
            String id = IdGenerator.generateId();
            if (id.chars().anyMatch(Character::isUpperCase)) {
                foundUppercase = true;
            }
        }

        // Then
        assertTrue(foundUppercase,
                "Should generate at least one uppercase letter within " + attempts + " attempts");
    }

    @Test
    void generateId_ShouldContainLowercaseLetters() {
        // Given
        boolean foundLowercase = false;
        int attempts = 100; // Try multiple times to account for randomness

        // When
        for (int i = 0; i < attempts && !foundLowercase; i++) {
            String id = IdGenerator.generateId();
            if (id.chars().anyMatch(Character::isLowerCase)) {
                foundLowercase = true;
            }
        }

        // Then
        assertTrue(foundLowercase,
                "Should generate at least one lowercase letter within " + attempts + " attempts");
    }

    @Test
    void generateId_ShouldContainDigits() {
        // Given
        boolean foundDigit = false;
        int attempts = 100; // Try multiple times to account for randomness

        // When
        for (int i = 0; i < attempts && !foundDigit; i++) {
            String id = IdGenerator.generateId();
            if (id.chars().anyMatch(Character::isDigit)) {
                foundDigit = true;
            }
        }

        // Then
        assertTrue(foundDigit,
                "Should generate at least one digit within " + attempts + " attempts");
    }
}