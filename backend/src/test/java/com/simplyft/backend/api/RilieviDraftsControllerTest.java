package com.simplyft.backend.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.simplyft.backend.security.AuthUser;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.web.server.ResponseStatusException;

class RilieviDraftsControllerTest {
    @SuppressWarnings("unchecked")
    @Test
    void updateRejectsNonDraftInspection() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        RilieviDraftsController controller = new RilieviDraftsController(jdbc);
        AuthUser technician = new AuthUser(1L, "Luca Bianchi", "tecnico@simplyft.local", "tecnico", "Tecnico");

        when(jdbc.query(anyString(), (RowMapper<Map<String, Object>>) org.mockito.ArgumentMatchers.any(), eq(7L)))
            .thenReturn(List.of(Map.of(
                "technicianId", 1L,
                "status", "IN_REVIEW"
            )));

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> controller.update(
            "insp-7",
            Map.of("id", "insp-7"),
            technician
        ));

        assertEquals(409, error.getStatusCode().value());
    }
}
