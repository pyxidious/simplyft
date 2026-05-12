import express from "express";
import multer from "multer";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const port = Number(process.env.PORT ?? 8001);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "whisper-service",
    timestamp: new Date().toISOString()
  });
});

app.post("/transcribe", upload.single("audio"), (req, res) => {
  res.json({
    status: "ok",
    filename: req.file?.originalname ?? null,
    bytes: req.file?.size ?? 0,
    text: "",
    message: "Whisper transcription placeholder. Wire a speech model here."
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`whisper-service listening on ${port}`);
});
