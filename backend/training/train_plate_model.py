from pathlib import Path

import torch
from ultralytics import YOLO


def main() -> None:
    # This is the main LICENSE-PLATE-RECOGNITION folder.
    project_directory = Path(__file__).resolve().parents[2]

    # Complete location of data.yaml.
    dataset_yaml_path = (
        project_directory
        / "data"
        / "license_plate_dataset"
        / "data.yaml"
    )

    # YOLO training results will be stored here.
    model_output_directory = (
        project_directory
        / "models"
        / "license_plate"
    )

    # Stop with a clear error if data.yaml is missing.
    if not dataset_yaml_path.exists():
        raise FileNotFoundError(
            "The dataset configuration file was not found.\n"
            f"Expected location: {dataset_yaml_path}"
        )

    # Create the output folder if it does not exist.
    model_output_directory.mkdir(
        parents=True,
        exist_ok=True,
    )

    # Use the NVIDIA GPU when CUDA is available.
    # Otherwise, train using the CPU.
    device = 0 if torch.cuda.is_available() else "cpu"

    print("=" * 60)
    print("LICENSE PLATE MODEL TRAINING")
    print("=" * 60)
    print(f"Dataset: {dataset_yaml_path}")
    print(f"Output folder: {model_output_directory}")
    print(f"Training device: {device}")
    print("=" * 60)

    # Load a small pretrained YOLO model.
    # It may download automatically the first time.
    model = YOLO("yolo26n.pt")

    # Start custom license-plate training.
    model.train(
        data=str(dataset_yaml_path),
        epochs=100,
        imgsz=640,
        batch=4,
        device=device,
        workers=0,
        project=str(model_output_directory),
        name="license_plate_detector",
        exist_ok=True,
    )

    print("=" * 60)
    print("TRAINING FINISHED")
    print("=" * 60)


if __name__ == "__main__":
    main()