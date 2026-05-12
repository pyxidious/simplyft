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
}
