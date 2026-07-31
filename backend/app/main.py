from fastapi import FastAPI


app = FastAPI(
    title="License Plate Recognition API",
    description="Backend API for detecting and recognizing license plates.",
    version="0.1.0",
)


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