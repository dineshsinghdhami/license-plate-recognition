import "./App.css";

function App() {
  return (
    <main className="app-container">
      <section className="hero">
        <p className="eyebrow">Computer Vision Project</p>

        <h1>License Plate Recognition</h1>

        <p className="description">
          Upload a vehicle image and recognize its license plate.
        </p>

        <button type="button">
          Select Vehicle Image
        </button>
      </section>
    </main>
  );
}

export default App;