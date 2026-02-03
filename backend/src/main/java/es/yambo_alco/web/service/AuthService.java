package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.UnauthorizedException;
import es.yambo_alco.web.jwt.JwtService;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.UserRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

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
