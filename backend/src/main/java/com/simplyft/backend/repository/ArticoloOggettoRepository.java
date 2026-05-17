package com.simplyft.backend.repository;

import com.simplyft.backend.domain.ArticoloOggetto;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ArticoloOggettoRepository extends JpaRepository<ArticoloOggetto, Long> {
    @Override
    @EntityGraph(attributePaths = {"categoriaL2", "categoriaL2.categoriaL1"})
    List<ArticoloOggetto> findAll();
}
