package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.UnauthorizedException;
import es.yambo_alco.web.jwt.JwtService;
import es.yambo_alco.web.model.Role;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    private User testUser;
    private static final String TEST_USERNAME = "testuser";
    private static final String TEST_PASSWORD = "testpass";
    private static final String ENCODED_PASSWORD = "encodedPassword";
    private static final String TEST_TOKEN = "test.jwt.token";

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .username(TEST_USERNAME)
                .password(ENCODED_PASSWORD)
                .email("test@yambo-alco.es")
                .roles(Set.of(
                        Role.builder().id("ADMIN").build(),
                        Role.builder().id("USER").build()))
                .enabled(true)
                .build();
    }

    @Test
    void loadUserByUsername_WithValidUsername_ShouldReturnUser() {
        // Given
        when(userRepository.findByUsername(TEST_USERNAME)).thenReturn(Optional.of(testUser));

        // When
        UserDetails user = authService.loadUserByUsername(TEST_USERNAME);

        // Then
        assertNotNull(user);
        assertEquals(TEST_USERNAME, user.getUsername());
    }

    @Test
    void loadUserByUsername_WithInvalidUsername_ShouldThrowException() {
        // Given
        when(userRepository.findByUsername("invalid")).thenReturn(Optional.empty());

        // Then
        assertThrows(UsernameNotFoundException.class,
                () -> authService.loadUserByUsername("invalid"));
    }

    @Test
    void authenticate_WithValidCredentials_ShouldReturnToken() {
        // Given
        when(userRepository.findByUsername(TEST_USERNAME)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches(TEST_PASSWORD, ENCODED_PASSWORD)).thenReturn(true);
        when(jwtService.generateToken(any(UserDetails.class))).thenReturn(TEST_TOKEN);

        // When
        String token = authService.authenticate(TEST_USERNAME, TEST_PASSWORD);

        // Then
        assertNotNull(token);
        assertEquals(TEST_TOKEN, token);
    }

    @Test
    void authenticate_WithInvalidPassword_ShouldThrowException() {
        // Given
        when(userRepository.findByUsername(TEST_USERNAME)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("wrongpass", ENCODED_PASSWORD)).thenReturn(false);

        // Then
        assertThrows(BadCredentialsException.class,
                () -> authService.authenticate(TEST_USERNAME, "wrongpass"));
    }

    @Test
    void getCurrentUser_WhenAuthenticated_ShouldReturnUser() {
        // Given
        SecurityContext securityContext = mock(SecurityContext.class);
        Authentication authentication = mock(Authentication.class);
        SecurityContextHolder.setContext(securityContext);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(testUser);

        // When
        User result = authService.getCurrentUser(true);

        // Then
        assertNotNull(result);
        assertEquals(testUser, result);
    }

    @Test
    void getCurrentUser_WhenNotAuthenticated_AndThrowIsTrue_ShouldThrowException() {
        // Given
        SecurityContext securityContext = mock(SecurityContext.class);
        SecurityContextHolder.setContext(securityContext);
        when(securityContext.getAuthentication()).thenReturn(null);

        // Then
        assertThrows(UnauthorizedException.class,
                () -> authService.getCurrentUser(true));
    }

    @Test
    void getCurrentUser_WhenNotAuthenticated_AndThrowIsFalse_ShouldReturnNull() {
        // Given
        SecurityContext securityContext = mock(SecurityContext.class);
        SecurityContextHolder.setContext(securityContext);
        when(securityContext.getAuthentication()).thenReturn(null);

        // When
        User result = authService.getCurrentUser(false);

        // Then
        assertNull(result);
    }

    @Test
    void reload_WhenAuthenticated_ShouldReturnNewToken() {
        // Given
        SecurityContext securityContext = mock(SecurityContext.class);
        Authentication authentication = mock(Authentication.class);
        SecurityContextHolder.setContext(securityContext);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(testUser);
        when(jwtService.generateToken(testUser)).thenReturn(TEST_TOKEN);

        // When
        String token = authService.reload();

        // Then
        assertNotNull(token);
        assertEquals(TEST_TOKEN, token);
    }

    @Test
    void reload_WhenNotAuthenticated_ShouldThrowException() {
        // Given
        SecurityContext securityContext = mock(SecurityContext.class);
        SecurityContextHolder.setContext(securityContext);
        when(securityContext.getAuthentication()).thenReturn(null);

        // Then
        assertThrows(UnauthorizedException.class,
                () -> authService.reload());
    }
}