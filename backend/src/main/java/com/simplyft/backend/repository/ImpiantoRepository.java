package com.simplyft.backend.repository;

import com.simplyft.backend.domain.Impianto;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImpiantoRepository extends JpaRepository<Impianto, Long> {
    @EntityGraph(attributePaths = "cliente")
    List<Impianto> findAllByOrderByUltimoRilievoDesc();
}
