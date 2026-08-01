import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  analyzeVideoFrame,
} from "../services/api";


export default function WebcamDetector() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const frameNumberRef = useRef(0);
  const requestRunningRef = useRef(false);

  const [isCameraRunning, setIsCameraRunning] =
    useState(false);

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [detectionResult, setDetectionResult] =
    useState(null);


  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);


  async function startCamera() {
    try {
      setErrorMessage("");
      setDetectionResult(null);

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
            facingMode: "environment",
          },
          audio: false,
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await videoRef.current.play();
      }

      setIsCameraRunning(true);

      startFrameProcessing();
    } catch (error) {
      setErrorMessage(
        error.message
          || "The camera could not be started.",
      );
    }
  }


  function stopCamera() {
    if (intervalRef.current) {
      window.clearInterval(
        intervalRef.current,
      );

      intervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    requestRunningRef.current = false;

    setIsCameraRunning(false);
    setIsAnalyzing(false);
  }


  function startFrameProcessing() {
    if (intervalRef.current) {
      window.clearInterval(
        intervalRef.current,
      );
    }

    intervalRef.current = window.setInterval(
      captureAndAnalyzeFrame,
      600,
    );
  }


  async function captureAndAnalyzeFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (
      !video
      || !canvas
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
    setIsAnalyzing(true);

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
          "The camera canvas could not be created.",
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
            0.72,
          );
        });

      if (!frameBlob) {
        throw new Error(
          "The webcam frame could not be created.",
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
          || "The webcam frame could not be analyzed.",
      );
    } finally {
      requestRunningRef.current = false;
      setIsAnalyzing(false);
    }
  }


  const firstDetection =
    detectionResult?.detections?.[0];


  return (
    <section className="webcam-detector">
      <div className="webcam-controls">
        {!isCameraRunning ? (
          <button
            type="button"
            onClick={startCamera}
          >
            Start live camera
          </button>
        ) : (
          <button
            type="button"
            onClick={stopCamera}
          >
            Stop camera
          </button>
        )}

        {isAnalyzing && (
          <span>
            Analyzing live frame…
          </span>
        )}
      </div>

      {errorMessage && (
        <p role="alert">
          {errorMessage}
        </p>
      )}

      <div className="webcam-layout">
        <div>
          <h3>Live camera</h3>

          <video
            ref={videoRef}
            muted
            playsInline
            className="webcam-video"
          />
        </div>

        <div>
          <h3>Latest detection</h3>

          {detectionResult?.annotated_image ? (
            <img
              src={
                detectionResult.annotated_image
              }
              alt="Latest live license plate detection"
              className="webcam-result-image"
            />
          ) : (
            <div className="webcam-empty-result">
              No processed frame yet
            </div>
          )}

          {firstDetection && (
            <div className="webcam-detection-info">
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
            </div>
          )}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        hidden
      />
    </section>
  );
}