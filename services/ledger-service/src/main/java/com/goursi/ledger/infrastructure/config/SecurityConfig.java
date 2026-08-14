package com.goursi.ledger.infrastructure.config;

import com.goursi.ledger.infrastructure.filter.ServiceKeyFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;

/**
 * La sécurité réelle du service interne est assurée par {@link ServiceKeyFilter}
 * (X-Service-Key, comparaison en temps constant). Spring Security est présent
 * pour l'hygiène des headers ; rien n'est ouvert publiquement par défaut.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, ServiceKeyFilter serviceKeyFilter) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            .addFilterBefore(serviceKeyFilter, BasicAuthenticationFilter.class);
        return http.build();
    }

    /** Le filtre est câblé dans la chaîne de sécurité — pas de double enregistrement. */
    @Bean
    public FilterRegistrationBean<ServiceKeyFilter> serviceKeyFilterRegistration(ServiceKeyFilter filter) {
        FilterRegistrationBean<ServiceKeyFilter> reg = new FilterRegistrationBean<>(filter);
        reg.setEnabled(false);
        return reg;
    }
}
