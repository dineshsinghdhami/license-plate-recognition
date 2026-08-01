from typing import Any

import cv2
import easyocr
import numpy as np
from numpy.typing import NDArray


ImageArray = NDArray[np.uint8]

_reader: easyocr.Reader | None = None


def get_ocr_reader() -> easyocr.Reader:
    """
    Load EasyOCR once and reuse it.

    Languages:
    - ne = Nepali
    - en = English
    """

    global _reader

    if _reader is None:
        _reader = easyocr.Reader(
            ["ne", "en"],
            gpu=False,
        )

    return _reader


def convert_to_python_type(
    value: Any,
) -> Any:
    """
    Convert NumPy values into normal Python values
    so FastAPI can return them as JSON.
    """

    if isinstance(value, np.integer):
        return int(value)

    if isinstance(value, np.floating):
        return float(value)

    if isinstance(value, np.ndarray):
        return [
            convert_to_python_type(item)
            for item in value.tolist()
        ]

    if isinstance(value, list):
        return [
            convert_to_python_type(item)
            for item in value
        ]

    if isinstance(value, tuple):
        return [
            convert_to_python_type(item)
            for item in value
        ]

    if isinstance(value, dict):
        return {
            key: convert_to_python_type(item)
            for key, item in value.items()
        }

    return value


def create_ocr_versions(
    plate_image: ImageArray,
) -> dict[str, ImageArray]:
    """
    Create multiple in-memory versions of the plate.

    OCR will test all versions and keep the best result.
    """

    if plate_image is None or plate_image.size == 0:
        raise ValueError(
            "The cropped plate image is empty."
        )

    height, width = plate_image.shape[:2]

    scale_factor = 4

    enlarged = cv2.resize(
        plate_image,
        (
            width * scale_factor,
            height * scale_factor,
        ),
        interpolation=cv2.INTER_CUBIC,
    )

    grayscale = cv2.cvtColor(
        enlarged,
        cv2.COLOR_BGR2GRAY,
    )

    clahe = cv2.createCLAHE(
        clipLimit=2.5,
        tileGridSize=(8, 8),
    )

    contrast = clahe.apply(
        grayscale,
    )

    denoised = cv2.bilateralFilter(
        contrast,
        d=7,
        sigmaColor=60,
        sigmaSpace=60,
    )

    sharpening_kernel = np.array(
        [
            [0, -1, 0],
            [-1, 5, -1],
            [0, -1, 0],
        ],
        dtype=np.float32,
    )

    sharpened = cv2.filter2D(
        denoised,
        ddepth=-1,
        kernel=sharpening_kernel,
    )

    adaptive_threshold = cv2.adaptiveThreshold(
        denoised,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        9,
    )

    otsu_threshold_value, otsu_threshold = cv2.threshold(
        denoised,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU,
    )

    _ = otsu_threshold_value

    inverted_adaptive = cv2.bitwise_not(
        adaptive_threshold
    )

    inverted_otsu = cv2.bitwise_not(
        otsu_threshold
    )

    return {
        "original_enlarged": enlarged,
        "grayscale": grayscale,
        "contrast": contrast,
        "sharpened": sharpened,
        "adaptive_threshold": adaptive_threshold,
        "adaptive_inverted": inverted_adaptive,
        "otsu_threshold": otsu_threshold,
        "otsu_inverted": inverted_otsu,
    }


def calculate_average_confidence(
    results: list,
) -> float:
    """
    Calculate the average confidence for one OCR attempt.
    """

    if not results:
        return 0.0

    confidences = [
        float(result[2])
        for result in results
        if len(result) >= 3
    ]

    if not confidences:
        return 0.0

    return sum(confidences) / len(confidences)


def read_plate_text(
    plate_image: ImageArray,
) -> dict[str, Any]:
    """
    Run OCR on multiple plate versions and keep
    the result with the highest average confidence.
    """

    reader = get_ocr_reader()

    image_versions = create_ocr_versions(
        plate_image=plate_image,
    )

    best_version_name = ""
    best_average_confidence = 0.0
    best_results: list = []

    all_attempts: list[dict[str, Any]] = []

    for version_name, image_version in image_versions.items():
        results = reader.readtext(
            image_version,
            detail=1,
            paragraph=False,
            decoder="beamsearch",
            beamWidth=5,
            text_threshold=0.5,
            low_text=0.3,
            link_threshold=0.3,
            mag_ratio=1.0,
        )

        average_confidence = calculate_average_confidence(
            results
        )

        attempt_text = " ".join(
            str(result[1]).strip()
            for result in results
            if len(result) >= 3
            and str(result[1]).strip()
        ).strip()

        all_attempts.append(
            {
                "version": version_name,
                "text": attempt_text,
                "average_confidence": round(
                    average_confidence,
                    4,
                ),
            }
        )

        if average_confidence > best_average_confidence:
            best_average_confidence = average_confidence
            best_version_name = version_name
            best_results = results

    detected_text_parts: list[str] = []
    ocr_results: list[dict[str, Any]] = []

    for result in best_results:
        bounding_box, text, confidence = result

        cleaned_text = str(text).strip()

        if not cleaned_text:
            continue

        detected_text_parts.append(
            cleaned_text
        )

        ocr_results.append(
            {
                "text": cleaned_text,
                "confidence": round(
                    float(confidence),
                    4,
                ),
                "bounding_box": convert_to_python_type(
                    bounding_box
                ),
            }
        )

    full_text = " ".join(
        detected_text_parts
    ).strip()

    return {
        "plate_text": full_text,
        "results": ocr_results,
        "best_version": best_version_name,
        "average_confidence": round(
            best_average_confidence,
            4,
        ),
        "attempts": all_attempts,
    }