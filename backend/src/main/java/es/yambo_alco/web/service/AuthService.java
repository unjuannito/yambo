package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.UnauthorizedException;
import es.yambo_alco.web.jwt.JwtService;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.UserRepository;
import lombok.RequiredArgsConstructor;
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

    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    public String authenticate(String username, String password) {
        UserDetails user = loadUserByUsername(username);
        if (passwordEncoder.matches(password, user.getPassword())) {
            return jwtService.generateToken(user);
        }
        throw new UnauthorizedException("Invalid credentials");
    }


    public User getCurrentUser(boolean throwIfNotAuthenticated) {
        if (org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication() == null) {
            if (throwIfNotAuthenticated) {
                throw new UnauthorizedException("User is not authenticated");
            }
            return null;
        }
        return (User) org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    public String reload() {
        User user = getCurrentUser(true);
        return jwtService.generateToken(user);
    }
}
