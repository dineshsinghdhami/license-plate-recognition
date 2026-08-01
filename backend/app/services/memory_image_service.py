import base64

import cv2
import numpy as np
from numpy.typing import NDArray


ImageArray = NDArray[np.uint8]


def decode_image_bytes(
    file_contents: bytes,
) -> ImageArray:
    """
    Convert uploaded image bytes into an OpenCV image
    without saving the file to the computer.
    """

    if not file_contents:
        raise ValueError(
            "The uploaded image is empty."
        )

    image_buffer = np.frombuffer(
        file_contents,
        dtype=np.uint8,
    )

    image = cv2.imdecode(
        image_buffer,
        cv2.IMREAD_COLOR,
    )

    if image is None:
        raise ValueError(
            "The uploaded file is not a valid image."
        )

    return image


def encode_image_as_data_url(
    image: ImageArray,
    extension: str = ".jpg",
) -> str:
    """
    Convert an OpenCV image into a Base64 data URL
    that React can display directly.
    """

    if image is None or image.size == 0:
        raise ValueError(
            "The image cannot be empty."
        )

    normalized_extension = extension.lower()

    if normalized_extension not in {
        ".jpg",
        ".jpeg",
        ".png",
    }:
        raise ValueError(
            "Only JPG and PNG encoding is supported."
        )

    success, encoded_image = cv2.imencode(
        normalized_extension,
        image,
    )

    if not success:
        raise RuntimeError(
            "The image could not be encoded."
        )

    base64_text = base64.b64encode(
        encoded_image.tobytes()
    ).decode("utf-8")

    mime_type = (
        "image/png"
        if normalized_extension == ".png"
        else "image/jpeg"
    )

    return (
        f"data:{mime_type};base64,"
        f"{base64_text}"
    )