package com.simplyft.backend.api;

import com.simplyft.backend.security.AuthUser;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/tecnico/integrazioni")
public class IntegrazioniController {
    private final JdbcTemplate jdbc;

    public IntegrazioniController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<Map<String, Object>> list(@AuthenticationPrincipal AuthUser user) {
        AuthUser tecnico = requireTechnician(user);
        return jdbc.query("""
            SELECT ri.*, p.numero_foglio, c.ragione_sociale, i.codice_impianto
            FROM richieste_integrazione ri
            JOIN preventivi_header p ON p.id = ri.preventivo_id
            JOIN rilievi r ON r.id = ri.rilievo_id
            LEFT JOIN clienti c ON c.id = r.cliente_id
            LEFT JOIN impianti i ON i.id = r.impianto_id
            WHERE ri.tecnico_id = ?
            ORDER BY ri.creata_il DESC, ri.id DESC
            """, (rs, rowNum) -> dtoFromRow(rs), tecnico.id());
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable String id, @AuthenticationPrincipal AuthUser user) {
        AuthUser tecnico = requireTechnician(user);
        Long requestId = parseIntegrationId(id);
        Map<String, Object> request = jdbc.query("""
            SELECT ri.*, p.numero_foglio, c.ragione_sociale, i.codice_impianto
            FROM richieste_integrazione ri
            JOIN preventivi_header p ON p.id = ri.preventivo_id
            JOIN rilievi r ON r.id = ri.rilievo_id
            LEFT JOIN clienti c ON c.id = r.cliente_id
            LEFT JOIN impianti i ON i.id = r.impianto_id
            WHERE ri.id = ? AND ri.tecnico_id = ?
            """, (rs, rowNum) -> dtoFromRow(rs), requestId, tecnico.id()).stream().findFirst().orElse(null);
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Richiesta non trovata");
        }
        return request;
    }

    private Map<String, Object> dtoFromRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return dto(
            "id", "int-" + rs.getLong("id"),
            "quoteId", "q-" + rs.getLong("preventivo_id"),
            "quoteTitle", "Preventivo " + rs.getString("numero_foglio"),
            "inspectionId", "insp-" + rs.getLong("rilievo_id"),
            "customerName", string(rs.getString("ragione_sociale"), "Cliente non disponibile"),
            "plantCode", string(rs.getString("codice_impianto"), "-"),
            "reason", rs.getString("motivo"),
            "notes", string(rs.getString("note"), ""),
            "fields", string(rs.getString("campi_da_correggere"), ""),
            "status", rs.getString("stato"),
            "createdAt", rs.getObject("creata_il", OffsetDateTime.class)
        );
    }

    private AuthUser requireTechnician(AuthUser user) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Autenticazione richiesta");
        }
        if (!"tecnico".equals(user.role())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accesso riservato ai tecnici");
        }
        return user;
    }

    private Long parseIntegrationId(String value) {
        String text = value.startsWith("int-") ? value.substring(4) : value;
        try {
            return Long.parseLong(text);
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificativo richiesta non valido");
        }
    }

    private String string(Object value, String fallback) {
        if (value == null || String.valueOf(value).isBlank()) {
            return fallback;
        }
        return String.valueOf(value);
    }

    private Map<String, Object> dto(Object... entries) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (int i = 0; i < entries.length; i += 2) {
            result.put((String) entries[i], entries[i + 1]);
        }
        return result;
    }
}
