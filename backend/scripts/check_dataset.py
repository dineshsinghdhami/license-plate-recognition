from pathlib import Path


ALLOWED_IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
}


def check_split(
    split_name: str,
    images_directory: Path,
    labels_directory: Path,
) -> bool:
    image_files = sorted(
        file
        for file in images_directory.iterdir()
        if file.suffix.lower() in ALLOWED_IMAGE_EXTENSIONS
    )

    label_files = sorted(
        file
        for file in labels_directory.iterdir()
        if file.suffix.lower() == ".txt"
        and file.name.lower() != "classes.txt"
    )

    image_names = {
        file.stem
        for file in image_files
    }

    label_names = {
        file.stem
        for file in label_files
    }

    images_without_labels = sorted(
        image_names - label_names
    )

    labels_without_images = sorted(
        label_names - image_names
    )

    print("=" * 60)
    print(f"{split_name.upper()} DATASET CHECK")
    print("=" * 60)

    print(f"Images found: {len(image_files)}")
    print(f"Labels found: {len(label_files)}")
    print()

    if images_without_labels:
        print("Images without matching labels:")

        for name in images_without_labels:
            print(f"  - {name}")
    else:
        print("Every image has a matching label.")

    print()

    if labels_without_images:
        print("Labels without matching images:")

        for name in labels_without_images:
            print(f"  - {name}")
    else:
        print("Every label has a matching image.")

    print()

    passed = (
        not images_without_labels
        and not labels_without_images
    )

    if passed:
        print(f"{split_name.upper()} DATASET CHECK PASSED")
    else:
        print(f"{split_name.upper()} DATASET CHECK FAILED")

    print()

    return passed


def main() -> None:
    project_directory = Path(__file__).resolve().parents[2]

    dataset_directory = (
        project_directory
        / "data"
        / "license_plate_dataset"
    )

    all_splits_passed = True

    for split_name in ["train", "val", "test"]:
        images_directory = (
            dataset_directory
            / "images"
            / split_name
        )

        labels_directory = (
            dataset_directory
            / "labels"
            / split_name
        )

        if not images_directory.exists():
            print(
                f"Missing images directory: "
                f"{images_directory}"
            )

            all_splits_passed = False
            continue

        if not labels_directory.exists():
            print(
                f"Missing labels directory: "
                f"{labels_directory}"
            )

            all_splits_passed = False
            continue

        split_passed = check_split(
            split_name=split_name,
            images_directory=images_directory,
            labels_directory=labels_directory,
        )

        if not split_passed:
            all_splits_passed = False

    print("=" * 60)

    if all_splits_passed:
        print("COMPLETE DATASET CHECK PASSED")
    else:
        print("COMPLETE DATASET CHECK FAILED")

    print("=" * 60)


if __name__ == "__main__":
    main()