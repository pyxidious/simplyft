package com.simplyft.backend.api;

import com.simplyft.backend.security.AuthUser;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/commerciale/preventivi")
public class PreventiviController {
    private static final DateTimeFormatter DATE_TIME_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private final JdbcTemplate jdbc;

    public PreventiviController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<Map<String, Object>> list(@AuthenticationPrincipal AuthUser user) {
        requireCommercial(user);
        return jdbc.query("""
            SELECT r.id AS rilievo_id, r.stato AS rilievo_stato, r.tecnico_id, r.tecnico_nome, r.aggiornato_il AS rilievo_aggiornato_il,
                   p.id AS preventivo_id, p.numero_foglio, p.stato AS preventivo_stato, p.priorita, p.assegnatario,
                   p.validazione_tecnica, p.totale_offerta, p.aggiornato_il AS preventivo_aggiornato_il,
                   c.ragione_sociale, i.codice_impianto
            FROM rilievi r
            LEFT JOIN LATERAL (
                SELECT *
                FROM preventivi_header ph
                WHERE ph.rilievo_id = r.id
                ORDER BY ph.aggiornato_il DESC, ph.id DESC
                LIMIT 1
            ) p ON TRUE
            LEFT JOIN clienti c ON c.id = r.cliente_id
            LEFT JOIN impianti i ON i.id = r.impianto_id
            WHERE r.stato <> 'DRAFT'
            ORDER BY r.aggiornato_il DESC, r.id DESC
            """, (rs, rowNum) -> dto(
                "id", rs.getObject("preventivo_id") == null ? "insp-" + rs.getLong("rilievo_id") : "q-" + rs.getLong("preventivo_id"),
                "quoteId", rs.getObject("preventivo_id") == null ? null : "q-" + rs.getLong("preventivo_id"),
                "inspectionId", "insp-" + rs.getLong("rilievo_id"),
                "hasQuote", rs.getObject("preventivo_id") != null,
                "sheetNumber", rs.getString("numero_foglio"),
                "title", rs.getObject("preventivo_id") == null ? "Da preventivare" : "Preventivo " + rs.getString("numero_foglio"),
                "customer", string(rs.getString("ragione_sociale"), "Cliente non disponibile"),
                "plantCode", string(rs.getString("codice_impianto"), "-"),
                "status", rs.getObject("preventivo_id") == null ? "DRAFT" : quoteStatus(rs.getString("preventivo_stato")),
                "inspectionStatus", rs.getString("rilievo_stato"),
                "technicianId", rs.getObject("tecnico_id") == null ? "" : String.valueOf(rs.getLong("tecnico_id")),
                "technicianName", rs.getString("tecnico_nome"),
                "priority", string(rs.getString("priorita"), "Media"),
                "assignee", string(rs.getString("assegnatario"), rs.getString("tecnico_nome")),
                "technicalValidation", string(rs.getString("validazione_tecnica"), "Da verificare"),
                "estimatedValue", rs.getObject("preventivo_id") == null ? null : rs.getBigDecimal("totale_offerta"),
                "lastUpdated", formatDateTime(rs.getObject("rilievo_aggiornato_il", OffsetDateTime.class))
            ));
    }

    @GetMapping("/{id}")
    public Map<String, Object> detail(@PathVariable String id, @AuthenticationPrincipal AuthUser user) {
        requireCommercial(user);
        Long quoteId = parseQuoteId(id);
        Map<String, Object> header = jdbc.query("""
            SELECT p.*, c.ragione_sociale, c.email, c.telefono, c.citta AS cliente_citta,
                   i.codice_impianto, i.matricola, i.indirizzo_installazione, i.citta AS impianto_citta, i.tipologia
            FROM preventivi_header p
            LEFT JOIN clienti c ON c.id = p.cliente_id
            LEFT JOIN impianti i ON i.id = p.impianto_id
            WHERE p.id = ?
            """, (rs, rowNum) -> dto(
                "id", "q-" + rs.getLong("id"),
                "sheetNumber", rs.getString("numero_foglio"),
                "title", "Preventivo " + rs.getString("numero_foglio"),
                "customer", string(rs.getString("ragione_sociale"), "Cliente non disponibile"),
                "plantCode", string(rs.getString("codice_impianto"), "-"),
                "status", quoteStatus(rs.getString("stato")),
                "priority", string(rs.getString("priorita"), "Media"),
                "assignee", string(rs.getString("assegnatario"), "-"),
                "technicalValidation", string(rs.getString("validazione_tecnica"), "Da verificare"),
                "estimatedValue", rs.getBigDecimal("totale_offerta"),
                "lastUpdated", formatDateTime(rs.getObject("aggiornato_il", OffsetDateTime.class)),
                "customerDetail", dto(
                    "name", string(rs.getString("ragione_sociale"), "Cliente non disponibile"),
                    "email", string(rs.getString("email"), "-"),
                    "phone", string(rs.getString("telefono"), "-"),
                    "city", string(rs.getString("cliente_citta"), "-")
                ),
                "plant", dto(
                    "code", string(rs.getString("codice_impianto"), "-"),
                    "serial", string(rs.getString("matricola"), "-"),
                    "address", joinAddress(rs.getString("indirizzo_installazione"), rs.getString("impianto_citta")),
                    "type", string(rs.getString("tipologia"), "-")
                ),
                "totals", dto(
                    "labor", rs.getBigDecimal("totale_manodopera"),
                    "material", rs.getBigDecimal("totale_materiale"),
                    "finalPrice", rs.getBigDecimal("totale_offerta"),
                    "margin", BigDecimal.ZERO
                ),
                "internalComments", rs.getString("note_interne") == null ? List.of() : List.of(rs.getString("note_interne"))
            ), quoteId).stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Preventivo non trovato"));
        header.put("items", rows(quoteId));
        header.put("inspection", linkedInspection(quoteId));
        header.put("activities", activities(quoteId));
        return header;
    }

    @PostMapping("/{id}/richiedi-integrazione")
    public Map<String, Object> requestIntegration(
        @PathVariable String id,
        @RequestBody Map<String, Object> payload,
        @AuthenticationPrincipal AuthUser user
    ) {
        AuthUser commercial = requireCommercial(user);
        Long quoteId = parseQuoteId(id);
        requireEditableQuote(quoteId);
        Long inspectionId = linkedInspectionId(quoteId);
        if (inspectionId == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Nessun rilievo reale collegato al preventivo");
        }
        Map<String, Object> owner = jdbc.query("""
            SELECT tecnico_id FROM rilievi WHERE id = ?
            """, (rs, rowNum) -> dto("technicianId", rs.getLong("tecnico_id")), inspectionId).stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rilievo non trovato"));
        String reason = string(payload.get("reason"), "");
        if (reason.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Motivo richiesta obbligatorio");
        }
        Long requestId = jdbc.queryForObject("""
            INSERT INTO richieste_integrazione (
                preventivo_id, rilievo_id, tecnico_id, richiesta_da, motivo, note, campi_da_correggere, stato
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN')
            RETURNING id
            """, Long.class,
            quoteId,
            inspectionId,
            owner.get("technicianId"),
            commercial.id(),
            reason,
            string(payload.get("notes"), null),
            string(payload.get("fields"), null)
        );
        jdbc.update("UPDATE rilievi SET stato = 'NEEDS_INTEGRATION', aggiornato_il = NOW() WHERE id = ?", inspectionId);
        jdbc.update("UPDATE preventivi_header SET stato = 'NEEDS_INTEGRATION', rilievo_id = COALESCE(rilievo_id, ?), aggiornato_il = NOW() WHERE id = ?", inspectionId, quoteId);
        return integrationDto(requestId);
    }

    @PostMapping("/{id}/confirm")
    public Map<String, Object> confirm(@PathVariable String id, @AuthenticationPrincipal AuthUser user) {
        requireCommercial(user);
        Long quoteId = parseQuoteId(id);
        int updated = jdbc.update("""
            UPDATE preventivi_header
            SET stato = 'CONFIRMED', validazione_tecnica = 'Validato', aggiornato_il = NOW()
            WHERE id = ?
            """, quoteId);
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Preventivo non trovato");
        }
        return detail(id, user);
    }

    @PatchMapping("/{id}/cliente")
    public Map<String, Object> updateCustomer(
        @PathVariable String id,
        @RequestBody Map<String, Object> payload,
        @AuthenticationPrincipal AuthUser user
    ) {
        requireCommercial(user);
        Long quoteId = parseQuoteId(id);
        requireEditableQuote(quoteId);
        Long customerId = jdbc.queryForObject("SELECT cliente_id FROM preventivi_header WHERE id = ?", Long.class, quoteId);
        if (customerId == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente non collegato");
        }
        jdbc.update("""
            UPDATE clienti
            SET ragione_sociale = ?, email = ?, telefono = ?, citta = ?
            WHERE id = ?
            """,
            string(payload.get("name"), "Cliente"),
            string(payload.get("email"), null),
            string(payload.get("phone"), null),
            string(payload.get("city"), null),
            customerId
        );
        jdbc.update("UPDATE preventivi_header SET aggiornato_il = NOW() WHERE id = ?", quoteId);
        return detail(id, user);
    }

    @PatchMapping("/{id}/impianto")
    public Map<String, Object> updatePlant(
        @PathVariable String id,
        @RequestBody Map<String, Object> payload,
        @AuthenticationPrincipal AuthUser user
    ) {
        requireCommercial(user);
        Long quoteId = parseQuoteId(id);
        requireEditableQuote(quoteId);
        Long plantId = jdbc.queryForObject("SELECT impianto_id FROM preventivi_header WHERE id = ?", Long.class, quoteId);
        if (plantId == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Impianto non collegato");
        }
        jdbc.update("""
            UPDATE impianti
            SET matricola = ?, indirizzo_installazione = ?, tipologia = ?
            WHERE id = ?
            """,
            string(payload.get("serial"), null),
            string(payload.get("address"), null),
            string(payload.get("type"), null),
            plantId
        );
        jdbc.update("UPDATE preventivi_header SET aggiornato_il = NOW() WHERE id = ?", quoteId);
        return detail(id, user);
    }

    @GetMapping("/{id}/documento")
    public Map<String, Object> document(@PathVariable String id, @AuthenticationPrincipal AuthUser user) {
        requireCommercial(user);
        Long quoteId = parseQuoteId(id);
        ensureDocument(quoteId);
        return documentDto(quoteId);
    }

    @PutMapping("/{id}/documento")
    public Map<String, Object> saveDocument(
        @PathVariable String id,
        @RequestBody Map<String, Object> payload,
        @AuthenticationPrincipal AuthUser user
    ) {
        requireCommercial(user);
        Long quoteId = parseQuoteId(id);
        requireEditableQuote(quoteId);
        ensureDocument(quoteId);
        jdbc.update("""
            UPDATE preventivi_documenti
            SET premessa = ?, metodo_pagamento = ?, condizioni_chiusura = ?, note_finali = ?,
                offerta_include = ?, offerta_esclude = ?, validita_offerta = ?, tempi_consegna = ?,
                garanzia_intervento = ?, versione = ?, lingua = ?, valuta = ?, template_documento = ?,
                clausole_extra = ?, aggiornato_il = NOW()
            WHERE preventivo_id = ?
            """,
            string(payload.get("premise"), null),
            string(payload.get("paymentMethod"), null),
            string(payload.get("closingConditions"), null),
            string(payload.get("finalNotes"), null),
            string(payload.get("includes"), null),
            string(payload.get("excludes"), null),
            string(payload.get("offerValidity"), null),
            string(payload.get("deliveryTime"), null),
            string(payload.get("warranty"), null),
            string(payload.get("version"), "1.0"),
            string(payload.get("language"), "it"),
            string(payload.get("currency"), "EUR"),
            string(payload.get("template"), "Modello Preventivo Standard"),
            serializeClauses(payload.get("customClauses")),
            quoteId
        );
        return documentDto(quoteId);
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> pdf(@PathVariable String id, @AuthenticationPrincipal AuthUser user) {
        Map<String, Object> detail = detail(id, user);
        Long quoteId = parseQuoteId(id);
        ensureDocument(quoteId);
        byte[] pdf = quotePdf(detail, documentDto(quoteId));
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.attachment().filename("preventivo-" + id + ".pdf").build());
        return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
    }

    private void requireEditableQuote(Long quoteId) {
        String status = jdbc.query("""
            SELECT stato FROM preventivi_header WHERE id = ?
            """, (rs, rowNum) -> rs.getString("stato"), quoteId).stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Preventivo non trovato"));
        if ("CONFIRMED".equalsIgnoreCase(status)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Preventivo confermato non modificabile");
        }
    }

    private void ensureDocument(Long quoteId) {
        jdbc.update("""
            INSERT INTO preventivi_documenti (
                preventivo_id, premessa, metodo_pagamento, condizioni_chiusura, note_finali,
                offerta_include, offerta_esclude, validita_offerta, tempi_consegna, garanzia_intervento,
                versione, lingua, valuta, template_documento, clausole_extra
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '1.0', 'it', 'EUR', 'Modello Preventivo Standard', '')
            ON CONFLICT (preventivo_id) DO NOTHING
            """,
            quoteId,
            "A seguito del rilievo tecnico ricevuto, trasmettiamo la nostra migliore offerta per le attivita indicate.",
            "Pagamento da concordare secondo condizioni contrattuali.",
            "La chiusura dell'offerta e subordinata ad accettazione scritta del cliente.",
            "Eventuali lavorazioni non descritte saranno oggetto di separata quotazione.",
            "Materiali, manodopera e collaudo delle lavorazioni indicate.",
            "Opere edili, pratiche non espressamente citate e attivita non rilevate.",
            "Offerta valida 30 giorni dalla data documento.",
            "Tempi di consegna da confermare a ordine accettato.",
            "Garanzia secondo normativa e condizioni del produttore."
        );
    }

    private Map<String, Object> documentDto(Long quoteId) {
        return jdbc.query("""
            SELECT p.numero_foglio, p.data_creazione, d.*
            FROM preventivi_header p
            JOIN preventivi_documenti d ON d.preventivo_id = p.id
            WHERE p.id = ?
            """, (rs, rowNum) -> dto(
                "quoteId", "q-" + quoteId,
                "number", rs.getString("numero_foglio"),
                "date", rs.getObject("data_creazione") == null ? null : String.valueOf(rs.getObject("data_creazione")),
                "version", rs.getString("versione"),
                "language", rs.getString("lingua"),
                "currency", rs.getString("valuta"),
                "template", string(rs.getString("template_documento"), "Modello Preventivo Standard"),
                "premise", string(rs.getString("premessa"), ""),
                "paymentMethod", string(rs.getString("metodo_pagamento"), ""),
                "closingConditions", string(rs.getString("condizioni_chiusura"), ""),
                "finalNotes", string(rs.getString("note_finali"), ""),
                "includes", string(rs.getString("offerta_include"), ""),
                "excludes", string(rs.getString("offerta_esclude"), ""),
                "offerValidity", string(rs.getString("validita_offerta"), ""),
                "deliveryTime", string(rs.getString("tempi_consegna"), ""),
                "warranty", string(rs.getString("garanzia_intervento"), ""),
                "customClauses", parseClauses(rs.getString("clausole_extra"))
            ), quoteId).stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Documento non trovato"));
    }

    private List<Map<String, Object>> rows(Long quoteId) {
        return jdbc.query("""
            SELECT r.*, a.codice_statistico, a.descrizione_breve
            FROM preventivi_righe r
            LEFT JOIN articoli_oggetti a ON a.id = r.articolo_id
            WHERE r.preventivo_id = ?
            ORDER BY r.id
            """, (rs, rowNum) -> dto(
                "id", "row-" + rs.getLong("id"),
                "description", string(rs.getString("descrizione_breve"), "Voce preventivo"),
                "sku", string(rs.getString("codice_statistico"), "-"),
                "quantity", rs.getBigDecimal("quantita"),
                "laborHours", rs.getBigDecimal("ore_manodopera_effettive"),
                "laborTotal", rs.getBigDecimal("totale_manodopera_riga"),
                "materialUnitPrice", rs.getBigDecimal("prezzo_materiale_unitario"),
                "materialTotal", rs.getBigDecimal("totale_materiale_riga"),
                "margin", BigDecimal.ZERO,
                "technicalNote", string(rs.getString("riassunto_ai_riga"), "")
            ), quoteId);
    }

    private Map<String, Object> linkedInspection(Long quoteId) {
        Long id = linkedInspectionId(quoteId);
        if (id == null) {
            return null;
        }
        return jdbc.query("""
            SELECT r.*, c.ragione_sociale, i.codice_impianto
            FROM rilievi r
            LEFT JOIN clienti c ON c.id = r.cliente_id
            LEFT JOIN impianti i ON i.id = r.impianto_id
            WHERE r.id = ?
            """, (rs, rowNum) -> dto(
                "id", "insp-" + rs.getLong("id"),
                "customerName", string(rs.getString("ragione_sociale"), "Cliente non disponibile"),
                "plantCode", string(rs.getString("codice_impianto"), "-"),
                "status", rs.getString("stato"),
                "technicianId", String.valueOf(rs.getLong("tecnico_id")),
                "technicianName", rs.getString("tecnico_nome"),
                "submittedAt", rs.getObject("inviato_il", OffsetDateTime.class),
                "updatedAt", rs.getObject("aggiornato_il", OffsetDateTime.class)
            ), id).stream().findFirst().orElse(null);
    }

    private Long linkedInspectionId(Long quoteId) {
        return jdbc.query("""
            SELECT COALESCE(p.rilievo_id, (
                SELECT r.id FROM rilievi r
                WHERE r.cliente_id = p.cliente_id AND r.impianto_id = p.impianto_id AND r.stato <> 'DRAFT'
                ORDER BY r.aggiornato_il DESC, r.id DESC
                LIMIT 1
            )) AS rilievo_id
            FROM preventivi_header p
            WHERE p.id = ?
            """, (rs, rowNum) -> {
                Object value = rs.getObject("rilievo_id");
                return value == null ? null : rs.getLong("rilievo_id");
            }, quoteId).stream().findFirst().orElse(null);
    }

    private List<Map<String, Object>> activities(Long quoteId) {
        return jdbc.query("""
            SELECT motivo, stato, creata_il FROM richieste_integrazione WHERE preventivo_id = ? ORDER BY creata_il DESC
            """, (rs, rowNum) -> dto(
                "id", "int-act-" + rowNum,
                "actor", "Commerciale",
                "action", "Richiesta integrazione: " + rs.getString("motivo"),
                "date", formatDateTime(rs.getObject("creata_il", OffsetDateTime.class)),
                "tone", "warning"
            ), quoteId);
    }

    private Map<String, Object> integrationDto(Long id) {
        return jdbc.query("""
            SELECT ri.*, p.numero_foglio, c.ragione_sociale, i.codice_impianto
            FROM richieste_integrazione ri
            JOIN preventivi_header p ON p.id = ri.preventivo_id
            JOIN rilievi r ON r.id = ri.rilievo_id
            LEFT JOIN clienti c ON c.id = r.cliente_id
            LEFT JOIN impianti i ON i.id = r.impianto_id
            WHERE ri.id = ?
            """, (rs, rowNum) -> dto(
                "id", "int-" + rs.getLong("id"),
                "quoteId", "q-" + rs.getLong("preventivo_id"),
                "quoteTitle", "Preventivo " + rs.getString("numero_foglio"),
                "inspectionId", "insp-" + rs.getLong("rilievo_id"),
                "technicianId", String.valueOf(rs.getLong("tecnico_id")),
                "customerName", string(rs.getString("ragione_sociale"), "Cliente non disponibile"),
                "plantCode", string(rs.getString("codice_impianto"), "-"),
                "reason", rs.getString("motivo"),
                "notes", string(rs.getString("note"), ""),
                "fields", string(rs.getString("campi_da_correggere"), ""),
                "status", rs.getString("stato"),
                "createdAt", rs.getObject("creata_il", OffsetDateTime.class)
            ), id).stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Richiesta non trovata"));
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

    private Long parseQuoteId(String value) {
        String text = value.startsWith("q-") ? value.substring(2) : value;
        try {
            return Long.parseLong(text);
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificativo preventivo non valido");
        }
    }

    private String quoteStatus(String status) {
        String normalized = string(status, "DRAFT").toUpperCase();
        if ("BOZZA".equals(normalized)) {
            return "DRAFT";
        }
        return normalized;
    }

    private String joinAddress(String address, String city) {
        if (city == null || city.isBlank()) {
            return string(address, "-");
        }
        return string(address, "-") + ", " + city;
    }

    private String formatDateTime(OffsetDateTime value) {
        return value == null ? "-" : value.format(DATE_TIME_FORMAT);
    }

    private String string(Object value, String fallback) {
        if (value == null || String.valueOf(value).isBlank()) {
            return fallback;
        }
        return String.valueOf(value);
    }

    @SuppressWarnings("unchecked")
    private byte[] quotePdf(Map<String, Object> detail, Map<String, Object> document) {
        List<String> lines = new ArrayList<>();
        lines.add("Preventivo " + document.get("number") + " - versione " + document.get("version"));
        lines.add("Data: " + document.get("date") + "   Valuta: " + document.get("currency"));
        lines.add("");
        lines.add("Cliente: " + detail.get("customer"));
        Map<String, Object> plant = (Map<String, Object>) detail.get("plant");
        lines.add("Impianto: " + detail.get("plantCode") + " - " + plant.get("address"));
        lines.add("Stato: " + detail.get("status"));
        lines.add("");
        lines.addAll(section("Premessa", string(document.get("premise"), "")));
        lines.addAll(section("Componenti e lavorazioni", ""));
        for (Map<String, Object> row : (List<Map<String, Object>>) detail.get("items")) {
            lines.addAll(wrap("- " + row.get("description") + " | qta " + row.get("quantity")
                + " | manodopera " + row.get("laborTotal") + " | materiali " + row.get("materialTotal"), 92));
        }
        lines.add("");
        lines.add("Totale offerta IVA esclusa: EUR " + detail.get("estimatedValue"));
        lines.add("");
        lines.addAll(section("Offerta include", string(document.get("includes"), "")));
        lines.addAll(section("Offerta esclude", string(document.get("excludes"), "")));
        lines.addAll(section("Validita offerta", string(document.get("offerValidity"), "")));
        lines.addAll(section("Tempi consegna", string(document.get("deliveryTime"), "")));
        lines.addAll(section("Garanzia intervento", string(document.get("warranty"), "")));
        for (Map<String, Object> clause : (List<Map<String, Object>>) document.get("customClauses")) {
            lines.addAll(section(string(clause.get("title"), "Clausola"), string(clause.get("text"), "")));
        }
        lines.addAll(section("Metodo pagamento", string(document.get("paymentMethod"), "")));
        lines.addAll(section("Condizioni di chiusura", string(document.get("closingConditions"), "")));
        lines.addAll(section("Note finali", string(document.get("finalNotes"), "")));

        StringBuilder stream = new StringBuilder("BT /F1 10 Tf 50 790 Td 14 TL ");
        int lineCount = 0;
        for (String line : lines) {
            if (lineCount > 0 && lineCount % 52 == 0) {
                stream.append("ET BT /F1 10 Tf 50 790 Td 14 TL ");
            }
            stream.append("(").append(escapePdf(line)).append(") Tj T* ");
            lineCount++;
        }
        stream.append("ET");
        String[] objects = {
            "<< /Type /Catalog /Pages 2 0 R >>",
            "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
            "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
            "<< /Length " + stream.length() + " >> stream\n" + stream + "\nendstream"
        };
        StringBuilder pdf = new StringBuilder("%PDF-1.4\n");
        int[] offsets = new int[objects.length + 1];
        for (int i = 0; i < objects.length; i++) {
            offsets[i + 1] = pdf.length();
            pdf.append(i + 1).append(" 0 obj ").append(objects[i]).append(" endobj\n");
        }
        int xrefOffset = pdf.length();
        pdf.append("xref\n0 ").append(objects.length + 1).append("\n0000000000 65535 f \n");
        for (int i = 1; i < offsets.length; i++) {
            pdf.append(String.format("%010d 00000 n \n", offsets[i]));
        }
        pdf.append("trailer << /Root 1 0 R /Size ").append(objects.length + 1).append(" >>\n")
            .append("startxref\n").append(xrefOffset).append("\n%%EOF");
        return pdf.toString().getBytes(StandardCharsets.ISO_8859_1);
    }

    private List<String> section(String title, String text) {
        List<String> lines = new ArrayList<>();
        lines.add(title);
        lines.addAll(wrap(text, 92));
        lines.add("");
        return lines;
    }

    private List<String> wrap(String text, int width) {
        List<String> result = new ArrayList<>();
        String[] words = string(text, "").replace("\r", " ").replace("\n", " ").split("\\s+");
        StringBuilder line = new StringBuilder();
        for (String word : words) {
            if (word.isBlank()) {
                continue;
            }
            if (line.length() + word.length() + 1 > width) {
                result.add(line.toString());
                line.setLength(0);
            }
            if (line.length() > 0) {
                line.append(' ');
            }
            line.append(word);
        }
        if (line.length() > 0) {
            result.add(line.toString());
        }
        if (result.isEmpty()) {
            result.add("-");
        }
        return result;
    }

    private String escapePdf(String text) {
        return text.replace("€", "EUR").replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
    }

    private String serializeClauses(Object value) {
        if (!(value instanceof List<?> clauses)) {
            return "";
        }
        return clauses.stream()
            .filter(Map.class::isInstance)
            .map(Map.class::cast)
            .map(clause -> string(clause.get("title"), "Clausola").replace("|", " ") + "|" + string(clause.get("text"), "").replace("|", " "))
            .reduce((left, right) -> left + "\n" + right)
            .orElse("");
    }

    private List<Map<String, Object>> parseClauses(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return value.lines()
            .map(line -> line.split("\\|", 2))
            .map(parts -> dto("title", parts[0], "text", parts.length > 1 ? parts[1] : ""))
            .toList();
    }

    private Map<String, Object> dto(Object... entries) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (int i = 0; i < entries.length; i += 2) {
            result.put((String) entries[i], entries[i + 1]);
        }
        return result;
    }
}
