FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PORT=8001 \
    HUGGINGFACE_WHISPER_MODEL=openai/whisper-small \
    WHISPER_LANGUAGE=italian

COPY requirements.txt ./
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.5.1 \
    && pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8001

HEALTHCHECK --interval=15s --timeout=5s --retries=10 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8001/health')" || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
