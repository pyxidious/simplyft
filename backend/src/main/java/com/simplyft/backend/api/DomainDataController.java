package com.simplyft.backend.api;

import com.simplyft.backend.domain.ArticoloOggetto;
import com.simplyft.backend.domain.AttivitaTecnico;
import com.simplyft.backend.domain.Impianto;
import com.simplyft.backend.domain.NotificaSistema;
import com.simplyft.backend.domain.PreventivoHeader;
import com.simplyft.backend.domain.PreventivoRiga;
import com.simplyft.backend.repository.ArticoloOggettoRepository;
import com.simplyft.backend.repository.AttivitaTecnicoRepository;
import com.simplyft.backend.repository.ImpiantoRepository;
import com.simplyft.backend.repository.NotificaSistemaRepository;
import com.simplyft.backend.repository.PreventivoHeaderRepository;
import com.simplyft.backend.repository.PreventivoRigaRepository;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class DomainDataController {
    private static final String TECHNICIAN_NAME = "Marcus V.";
    private static final DateTimeFormatter DATE_TIME_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final AttivitaTecnicoRepository attivitaTecnicoRepository;
    private final NotificaSistemaRepository notificaSistemaRepository;
    private final ImpiantoRepository impiantoRepository;
    private final ArticoloOggettoRepository articoloOggettoRepository;
    private final PreventivoHeaderRepository preventivoHeaderRepository;
    private final PreventivoRigaRepository preventivoRigaRepository;

    public DomainDataController(
        AttivitaTecnicoRepository attivitaTecnicoRepository,
        NotificaSistemaRepository notificaSistemaRepository,
        ImpiantoRepository impiantoRepository,
        ArticoloOggettoRepository articoloOggettoRepository,
        PreventivoHeaderRepository preventivoHeaderRepository,
        PreventivoRigaRepository preventivoRigaRepository
    ) {
        this.attivitaTecnicoRepository = attivitaTecnicoRepository;
        this.notificaSistemaRepository = notificaSistemaRepository;
        this.impiantoRepository = impiantoRepository;
        this.articoloOggettoRepository = articoloOggettoRepository;
        this.preventivoHeaderRepository = preventivoHeaderRepository;
        this.preventivoRigaRepository = preventivoRigaRepository;
    }

    @GetMapping("/field/home")
    public Map<String, Object> fieldHome() {
        List<Map<String, Object>> assignedActivities = attivitaTecnicoRepository
            .findTop5ByAssegnataAOrderByScadenzaAscIdAsc(TECHNICIAN_NAME)
            .stream()
            .map(this::toActivityDto)
            .toList();

        Map<String, Object> notification = notificaSistemaRepository.findFirstByOrderByCreataIlDescIdDesc()
            .map(this::toNotificationDto)
            .orElse(dto("title", "Nessuna notifica", "message", "Non ci sono aggiornamenti da visualizzare.", "type", "info"));

        return dto(
            "technician", Map.of("name", TECHNICIAN_NAME, "online", true),
            "stats", Map.of(
                "assigned", assignedActivities.size(),
                "pendingSync", 0,
                "catalogItems", articoloOggettoRepository.count()
            ),
            "assignedActivities", assignedActivities,
            "notification", notification
        );
    }

    @GetMapping("/field/plants")
    public List<Map<String, Object>> plants() {
        return impiantoRepository.findAllByOrderByUltimoRilievoDesc()
            .stream()
            .map(this::toPlantDto)
            .toList();
    }

    @GetMapping("/catalog/items")
    public List<Map<String, Object>> catalogItems() {
        return articoloOggettoRepository.findAll()
            .stream()
            .sorted((left, right) -> catalogCode(left).compareTo(catalogCode(right)))
            .map(this::toCatalogItemDto)
            .toList();
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

    private Map<String, Object> dto(Object... entries) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (int i = 0; i < entries.length; i += 2) {
            result.put((String) entries[i], entries[i + 1]);
        }
        return result;
    }
}
