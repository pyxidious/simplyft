package com.simplyft.backend.domain;

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
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "articoli_oggetti")
public class ArticoloOggetto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_l2_id")
    private CategoriaL2 categoriaL2;

    @Column(name = "codice_voce", nullable = false)
    private Integer codiceVoce;

    @Column(name = "codice_statistico")
    private String codiceStatistico;

    @Column(name = "descrizione_breve", nullable = false)
    private String descrizioneBreve;

    @Column(name = "descrizione_estesa")
    private String descrizioneEstesa;

    @Column(name = "ore_manodopera_standard")
    private BigDecimal oreManodoperaStandard;

    @Column(name = "prezzo_materiale_listino")
    private BigDecimal prezzoMaterialeListino;

    @Column(name = "url_immagine")
    private String urlImmagine;

    @OneToMany(mappedBy = "articolo")
    private List<PreventivoRiga> righePreventivo = new ArrayList<>();

    public Long getId() { return id; }
    public CategoriaL2 getCategoriaL2() { return categoriaL2; }
    public Integer getCodiceVoce() { return codiceVoce; }
    public String getCodiceStatistico() { return codiceStatistico; }
    public String getDescrizioneBreve() { return descrizioneBreve; }
    public String getDescrizioneEstesa() { return descrizioneEstesa; }
    public BigDecimal getOreManodoperaStandard() { return oreManodoperaStandard; }
    public BigDecimal getPrezzoMaterialeListino() { return prezzoMaterialeListino; }
    public String getUrlImmagine() { return urlImmagine; }
    public List<PreventivoRiga> getRighePreventivo() { return righePreventivo; }
}
