package com.simplyft.backend.api;

import com.simplyft.backend.security.AuthUser;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/commerciale")
public class CommercialeRilieviController {
    private final JdbcTemplate jdbc;

    public CommercialeRilieviController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/rilievi-da-preventivare")
    public List<Map<String, Object>> toQuote(@AuthenticationPrincipal AuthUser user) {
        requireCommercial(user);
        return jdbc.query("""
            SELECT r.id, r.stato, r.tecnico_nome, r.aggiornato_il, c.ragione_sociale, i.codice_impianto
            FROM rilievi r
            LEFT JOIN clienti c ON c.id = r.cliente_id
            LEFT JOIN impianti i ON i.id = r.impianto_id
            WHERE r.stato <> 'DRAFT'
              AND NOT EXISTS (SELECT 1 FROM preventivi_header p WHERE p.rilievo_id = r.id)
            ORDER BY r.aggiornato_il DESC, r.id DESC
            """, (rs, rowNum) -> dto(
                "inspectionId", "insp-" + rs.getLong("id"),
                "customerName", string(rs.getString("ragione_sociale"), "Cliente non disponibile"),
                "plantCode", string(rs.getString("codice_impianto"), "-"),
                "technicianName", rs.getString("tecnico_nome"),
                "status", rs.getString("stato"),
                "updatedAt", rs.getObject("aggiornato_il", OffsetDateTime.class)
            ));
    }

    @PostMapping("/rilievi/{id}/preventivo")
    public Map<String, Object> createQuote(@PathVariable String id, @AuthenticationPrincipal AuthUser user) {
        AuthUser commercial = requireCommercial(user);
        Long inspectionId = parseInspectionId(id);
        Long existing = jdbc.query("""
            SELECT id FROM preventivi_header WHERE rilievo_id = ? ORDER BY aggiornato_il DESC, id DESC LIMIT 1
            """, (rs, rowNum) -> rs.getLong("id"), inspectionId).stream().findFirst().orElse(null);
        if (existing != null) {
            return dto("id", "q-" + existing);
        }
        Map<String, Object> inspection = jdbc.query("""
            SELECT id, cliente_id, impianto_id, stato
            FROM rilievi
            WHERE id = ? AND stato <> 'DRAFT'
            """, (rs, rowNum) -> dto(
                "customerId", rs.getLong("cliente_id"),
                "plantId", rs.getLong("impianto_id"),
                "status", rs.getString("stato")
            ), inspectionId).stream().findFirst().orElse(null);
        if (inspection == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Rilievo non trovato o non preventivabile");
        }
        BigDecimal laborTotal = jdbc.queryForObject("""
            SELECT COALESCE(SUM(ore_manodopera * 69), 0) FROM rilievi_righe WHERE rilievo_id = ?
            """, BigDecimal.class, inspectionId);
        BigDecimal materialTotal = jdbc.queryForObject("""
            SELECT COALESCE(SUM(costo_materiale), 0) FROM rilievi_righe WHERE rilievo_id = ?
            """, BigDecimal.class, inspectionId);
        BigDecimal finalTotal = safe(laborTotal).add(safe(materialTotal));
        Long quoteId = jdbc.queryForObject("""
            INSERT INTO preventivi_header (
                numero_foglio, data_creazione, cliente_id, impianto_id, rilievo_id, stato, priorita, assegnatario,
                validazione_tecnica, totale_manodopera, totale_materiale, totale_offerta, aggiornato_il
            ) VALUES (?, ?, ?, ?, ?, 'DRAFT', 'Media', ?, 'Da verificare', ?, ?, ?, NOW())
            RETURNING id
            """, Long.class,
            "RIL-" + inspectionId,
            LocalDate.now(),
            inspection.get("customerId"),
            inspection.get("plantId"),
            inspectionId,
            commercial.name(),
            safe(laborTotal),
            safe(materialTotal),
            finalTotal
        );
        jdbc.update("""
            INSERT INTO preventivi_righe (
                preventivo_id, articolo_id, quantita, ore_manodopera_effettive, costo_orario_manodopera,
                totale_manodopera_riga, prezzo_materiale_unitario, sconto_percentuale, totale_materiale_riga,
                nota_vocale_trascritta, riassunto_ai_riga, posizione_vano
            )
            SELECT ?, articolo_id, 1, ore_manodopera, 69, ore_manodopera * 69, costo_materiale, 0, costo_materiale,
                   trascrizione, descrizione_formalizzata, categoria_nome
            FROM rilievi_righe
            WHERE rilievo_id = ?
            ON CONFLICT DO NOTHING
            """, quoteId, inspectionId);
        return dto("id", "q-" + quoteId);
    }

    @PatchMapping("/rilievi/{id}/tecnico")
    public Map<String, Object> updateTechnician(
        @PathVariable String id,
        @RequestBody Map<String, Object> payload,
        @AuthenticationPrincipal AuthUser user
    ) {
        requireCommercial(user);
        Long inspectionId = parseInspectionId(id);
        Long technicianId = parseLong(payload.get("technicianId"), "Tecnico obbligatorio");
        Map<String, Object> technician = jdbc.query("""
            SELECT id, nome
            FROM utenti
            WHERE id = ? AND ruolo = 'tecnico' AND attivo = TRUE
            """, (rs, rowNum) -> dto(
                "id", rs.getLong("id"),
                "name", rs.getString("nome")
            ), technicianId).stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tecnico non valido"));

        int updated = jdbc.update("""
            UPDATE rilievi
            SET tecnico_id = ?, tecnico_nome = ?, aggiornato_il = NOW()
            WHERE id = ? AND stato <> 'DRAFT'
            """,
            technician.get("id"),
            technician.get("name"),
            inspectionId
        );
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Rilievo non trovato");
        }

        jdbc.update("""
            UPDATE richieste_integrazione
            SET tecnico_id = ?
            WHERE rilievo_id = ? AND stato = 'OPEN'
            """, technician.get("id"), inspectionId);

        return dto(
            "inspectionId", "insp-" + inspectionId,
            "technicianId", String.valueOf(technician.get("id")),
            "technicianName", technician.get("name")
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

    private Long parseInspectionId(String value) {
        String text = value.startsWith("insp-") ? value.substring(5) : value;
        try {
            return Long.parseLong(text);
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificativo rilievo non valido");
        }
    }

    private Long parseLong(Object value, String message) {
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }

    private BigDecimal safe(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
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
