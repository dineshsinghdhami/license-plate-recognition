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
      setErrorMessage(error.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="uploader">
      <label className="file-label" htmlFor="vehicle-image">
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
            <strong>Filename:</strong> {selectedFile.name}
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
        {isUploading ? "Uploading..." : "Upload and process"}
      </button>

      {message && (
        <p className="success-message">{message}</p>
      )}

      {errorMessage && (
        <p className="error-message">{errorMessage}</p>
      )}

      {uploadResult && (
        <div className="result-section">
          <h2>Processing result</h2>

          <div className="image-comparison">
            <article>
              <h3>Original</h3>

              <img
                src={`${API_BASE_URL}${uploadResult.original_url}`}
                alt="Uploaded vehicle"
                className="preview-image"
              />
            </article>

            <article>
              <h3>Grayscale</h3>

              <img
                src={`${API_BASE_URL}${uploadResult.processed_url}`}
                alt="Grayscale vehicle"
                className="preview-image"
              />
            </article>
          </div>

          <p>
            Image dimensions: {uploadResult.width} ×{" "}
            {uploadResult.height} pixels
          </p>
        </div>
      )}
    </section>
  );
}