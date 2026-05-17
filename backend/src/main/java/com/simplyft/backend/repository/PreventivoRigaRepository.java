package com.simplyft.backend.repository;

import com.simplyft.backend.domain.PreventivoRiga;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PreventivoRigaRepository extends JpaRepository<PreventivoRiga, Long> {
    @EntityGraph(attributePaths = {"articolo", "articolo.categoriaL2", "articolo.categoriaL2.categoriaL1"})
    List<PreventivoRiga> findByPreventivoIdOrderById(Long preventivoId);
}
