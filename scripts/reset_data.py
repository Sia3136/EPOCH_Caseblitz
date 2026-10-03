from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent.parent

DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "broll.db"
INDEX_DIR = DATA_DIR / "index"
THUMB_DIR = DATA_DIR / "thumbnails"


def remove_path(path):
    if path.is_file():
        path.unlink()
        print(f"Deleted file: {path}")

    elif path.is_dir():
        shutil.rmtree(path)
        print(f"Deleted directory: {path}")


def main():
    print("Resetting B-roll data...")

    remove_path(DB_PATH)
    remove_path(INDEX_DIR)
    remove_path(THUMB_DIR)

    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    THUMB_DIR.mkdir(parents=True, exist_ok=True)

    print("Data reset complete.")
    print("Upload your B-roll ZIP again.")


if __name__ == "__main__":
    main()