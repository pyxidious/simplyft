package com.simplyft.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;

@Entity
@Table(name = "attivita_tecnico")
public class AttivitaTecnico {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String codice;

    @Column(nullable = false)
    private String titolo;

    @Column(nullable = false)
    private String luogo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "impianto_id")
    private Impianto impianto;

    private String tipo;
    private String stato;
    private String priorita;

    @Column(name = "assegnata_a")
    private String assegnataA;

    private LocalDate scadenza;

    public Long getId() { return id; }
    public String getCodice() { return codice; }
    public String getTitolo() { return titolo; }
    public String getLuogo() { return luogo; }
    public Impianto getImpianto() { return impianto; }
    public String getTipo() { return tipo; }
    public String getStato() { return stato; }
    public String getPriorita() { return priorita; }
    public String getAssegnataA() { return assegnataA; }
    public LocalDate getScadenza() { return scadenza; }
}
