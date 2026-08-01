from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.detection_service import detect_objects
from app.services.image_service import process_vehicle_image


router = APIRouter(
    prefix="/upload",
    tags=["Upload"],
)


# backend directory
BASE_DIRECTORY = Path(__file__).resolve().parents[2]

# backend/uploads
UPLOAD_DIRECTORY = BASE_DIRECTORY / "uploads"

# backend/outputs
OUTPUT_DIRECTORY = BASE_DIRECTORY / "outputs"


# Create the folders automatically if they do not exist.
UPLOAD_DIRECTORY.mkdir(
    parents=True,
    exist_ok=True,
)

OUTPUT_DIRECTORY.mkdir(
    parents=True,
    exist_ok=True,
)


# These are the image formats accepted by the API.
ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
}


# Maximum upload size: 5 MB
MAX_FILE_SIZE = 5 * 1024 * 1024


@router.post("/")
async def upload_image(
    file: UploadFile = File(...),
) -> dict:
    """
    Receive a vehicle image, process it with OpenCV,
    run YOLO object detection, and return the results.
    """

    # Step 1: Check the file type.
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, JPEG, and PNG images are allowed.",
        )

    # Step 2: Read the uploaded file.
    file_contents = await file.read()

    # Step 3: Reject an empty file.
    if not file_contents:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    # Step 4: Reject images larger than 5 MB.
    if len(file_contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="The image must be smaller than 5 MB.",
        )

    # Step 5: Create a unique filename.
    extension = ALLOWED_CONTENT_TYPES[file.content_type]
    unique_name = uuid4().hex

    original_filename = f"{unique_name}{extension}"
    original_path = UPLOAD_DIRECTORY / original_filename

    try:
        # Step 6: Save the original uploaded image.
        original_path.write_bytes(file_contents)

        # Step 7: Generate OpenCV preprocessing results.
        processing_result = process_vehicle_image(
            source_path=original_path,
            output_directory=OUTPUT_DIRECTORY,
            unique_name=unique_name,
        )

        # Step 8: Create the YOLO output filename.
        detection_filename = f"{unique_name}_detection.jpg"
        detection_path = OUTPUT_DIRECTORY / detection_filename

        # Step 9: Run YOLO object detection.
        detection_result = detect_objects(
    source_path=original_path,
    output_path=detection_path,
    crop_output_directory=OUTPUT_DIRECTORY,
    unique_name=unique_name,
    confidence_threshold=0.35,
)

    except ValueError as error:
        # A ValueError normally means OpenCV could not
        # decode the uploaded file as a valid image.
        original_path.unlink(
            missing_ok=True,
        )

        # Delete any output files already created.
        for generated_file in OUTPUT_DIRECTORY.glob(
            f"{unique_name}_*"
        ):
            generated_file.unlink(
                missing_ok=True,
            )

        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except Exception as error:
        # Print the actual error in the backend terminal.
        # This helps us debug during development.
        print(
            f"Image processing or detection error: {error}"
        )

        # Delete the original uploaded file.
        original_path.unlink(
            missing_ok=True,
        )

        # Delete every generated file belonging to this upload.
        for generated_file in OUTPUT_DIRECTORY.glob(
            f"{unique_name}_*"
        ):
            generated_file.unlink(
                missing_ok=True,
            )

        raise HTTPException(
            status_code=500,
            detail=(
                "Image processing or object detection failed. "
                "Check the backend terminal for the detailed error."
            ),
        ) from error

    finally:
        # Always close the uploaded file.
        await file.close()

    # This return statement only runs when both
    # preprocessing and YOLO detection succeed.
    return {
        "message": (
            "Image uploaded, processed, and analyzed successfully."
        ),
        "original_filename": original_filename,
        "original_url": (
            f"/uploads/{original_filename}"
        ),
        "dimensions": {
            "original_width": (
                processing_result["original_width"]
            ),
            "original_height": (
                processing_result["original_height"]
            ),
            "processed_width": (
                processing_result["processed_width"]
            ),
            "processed_height": (
                processing_result["processed_height"]
            ),
        },
        "processed_images": {
            "resized": (
                "/outputs/"
                f"{processing_result['resized_filename']}"
            ),
            "grayscale": (
                "/outputs/"
                f"{processing_result['grayscale_filename']}"
            ),
            "blurred": (
                "/outputs/"
                f"{processing_result['blurred_filename']}"
            ),
            "contrast": (
                "/outputs/"
                f"{processing_result['contrast_filename']}"
            ),
            "threshold": (
                "/outputs/"
                f"{processing_result['threshold_filename']}"
            ),
            "edges": (
                "/outputs/"
                f"{processing_result['edges_filename']}"
            ),
        },
        "detection": {
            "image_url": (
                f"/outputs/{detection_filename}"
            ),
            "count": (
                detection_result["detection_count"]
            ),
            "objects": (
                detection_result["detections"]
            ),
        },
    }