import { useEffect, useState } from "react";

import {
  API_BASE_URL,
  uploadVehicleImage,
} from "../services/api";


export default function ImageUploader() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadResult, setUploadResult] = useState(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);


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


  function handleFileChange(event) {
    const file = event.target.files?.[0];

    setUploadResult(null);
    setMessage("");
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
  }


  async function handleUpload() {
    if (!selectedFile) {
      setErrorMessage("Please select an image first.");
      return;
    }

    try {
      setIsUploading(true);
      setMessage("");
      setErrorMessage("");
      setUploadResult(null);

      const result = await uploadVehicleImage(selectedFile);

      setUploadResult(result);
      setMessage(result.message);
    } catch (error) {
      setErrorMessage(
        error.message || "Something went wrong.",
      );
    } finally {
      setIsUploading(false);
    }
  }


  return (
    <section className="uploader">
      <label
        className="file-label"
        htmlFor="vehicle-image"
      >
        Select a vehicle image
      </label>

      <input
        id="vehicle-image"
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        onChange={handleFileChange}
      />

      {selectedFile && (
        <div className="file-information">
          <p>
            <strong>Filename:</strong>{" "}
            {selectedFile.name}
          </p>

          <p>
            <strong>Size:</strong>{" "}
            {(selectedFile.size / 1024).toFixed(2)} KB
          </p>
        </div>
      )}

      {previewUrl && (
        <div className="image-section">
          <h2>Selected image</h2>

          <img
            src={previewUrl}
            alt="Selected vehicle preview"
            className="preview-image"
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleUpload}
        disabled={!selectedFile || isUploading}
      >
        {isUploading
          ? "Uploading and processing..."
          : "Upload and process"}
      </button>

      {message && (
        <p className="success-message">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="error-message">
          {errorMessage}
        </p>
      )}

      {uploadResult && (
        <div className="result-section">
          <h2>Image preprocessing results</h2>

          <div className="image-comparison">
            <article>
              <h3>Original</h3>

              <img
                src={`${API_BASE_URL}${uploadResult.original_url}`}
                alt="Original vehicle"
                className="preview-image"
              />
            </article>

            {Object.entries(
              uploadResult.processed_images,
            ).map(([name, url]) => (
              <article key={name}>
                <h3>
                  {name.charAt(0).toUpperCase()
                    + name.slice(1)}
                </h3>

                <img
                  src={`${API_BASE_URL}${url}`}
                  alt={`${name} processing result`}
                  className="preview-image"
                />
              </article>
            ))}
          </div>

          <div className="dimensions-box">
            <p>
              <strong>Original dimensions:</strong>{" "}
              {uploadResult.dimensions.original_width}
              {" × "}
              {uploadResult.dimensions.original_height}
            </p>

            <p>
              <strong>Processed dimensions:</strong>{" "}
              {uploadResult.dimensions.processed_width}
              {" × "}
              {uploadResult.dimensions.processed_height}
            </p>
          </div>

          {uploadResult.detection && (
            <section className="detection-section">
              <h2>YOLO Object Detection</h2>

              <img
                src={`${API_BASE_URL}${uploadResult.detection.image_url}`}
                alt="YOLO object detection result"
                className="preview-image"
              />

              <p className="detection-summary">
                <strong>Detected objects:</strong>{" "}
                {uploadResult.detection.count}
              </p>

              {uploadResult.detection.objects.length > 0 ? (
                <div className="detection-list">
                  {uploadResult.detection.objects.map(
                    (detectedObject, index) => (
                      <article
                        className="detection-item"
                        key={`${detectedObject.class_name}-${index}`}
                      >
                        <h3>
                          {index + 1}.{" "}
                          {detectedObject.class_name}
                        </h3>

                        <p>
                          <strong>Confidence:</strong>{" "}
                          {(
                            detectedObject.confidence * 100
                          ).toFixed(2)}
                          %
                        </p>

                        <p>
                          <strong>Bounding box:</strong>
                        </p>

                        <p>
                          x1:{" "}
                          {
                            detectedObject.bounding_box.x1
                          }
                        </p>

                        <p>
                          y1:{" "}
                          {
                            detectedObject.bounding_box.y1
                          }
                        </p>

                        <p>
                          x2:{" "}
                          {
                            detectedObject.bounding_box.x2
                          }
                        </p>

                        <p>
                          y2:{" "}
                          {
                            detectedObject.bounding_box.y2
                          }
                        </p>
                      </article>
                    ),
                  )}
                </div>
              ) : (
                <p>
                  No common objects were detected in this
                  image.
                </p>
              )}
            </section>
          )}
        </div>
      )}
    </section>
  );
}