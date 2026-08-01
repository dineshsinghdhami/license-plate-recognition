from pathlib import Path
from typing import Any

import cv2
from ultralytics import YOLO


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
    Load the custom license plate model once
    and reuse it for future requests.
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


def detect_objects(
    source_path: Path,
    output_path: Path,
    crop_output_directory: Path,
    unique_name: str,
    confidence_threshold: float = 0.35,
) -> dict[str, Any]:
    """
    Detect license plates, save an annotated image,
    and save a separate cropped image for each plate.
    """

    model = get_license_plate_model()

    original_image = cv2.imread(
        str(source_path)
    )

    if original_image is None:
        raise ValueError(
            "The source image could not be opened."
        )

    results = model.predict(
        source=str(source_path),
        conf=confidence_threshold,
        device="cpu",
        verbose=False,
    )

    if not results:
        raise RuntimeError(
            "YOLO returned no prediction result."
        )

    result = results[0]

    annotated_image = result.plot()

    saved = cv2.imwrite(
        str(output_path),
        annotated_image,
    )

    if not saved:
        raise RuntimeError(
            "The detection image could not be saved."
        )

    crop_output_directory.mkdir(
        parents=True,
        exist_ok=True,
    )

    image_height, image_width = (
        original_image.shape[:2]
    )

    detections: list[dict[str, Any]] = []

    if result.boxes is not None:
        for index, box in enumerate(
            result.boxes,
            start=1,
        ):
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

            class_name = result.names[class_id]

            cropped_plate = original_image[
                y1:y2,
                x1:x2,
            ]

            crop_filename = (
                f"{unique_name}_plate_{index}.jpg"
            )

            crop_path = (
                crop_output_directory
                / crop_filename
            )

            if cropped_plate.size == 0:
                crop_url = None
            else:
                crop_saved = cv2.imwrite(
                    str(crop_path),
                    cropped_plate,
                )

                if not crop_saved:
                    raise RuntimeError(
                        "A detected license plate crop "
                        "could not be saved."
                    )

                crop_url = (
                    f"/outputs/{crop_filename}"
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
                    "crop_filename": crop_filename,
                    "crop_url": crop_url,
                }
            )

    return {
        "detection_count": len(detections),
        "detections": detections,
    }