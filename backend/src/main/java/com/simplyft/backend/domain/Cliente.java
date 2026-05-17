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
@Table(name = "clienti")
public class Cliente {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "codice_cliente", nullable = false, unique = true)
    private Integer codiceCliente;

    @Column(name = "ragione_sociale", nullable = false)
    private String ragioneSociale;

    @Column(name = "partita_iva")
    private String partitaIva;

    @Column(name = "codice_fiscale")
    private String codiceFiscale;

    @Column(name = "indirizzo_fatturazione")
    private String indirizzoFatturazione;

    private String cap;
    private String citta;
    private String provincia;
    private String telefono;
    private String fax;
    private String email;

    @OneToMany(mappedBy = "cliente")
    private List<Impianto> impianti = new ArrayList<>();

    public Long getId() { return id; }
    public Integer getCodiceCliente() { return codiceCliente; }
    public String getRagioneSociale() { return ragioneSociale; }
    public String getPartitaIva() { return partitaIva; }
    public String getCodiceFiscale() { return codiceFiscale; }
    public String getIndirizzoFatturazione() { return indirizzoFatturazione; }
    public String getCap() { return cap; }
    public String getCitta() { return citta; }
    public String getProvincia() { return provincia; }
    public String getTelefono() { return telefono; }
    public String getFax() { return fax; }
    public String getEmail() { return email; }
    public List<Impianto> getImpianti() { return impianti; }
}
