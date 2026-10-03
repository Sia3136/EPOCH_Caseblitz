import zipfile
from pathlib import Path
from typing import List
from .config import MAX_ZIP_BYTES, MAX_CLIPS, VIDEO_EXTS


class UploadError(ValueError):
    """Message is safe to show directly in the UI."""


def validate_zip(path: Path) -> List[str]:
    """Return the list of video filenames inside, or raise UploadError."""
    path = Path(path)
    if path.stat().st_size > MAX_ZIP_BYTES:
        raise UploadError("Zip is larger than 500 MB.")
    if not zipfile.is_zipfile(path):
        raise UploadError("File is not a valid zip archive.")
    with zipfile.ZipFile(path) as z:
        if z.testzip() is not None:
            raise UploadError("Zip is corrupted.")
        videos = [
            n for n in z.namelist()
            if not n.endswith("/")
            and "__MACOSX" not in n
            and Path(n).suffix.lower() in VIDEO_EXTS
        ]
    if not videos:
        raise UploadError("No video files found in the zip.")
    if len(videos) > MAX_CLIPS:
        raise UploadError(f"Zip has {len(videos)} videos; the limit is {MAX_CLIPS}.")
    return videos


def safe_extract(zip_path: Path, dest: Path) -> None:
    """Extract while blocking path traversal (zip-slip)."""
    dest = Path(dest).resolve()
    dest.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as z:
        for member in z.namelist():
            target = (dest / member).resolve()
            if not str(target).startswith(str(dest)):
                raise UploadError("Zip contains unsafe paths.")
        z.extractall(dest)
