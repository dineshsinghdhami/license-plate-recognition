import { useEffect, useState } from "react";
import { getBackendHealth } from "./services/api";
import "./App.css";

function App() {
  const [backendStatus, setBackendStatus] = useState("checking");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function checkBackend() {
      try {
        const data = await getBackendHealth();

        setBackendStatus(data.status);
        setErrorMessage("");
      } catch (error) {
        setBackendStatus("unavailable");
        setErrorMessage(error.message);
      }
    }

    checkBackend();
  }, []);

  return (
    <main className="app-container">
      <section className="hero">
        <p className="eyebrow">Computer Vision Project</p>

        <h1>License Plate Recognition</h1>

        <p className="description">
          Upload a vehicle image and recognize its license plate.
        </p>

        <div className={`status-box status-${backendStatus}`}>
          <span className="status-indicator" />

          <div>
            <strong>Backend status</strong>
            <p>{backendStatus}</p>
          </div>
        </div>

        {errorMessage && (
          <p className="error-message">
            Error: {errorMessage}
          </p>
        )}

        <button type="button">
          Select Vehicle Image
        </button>
      </section>
    </main>
  );
}

export default App;