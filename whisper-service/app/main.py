import logging
import os
import subprocess
import tempfile
import wave
from functools import lru_cache
from pathlib import Path
from typing import Any

import imageio_ffmpeg
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from transformers import pipeline

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("simplyft-whisper-service")

app = FastAPI(title="Simplyft Whisper Service")

MODEL_ID = os.getenv("HUGGINGFACE_WHISPER_MODEL", "openai/whisper-small")
MAX_AUDIO_BYTES = int(os.getenv("MAX_AUDIO_BYTES", str(25 * 1024 * 1024)))
LANGUAGE = os.getenv("WHISPER_LANGUAGE", "italian")


@lru_cache(maxsize=1)
def transcriber() -> Any:
    logger.info("Loading Hugging Face Whisper model %s", MODEL_ID)
    return pipeline(
        "automatic-speech-recognition",
        model=MODEL_ID,
        device=-1,
        generate_kwargs={"language": LANGUAGE, "task": "transcribe"},
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "whisper-service",
        "provider": "huggingface-local",
        "model": MODEL_ID,
    }


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)) -> dict[str, Any]:
    content = await audio.read()
    if not content:
        raise HTTPException(status_code=400, detail="File audio vuoto")
    if len(content) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="File audio troppo grande")

    suffix = Path(audio.filename or "audio.webm").suffix or ".webm"
    source_path = None
    wav_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as source:
            source.write(content)
            source_path = source.name
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as wav:
            wav_path = wav.name

        subprocess.run(
            [
                imageio_ffmpeg.get_ffmpeg_exe(),
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-i",
                source_path,
                "-ar",
                "16000",
                "-ac",
                "1",
                wav_path,
            ],
            check=True,
            timeout=60,
        )

        result = transcriber()(read_wav_mono_16k(wav_path))
        text = str(result.get("text", "")).strip()
        if not text:
            raise HTTPException(status_code=502, detail="Whisper ha restituito una trascrizione vuota")
        return {
            "status": "ok",
            "filename": audio.filename,
            "bytes": len(content),
            "text": text,
            "model": MODEL_ID,
        }
    except subprocess.TimeoutExpired as exc:
        logger.warning("ffmpeg timeout while converting %s", audio.filename)
        raise HTTPException(status_code=504, detail="Conversione audio scaduta") from exc
    except subprocess.CalledProcessError as exc:
        logger.warning("ffmpeg failed while converting %s", audio.filename)
        raise HTTPException(status_code=415, detail="Formato audio non supportato o file non valido") from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Local Whisper transcription failed")
        raise HTTPException(status_code=502, detail="Errore durante la trascrizione Whisper locale") from exc
    finally:
        for path in (source_path, wav_path):
            if path:
                try:
                    os.unlink(path)
                except OSError:
                    logger.debug("Unable to remove temp file %s", path)


def read_wav_mono_16k(path: str) -> dict[str, Any]:
    with wave.open(path, "rb") as wav:
        sample_rate = wav.getframerate()
        channels = wav.getnchannels()
        sample_width = wav.getsampwidth()
        frames = wav.readframes(wav.getnframes())
    if sample_rate != 16000 or channels != 1 or sample_width != 2:
        raise HTTPException(status_code=415, detail="Conversione audio non valida")
    audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
    return {"array": audio, "sampling_rate": sample_rate}
