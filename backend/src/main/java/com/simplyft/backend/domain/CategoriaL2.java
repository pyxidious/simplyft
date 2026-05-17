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
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "categorie_l2")
public class CategoriaL2 {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_l1_id")
    private CategoriaL1 categoriaL1;

    @Column(name = "codice_gruppo", nullable = false)
    private Integer codiceGruppo;

    @Column(name = "descrizione_gruppo", nullable = false)
    private String descrizioneGruppo;

    @OneToMany(mappedBy = "categoriaL2")
    private List<ArticoloOggetto> articoli = new ArrayList<>();

    public Long getId() { return id; }
    public CategoriaL1 getCategoriaL1() { return categoriaL1; }
    public Integer getCodiceGruppo() { return codiceGruppo; }
    public String getDescrizioneGruppo() { return descrizioneGruppo; }
    public List<ArticoloOggetto> getArticoli() { return articoli; }
}
