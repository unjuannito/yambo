package es.yambo_alco.web.model;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class UserTest {

    @Test
    void builder_ShouldCreateUserWithAllFields() {
        LocalDateTime now = LocalDateTime.now();
        User user = User.builder()
                .id("abc12345")
                .password("password123")
                .email("test@example.com")
                .name("Test User")
                .createdAt(now)
                .updatedAt(now)
                .enabled(true)
                .build();

        assertEquals("abc12345", user.getId());
        assertEquals("test@example.com", user.getUsername()); // getUsername() returns email
        assertEquals("password123", user.getPassword());
        assertEquals("test@example.com", user.getEmail());
        assertEquals("Test User", user.getName());
        assertEquals(now, user.getCreatedAt());
        assertEquals(now, user.getUpdatedAt());
        assertTrue(user.isEnabled());
    }

    @Test
    void getAuthorities_ShouldReturnCorrectAuthorities() {
        User user = User.builder()
                .roles(Set.of(
                        Role.builder().id("ADMIN")
                                .permissions(Set.of(
                                        Permission.builder().id("READ_PRIVILEGES").build(),
                                        Permission.builder().id("WRITE_PRIVILEGES").build()))
                                .build(),
                        Role.builder().id("USER").build()))
                .build();

        Collection<? extends GrantedAuthority> authorities = user.getAuthorities();

        assertEquals(4, authorities.size());
        assertTrue(authorities.contains(new SimpleGrantedAuthority("ROLE_ADMIN")));
        assertTrue(authorities.contains(new SimpleGrantedAuthority("ROLE_USER")));
        assertTrue(authorities.contains(new SimpleGrantedAuthority("READ_PRIVILEGES")));
        assertTrue(authorities.contains(new SimpleGrantedAuthority("WRITE_PRIVILEGES")));
    }

    @Test
    void userDetails_DefaultValues_ShouldBeCorrect() {
        User user = new User();

        assertTrue(user.isAccountNonExpired());
        assertTrue(user.isAccountNonLocked());
        assertTrue(user.isCredentialsNonExpired());
        assertTrue(user.isEnabled());
    }

    @Test
    void setEnabled_ShouldUpdateEnabledStatus() {
        User user = new User();
        user.setEnabled(false);

        assertFalse(user.isEnabled());
    }

    @Test
    void equalsAndHashCode_ShouldWorkCorrectly() {
        User user1 = User.builder()
                .id("abc12345")
                .email("user@example.com")
                .build();

        User user2 = User.builder()
                .id("abc12345")
                .email("user@example.com")
                .build();

        assertEquals(user1, user2);
        assertEquals(user1.hashCode(), user2.hashCode());
    }
}