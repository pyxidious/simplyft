package com.simplyft.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "categorie_l1")
public class CategoriaL1 {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "codice_ramo", nullable = false, unique = true)
    private Integer codiceRamo;

    @Column(name = "descrizione_ramo", nullable = false)
    private String descrizioneRamo;

    @OneToMany(mappedBy = "categoriaL1")
    private List<CategoriaL2> gruppi = new ArrayList<>();

    public Long getId() { return id; }
    public Integer getCodiceRamo() { return codiceRamo; }
    public String getDescrizioneRamo() { return descrizioneRamo; }
    public List<CategoriaL2> getGruppi() { return gruppi; }
}
