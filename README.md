# Simplyft Docker Architecture

Multi-container scaffold for the Simplyft Angular frontend, Spring Boot backend, FastAPI AI service, TypeScript Whisper service, Ollama, PostgreSQL, and a separate context database.

## Prerequisites

- Docker Desktop or Docker Engine with Docker Compose v2
- A local `.env` file created from `.env.example`
- Optional: enough disk/RAM for Ollama models such as `deepseek-r1`

## Start

```bash
cp .env.example .env
docker compose up --build
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
docker compose up --build
```

## Services

- `frontend`: Angular app `simplyft`, built from `./frontend/simplyft` and served by nginx on container port `8080`.
- `backend`: Spring Boot REST API on container port `8081`.
- `ai-service`: FastAPI service on container port `8000`.
- `whisper-service`: TypeScript/Node HTTP service on container port `8001`.
- `ollama`: Ollama server on container port `11434`, reachable internally at `http://ollama:11434`.
- `db`: main PostgreSQL database for the backend.
- `context-db`: separate PostgreSQL database for AI context/memory.
- `nginx`: optional reverse proxy that exposes the frontend and backend behind one entrypoint.

## Main URLs

- Frontend: `http://localhost:4200`
- Reverse proxy: `http://localhost:8080`
- Backend health: `http://localhost:8081/api/health`
- Backend AI proxy: `POST http://localhost:8081/api/ai/analyze`
- AI health: `http://localhost:8000/health`
- AI analyze: `POST http://localhost:8000/analyze`
- Whisper health: `http://localhost:8001/health`
- Whisper transcribe: `POST http://localhost:8001/transcribe`
- Ollama: `http://localhost:11434`

Through the optional nginx entrypoint:

- App: `http://localhost:8080`
- Backend API: `http://localhost:8080/api/...`

## Ollama Notes

The AI service is configured with:

- `OLLAMA_BASE_URL=http://ollama:11434`
- `OLLAMA_MODEL=deepseek-r1`

After the stack is running, pull a model into the Ollama volume with:

```bash
docker compose exec ollama ollama pull deepseek-r1
```

You can change the model by editing `.env`:

```env
OLLAMA_MODEL=deepseek-r1
```

External providers can be wired later through `AI_PROVIDER` and provider keys such as `OPENAI_API_KEY`. Sensitive values belong in `.env`, not in committed files.
