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
                .id("U0000001")
                .email("testuser")
                .password("password123")
                .email("test@example.com")
                .name("Test User")
                .createdAt(now)
                .enabled(true)
                .build();

        assertEquals("U0000001", user.getId());
        assertEquals("password123", user.getPassword());
        assertEquals("test@example.com", user.getEmail());
        assertEquals("Test User", user.getName());
        assertEquals(now, user.getCreatedAt());
        assertTrue(user.isEnabled());
    }

    @Test
    void getAuthorities_ShouldReturnCorrectAuthorities() {
        User user = User.builder()
                .profiles(Set.of(
                        Profile.builder().id("ADMIN")
                                .permissions(Set.of(
                                        Permission.builder().id("READ_PRIVILEGES").build(),
                                        Permission.builder().id("WRITE_PRIVILEGES").build()))
                                .build(),
                        Profile.builder().id("USER").build()))
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
                .id("U0000001")
                .email("user")
                .email("user@example.com")
                .build();

        User user2 = User.builder()
                .id("U0000001")
                .email("user")
                .email("user@example.com")
                .build();

        assertEquals(user1, user2);
        assertEquals(user1.hashCode(), user2.hashCode());
    }
}