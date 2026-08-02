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
  const canvasRef = useRef(null);
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

  const [detectionResult, setDetectionResult] =
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

    setSelectedVideo(null);
    setDetectionResult(null);
    setErrorMessage("");
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
      700,
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


  async function captureAndAnalyzeFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (
      !video
      || !canvas
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
      const maximumWidth = 640;

      const scale = Math.min(
        1,
        maximumWidth / videoWidth,
      );

      canvas.width = Math.round(
        videoWidth * scale,
      );

      canvas.height = Math.round(
        videoHeight * scale,
      );

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "The video canvas could not be created.",
        );
      }

      context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      const frameBlob =
        await new Promise((resolve) => {
          canvas.toBlob(
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

      if (result.processed) {
        setDetectionResult(result);
      }
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
  }


  const firstDetection =
    detectionResult?.detections?.[0];


  return (
    <section className="video-detector">
      <header className="video-detector__heading">
        <h2>Upload traffic video</h2>

        <p>
          The video stays in your browser. Temporary frames
          are analyzed in memory and are not stored.
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

      <div className="video-detection-layout">
        <section>
          <h3>Uploaded video</h3>

          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              playsInline
              className="video-player"
              onPlay={handleVideoPlay}
              onPause={handleVideoPause}
              onEnded={handleVideoEnded}
            />
          ) : (
            <div className="video-empty-state">
              Select a video to begin
            </div>
          )}

          {isProcessing && (
            <p className="video-processing-status">
              Analyzing current video frame…
            </p>
          )}
        </section>

        <section>
          <h3>Latest license-plate detection</h3>

          {detectionResult?.annotated_image ? (
            <img
              src={detectionResult.annotated_image}
              alt="Latest video license plate detection"
              className="video-result-image"
            />
          ) : (
            <div className="video-empty-state">
              Play the video to start detection
            </div>
          )}

          {firstDetection && (
            <div className="video-detection-information">
              <p>
                <strong>Class:</strong>{" "}
                {firstDetection.class_name}
              </p>

              <p>
                <strong>Confidence:</strong>{" "}
                {(
                  firstDetection.confidence * 100
                ).toFixed(1)}
                %
              </p>

              {firstDetection.crop_image && (
                <img
                  src={firstDetection.crop_image}
                  alt="Cropped license plate"
                  className="video-plate-crop"
                />
              )}
            </div>
          )}
        </section>
      </div>

      <canvas
        ref={canvasRef}
        hidden
      />
    </section>
  );
}