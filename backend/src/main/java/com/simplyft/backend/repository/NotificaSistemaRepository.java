package com.simplyft.backend.repository;

import com.simplyft.backend.domain.NotificaSistema;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificaSistemaRepository extends JpaRepository<NotificaSistema, Long> {
    Optional<NotificaSistema> findFirstByOrderByCreataIlDescIdDesc();
}
