package com.simplyft.backend.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "preventivi_header")
public class PreventivoHeader {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "numero_foglio", nullable = false, unique = true)
    private String numeroFoglio;

    @Column(name = "data_creazione", nullable = false)
    private LocalDate dataCreazione;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "impianto_id")
    private Impianto impianto;

    private String stato;
    private String priorita;
    private String assegnatario;

    @Column(name = "validazione_tecnica")
    private String validazioneTecnica;

    @Column(name = "aliquota_iva")
    private BigDecimal aliquotaIva;

    @Column(name = "totale_manodopera")
    private BigDecimal totaleManodopera;

    @Column(name = "totale_materiale")
    private BigDecimal totaleMateriale;

    @Column(name = "totale_offerta")
    private BigDecimal totaleOfferta;

    @Column(name = "note_interne")
    private String noteInterne;

    @Column(name = "aggiornato_il")
    private OffsetDateTime aggiornatoIl;

    @OneToMany(mappedBy = "preventivo", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PreventivoRiga> righe = new ArrayList<>();

    public Long getId() { return id; }
    public String getNumeroFoglio() { return numeroFoglio; }
    public LocalDate getDataCreazione() { return dataCreazione; }
    public Cliente getCliente() { return cliente; }
    public Impianto getImpianto() { return impianto; }
    public String getStato() { return stato; }
    public String getPriorita() { return priorita; }
    public String getAssegnatario() { return assegnatario; }
    public String getValidazioneTecnica() { return validazioneTecnica; }
    public BigDecimal getAliquotaIva() { return aliquotaIva; }
    public BigDecimal getTotaleManodopera() { return totaleManodopera; }
    public BigDecimal getTotaleMateriale() { return totaleMateriale; }
    public BigDecimal getTotaleOfferta() { return totaleOfferta; }
    public String getNoteInterne() { return noteInterne; }
    public OffsetDateTime getAggiornatoIl() { return aggiornatoIl; }
    public List<PreventivoRiga> getRighe() { return righe; }
}
