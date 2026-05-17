package com.simplyft.backend.api;

import com.simplyft.backend.security.AuthUser;
import com.simplyft.backend.security.TokenService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;

    public AuthController(JdbcTemplate jdbc, PasswordEncoder passwordEncoder, TokenService tokenService) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody LoginRequest request) {
        AuthRecord record = jdbc.query("""
                SELECT id, nome, email, password_hash, ruolo, titolo
                FROM utenti
                WHERE lower(email) = lower(?) AND attivo = TRUE
                """,
            (rs, rowNum) -> new AuthRecord(
                rs.getLong("id"),
                rs.getString("nome"),
                rs.getString("email"),
                rs.getString("password_hash"),
                rs.getString("ruolo"),
                rs.getString("titolo")
            ),
            request.email()
        ).stream().findFirst().orElseThrow(() -> unauthorized());

        if (!passwordEncoder.matches(request.password(), record.passwordHash())) {
            throw unauthorized();
        }

        AuthUser user = new AuthUser(record.id(), record.name(), record.email(), record.role(), record.title());
        return Map.of("token", tokenService.issue(record.id()), "user", userDto(user));
    }

    @GetMapping("/me")
    public Map<String, Object> me(@AuthenticationPrincipal AuthUser user) {
        if (user == null) {
            throw unauthorized();
        }
        return userDto(user);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            tokenService.revoke(header.substring(7));
        }
    }

    private Map<String, Object> userDto(AuthUser user) {
        return Map.of(
            "id", user.id().toString(),
            "name", user.name(),
            "email", user.email(),
            "role", user.role(),
            "title", user.title() == null ? "" : user.title(),
            "online", true
        );
    }

    private ResponseStatusException unauthorized() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenziali non valide");
    }

    public record LoginRequest(String email, String password) {}
    private record AuthRecord(Long id, String name, String email, String passwordHash, String role, String title) {}
}
