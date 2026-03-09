import os
import random
import pandas as pd

FISH_ROOT_DIR = r"D:\Hirusha\fish_data\train"
EXTRAS_ROOT   = r"D:\Hirusha\fish_data\extras"
OUTPUT_CSV    = "fish_dataset_multistage.csv"
SEED = 42

NOT_FISH_SAMPLES = None
OTHER_FISH_SAMPLES = None

random.seed(SEED)

IMG_EXTS = (".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG")


def list_images(folder):
    imgs = []
    for root, _, files in os.walk(folder):
        for f in files:
            if f.lower().endswith((".jpg", ".jpeg", ".png")):
                imgs.append(os.path.join(root, f))
    return imgs


def process_fish_pairs(fish_root_dir):
    rows = []

    for species_folder in os.listdir(fish_root_dir):
        species_path = os.path.join(fish_root_dir, species_folder)
        if not os.path.isdir(species_path):
            continue

        for grade_folder in os.listdir(species_path):
            grade_path = os.path.join(species_path, grade_folder)
            if not os.path.isdir(grade_path):
                continue

            grade_label = grade_folder.split("_")[-1] if "_" in grade_folder else grade_folder
            fish_dict = {}

            for filename in os.listdir(grade_path):
                if not filename.lower().endswith((".jpg", ".jpeg", ".png")):
                    continue

                name_no_ext = os.path.splitext(filename)[0]
                parts = name_no_ext.split("_")

                if len(parts) < 4:
                    continue

                fish_id = "_".join(parts[:3])
                side = parts[3].upper()

                if side not in ("L", "R"):
                    continue

                full_path = os.path.join(grade_path, filename)
                fish_dict.setdefault(fish_id, {})
                fish_dict[fish_id][side] = full_path

            for fish_id, sides in fish_dict.items():
                if "L" in sides and "R" in sides:
                    rows.append({
                        "fish_id": fish_id,
                        "left_image": sides["L"],
                        "right_image": sides["R"],
                        "binary_label": "fish",
                        "species_label": species_folder,
                        "grade_label": grade_label,
                        "sample_type": "target_fish",
                        "is_real_pair": 1,
                    })

    return rows


def make_single_image_rows(images, n_samples, prefix, binary_label, species_label, sample_type):
    if len(images) == 0:
        return []

    if n_samples is None:
        n_samples = len(images)

    selected = images if n_samples <= len(images) else [random.choice(images) for _ in range(n_samples)]

    rows = []
    for i, img in enumerate(selected):
        rows.append({
            "fish_id": f"{prefix}_{i:06d}",
            "left_image": img,
            "right_image": img,   # duplicate same image instead of fake random pair
            "binary_label": binary_label,
            "species_label": species_label,
            "grade_label": "none",
            "sample_type": sample_type,
            "is_real_pair": 0,
        })
    return rows


def main():
    fish_rows = process_fish_pairs(FISH_ROOT_DIR)
    fish_count = len(fish_rows)
    print("Fish paired samples:", fish_count)

    not_fish_dir = os.path.join(EXTRAS_ROOT, "not_fish")
    other_fish_dir = os.path.join(EXTRAS_ROOT, "other_fish")

    rows = fish_rows

    if os.path.isdir(not_fish_dir):
        not_fish_imgs = list_images(not_fish_dir)
        n = NOT_FISH_SAMPLES if NOT_FISH_SAMPLES is not None else min(len(not_fish_imgs), fish_count)
        rows += make_single_image_rows(
            not_fish_imgs, n, "notfish",
            binary_label="non_fish",
            species_label="none",
            sample_type="not_fish"
        )

    if os.path.isdir(other_fish_dir):
        other_fish_imgs = list_images(other_fish_dir)

        # Recommended: treat other_fish as non-target for stage 1
        n = OTHER_FISH_SAMPLES if OTHER_FISH_SAMPLES is not None else min(len(other_fish_imgs), fish_count)
        rows += make_single_image_rows(
            other_fish_imgs, n, "otherfish",
            binary_label="non_fish",
            species_label="none",
            sample_type="other_fish"
        )

    df = pd.DataFrame(rows)
    df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8")

    print("\nCSV created successfully")
    print("Total samples:", len(df))
    print("Saved as:", OUTPUT_CSV)
    print(df["binary_label"].value_counts())
    print(df["sample_type"].value_counts())


if __name__ == "__main__":
    main()