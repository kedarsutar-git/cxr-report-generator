from contextlib import asynccontextmanager
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .schemas import ReportResponse
from .inference import get_service

ALLOWED = {"image/png", "image/jpeg", "image/jpg", "image/bmp"}
MAX_BYTES = 10 * 1024 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_service()
    yield


app = FastAPI(title="CXR Report Generator", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/health")
def health():
    return {"status": "ok"}


@app.post("/api/v1/predict", response_model=ReportResponse)
async def predict(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED:
        raise HTTPException(415, f"Unsupported type: {file.content_type}. Use PNG/JPEG.")

    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Image exceeds 10 MB.")
    if len(data) == 0:
        raise HTTPException(400, "Empty file.")

    try:
        result = get_service().predict(data)
    except Exception as e:
        raise HTTPException(500, f"Inference failed: {e}")

    return result