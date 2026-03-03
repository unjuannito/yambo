package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.UnauthorizedException;
import es.yambo_alco.web.jwt.JwtService;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.model.UserLoginHistory;
import es.yambo_alco.web.repository.UserLoginHistoryRepository;
import es.yambo_alco.web.repository.UserRepository;
import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService implements UserDetailsService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserLoginHistoryRepository userLoginHistoryRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return loadUserByEmail(username);
    }

    public UserDetails loadUserByEmail(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    public String authenticate(String email, String password) {
        UserDetails user = loadUserByEmail(email);
        if (passwordEncoder.matches(password, user.getPassword())) {
            return jwtService.generateToken(user);
        }
        throw new BadCredentialsException("Invalid credentials");
    }

    @Transactional
    public void recordLogin(String email, String ipAddress, String userAgent) {
        try {
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) return;

            LocalDateTime now = LocalDateTime.now();

            // Update lastLoginAt on user
            user.setLastLoginAt(now);
            userRepository.save(user);

            // Record login history
            UserLoginHistory history = UserLoginHistory.builder()
                    .userId(user.getId())
                    .loggedInAt(now)
                    .ipAddress(ipAddress)
                    .userAgent(userAgent != null && userAgent.length() > 512
                            ? userAgent.substring(0, 512) : userAgent)
                    .build();
            userLoginHistoryRepository.save(history);
        } catch (Exception e) {
            log.error("Failed to record login for user: {}", email, e);
        }
    }


    public User getCurrentUser(boolean throwIfNotAuthenticated) {
        var authentication = org.springframework.security.core.context.SecurityContextHolder.getContext()
                .getAuthentication();

        if (authentication == null) {
            if (throwIfNotAuthenticated) {
                throw new UnauthorizedException("User is not authenticated");
            }
            return null;
        }

        if (authentication instanceof org.springframework.security.authentication.AnonymousAuthenticationToken) {
            if (throwIfNotAuthenticated) {
                throw new UnauthorizedException("User is not authenticated");
            }
            return null;
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof User user) {
            return user;
        }

        if (principal instanceof String email) {
            if ("anonymousUser".equalsIgnoreCase(email)) {
                if (throwIfNotAuthenticated) {
                    throw new UnauthorizedException("User is not authenticated");
                }
                return null;
            }
            return (User) loadUserByEmail(email);
        }

        if (throwIfNotAuthenticated) {
            throw new UnauthorizedException("User is not authenticated");
        }
        return null;
    }

    public String reload() {
        User user = getCurrentUser(true);
        return jwtService.generateToken(user);
    }
}
