from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.memory_image_service import decode_image_bytes
from app.services.video_service import process_video_frame


router = APIRouter(
    prefix="/video",
    tags=["Video"],
)


ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
}


MAX_FRAME_SIZE = 5 * 1024 * 1024


@router.post("/frame")
async def analyze_video_frame(
    frame_number: int,
    file: UploadFile = File(...),
) -> dict:
    """
    Analyze one video or webcam frame entirely in memory.

    The frame is not saved anywhere.

    YOLO processes only selected frames according to the
    process_every_n_frames value.
    """

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="The frame must be a JPG, JPEG, or PNG image.",
        )

    try:
        frame_contents = await file.read()

        if not frame_contents:
            raise HTTPException(
                status_code=400,
                detail="The uploaded frame is empty.",
            )

        if len(frame_contents) > MAX_FRAME_SIZE:
            raise HTTPException(
                status_code=413,
                detail="The frame must be smaller than 5 MB.",
            )

        frame_image = decode_image_bytes(
            file_contents=frame_contents,
        )

        result = process_video_frame(
            frame=frame_image,
            frame_number=frame_number,
            process_every_n_frames=5,
            confidence_threshold=0.20,
        )

        return {
            "message": (
                "Frame analyzed."
                if result["processed"]
                else "Frame skipped for performance."
            ),
            "processed": result["processed"],
            "frame_number": result["frame_number"],
            "detection_count": result["detection_count"],
            "detections": result["detections"],
            "annotated_image": result["annotated_image"],
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
            "Video frame processing error:",
            error,
        )

        raise HTTPException(
            status_code=500,
            detail="The video frame could not be analyzed.",
        ) from error

    finally:
        await file.close()