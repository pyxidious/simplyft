package com.simplyft.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DemoUserSeeder implements CommandLineRunner {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final String demoPassword;

    public DemoUserSeeder(
        JdbcTemplate jdbc,
        PasswordEncoder passwordEncoder,
        @Value("${app.auth.demo-password:password}") String demoPassword
    ) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
        this.demoPassword = demoPassword;
    }

    @Override
    public void run(String... args) {
        upsert("Luca Bianchi", "tecnico@simplyft.local", "tecnico", "Tecnico Senior Area Nord");
        upsert("Giulia Conti", "commerciale@simplyft.local", "commerciale", "Back-office commerciale");
        upsert("Admin Simplyft", "admin@simplyft.local", "amministratore", "Amministratore");
    }

    private void upsert(String name, String email, String role, String title) {
        jdbc.update("""
            INSERT INTO utenti (nome, email, password_hash, ruolo, titolo, attivo)
            VALUES (?, ?, ?, ?, ?, TRUE)
            ON CONFLICT (email) DO UPDATE SET
                nome = EXCLUDED.nome,
                password_hash = EXCLUDED.password_hash,
                ruolo = EXCLUDED.ruolo,
                titolo = EXCLUDED.titolo,
                attivo = TRUE
            """,
            name,
            email,
            passwordEncoder.encode(demoPassword),
            role,
            title
        );
    }
}
