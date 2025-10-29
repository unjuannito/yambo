package es.yambo_alco.web.jwt;

import es.yambo_alco.web.model.Role;
import es.yambo_alco.web.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Set;

@ExtendWith(MockitoExtension.class)
class JwtServiceTest {

    private JwtService jwtService;
    private User testUser;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "jwtSecret", "bd54d2a5f05bab92db7403e180b40782cf5835d39fe702d8aa26ddeb18877019");
        ReflectionTestUtils.setField(jwtService, "jwtExpirationMillis", 3600000L);
        testUser = User.builder()
                .username("testuser")
                .password("password")
                .email("test@yambo-alco.es")
                .roles(Set.of(
                        Role.builder().id("ADMIN").build(),
                        Role.builder().id("USER").build()
                ))
                .enabled(true)
                .build();
    }

    @Test
    void generateToken_ShouldCreateValidToken() {
        String token = jwtService.generateToken(testUser);
        
        assertNotNull(token);
        assertTrue(jwtService.validateToken(token, testUser));
    }

    @Test
    void extractUsername_ShouldReturnCorrectUsername() {
        String token = jwtService.generateToken(testUser);
        
        String username = jwtService.extractUsername(token);
        assertEquals(testUser.getUsername(), username);
    }

    @Test
    void validateToken_WithValidToken_ShouldReturnTrue() {
        String token = jwtService.generateToken(testUser);
        
        assertTrue(jwtService.validateToken(token, testUser));
    }

    @Test
    void validateToken_WithInvalidUser_ShouldReturnFalse() {
        String token = jwtService.generateToken(testUser);
        
        User otherUser = User.builder()
                .username("otheruser")
                .password("password")
                .email("other@yambo-alco.es")
                .roles(Set.of(
                        Role.builder().id("USER").build()
                ))
                .enabled(true)
                .build();
                
        assertFalse(jwtService.validateToken(token, otherUser));
    }
}
