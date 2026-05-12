import os
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    text: str | None = None
    notes: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


app = FastAPI(title="Simplyft AI Service")


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "ai-service",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ollama_base_url": os.getenv("OLLAMA_BASE_URL", "http://ollama:11434"),
        "context_db_host": os.getenv("CONTEXT_DB_HOST", "context-db"),
        "whisper_service_url": os.getenv("WHISPER_SERVICE_URL", "http://whisper-service:8001"),
    }


@app.post("/analyze")
def analyze(payload: AnalyzeRequest) -> dict[str, Any]:
    source_text = payload.text or payload.notes or ""
    return {
        "status": "ok",
        "provider": os.getenv("AI_PROVIDER", "ollama"),
        "model": os.getenv("OLLAMA_MODEL", "deepseek-r1"),
        "input": {
            "text": source_text,
            "metadata": payload.metadata,
        },
        "normalized": {
            "text": source_text.strip(),
        },
        "operations": [],
        "message": "AI business logic placeholder. Wire model calls here.",
    }
