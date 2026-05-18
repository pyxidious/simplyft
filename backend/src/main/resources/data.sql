INSERT INTO clienti (
    codice_cliente, ragione_sociale, partita_iva, codice_fiscale, indirizzo_fatturazione,
    cap, citta, provincia, telefono, fax, email
) VALUES
    (301, 'Condominio Aurora', NULL, '93011890162', 'Via Milano 18', '24122', 'Bergamo', 'BG', '035 221104', NULL, 'amministrazione@condominioaurora.it'),
    (302, 'Officine Riva S.p.A.', '03749230981', '03749230981', 'Zona Industriale 4', '25125', 'Brescia', 'BS', '030 882104', NULL, 'manutenzione@officineriva.it'),
    (303, 'Hotel San Marco', '02648100231', '02648100231', 'Piazza Roma 7', '37121', 'Verona', 'VR', '045 810204', NULL, 'direzione@hotelsanmarco.it')
ON CONFLICT (codice_cliente) DO UPDATE SET
    ragione_sociale = EXCLUDED.ragione_sociale,
    email = EXCLUDED.email;

INSERT INTO impianti (
    cliente_id, codice_impianto, matricola, indirizzo_installazione, scala, cap, citta, provincia,
    amministratore_riferimento, note_tecniche_struttura, marca, modello, tipologia, anno_stimato,
    completezza, stato, ultimo_rilievo
) VALUES
    ((SELECT id FROM clienti WHERE codice_cliente = 301), 4029, 'KONE-88X-2041', 'Piazza Centro', 'Torre B', '24122', 'Bergamo', 'BG', 'Studio Verdi', 'Quadro accessibile, vano stretto, locale macchina assente.', 'Kone', 'MonoSpace 500', 'Ascensore elettrico MRL', 2011, 92, 'complete', '2026-05-13T09:40:00Z'),
    ((SELECT id FROM clienti WHERE codice_cliente = 302), 1022, 'OTIS-PLT-771', 'Parco Industriale Ovest', 'C', '25125', 'Brescia', 'BS', 'Responsabile HSE Riva', 'Richiesta sostituzione paracadute e revisione porte.', 'Otis', 'GoodsLift H', 'Montacarichi industriale', 2004, 68, 'needs-review', '2026-05-12T16:10:00Z'),
    ((SELECT id FROM clienti WHERE codice_cliente = 303), 7714, 'SCH-550-A9', 'Piazza Roma 7', NULL, '37121', 'Verona', 'VR', 'Direzione Hotel San Marco', 'Manca foto targhetta motore, preventivo urgente.', 'Schindler', '330A', 'Ascensore idraulico', 1998, 54, 'incomplete', '2026-05-11T11:25:00Z')
ON CONFLICT (codice_impianto) DO UPDATE SET
    completezza = EXCLUDED.completezza,
    stato = EXCLUDED.stato,
    ultimo_rilievo = EXCLUDED.ultimo_rilievo;

INSERT INTO categorie_l1 (codice_ramo, descrizione_ramo) VALUES
    (1, 'Manutenzione straordinaria'),
    (2, 'Ammodernamento'),
    (3, 'Sicurezza e normativa')
ON CONFLICT (codice_ramo) DO UPDATE SET descrizione_ramo = EXCLUDED.descrizione_ramo;

INSERT INTO categorie_l2 (categoria_l1_id, codice_gruppo, descrizione_gruppo) VALUES
    ((SELECT id FROM categorie_l1 WHERE codice_ramo = 2), 1, 'Quadri di manovra'),
    ((SELECT id FROM categorie_l1 WHERE codice_ramo = 2), 2, 'Funi di trazione'),
    ((SELECT id FROM categorie_l1 WHERE codice_ramo = 2), 3, 'Bottoniere e segnalazioni'),
    ((SELECT id FROM categorie_l1 WHERE codice_ramo = 3), 1, 'Dispositivi di sicurezza')
ON CONFLICT (categoria_l1_id, codice_gruppo) DO UPDATE SET descrizione_gruppo = EXCLUDED.descrizione_gruppo;

INSERT INTO articoli_oggetti (
    categoria_l2_id, codice_voce, codice_statistico, descrizione_breve, descrizione_estesa,
    ore_manodopera_standard, prezzo_materiale_listino, url_immagine
) VALUES
    ((SELECT l2.id FROM categorie_l2 l2 JOIN categorie_l1 l1 ON l1.id = l2.categoria_l1_id WHERE l1.codice_ramo = 2 AND l2.codice_gruppo = 1), 1, 'QMRL-8F', 'Quadro manovra MRL 8 fermate', 'Fornitura e posa quadro di manovra programmato per impianto MRL, comprensivo di cablaggio, configurazione inverter e collaudo funzionale.', 12.50, 5200.00, '/assets/catalog/quadro-mrl.png'),
    ((SELECT l2.id FROM categorie_l2 l2 JOIN categorie_l1 l1 ON l1.id = l2.categoria_l1_id WHERE l1.codice_ramo = 2 AND l2.codice_gruppo = 2), 5, 'FUNE-HR-09', 'Fune Ø9mm High Resistance', 'Sostituzione funi di trazione con materiale ad alta resistenza, inclusi smontaggio, posa, tensionamento e verifica finale.', 6.00, 780.00, '/assets/catalog/fune-9mm.png'),
    ((SELECT l2.id FROM categorie_l2 l2 JOIN categorie_l1 l1 ON l1.id = l2.categoria_l1_id WHERE l1.codice_ramo = 2 AND l2.codice_gruppo = 3), 2, 'BTN-INOX-7', 'Kit bottoniere inox antivandalo', 'Kit bottoniere di cabina e piano in acciaio inox con segnalazioni luminose, cablaggio e targhette personalizzate.', 8.00, 2940.00, '/assets/catalog/bottoniere-inox.png'),
    ((SELECT l2.id FROM categorie_l2 l2 JOIN categorie_l1 l1 ON l1.id = l2.categoria_l1_id WHERE l1.codice_ramo = 3 AND l2.codice_gruppo = 1), 4, 'PAR-IND-01', 'Kit paracadute industriale', 'Adeguamento gruppo paracadute per montacarichi industriale con verifica meccanica e prove di intervento.', 9.50, 3100.00, '/assets/catalog/paracadute.png')
ON CONFLICT (categoria_l2_id, codice_voce) DO UPDATE SET
    descrizione_breve = EXCLUDED.descrizione_breve,
    prezzo_materiale_listino = EXCLUDED.prezzo_materiale_listino;

INSERT INTO preventivi_header (
    numero_foglio, data_creazione, cliente_id, impianto_id, stato, priorita, assegnatario,
    validazione_tecnica, totale_manodopera, totale_materiale, totale_offerta, note_interne, aggiornato_il
) VALUES
    ('2026 / 245', '2026-05-13', (SELECT id FROM clienti WHERE codice_cliente = 301), (SELECT id FROM impianti WHERE codice_impianto = 4029), 'QUOTING', 'Alta', 'Giulia Conti', 'Da verificare', 8625.00, 12980.00, 21605.00, 'Verificare foto targhetta motore prima dell invio.', '2026-05-13T10:18:00Z'),
    ('2026 / 246', '2026-05-12', (SELECT id FROM clienti WHERE codice_cliente = 302), (SELECT id FROM impianti WHERE codice_impianto = 1022), 'TO_REVIEW', 'Media', 'Marco Serra', 'In attesa integrazione', 3325.00, 3100.00, 6425.00, 'Chiedere foto piastra argano.', '2026-05-12T17:35:00Z')
ON CONFLICT (numero_foglio) DO UPDATE SET
    stato = EXCLUDED.stato,
    totale_offerta = EXCLUDED.totale_offerta,
    aggiornato_il = EXCLUDED.aggiornato_il;

INSERT INTO preventivi_righe (
    preventivo_id, articolo_id, quantita, ore_manodopera_effettive, costo_orario_manodopera,
    totale_manodopera_riga, prezzo_materiale_unitario, sconto_percentuale, totale_materiale_riga,
    nota_vocale_trascritta, riassunto_ai_riga, posizione_vano
) VALUES
    ((SELECT id FROM preventivi_header WHERE numero_foglio = '2026 / 245'), (SELECT id FROM articoli_oggetti WHERE codice_statistico = 'QMRL-8F'), 1, 12.50, 69.00, 862.50, 5200.00, 0.00, 5200.00, 'Quadro accessibile, spazio laterale ridotto.', 'Quadro compatibile con modernizzazione MRL 8 fermate.', 'Locale quadro'),
    ((SELECT id FROM preventivi_header WHERE numero_foglio = '2026 / 245'), (SELECT id FROM articoli_oggetti WHERE codice_statistico = 'BTN-INOX-7'), 7, 8.00, 69.00, 552.00, 420.00, 0.00, 2940.00, 'Bottoniere usurate, cliente richiede inox.', 'Sostituzione bottoniere consigliata.', 'Cabina e piani'),
    ((SELECT id FROM preventivi_header WHERE numero_foglio = '2026 / 246'), (SELECT id FROM articoli_oggetti WHERE codice_statistico = 'PAR-IND-01'), 1, 9.50, 70.00, 665.00, 3100.00, 0.00, 3100.00, 'Verificare portata dichiarata in targhetta.', 'Serve integrazione fotografica prima dell offerta.', 'Fossa')
ON CONFLICT DO NOTHING;

INSERT INTO attivita_tecnico (codice, titolo, luogo, impianto_id, tipo, stato, priorita, assegnata_a, scadenza) VALUES
    ('ELV-4029-A', 'Manutenzione sollevatori principale', 'Piazza Centro • Torre B', (SELECT id FROM impianti WHERE codice_impianto = 4029), 'maintenance', 'assegnata', 'Alta', 'Luca Bianchi', '2026-05-18'),
    ('SRV-1022-C', 'Ispezione di sicurezza', 'Parco Industriale Ovest', (SELECT id FROM impianti WHERE codice_impianto = 1022), 'safety', 'assegnata', 'Media', 'Luca Bianchi', '2026-05-19')
ON CONFLICT (codice) DO UPDATE SET
    titolo = EXCLUDED.titolo,
    luogo = EXCLUDED.luogo,
    assegnata_a = EXCLUDED.assegnata_a,
    scadenza = EXCLUDED.scadenza;

INSERT INTO notifiche_sistema (titolo, messaggio, tipo, creata_il) VALUES
    ('Nuovi ricambi disponibili per il ritiro', 'L ordine #9921 per ELV-4029 e stato elaborato presso Magazzino Nord.', 'parts', '2026-05-17T08:15:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO utenti (nome, email, password_hash, ruolo, titolo, attivo) VALUES
    ('Luca Bianchi', 'tecnico@simplyft.local', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi/jOHysVsRMsjF3TfgQ3Ex2l2N5EHC', 'tecnico', 'Tecnico Senior Area Nord', TRUE),
    ('Mario Rossi', 'tecnico2@simplyft.local', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi/jOHysVsRMsjF3TfgQ3Ex2l2N5EHC', 'tecnico', 'Tecnico Area Est', TRUE),
    ('Giulia Conti', 'commerciale@simplyft.local', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi/jOHysVsRMsjF3TfgQ3Ex2l2N5EHC', 'commerciale', 'Back-office commerciale', TRUE),
    ('Admin Simplyft', 'admin@simplyft.local', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi/jOHysVsRMsjF3TfgQ3Ex2l2N5EHC', 'amministratore', 'Amministratore', TRUE)
ON CONFLICT (email) DO UPDATE SET
    nome = EXCLUDED.nome,
    password_hash = EXCLUDED.password_hash,
    ruolo = EXCLUDED.ruolo,
    titolo = EXCLUDED.titolo,
    attivo = EXCLUDED.attivo;
