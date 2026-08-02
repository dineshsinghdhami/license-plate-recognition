from typing import Any

import numpy as np
from numpy.typing import NDArray

from app.services.detection_service import (
    detect_license_plates,
)


ImageArray = NDArray[np.uint8]


def should_process_frame(
    frame_number: int,
    process_every_n_frames: int = 3,
) -> bool:
    """
    Decide whether YOLO should analyze the frame.

    Processing every third captured frame reduces CPU usage.
    """

    if process_every_n_frames < 1:
        raise ValueError(
            "process_every_n_frames must be at least 1."
        )

    return (
        frame_number % process_every_n_frames == 0
    )


def process_video_frame(
    frame: ImageArray,
    frame_number: int,
    process_every_n_frames: int = 3,
    confidence_threshold: float = 0.50,
) -> dict[str, Any]:
    """
    Process one temporary video frame in memory.

    The function returns bounding-box coordinates only.
    It does not save or return an annotated image.
    """

    if frame is None or frame.size == 0:
        raise ValueError(
            "The video frame is empty."
        )

    frame_height, frame_width = frame.shape[:2]

    process_this_frame = should_process_frame(
        frame_number=frame_number,
        process_every_n_frames=process_every_n_frames,
    )

    if not process_this_frame:
        return {
            "processed": False,
            "frame_number": frame_number,
            "frame_width": frame_width,
            "frame_height": frame_height,
            "detection_count": 0,
            "detections": [],
        }

    detection_result = detect_license_plates(
        original_image=frame,
        confidence_threshold=confidence_threshold,
        image_size=960,
        include_annotated_image=False,
    )

    return {
        "processed": True,
        "frame_number": frame_number,
        "frame_width": frame_width,
        "frame_height": frame_height,
        "detection_count": detection_result[
            "detection_count"
        ],
        "detections": detection_result[
            "detections"
        ],
    }