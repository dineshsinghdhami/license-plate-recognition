import ImageUploader from "./components/ImageUploader";
import WebcamDetector from "./components/WebcamDetector";

import "./App.css";


function App() {
  return (
    <main className="app-container">
      <section className="hero">
        <p className="eyebrow">
          Nepal Traffic Police
        </p>

        <h1>
          License Plate Recognition System
        </h1>

        <p className="description">
          Detect license plates from uploaded images
          or a live camera feed. Images and frames are
          processed temporarily and are not stored.
        </p>

        <ImageUploader />

        <section className="live-camera-section">
          <div className="live-camera-heading">
            <span>03</span>

            <div>
              <h2>Live camera detection</h2>

              <p>
                Start your webcam to detect license plates
                from live frames.
              </p>
            </div>
          </div>

          <WebcamDetector />
        </section>
      </section>
    </main>
  );
}


export default App;