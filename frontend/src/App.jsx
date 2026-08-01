import ImageUploader from "./components/ImageUploader";
import "./App.css";

function App() {
  return (
    <main className="app-container">
      <section className="hero">
        <p className="eyebrow">Computer Vision Project</p>

        <h1>License Plate Recognition</h1>

        <p className="description">
          Upload a vehicle image to begin processing it with
          OpenCV.
        </p>

        <ImageUploader />
      </section>
    </main>
  );
}

export default App;