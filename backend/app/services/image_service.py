from pathlib import Path

import cv2
import numpy as np


def process_vehicle_image(
    source_path: Path,
    output_directory: Path,
    unique_name: str,
) -> dict[str, str | int]:
    image = cv2.imread(str(source_path))

    if image is None:
        raise ValueError("The uploaded file is not a valid image.")

    height, width = image.shape[:2]

    # Resize very large images while preserving aspect ratio.
    maximum_width = 1200

    if width > maximum_width:
        scale = maximum_width / width
        resized_width = int(width * scale)
        resized_height = int(height * scale)

        image = cv2.resize(
            image,
            (resized_width, resized_height),
            interpolation=cv2.INTER_AREA,
        )

    processed_height, processed_width = image.shape[:2]

    grayscale = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY,
    )

    blurred = cv2.GaussianBlur(
        grayscale,
        (5, 5),
        0,
    )

    contrast_enhanced = cv2.equalizeHist(grayscale)

    _, thresholded = cv2.threshold(
        blurred,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU,
    )

    edges = cv2.Canny(
        blurred,
        100,
        200,
    )

    filenames = {
        "resized": f"{unique_name}_resized.jpg",
        "grayscale": f"{unique_name}_grayscale.jpg",
        "blurred": f"{unique_name}_blurred.jpg",
        "contrast": f"{unique_name}_contrast.jpg",
        "threshold": f"{unique_name}_threshold.jpg",
        "edges": f"{unique_name}_edges.jpg",
    }

    images_to_save: dict[str, np.ndarray] = {
        "resized": image,
        "grayscale": grayscale,
        "blurred": blurred,
        "contrast": contrast_enhanced,
        "threshold": thresholded,
        "edges": edges,
    }

    for image_type, processed_image in images_to_save.items():
        output_path = output_directory / filenames[image_type]

        saved = cv2.imwrite(
            str(output_path),
            processed_image,
        )

        if not saved:
            raise RuntimeError(
                f"Could not save the {image_type} image."
            )

    return {
        "original_width": width,
        "original_height": height,
        "processed_width": processed_width,
        "processed_height": processed_height,
        "resized_filename": filenames["resized"],
        "grayscale_filename": filenames["grayscale"],
        "blurred_filename": filenames["blurred"],
        "contrast_filename": filenames["contrast"],
        "threshold_filename": filenames["threshold"],
        "edges_filename": filenames["edges"],
    }