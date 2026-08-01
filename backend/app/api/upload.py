from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.image_service import create_grayscale_image


router = APIRouter(
    prefix="/upload",
    tags=["Upload"],
)

BASE_DIRECTORY = Path(__file__).resolve().parents[2]
UPLOAD_DIRECTORY = BASE_DIRECTORY / "uploads"
OUTPUT_DIRECTORY = BASE_DIRECTORY / "outputs"

UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
OUTPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
}

MAX_FILE_SIZE = 5 * 1024 * 1024


@router.post("/")
async def upload_image(
    file: UploadFile = File(...),
) -> dict:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, JPEG, and PNG images are allowed.",
        )

    file_contents = await file.read()

    if not file_contents:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    if len(file_contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="The image must be smaller than 5 MB.",
        )

    extension = ALLOWED_CONTENT_TYPES[file.content_type]
    unique_name = uuid4().hex

    original_filename = f"{unique_name}{extension}"
    processed_filename = f"{unique_name}_grayscale.jpg"

    original_path = UPLOAD_DIRECTORY / original_filename
    processed_path = OUTPUT_DIRECTORY / processed_filename

    try:
        original_path.write_bytes(file_contents)

        width, height = create_grayscale_image(
            source_path=original_path,
            output_path=processed_path,
        )

    except ValueError as error:
        original_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except Exception as error:
        original_path.unlink(missing_ok=True)
        processed_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=500,
            detail="Image processing failed.",
        ) from error

    finally:
        await file.close()

    return {
        "message": "Image uploaded and processed successfully.",
        "original_filename": original_filename,
        "processed_filename": processed_filename,
        "width": width,
        "height": height,
        "original_url": f"/uploads/{original_filename}",
        "processed_url": f"/outputs/{processed_filename}",
    }