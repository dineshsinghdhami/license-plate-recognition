from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.detection_service import detect_license_plates
from app.services.memory_image_service import (
    decode_image_bytes,
    encode_image_as_data_url,
)


router = APIRouter(
    prefix="/upload",
    tags=["Upload"],
)


ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
}


MAX_FILE_SIZE = 5 * 1024 * 1024


@router.post("/")
async def upload_image(
    file: UploadFile = File(...),
) -> dict:
    """
    Receive an image, process it entirely in memory,
    and return detection and OCR results.

    The uploaded image and generated results are not
    saved in uploads or outputs.
    """

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, JPEG, and PNG images are allowed.",
        )

    try:
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

        original_image = decode_image_bytes(
            file_contents=file_contents,
        )

        height, width = original_image.shape[:2]

        detection_result = detect_license_plates(
            original_image=original_image,
            confidence_threshold=0.20,
        )

        original_image_data = encode_image_as_data_url(
            original_image,
            extension=".jpg",
        )

        return {
            "message": "Image analyzed successfully.",
            "filename": file.filename,
            "dimensions": {
                "width": width,
                "height": height,
            },
            "original_image": original_image_data,
            "detection": {
                "count": detection_result[
                    "detection_count"
                ],
                "annotated_image": detection_result[
                    "annotated_image"
                ],
                "objects": detection_result[
                    "detections"
                ],
            },
        }

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except Exception as error:
        print(
            "In-memory image processing error:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Image detection or OCR processing failed. "
                "Check the backend terminal for details."
            ),
        ) from error

    finally:
        await file.close()