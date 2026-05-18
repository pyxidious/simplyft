package com.simplyft.backend.api;

import com.simplyft.backend.security.AuthUser;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/tecnico/rilievi/bozze")
public class RilieviDraftsController {
    private final JdbcTemplate jdbc;

    public RilieviDraftsController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<Map<String, Object>> list(@AuthenticationPrincipal AuthUser user) {
        AuthUser tecnico = requireTechnician(user);
        return jdbc.query("""
            SELECT r.id
            FROM rilievi r
            WHERE r.stato = 'DRAFT' AND r.tecnico_id = ?
            ORDER BY r.aggiornato_il DESC, r.id DESC
            """, (rs, rowNum) -> inspectionDto(rs.getLong("id")), tecnico.id());
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable String id, @AuthenticationPrincipal AuthUser user) {
        Long draftId = parseInspectionId(id);
        requireDraftOwner(draftId, requireTechnician(user));
        return inspectionDto(draftId);
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> payload, @AuthenticationPrincipal AuthUser user) {
        return saveDraftPayload(null, payload, requireTechnician(user));
    }

    @PutMapping("/{id}")
    public Map<String, Object> update(
        @PathVariable String id,
        @RequestBody Map<String, Object> payload,
        @AuthenticationPrincipal AuthUser user
    ) {
        Long draftId = parseInspectionId(id);
        AuthUser tecnico = requireTechnician(user);
        requireMatchingPayloadId(draftId, payload);
        requireDraftOwner(draftId, tecnico);
        return saveDraftPayload(draftId, payload, tecnico);
    }

    @PostMapping("/{id}")
    public Map<String, Object> save(
        @PathVariable String id,
        @RequestBody Map<String, Object> payload,
        @AuthenticationPrincipal AuthUser user
    ) {
        return update(id, payload, user);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id, @AuthenticationPrincipal AuthUser user) {
        Long draftId = parseInspectionId(id);
        requireDraftOwner(draftId, requireTechnician(user));
        jdbc.update("DELETE FROM rilievi WHERE id = ?", draftId);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> saveDraftPayload(Long id, Map<String, Object> payload, AuthUser tecnico) {
        String customerId = string(payload.get("customerId"), "");
        Long plantId = customerId.startsWith("p-") ? parsePrefixedId(customerId, "p-") : null;
        Long customerDbId = plantId == null ? null : jdbc.queryForObject("SELECT cliente_id FROM impianti WHERE id = ?", Long.class, plantId);
        List<Map<String, Object>> items = (List<Map<String, Object>>) payload.getOrDefault("items", List.of());
        BigDecimal totalHours = decimal(payload.get("totalLaborHours"));
        BigDecimal totalMaterial = decimal(payload.get("totalMaterialCost"));

        if (id == null) {
            id = jdbc.queryForObject("""
                INSERT INTO rilievi (cliente_id, impianto_id, stato, tecnico_id, tecnico_nome, totale_ore_manodopera, totale_costo_materiale)
                VALUES (?, ?, 'DRAFT', ?, ?, ?, ?)
                RETURNING id
                """, Long.class, customerDbId, plantId, tecnico.id(), tecnico.name(), totalHours, totalMaterial);
        } else {
            jdbc.update("""
                UPDATE rilievi
                SET cliente_id = ?, impianto_id = ?, tecnico_nome = ?, totale_ore_manodopera = ?,
                    totale_costo_materiale = ?, aggiornato_il = NOW()
                WHERE id = ? AND stato = 'DRAFT' AND tecnico_id = ?
                """, customerDbId, plantId, tecnico.name(), totalHours, totalMaterial, id, tecnico.id());
            jdbc.update("DELETE FROM rilievi_righe WHERE rilievo_id = ?", id);
        }

        insertRows(id, items);
        return inspectionDto(id);
    }

    private void insertRows(Long id, List<Map<String, Object>> items) {
        for (Map<String, Object> item : items) {
            jdbc.update("""
                INSERT INTO rilievi_righe (
                    rilievo_id, articolo_id, nome_articolo, categoria_nome, ore_manodopera,
                    costo_materiale, nota_grezza, trascrizione, descrizione_tecnica_originale,
                    descrizione_formalizzata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                id,
                parseOptionalCatalogId(item.get("catalogItemId")),
                string(item.get("catalogItemName"), "Voce rilievo"),
                string(item.get("categoryName"), null),
                decimal(item.get("laborHours")),
                decimal(item.get("materialCost")),
                string(item.get("rawNote"), null),
                string(item.get("transcribedNote"), null),
                string(item.get("originalTechnicalDescription"), null),
                string(item.get("formalizedDescription"), null)
            );
        }
    }

    private void requireDraftOwner(Long id, AuthUser tecnico) {
        Map<String, Object> owner = jdbc.query("""
            SELECT tecnico_id, stato
            FROM rilievi
            WHERE id = ?
            """, (rs, rowNum) -> dto(
                "technicianId", rs.getLong("tecnico_id"),
                "status", rs.getString("stato")
            ), id).stream().findFirst().orElse(null);
        if (owner == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bozza non trovata");
        }
        if (!tecnico.id().equals(owner.get("technicianId"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bozza assegnata a un altro tecnico");
        }
        if (!"DRAFT".equals(owner.get("status"))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Rilievo gia inviato");
        }
    }

    private void requireMatchingPayloadId(Long pathId, Map<String, Object> payload) {
        Long payloadId = parseOptionalId(payload.get("id"));
        if (!pathId.equals(payloadId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificativo path/body non coerente");
        }
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

    private Map<String, Object> inspectionDto(Long id) {
        Map<String, Object> header = jdbc.queryForObject("""
            SELECT r.*, c.ragione_sociale, i.codice_impianto, i.indirizzo_installazione, i.citta
            FROM rilievi r
            LEFT JOIN clienti c ON c.id = r.cliente_id
            LEFT JOIN impianti i ON i.id = r.impianto_id
            WHERE r.id = ?
            """, (rs, rowNum) -> dto(
                "id", "insp-" + rs.getLong("id"),
                "customerId", rs.getObject("impianto_id") == null ? "" : "p-" + rs.getLong("impianto_id"),
                "customerName", rs.getString("ragione_sociale") == null ? "Cliente da selezionare" : rs.getString("ragione_sociale"),
                "plantCode", rs.getString("codice_impianto"),
                "plantAddress", joinAddress(rs.getString("indirizzo_installazione"), rs.getString("citta")),
                "status", rs.getString("stato"),
                "technicianId", String.valueOf(rs.getLong("tecnico_id")),
                "technicianName", rs.getString("tecnico_nome"),
                "totalLaborHours", rs.getBigDecimal("totale_ore_manodopera"),
                "totalMaterialCost", rs.getBigDecimal("totale_costo_materiale"),
                "createdAt", rs.getObject("creato_il", OffsetDateTime.class),
                "updatedAt", rs.getObject("aggiornato_il", OffsetDateTime.class),
                "submittedAt", rs.getObject("inviato_il", OffsetDateTime.class)
            ), id);
        List<Map<String, Object>> rows = jdbc.query("""
            SELECT * FROM rilievi_righe WHERE rilievo_id = ? ORDER BY id
            """, (rs, rowNum) -> dto(
                "id", "line-" + rs.getLong("id"),
                "catalogItemId", String.valueOf(rs.getLong("articolo_id")),
                "catalogItemName", rs.getString("nome_articolo"),
                "categoryName", rs.getString("categoria_nome"),
                "laborHours", rs.getBigDecimal("ore_manodopera"),
                "materialCost", rs.getBigDecimal("costo_materiale"),
                "rawNote", rs.getString("nota_grezza"),
                "transcribedNote", rs.getString("trascrizione"),
                "originalTechnicalDescription", rs.getString("descrizione_tecnica_originale"),
                "formalizedDescription", rs.getString("descrizione_formalizzata"),
                "photos", List.of()
            ), id);
        header.put("items", rows);
        return header;
    }

    private Long parseInspectionId(String value) {
        return parseOptionalId(value);
    }

    private Long parsePrefixedId(String value, String prefix) {
        if (value == null || !value.startsWith(prefix)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificativo non valido");
        }
        return Long.parseLong(value.substring(prefix.length()));
    }

    private Long parseOptionalId(Object value) {
        if (value == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificativo non valido");
        }
        String text = String.valueOf(value);
        if (text.startsWith("insp-")) {
            text = text.substring(5);
        }
        try {
            return Long.parseLong(text);
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificativo non valido");
        }
    }

    private Long parseOptionalCatalogId(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private BigDecimal decimal(Object value) {
        if (value == null || String.valueOf(value).isBlank()) {
            return BigDecimal.ZERO;
        }
        return new BigDecimal(String.valueOf(value));
    }

    private String joinAddress(String address, String city) {
        if (city == null || city.isBlank()) {
            return address;
        }
        return address + ", " + city;
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
