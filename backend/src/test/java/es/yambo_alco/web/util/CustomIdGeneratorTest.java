package es.yambo_alco.web.util;

import org.hibernate.engine.spi.SharedSessionContractImplementor;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.Serializable;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class CustomIdGeneratorTest {

    @Mock
    private SharedSessionContractImplementor session;

    private final CustomIdGenerator generator = new CustomIdGenerator();

    @Test
    void generate_ShouldReturnString() throws Exception {
        // Given
        Object object = new Object();

        // When
        Serializable result = generator.generate(session, object);

        // Then
        assertNotNull(result);
        assertInstanceOf(String.class, result);
    }

    @Test
    void generate_ShouldReturnEightCharacterId() throws Exception {
        // Given
        Object object = new Object();

        // When
        Serializable result = generator.generate(session, object);

        // Then
        assertInstanceOf(String.class, result);
        String id = (String) result;
        assertEquals(8, id.length());
    }

    @Test
    void generate_ShouldReturnAlphanumericId() throws Exception {
        // Given
        Object object = new Object();

        // When
        Serializable result = generator.generate(session, object);

        // Then
        assertInstanceOf(String.class, result);
        String id = (String) result;
        assertTrue(id.matches("^[A-Za-z0-9]{8}$"),
                "Generated ID should be 8 alphanumeric characters: " + id);
    }

    @Test
    void generate_WithNullObject_ShouldStillGenerateId() throws Exception {
        // When
        Serializable result = generator.generate(session, null);

        // Then
        assertNotNull(result);
        assertInstanceOf(String.class, result);
        String id = (String) result;
        assertEquals(8, id.length());
    }

    @Test
    void generate_WithNullSession_ShouldStillGenerateId() throws Exception {
        // Given
        Object object = new Object();

        // When
        Serializable result = generator.generate(null, object);

        // Then
        assertNotNull(result);
        assertInstanceOf(String.class, result);
        String id = (String) result;
        assertEquals(8, id.length());
    }

    @Test
    void generate_MultipleCalls_ShouldReturnUniqueIds() throws Exception {
        // Given
        Object object = new Object();

        // When
        Serializable result1 = generator.generate(session, object);
        Serializable result2 = generator.generate(session, object);
        Serializable result3 = generator.generate(session, object);

        // Then
        assertNotEquals(result1, result2);
        assertNotEquals(result1, result3);
        assertNotEquals(result2, result3);
    }
}