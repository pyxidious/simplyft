package com.simplyft.backend.repository;

import com.simplyft.backend.domain.PreventivoHeader;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PreventivoHeaderRepository extends JpaRepository<PreventivoHeader, Long> {
    @EntityGraph(attributePaths = {"cliente", "impianto"})
    List<PreventivoHeader> findAllByOrderByAggiornatoIlDesc();
}
