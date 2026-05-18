package com.simplyft.backend.api;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@RestController
public class AiController {

    private static final String FORMALIZE_INSTRUCTION = "Riscrivi il testo seguente in linguaggio chiaro, professionale e adatto a commerciale/segreteria. Mantieni il significato. Non aggiungere dettagli. Max 2 frasi. Non ripetere titoli o prefissi.";
    private static final String STRICT_FORMALIZE_INSTRUCTION = FORMALIZE_INSTRUCTION + " Il risultato deve essere diverso dal testo originale: riformula davvero la frase, mantenendo solo le informazioni presenti.";

    private final WebClient webClient;
    private final ConcurrentMap<String, String> formalizationCache = new ConcurrentHashMap<>();

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
    public Mono<Map<String, Object>> formalizeDescription(@RequestBody Map<String, Object> payload) {
        String mode = string(payload.get("mode"), "GENERATE");
        String objectName = string(payload.get("objectName"), "componente rilevato");
        String originalTechnicalDescription = string(payload.get("originalTechnicalDescription"), "");
        String current = originalTechnicalDescription.isBlank()
            ? string(payload.get("currentDescription"), "")
            : originalTechnicalDescription;
        String rawNote = string(payload.get("freeTechnicalNote"), "");
        String voiceNote = string(payload.get("transcribedVoiceNote"), "");
        String textToRewrite = "FORMALIZE".equalsIgnoreCase(mode)
            ? textToRewrite(current, rawNote, voiceNote)
            : textToRewrite(
                current,
                rawNote.isBlank() ? "Verificare " + objectName + " e predisporre offerta per materiali e manodopera indicati." : rawNote,
                voiceNote
            );

        if (textToRewrite.isBlank()) {
            return Mono.just(Map.of("formalizedText", ""));
        }

        String cacheKey = formalizationCacheKey(mode, objectName, textToRewrite);
        String cached = formalizationCache.get(cacheKey);
        if (cached != null) {
            return Mono.just(Map.of("formalizedText", cached));
        }

        return requestFormalization(FORMALIZE_INSTRUCTION, textToRewrite, false)
            .flatMap(first -> {
                String cleaned = postProcessFormalizedText(first, textToRewrite, objectName);
                if (!sameText(cleaned, textToRewrite)) {
                    return Mono.just(cleaned);
                }
                return requestFormalization(STRICT_FORMALIZE_INSTRUCTION, textToRewrite, true)
                    .map(second -> postProcessFormalizedText(second, textToRewrite, objectName));
            })
            .onErrorReturn(postProcessFormalizedText(textToRewrite, textToRewrite, objectName))
            .doOnNext(text -> formalizationCache.putIfAbsent(cacheKey, text))
            .map(text -> Map.<String, Object>of("formalizedText", text));
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

    private Mono<String> requestFormalization(String instruction, String textToRewrite, boolean strict) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("instruction", instruction);
        request.put("textToRewrite", textToRewrite);
        request.put("strict", strict);
        request.put("prompt", instruction + "\n\nText to rewrite:\n" + textToRewrite);

        return webClient.post()
            .uri("/formalize-description")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(request)
            .retrieve()
            .bodyToMono(Map.class)
            .map(this::extractFormalizedText)
            .map(text -> text.isBlank() ? textToRewrite : text);
    }

    String textToRewrite(String currentDescription, String freeTechnicalNote, String transcribedVoiceNote) {
        return String.join("\n", List.of(currentDescription, freeTechnicalNote, transcribedVoiceNote).stream()
            .map(value -> value == null ? "" : value.replaceAll("\\s+", " ").trim())
            .filter(value -> !value.isBlank())
            .toList());
    }

    String postProcessFormalizedText(String modelOutput, String fallback, String objectName) {
        String cleaned = Optional.ofNullable(modelOutput).orElse("")
            .replaceAll("\\s+", " ")
            .trim();
        cleaned = collapseInterventoPrefix(cleaned, objectName);
        return cleaned.isBlank() ? fallback.replaceAll("\\s+", " ").trim() : cleaned;
    }

    String collapseInterventoPrefix(String text, String objectName) {
        String normalizedObjectName = Optional.ofNullable(objectName).orElse("").replaceAll("\\s+", " ").trim();
        if (text.isBlank() || normalizedObjectName.isBlank()) {
            return text;
        }
        Pattern prefix = Pattern.compile(
            "^Intervento\\s+su\\s+" + Pattern.quote(normalizedObjectName) + ":\\s*",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
        );
        String rest = text;
        int prefixes = 0;
        Matcher matcher = prefix.matcher(rest);
        while (matcher.find()) {
            prefixes++;
            rest = rest.substring(matcher.end()).trim();
            matcher = prefix.matcher(rest);
        }
        if (prefixes == 0) {
            return text;
        }
        return rest.isBlank()
            ? "Intervento su " + normalizedObjectName + ":"
            : "Intervento su " + normalizedObjectName + ": " + rest;
    }

    boolean sameText(String left, String right) {
        return normalizeForComparison(left).equals(normalizeForComparison(right));
    }

    private String formalizationCacheKey(String mode, String objectName, String textToRewrite) {
        return normalizeForComparison(mode)
            + "\n" + normalizeForComparison(objectName)
            + "\n" + normalizeForComparison(textToRewrite);
    }

    private String normalizeForComparison(String value) {
        return Optional.ofNullable(value).orElse("")
            .replaceAll("\\s+", " ")
            .trim()
            .toLowerCase();
    }

    private String extractFormalizedText(Map<?, ?> response) {
        for (String key : List.of("formalizedText", "text", "description")) {
            Object value = response.get(key);
            if (value != null && !String.valueOf(value).isBlank()) {
                return String.valueOf(value);
            }
        }
        return "";
    }
}
