package com.simplyft.backend.repository;

import com.simplyft.backend.domain.AttivitaTecnico;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttivitaTecnicoRepository extends JpaRepository<AttivitaTecnico, Long> {
    List<AttivitaTecnico> findTop5ByAssegnataAOrderByScadenzaAscIdAsc(String assegnataA);
}
