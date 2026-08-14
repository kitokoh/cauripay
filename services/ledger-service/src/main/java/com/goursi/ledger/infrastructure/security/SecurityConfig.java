package com.goursi.ledger.infrastructure.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * API interne : réseau Docker uniquement, authentifiée par {@code X-Service-Key}
 * (filtre temps constant). Stateless, CSRF désactivé (pas de cookies/sessions).
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http, ServiceKeyFilter serviceKeyFilter)
      throws Exception {
    http
        .csrf(csrf -> csrf.disable())
        .formLogin(form -> form.disable())
        .httpBasic(basic -> basic.disable())
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
        .addFilterBefore(serviceKeyFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }

  @Bean
  public ServiceKeyFilter serviceKeyFilter(@Value("${goursi.ledger.internal-service-key}") String key) {
    return new ServiceKeyFilter(key);
  }
}
