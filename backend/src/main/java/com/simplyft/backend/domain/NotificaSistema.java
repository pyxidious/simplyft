package com.simplyft.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "notifiche_sistema")
public class NotificaSistema {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String titolo;
    private String messaggio;
    private String tipo;

    @Column(name = "creata_il")
    private OffsetDateTime creataIl;

    public Long getId() { return id; }
    public String getTitolo() { return titolo; }
    public String getMessaggio() { return messaggio; }
    public String getTipo() { return tipo; }
    public OffsetDateTime getCreataIl() { return creataIl; }
}
