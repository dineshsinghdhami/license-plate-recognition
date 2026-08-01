from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.upload import router as upload_router


BASE_DIRECTORY = Path(__file__).resolve().parent.parent
UPLOAD_DIRECTORY = BASE_DIRECTORY / "uploads"
OUTPUT_DIRECTORY = BASE_DIRECTORY / "outputs"

UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
OUTPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="License Plate Recognition API",
    description="Backend API for detecting and recognizing license plates.",
    version="0.1.0",
)

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount(
    "/uploads",
    StaticFiles(directory=UPLOAD_DIRECTORY),
    name="uploads",
)

app.mount(
    "/outputs",
    StaticFiles(directory=OUTPUT_DIRECTORY),
    name="outputs",
)

app.include_router(upload_router)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "message": "License Plate Recognition API is running",
    }


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {
        "status": "healthy",
    }