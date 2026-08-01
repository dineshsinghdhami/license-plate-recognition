import { useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL;

export default function ImageUploader() {

    const [selectedImage, setSelectedImage] = useState(null);

    const [message, setMessage] = useState("");

    async function uploadImage() {

        if (!selectedImage) return;

        const formData = new FormData();

        formData.append("file", selectedImage);

        const response = await fetch(`${API}/upload/`, {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        setMessage(data.message);
    }

    return (

        <div>

            <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                    setSelectedImage(e.target.files[0])
                }
            />

            <br />

            <button onClick={uploadImage}>
                Upload
            </button>

            <p>{message}</p>

        </div>

    );

}