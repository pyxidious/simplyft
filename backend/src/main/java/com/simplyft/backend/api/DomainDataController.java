package com.simplyft.backend.api;

import com.simplyft.backend.domain.ArticoloOggetto;
import com.simplyft.backend.domain.AttivitaTecnico;
import com.simplyft.backend.domain.Impianto;
import com.simplyft.backend.domain.NotificaSistema;
import com.simplyft.backend.domain.PreventivoHeader;
import com.simplyft.backend.domain.PreventivoRiga;
import com.simplyft.backend.repository.ArticoloOggettoRepository;
import com.simplyft.backend.repository.AttivitaTecnicoRepository;
import com.simplyft.backend.repository.ClienteRepository;
import com.simplyft.backend.repository.ImpiantoRepository;
import com.simplyft.backend.repository.NotificaSistemaRepository;
import com.simplyft.backend.repository.PreventivoHeaderRepository;
import com.simplyft.backend.repository.PreventivoRigaRepository;
import com.simplyft.backend.security.AuthUser;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class DomainDataController {
    private static final String TECHNICIAN_NAME = "Marcus V.";
    private static final DateTimeFormatter DATE_TIME_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final AttivitaTecnicoRepository attivitaTecnicoRepository;
    private final NotificaSistemaRepository notificaSistemaRepository;
    private final ClienteRepository clienteRepository;
    private final ImpiantoRepository impiantoRepository;
    private final ArticoloOggettoRepository articoloOggettoRepository;
    private final PreventivoHeaderRepository preventivoHeaderRepository;
    private final PreventivoRigaRepository preventivoRigaRepository;
    private final JdbcTemplate jdbc;

    public DomainDataController(
        AttivitaTecnicoRepository attivitaTecnicoRepository,
        NotificaSistemaRepository notificaSistemaRepository,
        ClienteRepository clienteRepository,
        ImpiantoRepository impiantoRepository,
        ArticoloOggettoRepository articoloOggettoRepository,
        PreventivoHeaderRepository preventivoHeaderRepository,
        PreventivoRigaRepository preventivoRigaRepository,
        JdbcTemplate jdbc
    ) {
        this.attivitaTecnicoRepository = attivitaTecnicoRepository;
        this.notificaSistemaRepository = notificaSistemaRepository;
        this.clienteRepository = clienteRepository;
        this.impiantoRepository = impiantoRepository;
        this.articoloOggettoRepository = articoloOggettoRepository;
        this.preventivoHeaderRepository = preventivoHeaderRepository;
        this.preventivoRigaRepository = preventivoRigaRepository;
        this.jdbc = jdbc;
    }

    @GetMapping({"/field/home", "/tecnico/home"})
    public Map<String, Object> fieldHome(@AuthenticationPrincipal AuthUser user) {
        String technicianName = user == null ? TECHNICIAN_NAME : user.name();
        List<Map<String, Object>> assignedActivities = attivitaTecnicoRepository
            .findTop5ByAssegnataAOrderByScadenzaAscIdAsc(technicianName)
            .stream()
            .map(this::toActivityDto)
            .toList();

        Map<String, Object> notification = notificaSistemaRepository.findFirstByOrderByCreataIlDescIdDesc()
            .map(this::toNotificationDto)
            .orElse(dto("title", "Nessuna notifica", "message", "Non ci sono aggiornamenti da visualizzare.", "type", "info"));

        return dto(
            "technician", Map.of("name", technicianName, "online", true),
            "stats", Map.of(
                "assigned", assignedActivities.size(),
                "pendingSync", 0,
                "catalogItems", articoloOggettoRepository.count()
            ),
            "assignedActivities", assignedActivities,
            "notification", notification
        );
    }

    @GetMapping("/commerciale/dashboard")
    public Map<String, Object> commercialDashboard(@AuthenticationPrincipal AuthUser user) {
        requireCommercial(user);
        List<Map<String, Object>> recentQuotes = jdbc.query("""
            SELECT p.id, p.numero_foglio, p.stato, p.priorita, p.assegnatario, p.validazione_tecnica,
                   p.totale_offerta, p.aggiornato_il, c.ragione_sociale, i.codice_impianto
            FROM preventivi_header p
            JOIN rilievi r ON r.id = p.rilievo_id
            LEFT JOIN clienti c ON c.id = r.cliente_id
            LEFT JOIN impianti i ON i.id = r.impianto_id
            WHERE r.stato <> 'DRAFT'
            ORDER BY p.aggiornato_il DESC, p.id DESC
            LIMIT 5
            """, (rs, rowNum) -> dto(
                "id", "q-" + rs.getLong("id"),
                "sheetNumber", rs.getString("numero_foglio"),
                "customer", string(rs.getString("ragione_sociale"), "Cliente non disponibile"),
                "plantCode", string(rs.getString("codice_impianto"), "-"),
                "status", rs.getString("stato"),
                "priority", string(rs.getString("priorita"), "Media"),
                "assignee", string(rs.getString("assegnatario"), "-"),
                "technicalValidation", string(rs.getString("validazione_tecnica"), "Da verificare"),
                "estimatedValue", rs.getBigDecimal("totale_offerta"),
                "lastUpdated", formatDateTime(rs.getObject("aggiornato_il", OffsetDateTime.class))
            ));
        List<Map<String, Object>> recentInspections = jdbc.query("""
            SELECT r.id, r.stato, r.tecnico_nome, r.aggiornato_il, c.ragione_sociale, i.codice_impianto
            FROM rilievi r
            LEFT JOIN clienti c ON c.id = r.cliente_id
            LEFT JOIN impianti i ON i.id = r.impianto_id
            WHERE r.stato <> 'DRAFT'
            ORDER BY r.aggiornato_il DESC, r.id DESC
            LIMIT 5
            """, (rs, rowNum) -> dto(
                "id", "insp-" + rs.getLong("id"),
                "customerName", string(rs.getString("ragione_sociale"), "Cliente non associato"),
                "plantCode", string(rs.getString("codice_impianto"), "-"),
                "technicianName", rs.getString("tecnico_nome"),
                "status", rs.getString("stato"),
                "updatedAt", formatDateTime(rs.getObject("aggiornato_il", OffsetDateTime.class))
            ));
        List<Map<String, Object>> recentCustomers = jdbc.query("""
            SELECT DISTINCT ON (c.id) c.id, c.ragione_sociale, c.citta, c.email, r.aggiornato_il
            FROM rilievi r
            JOIN clienti c ON c.id = r.cliente_id
            WHERE r.stato <> 'DRAFT'
            ORDER BY c.id, r.aggiornato_il DESC
            LIMIT 5
            """, (rs, rowNum) -> dto(
                "id", "c-" + rs.getLong("id"),
                "name", rs.getString("ragione_sociale"),
                "city", string(rs.getString("citta"), "-"),
                "email", string(rs.getString("email"), "-")
            ));
        List<Map<String, Object>> opportunityTrend = jdbc.query("""
            SELECT data_creazione, COALESCE(SUM(totale_offerta), 0) AS total
            FROM preventivi_header p
            JOIN rilievi r ON r.id = p.rilievo_id
            WHERE r.stato <> 'DRAFT'
            GROUP BY p.data_creazione
            ORDER BY data_creazione DESC
            LIMIT 6
            """, (rs, rowNum) -> dto(
                "label", rs.getDate("data_creazione").toLocalDate().format(DateTimeFormatter.ofPattern("dd/MM")),
                "value", rs.getBigDecimal("total")
            )).reversed();

        long openQuotes = countFor("""
            SELECT COUNT(*)
            FROM preventivi_header p
            JOIN rilievi r ON r.id = p.rilievo_id
            WHERE r.stato <> 'DRAFT'
              AND COALESCE(p.stato, '') NOT IN ('CONFIRMED', 'ACCETTATO', 'RIFIUTATO', 'CHIUSO')
            """);
        long submittedInspections = countFor("SELECT COUNT(*) FROM rilievi WHERE stato <> 'DRAFT'");
        long waitingItems = countFor("""
            SELECT COUNT(*) FROM rilievi WHERE stato IN ('SUBMITTED', 'COMMERCIAL_REVIEW', 'IN_REVIEW')
            """);
        BigDecimal pipelineValue = jdbc.queryForObject("""
            SELECT COALESCE(SUM(p.totale_offerta), 0)
            FROM preventivi_header p
            JOIN rilievi r ON r.id = p.rilievo_id
            WHERE r.stato <> 'DRAFT'
              AND COALESCE(p.stato, '') NOT IN ('CONFIRMED', 'ACCETTATO', 'RIFIUTATO', 'CHIUSO')
            """, BigDecimal.class);

        return dto(
            "kpis", List.of(
                kpi("Preventivi aperti", String.valueOf(openQuotes), "Da database", "flat"),
                kpi("Rilievi ricevuti", String.valueOf(submittedInspections), "Da verificare", "flat"),
                kpi("In attesa", String.valueOf(waitingItems), "Rilievi aperti", waitingItems > 0 ? "warn" : "flat"),
                kpi("Valore pipeline", formatEuro(pipelineValue), "Preventivi aperti", "flat")
            ),
            "recentInspections", recentInspections,
            "recentQuotes", recentQuotes,
            "recentCustomers", recentCustomers,
            "opportunityTrend", opportunityTrend
        );
    }

    @GetMapping({"/field/plants", "/tecnico/plants", "/tecnico/impianti"})
    public List<Map<String, Object>> plants(@AuthenticationPrincipal AuthUser user) {
        if (user != null && "tecnico".equals(user.role())) {
            return jdbc.query("""
                SELECT DISTINCT ON (i.id) i.*, c.ragione_sociale, a.codice AS assignment_code,
                       a.titolo AS assignment_title, a.assegnata_a, a.scadenza
                FROM impianti i
                JOIN attivita_tecnico a ON a.impianto_id = i.id
                LEFT JOIN clienti c ON c.id = i.cliente_id
                WHERE a.tecnico_id = ? OR a.assegnata_a = ?
                ORDER BY i.id, a.scadenza ASC NULLS LAST, a.id ASC
                """, (rs, rowNum) -> plantDtoFromRow(rs), user.id(), user.name());
        }
        return impiantoRepository.findAllByOrderByUltimoRilievoDesc()
            .stream()
            .map(this::toPlantDto)
            .toList();
    }

    @GetMapping({"/field/plants/{id}", "/tecnico/plants/{id}", "/tecnico/impianti/{id}"})
    public Map<String, Object> plant(@PathVariable String id, @AuthenticationPrincipal AuthUser user) {
        Long plantId = parsePrefixedId(id, "p-");
        if (user != null && "tecnico".equals(user.role())) {
            return jdbc.query("""
                SELECT DISTINCT ON (i.id) i.*, c.ragione_sociale, a.codice AS assignment_code,
                       a.titolo AS assignment_title, a.assegnata_a, a.scadenza
                FROM impianti i
                JOIN attivita_tecnico a ON a.impianto_id = i.id
                LEFT JOIN clienti c ON c.id = i.cliente_id
                WHERE i.id = ? AND (a.tecnico_id = ? OR a.assegnata_a = ?)
                ORDER BY i.id, a.scadenza ASC NULLS LAST, a.id ASC
                """, (rs, rowNum) -> plantDtoFromRow(rs), plantId, user.id(), user.name()).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Impianto non assegnato al tecnico"));
        }
        return impiantoRepository.findById(plantId)
            .map(this::toPlantDto)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Impianto non trovato"));
    }

    @GetMapping("/customers/search")
    public List<Map<String, Object>> customers() {
        return impiantoRepository.findAllByOrderByUltimoRilievoDesc()
            .stream()
            .map(this::toPlantDto)
            .toList();
    }

    @GetMapping("/customers/{id}")
    public Map<String, Object> customer(@PathVariable String id) {
        Long plantId = parsePrefixedId(id, "p-");
        Map<String, Object> plant = impiantoRepository.findById(plantId)
            .map(this::toPlantDto)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Impianto non trovato"));
        return dto(
            "id", plant.get("id"),
            "customerName", plant.get("customer"),
            "plantCode", plant.get("code"),
            "serial", plant.get("serial"),
            "address", plant.get("address"),
            "type", plant.get("type")
        );
    }

    @GetMapping("/catalog/items")
    public List<Map<String, Object>> catalogItems() {
        return articoloOggettoRepository.findAll()
            .stream()
            .sorted((left, right) -> catalogCode(left).compareTo(catalogCode(right)))
            .map(this::toCatalogItemDto)
            .toList();
    }

    @GetMapping("/catalog/categories")
    public List<String> catalogCategories() {
        return articoloOggettoRepository.findAll().stream()
            .map(item -> item.getCategoriaL2().getDescrizioneGruppo())
            .distinct()
            .sorted()
            .toList();
    }

    @PostMapping("/catalog/items")
    public Map<String, Object> createCatalogItem(@RequestBody Map<String, Object> payload) {
        Long categoryId = jdbc.queryForObject("SELECT id FROM categorie_l2 ORDER BY id LIMIT 1", Long.class);
        Integer nextCode = jdbc.queryForObject(
            "SELECT COALESCE(MAX(codice_voce), 0) + 1 FROM articoli_oggetti WHERE categoria_l2_id = ?",
            Integer.class,
            categoryId
        );
        Long id = jdbc.queryForObject("""
            INSERT INTO articoli_oggetti (categoria_l2_id, codice_voce, descrizione_breve, descrizione_estesa)
            VALUES (?, ?, ?, ?)
            RETURNING id
            """, Long.class,
            categoryId,
            nextCode,
            string(payload.get("name"), "Nuovo oggetto"),
            string(payload.get("shortDescription"), null)
        );
        ArticoloOggetto item = articoloOggettoRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Oggetto non creato"));
        return toCatalogItemDto(item);
    }

    @GetMapping("/quotes")
    public List<Map<String, Object>> quotes() {
        return preventivoHeaderRepository.findAllByOrderByAggiornatoIlDesc()
            .stream()
            .map(this::toQuoteDto)
            .toList();
    }

    @GetMapping("/quotes/{id}/rows")
    public List<Map<String, Object>> quoteRows(@PathVariable Long id) {
        return preventivoRigaRepository.findByPreventivoIdOrderById(id)
            .stream()
            .map(this::toQuoteRowDto)
            .toList();
    }

    @GetMapping("/inspections")
    public List<Map<String, Object>> inspections(@AuthenticationPrincipal AuthUser user) {
        if (user != null && "tecnico".equals(user.role())) {
            return jdbc.query("""
                SELECT r.*, c.ragione_sociale, i.codice_impianto, i.indirizzo_installazione, i.citta
                FROM rilievi r
                LEFT JOIN clienti c ON c.id = r.cliente_id
                LEFT JOIN impianti i ON i.id = r.impianto_id
                WHERE r.tecnico_id = ?
                ORDER BY r.aggiornato_il DESC, r.id DESC
                """, (rs, rowNum) -> inspectionDto(rs.getLong("id")), user.id());
        }
        return jdbc.query("""
            SELECT r.*, c.ragione_sociale, i.codice_impianto, i.indirizzo_installazione, i.citta
            FROM rilievi r
            LEFT JOIN clienti c ON c.id = r.cliente_id
            LEFT JOIN impianti i ON i.id = r.impianto_id
            WHERE r.stato <> 'DRAFT'
            ORDER BY r.aggiornato_il DESC, r.id DESC
            """, (rs, rowNum) -> inspectionDto(rs.getLong("id")));
    }

    @PostMapping({"/inspections/save-draft", "/inspections/{ignored}/save-draft"})
    public Map<String, Object> saveInspection(@RequestBody Map<String, Object> payload, @AuthenticationPrincipal AuthUser user) {
        return saveInspectionPayload(payload, false, requireTechnician(user));
    }

    @PostMapping({"/inspections/submit", "/inspections/{ignored}/submit"})
    public Map<String, Object> submitInspection(@RequestBody Map<String, Object> payload, @AuthenticationPrincipal AuthUser user) {
        return saveInspectionPayload(payload, true, requireTechnician(user));
    }

    private Map<String, Object> toActivityDto(AttivitaTecnico activity) {
        return dto(
            "code", activity.getCodice(),
            "title", activity.getTitolo(),
            "location", activity.getLuogo(),
            "type", activity.getTipo(),
            "priority", activity.getPriorita(),
            "dueDate", activity.getScadenza().toString()
        );
    }

    private Map<String, Object> toNotificationDto(NotificaSistema notification) {
        return dto(
            "title", notification.getTitolo(),
            "message", notification.getMessaggio(),
            "type", notification.getTipo()
        );
    }

    private Map<String, Object> toPlantDto(Impianto plant) {
        return dto(
            "id", "p-" + plant.getId(),
            "customer", plant.getCliente().getRagioneSociale(),
            "address", joinAddress(plant.getIndirizzoInstallazione(), plant.getCitta()),
            "code", plant.getCodiceImpianto().toString(),
            "serial", plant.getMatricola(),
            "type", plant.getTipologia(),
            "brand", plant.getMarca(),
            "model", plant.getModello(),
            "estimatedYear", plant.getAnnoStimato(),
            "notes", plant.getNoteTecnicheStruttura(),
            "completeness", plant.getCompletezza(),
            "status", plant.getStato(),
            "lastSurvey", plant.getUltimoRilievo().format(DATE_TIME_FORMAT)
        );
    }

    private Map<String, Object> plantDtoFromRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        String city = rs.getString("citta");
        String address = rs.getString("indirizzo_installazione");
        return dto(
            "id", "p-" + rs.getLong("id"),
            "customer", rs.getString("ragione_sociale"),
            "address", joinAddress(address, city),
            "code", String.valueOf(rs.getInt("codice_impianto")),
            "serial", rs.getString("matricola"),
            "type", rs.getString("tipologia"),
            "brand", rs.getString("marca"),
            "model", rs.getString("modello"),
            "estimatedYear", rs.getInt("anno_stimato"),
            "notes", rs.getString("note_tecniche_struttura"),
            "completeness", rs.getInt("completezza"),
            "status", rs.getString("stato"),
            "lastSurvey", rs.getObject("ultimo_rilievo", OffsetDateTime.class) == null
                ? "-"
                : rs.getObject("ultimo_rilievo", OffsetDateTime.class).format(DATE_TIME_FORMAT),
            "assignedTo", rs.getString("assegnata_a"),
            "assignmentCode", rs.getString("assignment_code"),
            "assignmentTitle", rs.getString("assignment_title"),
            "assignmentDueDate", rs.getObject("scadenza") == null ? null : String.valueOf(rs.getObject("scadenza"))
        );
    }

    private Map<String, Object> toCatalogItemDto(ArticoloOggetto item) {
        return dto(
            "id", item.getId(),
            "code", catalogCode(item),
            "statisticalCode", item.getCodiceStatistico(),
            "branch", item.getCategoriaL2().getCategoriaL1().getDescrizioneRamo(),
            "group", item.getCategoriaL2().getDescrizioneGruppo(),
            "shortDescription", item.getDescrizioneBreve(),
            "longDescription", item.getDescrizioneEstesa(),
            "standardLaborHours", item.getOreManodoperaStandard(),
            "listMaterialPrice", item.getPrezzoMaterialeListino(),
            "imageUrl", item.getUrlImmagine()
        );
    }

    private Map<String, Object> toQuoteDto(PreventivoHeader quote) {
        return dto(
            "id", "q-" + quote.getId(),
            "sheetNumber", quote.getNumeroFoglio(),
            "customer", quote.getCliente().getRagioneSociale(),
            "plantCode", quote.getImpianto().getCodiceImpianto().toString(),
            "status", quote.getStato(),
            "priority", quote.getPriorita(),
            "assignee", quote.getAssegnatario(),
            "technicalValidation", quote.getValidazioneTecnica(),
            "estimatedValue", quote.getTotaleOfferta(),
            "lastUpdated", quote.getAggiornatoIl().format(DATE_TIME_FORMAT)
        );
    }

    private Map<String, Object> toQuoteRowDto(PreventivoRiga row) {
        return dto(
            "id", row.getId(),
            "catalogCode", catalogCode(row.getArticolo()),
            "description", row.getArticolo().getDescrizioneBreve(),
            "quantity", row.getQuantita(),
            "laborHours", row.getOreManodoperaEffettive(),
            "laborHourlyCost", row.getCostoOrarioManodopera(),
            "laborTotal", row.getTotaleManodoperaRiga(),
            "materialUnitPrice", row.getPrezzoMaterialeUnitario(),
            "discountPercent", row.getScontoPercentuale(),
            "materialTotal", row.getTotaleMaterialeRiga(),
            "voiceTranscript", row.getNotaVocaleTrascritta(),
            "aiSummary", row.getRiassuntoAiRiga(),
            "shaftPosition", row.getPosizioneVano()
        );
    }

    private String catalogCode(ArticoloOggetto item) {
        return item.getCategoriaL2().getCategoriaL1().getCodiceRamo()
            + "." + item.getCategoriaL2().getCodiceGruppo()
            + "." + item.getCodiceVoce();
    }

    private String joinAddress(String address, String city) {
        if (city == null || city.isBlank()) {
            return address;
        }
        return address + ", " + city;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> saveInspectionPayload(Map<String, Object> payload, boolean submitted, AuthUser user) {
        String customerId = string(payload.get("customerId"), "");
        Long plantId = customerId.startsWith("p-") ? parsePrefixedId(customerId, "p-") : null;
        Long customerDbId = plantId == null ? null : jdbc.queryForObject("SELECT cliente_id FROM impianti WHERE id = ?", Long.class, plantId);
        List<Map<String, Object>> items = (List<Map<String, Object>>) payload.getOrDefault("items", List.of());
        BigDecimal totalHours = decimal(payload.get("totalLaborHours"));
        BigDecimal totalMaterial = decimal(payload.get("totalMaterialCost"));
        Long id = parseOptionalId(payload.get("id"));
        if (id != null && inspectionExists(id) && !inspectionOwnedBy(id, user.id())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Rilievo non trovato");
        }
        if (id != null && inspectionExists(id) && !"DRAFT".equals(inspectionStatus(id))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Rilievo gia inviato");
        }
        if (id != null && !inspectionExists(id)) {
            id = null;
        }
        String status = submitted ? "SUBMITTED" : "DRAFT";
        if (id == null) {
            id = jdbc.queryForObject("""
                INSERT INTO rilievi (cliente_id, impianto_id, stato, tecnico_id, tecnico_nome, totale_ore_manodopera, totale_costo_materiale, inviato_il)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING id
                """, Long.class,
                customerDbId,
                plantId,
                status,
                user.id(),
                user.name(),
                totalHours,
                totalMaterial,
                submitted ? OffsetDateTime.now() : null
            );
        } else {
            jdbc.update("""
                UPDATE rilievi
                SET cliente_id = ?, impianto_id = ?, stato = ?, tecnico_id = ?, tecnico_nome = ?,
                    totale_ore_manodopera = ?, totale_costo_materiale = ?, aggiornato_il = NOW(),
                    inviato_il = CASE WHEN ? THEN COALESCE(inviato_il, NOW()) ELSE inviato_il END
                WHERE id = ?
                """,
                customerDbId, plantId, status, user.id(),
                user.name(), totalHours, totalMaterial, submitted, id
            );
            jdbc.update("DELETE FROM rilievi_righe WHERE rilievo_id = ?", id);
        }
        for (Map<String, Object> item : items) {
            jdbc.update("""
                INSERT INTO rilievi_righe (
                    rilievo_id, articolo_id, nome_articolo, categoria_nome, ore_manodopera,
                    costo_materiale, nota_grezza, trascrizione, descrizione_tecnica_originale,
                    descrizione_formalizzata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                id,
                parseOptionalId(item.get("catalogItemId")),
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
        return inspectionDto(id);
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

    private Long parsePrefixedId(String value, String prefix) {
        if (value == null || !value.startsWith(prefix)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificativo non valido");
        }
        return Long.parseLong(value.substring(prefix.length()));
    }

    private Long parseOptionalId(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value);
        if (text.isBlank() || text.startsWith("draft-") || text.startsWith("line-")) {
            return null;
        }
        if (text.startsWith("insp-")) {
            text = text.substring(5);
        }
        if (text.startsWith("p-")) {
            text = text.substring(2);
        }
        try {
            return Long.parseLong(text);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private boolean inspectionOwnedBy(Long id, Long userId) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM rilievi WHERE id = ? AND tecnico_id = ?", Integer.class, id, userId);
        return count != null && count > 0;
    }

    private boolean inspectionExists(Long id) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM rilievi WHERE id = ?", Integer.class, id);
        return count != null && count > 0;
    }

    private String inspectionStatus(Long id) {
        return jdbc.queryForObject("SELECT stato FROM rilievi WHERE id = ?", String.class, id);
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

    private AuthUser requireCommercial(AuthUser user) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Autenticazione richiesta");
        }
        if (!"commerciale".equals(user.role()) && !"amministratore".equals(user.role())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accesso riservato al commerciale");
        }
        return user;
    }

    private long countFor(String sql) {
        Long count = jdbc.queryForObject(sql, Long.class);
        return count == null ? 0 : count;
    }

    private Map<String, Object> kpi(String label, String value, String trend, String trendTone) {
        return dto("label", label, "value", value, "trend", trend, "trendTone", trendTone);
    }

    private String formatEuro(BigDecimal value) {
        return "EUR " + (value == null ? BigDecimal.ZERO : value).setScale(0, java.math.RoundingMode.HALF_UP);
    }

    private String formatDateTime(OffsetDateTime value) {
        return value == null ? "-" : value.format(DATE_TIME_FORMAT);
    }

    private BigDecimal decimal(Object value) {
        if (value == null || String.valueOf(value).isBlank()) {
            return BigDecimal.ZERO;
        }
        return new BigDecimal(String.valueOf(value));
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
