package com.simplyft.backend.api;

import com.simplyft.backend.security.AuthUser;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/commerciale")
public class AssegnazioniController {
    private final JdbcTemplate jdbc;

    public AssegnazioniController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/tecnici")
    public List<Map<String, Object>> technicians(@AuthenticationPrincipal AuthUser user) {
        requireCommercial(user);
        return jdbc.query("""
            SELECT id, nome, email, titolo FROM utenti WHERE ruolo = 'tecnico' AND attivo = TRUE ORDER BY nome
            """, (rs, rowNum) -> dto(
                "id", String.valueOf(rs.getLong("id")),
                "name", rs.getString("nome"),
                "email", rs.getString("email"),
                "title", string(rs.getString("titolo"), "Tecnico")
            ));
    }

    @GetMapping("/clienti")
    public List<Map<String, Object>> customers(@AuthenticationPrincipal AuthUser user) {
        requireCommercial(user);
        return jdbc.query("""
            SELECT id, ragione_sociale, citta, email FROM clienti ORDER BY ragione_sociale
            """, (rs, rowNum) -> dto(
                "id", String.valueOf(rs.getLong("id")),
                "name", rs.getString("ragione_sociale"),
                "city", string(rs.getString("citta"), "-"),
                "email", string(rs.getString("email"), "-")
            ));
    }

    @PostMapping("/clienti")
    public Map<String, Object> createCustomer(@RequestBody Map<String, Object> payload, @AuthenticationPrincipal AuthUser user) {
        requireCommercial(user);
        Integer nextCode = jdbc.queryForObject("SELECT COALESCE(MAX(codice_cliente), 300) + 1 FROM clienti", Integer.class);
        Long id = jdbc.queryForObject("""
            INSERT INTO clienti (codice_cliente, ragione_sociale, citta, email, telefono)
            VALUES (?, ?, ?, ?, ?)
            RETURNING id
            """, Long.class,
            nextCode,
            string(payload.get("name"), "Nuovo cliente"),
            string(payload.get("city"), null),
            string(payload.get("email"), null),
            string(payload.get("phone"), null)
        );
        return customerDto(id);
    }

    @PatchMapping("/clienti/{id}")
    public Map<String, Object> updateCustomer(@PathVariable Long id, @RequestBody Map<String, Object> payload, @AuthenticationPrincipal AuthUser user) {
        requireCommercial(user);
        int updated = jdbc.update("""
            UPDATE clienti SET ragione_sociale = ?, citta = ?, email = ?, telefono = ? WHERE id = ?
            """,
            string(payload.get("name"), "Cliente"),
            string(payload.get("city"), null),
            string(payload.get("email"), null),
            string(payload.get("phone"), null),
            id
        );
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente non trovato");
        }
        return customerDto(id);
    }

    @DeleteMapping("/clienti/{id}")
    public void deleteCustomer(@PathVariable Long id, @AuthenticationPrincipal AuthUser user) {
        requireCommercial(user);
        jdbc.update("DELETE FROM clienti WHERE id = ?", id);
    }

    @GetMapping("/impianti")
    public List<Map<String, Object>> plants(@RequestParam(required = false) Long customerId, @AuthenticationPrincipal AuthUser user) {
        requireCommercial(user);
        if (customerId != null) {
            return plantRows("WHERE i.cliente_id = ?", customerId);
        }
        return plantRows("", new Object[] {});
    }

    @PostMapping("/impianti")
    public Map<String, Object> createPlant(@RequestBody Map<String, Object> payload, @AuthenticationPrincipal AuthUser user) {
        requireCommercial(user);
        Long customerId = parseLong(payload.get("customerId"), "Cliente obbligatorio");
        Integer nextCode = jdbc.queryForObject("SELECT COALESCE(MAX(codice_impianto), 1000) + 1 FROM impianti", Integer.class);
        Long id = jdbc.queryForObject("""
            INSERT INTO impianti (cliente_id, codice_impianto, matricola, indirizzo_installazione, citta, tipologia, stato, completezza)
            VALUES (?, ?, ?, ?, ?, ?, 'incomplete', 0)
            RETURNING id
            """, Long.class,
            customerId,
            nextCode,
            string(payload.get("serial"), "MAT-" + nextCode),
            string(payload.get("address"), null),
            string(payload.get("city"), null),
            string(payload.get("type"), null)
        );
        return plantDto(id);
    }

    @PatchMapping("/impianti/{id}")
    public Map<String, Object> updatePlant(@PathVariable Long id, @RequestBody Map<String, Object> payload, @AuthenticationPrincipal AuthUser user) {
        requireCommercial(user);
        int updated = jdbc.update("""
            UPDATE impianti SET indirizzo_installazione = ?, citta = ?, matricola = ?, tipologia = ? WHERE id = ?
            """,
            string(payload.get("address"), null),
            string(payload.get("city"), null),
            string(payload.get("serial"), null),
            string(payload.get("type"), null),
            id
        );
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Impianto non trovato");
        }
        return plantDto(id);
    }

    @DeleteMapping("/impianti/{id}")
    public void deletePlant(@PathVariable Long id, @AuthenticationPrincipal AuthUser user) {
        requireCommercial(user);
        jdbc.update("DELETE FROM impianti WHERE id = ?", id);
    }

    @GetMapping("/assegnazioni")
    public List<Map<String, Object>> assignments(@AuthenticationPrincipal AuthUser user) {
        requireCommercial(user);
        return jdbc.query("""
            SELECT a.*, u.nome AS tecnico_nome, c.ragione_sociale, i.codice_impianto, i.indirizzo_installazione, i.citta
            FROM attivita_tecnico a
            LEFT JOIN utenti u ON u.id = a.tecnico_id
            LEFT JOIN impianti i ON i.id = a.impianto_id
            LEFT JOIN clienti c ON c.id = i.cliente_id
            ORDER BY a.created_at DESC, a.id DESC
            """, (rs, rowNum) -> assignmentDto(rs));
    }

    @PostMapping("/assegnazioni")
    public Map<String, Object> createAssignment(@RequestBody Map<String, Object> payload, @AuthenticationPrincipal AuthUser user) {
        AuthUser commercial = requireCommercial(user);
        Long technicianId = parseLong(payload.get("technicianId"), "Tecnico obbligatorio");
        Long plantId = parseLong(payload.get("plantId"), "Impianto obbligatorio");
        Map<String, Object> technician = jdbc.query("""
            SELECT nome FROM utenti WHERE id = ? AND ruolo = 'tecnico' AND attivo = TRUE
            """, (rs, rowNum) -> dto("name", rs.getString("nome")), technicianId).stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tecnico non valido"));
        Integer plantCount = jdbc.queryForObject("SELECT COUNT(*) FROM impianti WHERE id = ?", Integer.class, plantId);
        if (plantCount == null || plantCount == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Impianto non valido");
        }
        String code = "ACT-" + System.currentTimeMillis();
        Long id = jdbc.queryForObject("""
            INSERT INTO attivita_tecnico (
                codice, titolo, descrizione, luogo, impianto_id, tipo, stato, priorita, assegnata_a,
                tecnico_id, scadenza, created_by_commercial_id
            )
            SELECT ?, ?, ?, COALESCE(i.indirizzo_installazione, '-'), i.id, 'assignment', ?, ?, ?, ?, CAST(NULLIF(?, '') AS DATE), ?
            FROM impianti i
            WHERE i.id = ?
            RETURNING id
            """, Long.class,
            code,
            string(payload.get("title"), "Attivita assegnata"),
            string(payload.get("description"), null),
            string(payload.get("status"), "assegnata"),
            string(payload.get("priority"), "Media"),
            technician.get("name"),
            technicianId,
            string(payload.get("dueDate"), ""),
            commercial.id(),
            plantId
        );
        return jdbc.query("""
            SELECT a.*, u.nome AS tecnico_nome, c.ragione_sociale, i.codice_impianto, i.indirizzo_installazione, i.citta
            FROM attivita_tecnico a
            LEFT JOIN utenti u ON u.id = a.tecnico_id
            LEFT JOIN impianti i ON i.id = a.impianto_id
            LEFT JOIN clienti c ON c.id = i.cliente_id
            WHERE a.id = ?
            """, (rs, rowNum) -> assignmentDto(rs), id).stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Assegnazione non creata"));
    }

    private List<Map<String, Object>> plantRows(String where, Object... args) {
        return jdbc.query("""
            SELECT i.id, i.cliente_id, c.ragione_sociale, i.codice_impianto, i.indirizzo_installazione, i.citta, i.tipologia
            FROM impianti i
            LEFT JOIN clienti c ON c.id = i.cliente_id
            """ + where + " ORDER BY c.ragione_sociale, i.codice_impianto", (rs, rowNum) -> dto(
                "id", String.valueOf(rs.getLong("id")),
                "customerId", String.valueOf(rs.getLong("cliente_id")),
                "customerName", rs.getString("ragione_sociale"),
                "code", String.valueOf(rs.getInt("codice_impianto")),
                "address", joinAddress(rs.getString("indirizzo_installazione"), rs.getString("citta")),
                "type", string(rs.getString("tipologia"), "-")
            ), args);
    }

    private Map<String, Object> customerDto(Long id) {
        return jdbc.query("""
            SELECT id, ragione_sociale, citta, email FROM clienti WHERE id = ?
            """, (rs, rowNum) -> dto(
                "id", String.valueOf(rs.getLong("id")),
                "name", rs.getString("ragione_sociale"),
                "city", string(rs.getString("citta"), "-"),
                "email", string(rs.getString("email"), "-")
            ), id).stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente non trovato"));
    }

    private Map<String, Object> plantDto(Long id) {
        return jdbc.query("""
            SELECT i.id, i.cliente_id, c.ragione_sociale, i.codice_impianto, i.indirizzo_installazione, i.citta, i.tipologia
            FROM impianti i
            LEFT JOIN clienti c ON c.id = i.cliente_id
            WHERE i.id = ?
            """, (rs, rowNum) -> dto(
                "id", String.valueOf(rs.getLong("id")),
                "customerId", String.valueOf(rs.getLong("cliente_id")),
                "customerName", rs.getString("ragione_sociale"),
                "code", String.valueOf(rs.getInt("codice_impianto")),
                "address", joinAddress(rs.getString("indirizzo_installazione"), rs.getString("citta")),
                "type", string(rs.getString("tipologia"), "-")
            ), id).stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Impianto non trovato"));
    }

    private Map<String, Object> assignmentDto(java.sql.ResultSet rs) throws java.sql.SQLException {
        return dto(
            "id", "act-" + rs.getLong("id"),
            "code", rs.getString("codice"),
            "technicianId", String.valueOf(rs.getLong("tecnico_id")),
            "technicianName", string(rs.getString("tecnico_nome"), rs.getString("assegnata_a")),
            "plantId", "p-" + rs.getLong("impianto_id"),
            "customerName", string(rs.getString("ragione_sociale"), "-"),
            "plantCode", String.valueOf(rs.getInt("codice_impianto")),
            "address", joinAddress(rs.getString("indirizzo_installazione"), rs.getString("citta")),
            "title", rs.getString("titolo"),
            "description", string(rs.getString("descrizione"), ""),
            "priority", rs.getString("priorita"),
            "status", rs.getString("stato"),
            "dueDate", rs.getObject("scadenza") == null ? null : String.valueOf(rs.getObject("scadenza")),
            "createdAt", rs.getObject("created_at", OffsetDateTime.class)
        );
    }

    private AuthUser requireCommercial(AuthUser user) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Autenticazione richiesta");
        }
        if (!"commerciale".equals(user.role()) && !"amministratore".equals(user.role())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accesso riservato al commerciale");
        }
        return user;
    }

    private Long parseLong(Object value, String message) {
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }

    private String joinAddress(String address, String city) {
        return city == null || city.isBlank() ? string(address, "-") : string(address, "-") + ", " + city;
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
