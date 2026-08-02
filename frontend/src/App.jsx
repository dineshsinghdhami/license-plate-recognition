import ImageUploader from "./components/ImageUploader";
import VideoDetector from "./components/VideoDetector";

import "./App.css";


function App() {
  return (
    <main className="app-container">
      <section className="hero">
        <p className="eyebrow">
          Computer Vision Project
        </p>

        <h1>
          License Plate Detection System
        </h1>

        <p className="description">
          Detect license plates from images and uploaded
          videos. Files are processed temporarily and are
          not stored by the backend.
        </p>

        <ImageUploader />

        <section className="video-upload-section">
          <div className="video-upload-heading">
            <span>02</span>

            <div>
              <h2>Video license-plate detection</h2>

              <p>
                Upload and play a traffic video to analyze
                selected frames without saving the video.
              </p>
            </div>
          </div>

          <VideoDetector />
        </section>
      </section>
    </main>
  );
}


export default App;