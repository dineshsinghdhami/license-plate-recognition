import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  analyzeVideoFrame,
} from "../services/api";


export default function VideoDetector() {
  const videoRef = useRef(null);

  // Used only to capture temporary video frames.
  const captureCanvasRef = useRef(null);

  // Displayed transparently over the playing video.
  const overlayCanvasRef = useRef(null);

  const intervalRef = useRef(null);
  const requestRunningRef = useRef(false);
  const frameNumberRef = useRef(0);

  const [selectedVideo, setSelectedVideo] =
    useState(null);

  const [videoUrl, setVideoUrl] = useState("");

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [latestDetections, setLatestDetections] =
    useState([]);

  const [latestFrameNumber, setLatestFrameNumber] =
    useState(null);


  useEffect(() => {
    if (!selectedVideo) {
      setVideoUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(
      selectedVideo,
    );

    setVideoUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedVideo]);


  useEffect(() => {
    return () => {
      stopFrameProcessing();
    };
  }, []);


  function handleVideoChange(event) {
    const file = event.target.files?.[0];

    stopFrameProcessing();
    clearOverlay();

    setSelectedVideo(null);
    setErrorMessage("");
    setLatestDetections([]);
    setLatestFrameNumber(null);

    frameNumberRef.current = 0;

    if (!file) {
      return;
    }

    const allowedTypes = [
      "video/mp4",
      "video/webm",
      "video/ogg",
    ];

    if (!allowedTypes.includes(file.type)) {
      setErrorMessage(
        "Please choose an MP4, WebM, or OGG video.",
      );

      event.target.value = "";
      return;
    }

    const maximumSize = 100 * 1024 * 1024;

    if (file.size > maximumSize) {
      setErrorMessage(
        "The selected video must be smaller than 100 MB.",
      );

      event.target.value = "";
      return;
    }

    setSelectedVideo(file);
  }


  function startFrameProcessing() {
    if (intervalRef.current) {
      return;
    }

    intervalRef.current = window.setInterval(
      captureAndAnalyzeFrame,
      500,
    );
  }


  function stopFrameProcessing() {
    if (intervalRef.current) {
      window.clearInterval(
        intervalRef.current,
      );

      intervalRef.current = null;
    }

    requestRunningRef.current = false;
    setIsProcessing(false);
  }


  function clearOverlay() {
    const canvas = overlayCanvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height,
    );
  }


  function resizeOverlayCanvas() {
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;

    if (!video || !canvas) {
      return;
    }

    const displayedWidth = video.clientWidth;
    const displayedHeight = video.clientHeight;

    if (!displayedWidth || !displayedHeight) {
      return;
    }

    canvas.width = displayedWidth;
    canvas.height = displayedHeight;

    drawDetections(
      latestDetections,
    );
  }


  function drawDetections(
    detections,
    sourceWidth = null,
    sourceHeight = null,
  ) {
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;

    if (!video || !canvas) {
      return;
    }

    const displayedWidth = video.clientWidth;
    const displayedHeight = video.clientHeight;

    if (!displayedWidth || !displayedHeight) {
      return;
    }

    canvas.width = displayedWidth;
    canvas.height = displayedHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height,
    );

    if (
      !detections
      || detections.length === 0
    ) {
      return;
    }

    const originalWidth =
      sourceWidth || video.videoWidth;

    const originalHeight =
      sourceHeight || video.videoHeight;

    if (!originalWidth || !originalHeight) {
      return;
    }

    const videoAspectRatio =
      originalWidth / originalHeight;

    const displayAspectRatio =
      displayedWidth / displayedHeight;

    let renderedWidth;
    let renderedHeight;
    let offsetX;
    let offsetY;

    /*
     * The video uses object-fit: contain.
     * These calculations account for black bars
     * around portrait or landscape videos.
     */
    if (displayAspectRatio > videoAspectRatio) {
      renderedHeight = displayedHeight;
      renderedWidth =
        renderedHeight * videoAspectRatio;

      offsetX =
        (displayedWidth - renderedWidth) / 2;

      offsetY = 0;
    } else {
      renderedWidth = displayedWidth;
      renderedHeight =
        renderedWidth / videoAspectRatio;

      offsetX = 0;

      offsetY =
        (displayedHeight - renderedHeight) / 2;
    }

    const scaleX =
      renderedWidth / originalWidth;

    const scaleY =
      renderedHeight / originalHeight;

    context.lineWidth = 3;
    context.font =
      "600 14px Arial, sans-serif";

    detections.forEach(
      (detection) => {
        const box = detection.bounding_box;

        const x =
          offsetX + box.x1 * scaleX;

        const y =
          offsetY + box.y1 * scaleY;

        const width =
          (box.x2 - box.x1) * scaleX;

        const height =
          (box.y2 - box.y1) * scaleY;

        const confidencePercentage =
          (
            detection.confidence * 100
          ).toFixed(1);

        const label =
          `license_plate ${confidencePercentage}%`;

        context.strokeStyle = "#f4b400";
        context.fillStyle = "#f4b400";

        context.strokeRect(
          x,
          y,
          width,
          height,
        );

        const textWidth =
          context.measureText(label).width;

        const labelHeight = 24;

        const labelY =
          Math.max(
            labelHeight,
            y,
          );

        context.fillRect(
          x,
          labelY - labelHeight,
          textWidth + 14,
          labelHeight,
        );

        context.fillStyle = "#171a1e";

        context.fillText(
          label,
          x + 7,
          labelY - 7,
        );
      },
    );
  }


  async function captureAndAnalyzeFrame() {
    const video = videoRef.current;
    const captureCanvas =
      captureCanvasRef.current;

    if (
      !video
      || !captureCanvas
      || video.paused
      || video.ended
      || video.readyState < 2
      || requestRunningRef.current
    ) {
      return;
    }

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (!videoWidth || !videoHeight) {
      return;
    }

    requestRunningRef.current = true;
    setIsProcessing(true);

    try {
      const maximumWidth = 1280;

      const scale = Math.min(
        1,
        maximumWidth / videoWidth,
      );

      captureCanvas.width = Math.round(
        videoWidth * scale,
      );

      captureCanvas.height = Math.round(
        videoHeight * scale,
      );

      const context =
        captureCanvas.getContext("2d");

      if (!context) {
        throw new Error(
          "The video canvas could not be created.",
        );
      }

      context.drawImage(
        video,
        0,
        0,
        captureCanvas.width,
        captureCanvas.height,
      );

      const frameBlob =
        await new Promise((resolve) => {
          captureCanvas.toBlob(
            resolve,
            "image/jpeg",
            0.7,
          );
        });

      if (!frameBlob) {
        throw new Error(
          "The video frame could not be created.",
        );
      }

      const currentFrameNumber =
        frameNumberRef.current;

      frameNumberRef.current += 1;

      const result = await analyzeVideoFrame(
        frameBlob,
        currentFrameNumber,
      );

      if (!result.processed) {
        return;
      }

      setLatestFrameNumber(
        result.frame_number,
      );

      setLatestDetections(
        result.detections,
      );

      drawDetections(
        result.detections,
        result.frame_width,
        result.frame_height,
      );
    } catch (error) {
      setErrorMessage(
        error.message
          || "The video frame could not be analyzed.",
      );

      stopFrameProcessing();
    } finally {
      requestRunningRef.current = false;
      setIsProcessing(false);
    }
  }


  function handleVideoPlay() {
    setErrorMessage("");
    startFrameProcessing();
  }


  function handleVideoPause() {
    stopFrameProcessing();
  }


  function handleVideoEnded() {
    stopFrameProcessing();
    clearOverlay();
  }


  function handleVideoLoadedMetadata() {
    resizeOverlayCanvas();
  }


  const firstDetection =
    latestDetections[0];


  return (
    <section className="video-detector">
      <header className="video-detector__heading">
        <h2>Upload traffic video</h2>

        <p>
          The video stays inside your browser.
          Temporary frames are analyzed in memory
          and are not stored.
        </p>
      </header>

      <label
        className="video-file-picker"
        htmlFor="traffic-video"
      >
        <strong>Choose a video</strong>

        <span>
          MP4, WebM or OGG — maximum 100 MB
        </span>

        <input
          id="traffic-video"
          type="file"
          accept="video/mp4,video/webm,video/ogg"
          onChange={handleVideoChange}
        />
      </label>

      {selectedVideo && (
        <p className="video-file-information">
          {selectedVideo.name}
          {" · "}
          {(selectedVideo.size / 1024 / 1024).toFixed(2)}
          {" MB"}
        </p>
      )}

      {errorMessage && (
        <p
          className="video-error-message"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      <section className="video-analysis-panel">
        <h3>Video license-plate detection</h3>

        {videoUrl ? (
          <div className="video-overlay-wrapper">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              playsInline
              className="video-player"
              onPlay={handleVideoPlay}
              onPause={handleVideoPause}
              onEnded={handleVideoEnded}
              onLoadedMetadata={
                handleVideoLoadedMetadata
              }
            />

            <canvas
              ref={overlayCanvasRef}
              className="video-overlay-canvas"
              aria-hidden="true"
            />
          </div>
        ) : (
          <div className="video-empty-state">
            Select a video to begin
          </div>
        )}

        <div className="video-status-bar">
          <span>
            {isProcessing
              ? "Analyzing frame..."
              : "Ready"}
          </span>

          <span>
            Detections: {latestDetections.length}
          </span>

          <span>
            Frame:{" "}
            {latestFrameNumber ?? "—"}
          </span>

          <span>
            Confidence:{" "}
            {firstDetection
              ? (
                  firstDetection.confidence
                  * 100
                ).toFixed(1)
              : "—"}
            {firstDetection ? "%" : ""}
          </span>
        </div>

        {firstDetection?.crop_image && (
          <div className="video-crop-summary">
            <span>
              Latest cropped license plate
            </span>

            <img
              src={firstDetection.crop_image}
              alt="Latest cropped license plate"
            />
          </div>
        )}
      </section>

      <canvas
        ref={captureCanvasRef}
        hidden
      />
    </section>
  );
}