package com.simplyft.backend.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class TokenService {
    private final JdbcTemplate jdbc;
    private final SecureRandom secureRandom = new SecureRandom();
    private final long ttlHours;

    public TokenService(JdbcTemplate jdbc, @Value("${app.auth.token-ttl-hours}") long ttlHours) {
        this.jdbc = jdbc;
        this.ttlHours = ttlHours;
    }

    public String issue(Long userId) {
        byte[] bytes = new byte[48];
        secureRandom.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        jdbc.update(
            "INSERT INTO auth_tokens (utente_id, token_hash, scade_il) VALUES (?, ?, ?)",
            userId,
            hash(token),
            OffsetDateTime.now().plusHours(ttlHours)
        );
        return token;
    }

    public Optional<AuthUser> findUser(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        return jdbc.query("""
                SELECT u.id, u.nome, u.email, u.ruolo, u.titolo
                FROM auth_tokens t
                JOIN utenti u ON u.id = t.utente_id
                WHERE t.token_hash = ?
                  AND t.revocato_il IS NULL
                  AND t.scade_il > NOW()
                  AND u.attivo = TRUE
                """,
            (rs, rowNum) -> new AuthUser(
                rs.getLong("id"),
                rs.getString("nome"),
                rs.getString("email"),
                rs.getString("ruolo"),
                rs.getString("titolo")
            ),
            hash(token)
        ).stream().findFirst();
    }

    public void revoke(String token) {
        if (token != null && !token.isBlank()) {
            jdbc.update("UPDATE auth_tokens SET revocato_il = NOW() WHERE token_hash = ?", hash(token));
        }
    }

    private String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to hash auth token", ex);
        }
    }
}
