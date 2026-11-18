package br.senai.metaltech.config;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.*;
import java.util.List;

@Configuration
public class SecurityConfiguration {
    @Bean
    SecurityFilterChain security(HttpSecurity http) throws Exception {
        return http.csrf(c -> c.disable()).cors(c -> {
        }).authorizeHttpRequests(a -> a.requestMatchers(HttpMethod.GET, "/api/**", "/actuator/health").permitAll()
                .anyRequest().permitAll()).build();
    }

    @Bean
    CorsConfigurationSource cors(@Value("${CORS_ORIGIN:http://localhost:5173}") String origin) {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(List.of(origin));
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("Content-Type", "X-Ingest-Key", "X-Admin-Key"));
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", c);
        return src;
    }
}
