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
import java.math.BigDecimal;

@Entity
@Table(name = "preventivi_righe")
public class PreventivoRiga {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "preventivo_id")
    private PreventivoHeader preventivo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "articolo_id")
    private ArticoloOggetto articolo;

    private BigDecimal quantita;

    @Column(name = "ore_manodopera_effettive")
    private BigDecimal oreManodoperaEffettive;

    @Column(name = "costo_orario_manodopera")
    private BigDecimal costoOrarioManodopera;

    @Column(name = "totale_manodopera_riga")
    private BigDecimal totaleManodoperaRiga;

    @Column(name = "prezzo_materiale_unitario")
    private BigDecimal prezzoMaterialeUnitario;

    @Column(name = "sconto_percentuale")
    private BigDecimal scontoPercentuale;

    @Column(name = "totale_materiale_riga")
    private BigDecimal totaleMaterialeRiga;

    @Column(name = "nota_vocale_trascritta")
    private String notaVocaleTrascritta;

    @Column(name = "riassunto_ai_riga")
    private String riassuntoAiRiga;

    @Column(name = "posizione_vano")
    private String posizioneVano;

    public Long getId() { return id; }
    public PreventivoHeader getPreventivo() { return preventivo; }
    public ArticoloOggetto getArticolo() { return articolo; }
    public BigDecimal getQuantita() { return quantita; }
    public BigDecimal getOreManodoperaEffettive() { return oreManodoperaEffettive; }
    public BigDecimal getCostoOrarioManodopera() { return costoOrarioManodopera; }
    public BigDecimal getTotaleManodoperaRiga() { return totaleManodoperaRiga; }
    public BigDecimal getPrezzoMaterialeUnitario() { return prezzoMaterialeUnitario; }
    public BigDecimal getScontoPercentuale() { return scontoPercentuale; }
    public BigDecimal getTotaleMaterialeRiga() { return totaleMaterialeRiga; }
    public String getNotaVocaleTrascritta() { return notaVocaleTrascritta; }
    public String getRiassuntoAiRiga() { return riassuntoAiRiga; }
    public String getPosizioneVano() { return posizioneVano; }
}
