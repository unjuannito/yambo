package es.yambo_alco.web.model.enums;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

class PermissionActionTest {

    @Test
    void shouldHaveCorrectValues() {
        assertEquals("create", PermissionAction.CREATE.getValue());
        assertEquals("read", PermissionAction.READ.getValue());
        assertEquals("update", PermissionAction.UPDATE.getValue());
        assertEquals("delete", PermissionAction.DELETE.getValue());
        assertEquals("comment", PermissionAction.COMMENT.getValue());
    }

    @Test
    void fromValue_WithValidLowercaseValues_ShouldReturnCorrectEnum() {
        assertEquals(PermissionAction.CREATE, PermissionAction.fromValue("create"));
        assertEquals(PermissionAction.READ, PermissionAction.fromValue("read"));
        assertEquals(PermissionAction.UPDATE, PermissionAction.fromValue("update"));
        assertEquals(PermissionAction.DELETE, PermissionAction.fromValue("delete"));
        assertEquals(PermissionAction.COMMENT, PermissionAction.fromValue("comment"));
    }

    @Test
    void fromValue_WithValidUppercaseValues_ShouldReturnCorrectEnum() {
        assertEquals(PermissionAction.CREATE, PermissionAction.fromValue("CREATE"));
        assertEquals(PermissionAction.READ, PermissionAction.fromValue("READ"));
        assertEquals(PermissionAction.UPDATE, PermissionAction.fromValue("UPDATE"));
        assertEquals(PermissionAction.DELETE, PermissionAction.fromValue("DELETE"));
        assertEquals(PermissionAction.COMMENT, PermissionAction.fromValue("COMMENT"));
    }

    @Test
    void fromValue_WithMixedCaseValues_ShouldReturnCorrectEnum() {
        assertEquals(PermissionAction.CREATE, PermissionAction.fromValue("Create"));
        assertEquals(PermissionAction.READ, PermissionAction.fromValue("ReAd"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"invalid", "write", "manage", ""})
    void fromValue_WithInvalidValues_ShouldThrowException(String value) {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> PermissionAction.fromValue(value));
        assertTrue(exception.getMessage().contains("Unknown action"));
    }

    @Test
    void fromValue_WithNull_ShouldThrowException() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> PermissionAction.fromValue(null));
        assertEquals("Action value cannot be null", exception.getMessage());
    }

    @Test
    void toString_ShouldReturnValue() {
        assertEquals("create", PermissionAction.CREATE.toString());
        assertEquals("read", PermissionAction.READ.toString());
        assertEquals("update", PermissionAction.UPDATE.toString());
        assertEquals("delete", PermissionAction.DELETE.toString());
        assertEquals("comment", PermissionAction.COMMENT.toString());
    }

    @Test
    void values_ShouldContainAllActions() {
        PermissionAction[] actions = PermissionAction.values();
        assertEquals(5, actions.length);
        assertArrayEquals(
            new PermissionAction[]{
                PermissionAction.CREATE,
                PermissionAction.READ,
                PermissionAction.UPDATE,
                PermissionAction.DELETE,
                PermissionAction.COMMENT
            },
                actions
        );
    }
}
