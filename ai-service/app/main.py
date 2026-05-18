import os
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import FastAPI
from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    text: str | None = None
    notes: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class FormalizeRequest(BaseModel):
    instruction: str
    text_to_rewrite: str | None = Field(default=None, alias="textToRewrite")
    prompt: str | None = None
    strict: bool = False


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


@app.post("/formalize-description")
def formalize_description(payload: FormalizeRequest) -> dict[str, Any]:
    text_to_rewrite = normalize_text(payload.text_to_rewrite or "")
    if not text_to_rewrite:
        return {"formalizedText": ""}

    prompt = build_formalize_prompt(payload.instruction, text_to_rewrite)
    formalized = call_ollama(prompt)
    if not formalized:
        formalized = text_to_rewrite

    return {"formalizedText": normalize_text(formalized)}


def build_formalize_prompt(instruction: str, text_to_rewrite: str) -> str:
    return (
        f"{instruction}\n\n"
        "Text to rewrite:\n"
        f"{text_to_rewrite}\n\n"
        "Rispondi solo con il testo riscritto, senza introduzioni, titoli o prefissi."
    )


def call_ollama(prompt: str) -> str:
    base_url = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434").rstrip("/")
    model = os.getenv("OLLAMA_MODEL", "deepseek-r1")
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{base_url}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0,
                    },
                },
            )
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPError, ValueError):
        return ""
    return strip_reasoning(str(data.get("response", ""))).strip()


def strip_reasoning(text: str) -> str:
    if "</think>" in text:
        return text.split("</think>", 1)[1]
    return text


def normalize_text(text: str) -> str:
    return " ".join(text.split()).strip()
