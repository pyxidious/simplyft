package com.simplyft.backend.api;

import com.simplyft.backend.security.AuthUser;
import com.simplyft.backend.security.TokenService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

@RestController
public class AudioTranscriptionController {
    private static final Logger log = LoggerFactory.getLogger(AudioTranscriptionController.class);
    private static final long MAX_AUDIO_BYTES = 25L * 1024L * 1024L;

    private final WebClient webClient;
    private final JdbcTemplate jdbc;
    private final TokenService tokenService;

    public AudioTranscriptionController(
        WebClient.Builder webClientBuilder,
        @Value("${app.whisper-service-url}") String whisperServiceUrl,
        JdbcTemplate jdbc,
        TokenService tokenService
    ) {
        this.webClient = webClientBuilder.baseUrl(whisperServiceUrl).build();
        this.jdbc = jdbc;
        this.tokenService = tokenService;
    }

    @PostMapping(path = {"/api/audio/transcribe", "/api/transcriptions/audio"}, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Mono<Map<String, Object>> transcribe(@RequestParam("audio") MultipartFile audio, HttpServletRequest request) {
        AuthUser user = authenticatedUser(request);
        if (audio.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File audio vuoto");
        }
        if (audio.getSize() > MAX_AUDIO_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "File audio troppo grande");
        }
        String contentType = audio.getContentType() == null ? "application/octet-stream" : audio.getContentType();
        if (!contentType.startsWith("audio/")
            && !contentType.equals("video/webm")
            && !contentType.equals(MediaType.APPLICATION_OCTET_STREAM_VALUE)) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Formato audio non supportato");
        }
        try {
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            builder.part("audio", new ByteArrayResource(audio.getBytes()) {
                @Override
                public String getFilename() {
                    return audio.getOriginalFilename() == null ? "audio.webm" : audio.getOriginalFilename();
                }
            }).contentType(MediaType.parseMediaType(contentType));

            return webClient.post()
                .uri("/transcribe")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(builder.build()))
                .retrieve()
                .bodyToMono(Map.class)
                .map(response -> normalizeAndPersist(response, audio, user));
        } catch (Exception ex) {
            log.warn("Audio transcription request failed before sending to whisper-service", ex);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Errore durante upload audio");
        }
    }

    private AuthUser authenticatedUser(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token mancante");
        }
        return tokenService.findUser(header.substring(7))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token non valido o scaduto"));
    }

    private Map<String, Object> normalizeAndPersist(Map<?, ?> response, MultipartFile audio, AuthUser user) {
        Object value = response.containsKey("text") ? response.get("text") : response.get("transcription");
        String text = value == null ? "" : String.valueOf(value).trim();
        if (text.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Whisper ha restituito una trascrizione vuota");
        }
        Long transcriptionId = jdbc.queryForObject("""
            INSERT INTO trascrizioni_audio (nome_file, content_type, dimensione_byte, testo, creato_da)
            VALUES (?, ?, ?, ?, ?)
            RETURNING id
            """, Long.class,
            audio.getOriginalFilename(),
            audio.getContentType(),
            audio.getSize(),
            text,
            user == null ? null : user.id()
        );
        return Map.of("id", transcriptionId, "text", text, "transcription", text);
    }
}
