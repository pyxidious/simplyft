# Simplyft

Simplyft e' un ambiente multi-container basato su Docker Compose. Include frontend Angular, backend Spring Boot, servizio AI FastAPI, servizio Whisper in Node/TypeScript, Ollama, PostgreSQL e un database separato per il contesto AI.

## Prerequisiti

- Docker Desktop oppure Docker Engine con Docker Compose v2.
- Spazio disco e RAM sufficienti per eseguire tutti i container.
- Per l'uso locale di Ollama, spazio aggiuntivo per scaricare modelli come `deepseek-r1`.

## Avvio Rapido

Il modo consigliato per avviare tutto l'ambiente e' usare gli script nella directory `scripts`.

### Windows

Da PowerShell:

```powershell
.\scripts\start-environment.ps1
```

Se PowerShell blocca l'esecuzione dello script, usa il wrapper CMD:

```cmd
scripts\start-environment.cmd
```

### Linux/macOS

Rendi eseguibile lo script, se necessario:

```bash
chmod +x scripts/start-environment.sh
```

Poi avvia l'ambiente:

```bash
./scripts/start-environment.sh
```

Gli script creano automaticamente `.env` copiandolo da `.env.example` quando il file non esiste, poi eseguono Docker Compose in modalita' detached.

## Opzioni Degli Script

- Windows: `-NoBuild` avvia senza ricostruire le immagini.
- Windows: `-FollowLogs` mostra i log dopo l'avvio.
- Linux/macOS: `--no-build` avvia senza ricostruire le immagini.
- Linux/macOS: `--follow-logs` mostra i log dopo l'avvio.

Esempi:

```powershell
.\scripts\start-environment.ps1 -FollowLogs
```

```bash
./scripts/start-environment.sh --no-build
```

## Avvio Manuale

In alternativa agli script puoi usare direttamente Docker Compose:

```bash
cp .env.example .env
docker compose up -d --build
```

Su Windows PowerShell:

```powershell
Copy-Item .env.example .env
docker compose up -d --build
```

Per fermare l'ambiente:

```bash
docker compose down
```

Per seguire i log:

```bash
docker compose logs -f
```

## Servizi

- `frontend`: applicazione Angular `simplyft`, compilata da `./frontend/simplyft` e servita da nginx sulla porta container `8080`.
- `backend`: API REST Spring Boot sulla porta container `8081`.
- `ai-service`: servizio FastAPI sulla porta container `8000`.
- `whisper-service`: servizio HTTP Node/TypeScript sulla porta container `8001`.
- `ollama`: server Ollama sulla porta container `11434`, raggiungibile dagli altri container con `http://ollama:11434`.
- `db`: database PostgreSQL principale usato dal backend.
- `context-db`: database PostgreSQL separato per contesto/memoria AI.
- `nginx`: reverse proxy opzionale che espone frontend e API backend da un unico ingresso.

## URL Principali

- Frontend: `http://localhost:4200`
- Reverse proxy: `http://localhost:8080`
- Backend health: `http://localhost:8081/api/health`
- Backend AI proxy: `POST http://localhost:8081/api/ai/analyze`
- AI health: `http://localhost:8000/health`
- AI analyze: `POST http://localhost:8000/analyze`
- Whisper health: `http://localhost:8001/health`
- Whisper transcribe: `POST http://localhost:8001/transcribe`
- Ollama: `http://localhost:11434`

Attraverso il reverse proxy nginx:

- Applicazione: `http://localhost:8080`
- API backend: `http://localhost:8080/api/...`

## Configurazione

Le variabili principali sono definite in `.env`. Il file non deve essere committato: usa `.env.example` come base.

Porte host predefinite:

- `FRONTEND_PORT=4200`
- `BACKEND_PORT=8081`
- `AI_SERVICE_PORT=8000`
- `WHISPER_SERVICE_PORT=8001`
- `OLLAMA_PORT=11434`
- `POSTGRES_PORT=5432`
- `CONTEXT_POSTGRES_PORT=5433`
- `NGINX_PORT=8080`

Credenziali e valori sensibili, come password database o chiavi provider AI, vanno modificati nel file `.env` locale.

## Note Su Ollama

Il servizio AI e' configurato di default con:

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=deepseek-r1
```

Dopo l'avvio dello stack, scarica il modello nel volume Ollama:

```bash
docker compose exec ollama ollama pull deepseek-r1
```

Puoi cambiare modello modificando `.env`:

```env
OLLAMA_MODEL=deepseek-r1
```

Provider esterni possono essere configurati tramite `AI_PROVIDER` e chiavi come `OPENAI_API_KEY`. Le chiavi non vanno inserite nei file versionati.

## Note Di Build

Il frontend usa una build Docker dedicata con Node LTS e nginx. Se il primo build e' stato interrotto o Docker ha cache incoerente, puoi forzare una ricostruzione pulita:

```bash
docker compose build --no-cache frontend
docker compose up -d
```

Per ricostruire tutto:

```bash
docker compose build --no-cache
docker compose up -d
```
