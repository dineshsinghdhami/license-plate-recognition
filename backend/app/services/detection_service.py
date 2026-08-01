from pathlib import Path
from typing import Any

import cv2
from ultralytics import YOLO


PROJECT_DIRECTORY = Path(__file__).resolve().parents[3]
GENERAL_MODEL_PATH = (
    PROJECT_DIRECTORY
    / "models"
    / "general"
    / "yolo26n.pt"
)

_model: YOLO | None = None


def get_general_model() -> YOLO:
    """
    Load the YOLO model once and reuse it for later requests.
    """

    global _model

    if _model is None:
        if GENERAL_MODEL_PATH.exists():
            _model = YOLO(str(GENERAL_MODEL_PATH))
        else:
            # Ultralytics downloads the model automatically
            # when it is not available locally.
            _model = YOLO("yolo26n.pt")

    return _model


def detect_objects(
    source_path: Path,
    output_path: Path,
    confidence_threshold: float = 0.35,
) -> dict[str, Any]:
    """
    Detect common objects in an image and save an annotated result.
    """

    model = get_general_model()

    results = model.predict(
        source=str(source_path),
        conf=confidence_threshold,
        verbose=False,
    )

    if not results:
        raise RuntimeError("YOLO returned no prediction result.")

    result = results[0]

    annotated_image = result.plot()

    saved = cv2.imwrite(
        str(output_path),
        annotated_image,
    )

    if not saved:
        raise RuntimeError(
            "The YOLO detection image could not be saved."
        )

    detections: list[dict[str, Any]] = []

    if result.boxes is not None:
        for box in result.boxes:
            class_id = int(box.cls.item())
            confidence = float(box.conf.item())

            x1, y1, x2, y2 = [
                round(float(value), 2)
                for value in box.xyxy[0].tolist()
            ]

            class_name = result.names[class_id]

            detections.append(
                {
                    "class_id": class_id,
                    "class_name": class_name,
                    "confidence": round(confidence, 4),
                    "bounding_box": {
                        "x1": x1,
                        "y1": y1,
                        "x2": x2,
                        "y2": y2,
                    },
                }
            )

    return {
        "detection_count": len(detections),
        "detections": detections,
    }