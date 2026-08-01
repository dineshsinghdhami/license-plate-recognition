from typing import Any

import numpy as np
from numpy.typing import NDArray

from app.services.detection_service import (
    detect_license_plates,
)


ImageArray = NDArray[np.uint8]


def should_process_frame(
    frame_number: int,
    process_every_n_frames: int = 5,
) -> bool:
    """
    Decide whether YOLO should process the current frame.

    Processing every frame is slow on a CPU. For example,
    with process_every_n_frames=5, YOLO processes frames:

    0, 5, 10, 15, 20, ...

    The frames between them can still be displayed normally.
    """

    if process_every_n_frames < 1:
        raise ValueError(
            "process_every_n_frames must be at least 1."
        )

    return frame_number % process_every_n_frames == 0


def process_video_frame(
    frame: ImageArray,
    frame_number: int,
    process_every_n_frames: int = 5,
    confidence_threshold: float = 0.20,
) -> dict[str, Any]:
    """
    Process one video or webcam frame in memory.

    Nothing is written to uploads or outputs.

    YOLO is skipped on some frames to improve performance.
    """

    if frame is None or frame.size == 0:
        raise ValueError(
            "The video frame is empty."
        )

    process_this_frame = should_process_frame(
        frame_number=frame_number,
        process_every_n_frames=process_every_n_frames,
    )

    if not process_this_frame:
        return {
            "processed": False,
            "frame_number": frame_number,
            "detection_count": 0,
            "detections": [],
            "annotated_image": None,
        }

    detection_result = detect_license_plates(
        original_image=frame,
        confidence_threshold=confidence_threshold,
    )

    return {
        "processed": True,
        "frame_number": frame_number,
        "detection_count": detection_result[
            "detection_count"
        ],
        "detections": detection_result[
            "detections"
        ],
        "annotated_image": detection_result[
            "annotated_image"
        ],
    }