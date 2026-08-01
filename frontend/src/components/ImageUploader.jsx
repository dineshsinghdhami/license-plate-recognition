import { useEffect, useState } from "react";

import {
  uploadVehicleImage,
} from "../services/api";
import "./ImageUploader.css";


export default function ImageUploader() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadResult, setUploadResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);


  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedFile);

    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);


  async function processSelectedImage(file) {
    try {
      setIsProcessing(true);
      setErrorMessage("");
      setUploadResult(null);

      const result = await uploadVehicleImage(file);

      setUploadResult(result);
    } catch (error) {
      setErrorMessage(
        error.message || "Something went wrong.",
      );
    } finally {
      setIsProcessing(false);
    }
  }


  function handleFileChange(event) {
    const file = event.target.files?.[0];

    setUploadResult(null);
    setErrorMessage("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
    ];

    if (!allowedTypes.includes(file.type)) {
      setSelectedFile(null);

      setErrorMessage(
        "Please select a JPG, JPEG, or PNG image.",
      );

      event.target.value = "";
      return;
    }

    const maximumSize = 5 * 1024 * 1024;

    if (file.size > maximumSize) {
      setSelectedFile(null);

      setErrorMessage(
        "The selected image must be smaller than 5 MB.",
      );

      event.target.value = "";
      return;
    }

    setSelectedFile(file);

    processSelectedImage(file);
  }


  const firstDetection =
    uploadResult?.detection?.objects?.[0];

  const detectionConfidence = firstDetection
    ? (firstDetection.confidence * 100).toFixed(1)
    : null;

  const ocrConfidence =
    firstDetection?.ocr_results?.length > 0
      ? (
          firstDetection.ocr_results[0].confidence * 100
        ).toFixed(1)
      : "0.0";


  return (
    <section className="scan-station">

      <section className="lane-input" aria-label="Upload vehicle image">
        <h2>Upload a vehicle photo</h2>
        <p className="lede">
          It's read and matched right away — nothing gets saved on the server.
        </p>

        <label className="drop-zone" htmlFor="vehicle-image">
          <span className="drop-zone__title">Click to choose an image</span>
          <span className="drop-zone__hint">jpg, jpeg or png, up to 5MB</span>

          <input
            id="vehicle-image"
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            onChange={handleFileChange}
          />
        </label>

        {selectedFile && (
          <p className="file-meta">
            {selectedFile.name} · {(selectedFile.size / 1024).toFixed(1)} KB
          </p>
        )}

        {previewUrl && (
          <img
            src={previewUrl}
            alt="Selected vehicle preview"
            className="preview-image"
          />
        )}

        {isProcessing && (
          <p className="status-line" role="status">
            Detecting the plate and reading the text…
          </p>
        )}

        {errorMessage && (
          <p className="status-line status-line--error" role="alert">
            {errorMessage}
          </p>
        )}
      </section>

      <section className="lane-output" aria-label="Recognition result">

        {!uploadResult && !isProcessing && (
          <div className="placeholder">
            <p>Nothing to show yet — pick an image on the left.</p>
          </div>
        )}

        {isProcessing && (
          <div className="placeholder">
            <span className="spinner" aria-hidden="true" />
            <p>Running detection, then OCR on whatever it finds…</p>
          </div>
        )}

        {uploadResult && !firstDetection && (
          <div>
            <p className="result-status result-status--none">
              Couldn't find a plate in that one
            </p>
            <img
              src={uploadResult.detection.annotated_image}
              alt="Detection result, no plate found"
              className="preview-image"
            />
            <p className="lede">
              Try a shot where the plate sits larger in the frame and isn't at an angle.
            </p>
          </div>
        )}

        {uploadResult && firstDetection && (
          <div>
            <p className="result-status">Found a plate</p>

            <img
              src={uploadResult.detection.annotated_image}
              alt="License plate detection result"
              className="preview-image"
            />

            <div className="plate-result">
              <span className="plate-result__text">
                {firstDetection.plate_text || "couldn't read the characters"}
              </span>
              <span className="plate-result__conf">
                detection {detectionConfidence}% · ocr {ocrConfidence}%
              </span>
            </div>

            {firstDetection.crop_image && (
              <div className="crop-row">
                <img
                  src={firstDetection.crop_image}
                  alt="Cropped license plate"
                  className="crop-row__image"
                />
                <span className="crop-row__label">cropped from the frame above</span>
              </div>
            )}

            <p className="coords">
              box: {firstDetection.bounding_box.x1}, {firstDetection.bounding_box.y1}
              {" "}&rarr;{" "}
              {firstDetection.bounding_box.x2}, {firstDetection.bounding_box.y2}
            </p>
          </div>
        )}
      </section>
    </section>
  );
}