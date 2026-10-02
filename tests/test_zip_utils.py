import zipfile
import pytest
from backend.zip_utils import validate_zip, UploadError


def make_zip(tmp_path, names):
    p = tmp_path / "t.zip"
    with zipfile.ZipFile(p, "w") as z:
        for n in names:
            z.writestr(n, b"x")
    return p


def test_valid(tmp_path):
    assert validate_zip(make_zip(tmp_path, ["a.mp4", "notes.txt"])) == ["a.mp4"]


def test_not_zip(tmp_path):
    p = tmp_path / "bad.zip"
    p.write_bytes(b"hello")
    with pytest.raises(UploadError):
        validate_zip(p)


def test_no_videos(tmp_path):
    with pytest.raises(UploadError):
        validate_zip(make_zip(tmp_path, ["a.txt"]))


def test_too_many(tmp_path):
    with pytest.raises(UploadError):
        validate_zip(make_zip(tmp_path, [f"{i}.mp4" for i in range(51)]))
