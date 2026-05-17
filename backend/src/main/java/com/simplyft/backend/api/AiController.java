package com.simplyft.backend.api;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@RestController
public class AiController {

    private final WebClient webClient;

    public AiController(WebClient.Builder webClientBuilder, @Value("${app.ai-service-url}") String aiServiceUrl) {
        this.webClient = webClientBuilder.baseUrl(aiServiceUrl).build();
    }

    @PostMapping(path = "/api/ai/analyze", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Map> analyze(@RequestBody Map<String, Object> payload) {
        return webClient.post()
            .uri("/analyze")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(payload)
            .retrieve()
            .bodyToMono(Map.class);
    }

    @PostMapping(path = "/api/ai/formalize-description", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> formalizeDescription(@RequestBody Map<String, Object> payload) {
        String objectName = string(payload.get("objectName"), "componente rilevato");
        String current = string(payload.get("currentDescription"), "");
        String rawNote = string(payload.get("freeTechnicalNote"), "");
        String voiceNote = string(payload.get("transcribedVoiceNote"), "");
        String source = !current.isBlank() ? current : (!rawNote.isBlank() ? rawNote : voiceNote);
        String text = source.isBlank()
            ? "Verificare " + objectName + " e predisporre offerta per materiali e manodopera indicati."
            : "Intervento su " + objectName + ": " + source.replaceAll("\\s+", " ").trim();
        return Map.of("text", text, "formalizedText", text);
    }

    @PostMapping(path = "/api/ai/formalize-transcription", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> formalizeTranscription(@RequestBody Map<String, Object> payload) {
        String transcription = string(payload.get("transcription"), "");
        String text = transcription.isBlank()
            ? ""
            : "Nota tecnica rilevata: " + transcription.replaceAll("\\s+", " ").trim();
        return Map.of("text", text, "formalizedText", text);
    }

    private String string(Object value, String fallback) {
        if (value == null || String.valueOf(value).isBlank()) {
            return fallback;
        }
        return String.valueOf(value);
    }
}
