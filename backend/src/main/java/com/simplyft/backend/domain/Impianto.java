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
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "impianti")
public class Impianto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    @Column(name = "codice_impianto", nullable = false, unique = true)
    private Integer codiceImpianto;

    @Column(nullable = false, unique = true)
    private String matricola;

    @Column(name = "indirizzo_installazione")
    private String indirizzoInstallazione;

    private String scala;
    private String cap;
    private String citta;
    private String provincia;

    @Column(name = "amministratore_riferimento")
    private String amministratoreRiferimento;

    @Column(name = "note_tecniche_struttura")
    private String noteTecnicheStruttura;

    private String marca;
    private String modello;
    private String tipologia;

    @Column(name = "anno_stimato")
    private Integer annoStimato;

    private Integer completezza;
    private String stato;

    @Column(name = "ultimo_rilievo")
    private OffsetDateTime ultimoRilievo;

    @OneToMany(mappedBy = "impianto")
    private List<PreventivoHeader> preventivi = new ArrayList<>();

    public Long getId() { return id; }
    public Cliente getCliente() { return cliente; }
    public Integer getCodiceImpianto() { return codiceImpianto; }
    public String getMatricola() { return matricola; }
    public String getIndirizzoInstallazione() { return indirizzoInstallazione; }
    public String getScala() { return scala; }
    public String getCap() { return cap; }
    public String getCitta() { return citta; }
    public String getProvincia() { return provincia; }
    public String getAmministratoreRiferimento() { return amministratoreRiferimento; }
    public String getNoteTecnicheStruttura() { return noteTecnicheStruttura; }
    public String getMarca() { return marca; }
    public String getModello() { return modello; }
    public String getTipologia() { return tipologia; }
    public Integer getAnnoStimato() { return annoStimato; }
    public Integer getCompletezza() { return completezza; }
    public String getStato() { return stato; }
    public OffsetDateTime getUltimoRilievo() { return ultimoRilievo; }
    public List<PreventivoHeader> getPreventivi() { return preventivi; }
}
