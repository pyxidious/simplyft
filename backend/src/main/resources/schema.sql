CREATE TABLE IF NOT EXISTS clienti (
    id BIGSERIAL PRIMARY KEY,
    codice_cliente INT UNIQUE NOT NULL,
    ragione_sociale VARCHAR(255) NOT NULL,
    partita_iva VARCHAR(11),
    codice_fiscale VARCHAR(16),
    indirizzo_fatturazione VARCHAR(255),
    cap VARCHAR(5),
    citta VARCHAR(100),
    provincia VARCHAR(2),
    telefono VARCHAR(20),
    fax VARCHAR(20),
    email VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS impianti (
    id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT REFERENCES clienti(id),
    codice_impianto INT UNIQUE NOT NULL,
    matricola VARCHAR(50) UNIQUE NOT NULL,
    indirizzo_installazione VARCHAR(255),
    scala VARCHAR(10),
    cap VARCHAR(5),
    citta VARCHAR(100),
    provincia VARCHAR(2),
    amministratore_riferimento VARCHAR(255),
    note_tecniche_struttura TEXT,
    marca VARCHAR(100),
    modello VARCHAR(100),
    tipologia VARCHAR(100),
    anno_stimato INT,
    completezza INT DEFAULT 0,
    stato VARCHAR(30) DEFAULT 'incomplete',
    ultimo_rilievo TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS categorie_l1 (
    id BIGSERIAL PRIMARY KEY,
    codice_ramo INT UNIQUE NOT NULL,
    descrizione_ramo VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS categorie_l2 (
    id BIGSERIAL PRIMARY KEY,
    categoria_l1_id BIGINT REFERENCES categorie_l1(id),
    codice_gruppo INT NOT NULL,
    descrizione_gruppo VARCHAR(150) NOT NULL,
    CONSTRAINT unique_l2_code UNIQUE (categoria_l1_id, codice_gruppo)
);

CREATE TABLE IF NOT EXISTS articoli_oggetti (
    id BIGSERIAL PRIMARY KEY,
    categoria_l2_id BIGINT REFERENCES categorie_l2(id),
    codice_voce INT NOT NULL,
    codice_statistico VARCHAR(50),
    descrizione_breve VARCHAR(255) NOT NULL,
    descrizione_estesa TEXT,
    ore_manodopera_standard DECIMAL(5,2),
    prezzo_materiale_listino DECIMAL(10,2),
    url_immagine VARCHAR(255),
    CONSTRAINT unique_l3_code UNIQUE (categoria_l2_id, codice_voce)
);

CREATE TABLE IF NOT EXISTS preventivi_header (
    id BIGSERIAL PRIMARY KEY,
    numero_foglio VARCHAR(50) UNIQUE NOT NULL,
    data_creazione DATE NOT NULL,
    cliente_id BIGINT REFERENCES clienti(id),
    impianto_id BIGINT REFERENCES impianti(id),
    stato VARCHAR(20) DEFAULT 'BOZZA',
    priorita VARCHAR(20) DEFAULT 'Media',
    assegnatario VARCHAR(255),
    validazione_tecnica VARCHAR(50) DEFAULT 'Da verificare',
    aliquota_iva DECIMAL(4,2) DEFAULT 22.00,
    totale_manodopera DECIMAL(10,2) DEFAULT 0.00,
    totale_materiale DECIMAL(10,2) DEFAULT 0.00,
    totale_offerta DECIMAL(10,2) DEFAULT 0.00,
    note_interne TEXT,
    aggiornato_il TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS preventivi_righe (
    id BIGSERIAL PRIMARY KEY,
    preventivo_id BIGINT REFERENCES preventivi_header(id) ON DELETE CASCADE,
    articolo_id BIGINT REFERENCES articoli_oggetti(id),
    quantita DECIMAL(10,2) DEFAULT 1.00,
    ore_manodopera_effettive DECIMAL(5,2),
    costo_orario_manodopera DECIMAL(10,2),
    totale_manodopera_riga DECIMAL(10,2),
    prezzo_materiale_unitario DECIMAL(10,2),
    sconto_percentuale DECIMAL(5,2) DEFAULT 0.00,
    totale_materiale_riga DECIMAL(10,2),
    nota_vocale_trascritta TEXT,
    riassunto_ai_riga TEXT,
    posizione_vano VARCHAR(100)
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_preventivo_articolo
    ON preventivi_righe (preventivo_id, articolo_id);

CREATE TABLE IF NOT EXISTS attivita_tecnico (
    id BIGSERIAL PRIMARY KEY,
    codice VARCHAR(50) UNIQUE NOT NULL,
    titolo VARCHAR(255) NOT NULL,
    luogo VARCHAR(255) NOT NULL,
    impianto_id BIGINT REFERENCES impianti(id),
    tipo VARCHAR(50) NOT NULL,
    stato VARCHAR(30) DEFAULT 'assegnata',
    priorita VARCHAR(20) DEFAULT 'Media',
    assegnata_a VARCHAR(255) NOT NULL,
    scadenza DATE
);

CREATE TABLE IF NOT EXISTS notifiche_sistema (
    id BIGSERIAL PRIMARY KEY,
    titolo VARCHAR(255) NOT NULL,
    messaggio TEXT NOT NULL,
    tipo VARCHAR(50) DEFAULT 'info',
    creata_il TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_notifica_titolo_messaggio
    ON notifiche_sistema (titolo, messaggio);
