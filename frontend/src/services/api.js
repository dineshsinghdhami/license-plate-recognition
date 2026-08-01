export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL;


if (!API_BASE_URL) {
  throw new Error(
    "VITE_API_BASE_URL is missing from frontend/.env",
  );
}


export async function getBackendHealth() {
  const response = await fetch(
    `${API_BASE_URL}/health`,
  );

  if (!response.ok) {
    throw new Error(
      `Backend returned status ${response.status}`,
    );
  }

  return response.json();
}


export async function uploadVehicleImage(file) {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/upload/`,
    {
      method: "POST",
      body: formData,
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail
        || "The image could not be analyzed.",
    );
  }

  return data;
}


export async function analyzeVideoFrame(
  frameBlob,
  frameNumber,
) {
  const formData = new FormData();

  formData.append(
    "file",
    frameBlob,
    `frame-${frameNumber}.jpg`,
  );

  const response = await fetch(
    `${API_BASE_URL}/video/frame?frame_number=${frameNumber}`,
    {
      method: "POST",
      body: formData,
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail
        || "The video frame could not be analyzed.",
    );
  }

  return data;
}