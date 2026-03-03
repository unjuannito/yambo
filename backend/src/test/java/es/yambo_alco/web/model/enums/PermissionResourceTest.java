package es.yambo_alco.web.model.enums;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

class PermissionResourceTest {

    @Test
    void shouldHaveCorrectValues() {
        assertEquals("user", PermissionResource.USER.getValue());
        assertEquals("profile", PermissionResource.PROFILE.getValue());
        assertEquals("invitation", PermissionResource.INVITATION.getValue());
        assertEquals("product", PermissionResource.PRODUCT.getValue());
        assertEquals("project", PermissionResource.PROJECT.getValue());
        assertEquals("family_product", PermissionResource.FAMILY_PRODUCT.getValue());
    }

    @Test
    void fromValue_WithValidLowercaseValues_ShouldReturnCorrectEnum() {
        assertEquals(PermissionResource.USER, PermissionResource.fromValue("user"));
        assertEquals(PermissionResource.PROFILE, PermissionResource.fromValue("profile"));
        assertEquals(PermissionResource.INVITATION, PermissionResource.fromValue("invitation"));
        assertEquals(PermissionResource.PRODUCT, PermissionResource.fromValue("product"));
        assertEquals(PermissionResource.PROJECT, PermissionResource.fromValue("project"));
        assertEquals(PermissionResource.FAMILY_PRODUCT, PermissionResource.fromValue("family_product"));
    }

    @Test
    void fromValue_WithValidUppercaseValues_ShouldReturnCorrectEnum() {
        assertEquals(PermissionResource.USER, PermissionResource.fromValue("USER"));
        assertEquals(PermissionResource.PROFILE, PermissionResource.fromValue("PROFILE"));
        assertEquals(PermissionResource.INVITATION, PermissionResource.fromValue("INVITATION"));
    }

    @Test
    void fromValue_WithMixedCaseValues_ShouldReturnCorrectEnum() {
        assertEquals(PermissionResource.USER, PermissionResource.fromValue("User"));
        assertEquals(PermissionResource.PROFILE, PermissionResource.fromValue("ProFile"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"invalid", "users", "admin", ""})
    void fromValue_WithInvalidValues_ShouldThrowException(String value) {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> PermissionResource.fromValue(value));
        assertTrue(exception.getMessage().contains("Unknown resource"));
    }

    @Test
    void fromValue_WithNull_ShouldThrowException() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> PermissionResource.fromValue(null));
        assertEquals("Resource value cannot be null", exception.getMessage());
    }

    @Test
    void toString_ShouldReturnValue() {
        assertEquals("user", PermissionResource.USER.toString());
        assertEquals("profile", PermissionResource.PROFILE.toString());
        assertEquals("invitation", PermissionResource.INVITATION.toString());
        assertEquals("product", PermissionResource.PRODUCT.toString());
        assertEquals("project", PermissionResource.PROJECT.toString());
        assertEquals("family_product", PermissionResource.FAMILY_PRODUCT.toString());
    }

    @Test
    void values_ShouldContainAllResources() {
        PermissionResource[] resources = PermissionResource.values();
        assertEquals(12, resources.length);
    }
}
