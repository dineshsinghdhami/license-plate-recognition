from pathlib import Path
from typing import Any

import numpy as np
from numpy.typing import NDArray
from ultralytics import YOLO

from app.services.memory_image_service import (
    encode_image_as_data_url,
)


ImageArray = NDArray[np.uint8]


PROJECT_DIRECTORY = Path(__file__).resolve().parents[3]

LICENSE_PLATE_MODEL_PATH = (
    PROJECT_DIRECTORY
    / "models"
    / "license_plate"
    / "license_plate_detector"
    / "weights"
    / "best.pt"
)

_model: YOLO | None = None


def get_license_plate_model() -> YOLO:
    """
    Load the custom YOLO model once and reuse it.
    """

    global _model

    if _model is None:
        if not LICENSE_PLATE_MODEL_PATH.exists():
            raise FileNotFoundError(
                "The custom license plate model was not found.\n"
                f"Expected location: {LICENSE_PLATE_MODEL_PATH}"
            )

        _model = YOLO(
            str(LICENSE_PLATE_MODEL_PATH)
        )

    return _model


def detect_license_plates(
    original_image: ImageArray,
    confidence_threshold: float = 0.20,
    image_size: int = 512,
    include_annotated_image: bool = True,
) -> dict[str, Any]:
    """
    Detect license plates from an in-memory image.

    image_size:
        Higher values preserve more detail for small and
        distant plates, but require more processing time.

    include_annotated_image:
        Image uploads can request an annotated image.
        Video frames can disable it and use coordinates only.

    Nothing is saved to disk.
    """

    if original_image is None or original_image.size == 0:
        raise ValueError(
            "The source image is empty."
        )

    if image_size < 320:
        raise ValueError(
            "image_size must be at least 320."
        )

    model = get_license_plate_model()

    results = model.predict(
        source=original_image,
        conf=confidence_threshold,
        imgsz=image_size,
        device="cpu",
        verbose=False,
    )

    if not results:
        raise RuntimeError(
            "YOLO returned no prediction result."
        )

    result = results[0]

    image_height, image_width = original_image.shape[:2]

    detections: list[dict[str, Any]] = []

    if result.boxes is not None:
        for box in result.boxes:
            class_id = int(box.cls.item())
            confidence = float(box.conf.item())

            x1_float, y1_float, x2_float, y2_float = (
                box.xyxy[0].tolist()
            )

            x1 = max(
                0,
                int(round(x1_float)),
            )

            y1 = max(
                0,
                int(round(y1_float)),
            )

            x2 = min(
                image_width,
                int(round(x2_float)),
            )

            y2 = min(
                image_height,
                int(round(y2_float)),
            )

            class_name = str(
                result.names[class_id]
            )

            cropped_plate = original_image[
                y1:y2,
                x1:x2,
            ]

            crop_data_url: str | None = None

            if cropped_plate.size > 0:
                crop_data_url = encode_image_as_data_url(
                    cropped_plate,
                    extension=".jpg",
                )

            detections.append(
                {
                    "class_id": class_id,
                    "class_name": class_name,
                    "confidence": round(
                        confidence,
                        4,
                    ),
                    "bounding_box": {
                        "x1": x1,
                        "y1": y1,
                        "x2": x2,
                        "y2": y2,
                    },
                    "crop_image": crop_data_url,
                }
            )

    annotated_image: str | None = None

    if include_annotated_image:
        plotted_image = result.plot()

        annotated_image = encode_image_as_data_url(
            plotted_image,
            extension=".jpg",
        )

    return {
        "detection_count": len(detections),
        "detections": detections,
        "annotated_image": annotated_image,
    }