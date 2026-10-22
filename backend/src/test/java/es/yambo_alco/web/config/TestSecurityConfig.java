package es.yambo_alco.web.config;

import es.yambo_alco.web.jwt.JwtAuthenticationFilter;
import es.yambo_alco.web.jwt.JwtService;
import es.yambo_alco.web.service.AuthService;
import es.yambo_alco.web.util.PermissionCheckService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.servlet.HandlerExceptionResolver;

import static org.mockito.Mockito.mock;

@TestConfiguration
@EnableWebSecurity
@EnableMethodSecurity
public class TestSecurityConfig {

    @Bean
    @Primary
    public JwtService jwtService() {
        return mock(JwtService.class);
    }

    @Bean
    @Primary
    public AuthService authService() {
        return mock(AuthService.class);
    }

    @Bean("permissionCheck")
    @Primary
    public PermissionCheckService permissionCheckService() {
        return mock(PermissionCheckService.class);
    }

    // Use mocked AuthService (which implements UserDetailsService) to avoid multiple UserDetailsService beans

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter(@Qualifier("handlerExceptionResolver") HandlerExceptionResolver handlerExceptionResolver) {
        return new JwtAuthenticationFilter(jwtService(), authService(), handlerExceptionResolver);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/health").permitAll()
                .anyRequest().permitAll()
            );

        return http.build();
    }
}
