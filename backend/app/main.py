from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.upload import router as upload_router


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

app.include_router(upload_router)

@app.get("/")
async def root() -> dict[str, str]:
    return {
        "message": "License Plate Recognition API is running"
    }


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {
        "status": "healthy"
    }