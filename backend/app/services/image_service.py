from pathlib import Path

import cv2


def create_grayscale_image(
    source_path: Path,
    output_path: Path,
) -> tuple[int, int]:
    """Read an image, convert it to grayscale, and save the result."""

    image = cv2.imread(str(source_path))

    if image is None:
        raise ValueError("The uploaded file is not a valid image.")

    height, width = image.shape[:2]

    grayscale_image = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY,
    )

    saved = cv2.imwrite(
        str(output_path),
        grayscale_image,
    )

    if not saved:
        raise RuntimeError("The processed image could not be saved.")

    return width, height