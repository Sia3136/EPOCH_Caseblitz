"""Streamlit application for uploading and searching a b-roll library."""
from pathlib import Path
import shutil
import uuid
from zipfile import ZipFile

from ml.indexing import index_video, unique_video_paths
from ml.ranking import similarity_to_percentage
from ml.search import search_videos
from ml.script_processor import search_script
from ml.video_processor import SUPPORTED_VIDEO_EXTENSIONS


ROOT = Path(__file__).resolve().parent
VIDEO_ROOT = ROOT / "data" / "videos"
MAX_UPLOAD_BYTES = 500 * 1024 * 1024
MAX_VIDEO_COUNT = 50


def extract_video_zip(uploaded_file, destination=VIDEO_ROOT):
    """Safely extract supported videos from a ZIP upload."""
    size = getattr(uploaded_file, "size", None)
    if size is not None and size > MAX_UPLOAD_BYTES:
        raise ValueError("ZIP exceeds the 500 MB upload limit")

    destination = Path(destination).resolve()
    destination.mkdir(parents=True, exist_ok=True)
    job_dir = destination / f"upload_{uuid.uuid4().hex}"
    job_dir.mkdir()
    extracted = []
    total_uncompressed = 0

    try:
        with ZipFile(uploaded_file) as archive:
            candidates = [
                info for info in archive.infolist()
                if Path(info.filename).suffix.lower()
                in SUPPORTED_VIDEO_EXTENSIONS
                and not info.is_dir()
            ]
            if len(candidates) > MAX_VIDEO_COUNT:
                raise ValueError("ZIP contains more than 50 video files")

            for info in candidates:
                relative_path = Path(info.filename)
                target = (job_dir / relative_path).resolve()
                if not target.is_relative_to(job_dir):
                    raise ValueError("ZIP contains an unsafe file path")
                if info.external_attr >> 16 & 0o170000 == 0o120000:
                    raise ValueError("ZIP contains a symbolic link")

                total_uncompressed += info.file_size
                if total_uncompressed > MAX_UPLOAD_BYTES:
                    raise ValueError("Uncompressed ZIP content exceeds 500 MB")

                target.parent.mkdir(parents=True, exist_ok=True)
                with archive.open(info) as source, target.open("wb") as sink:
                    shutil.copyfileobj(source, sink, length=1024 * 1024)
                extracted.append(target)
    except Exception:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise

    return extracted


def validate_videos(video_paths):
    """Return paths that OpenCV can read at least one frame from."""
    from ml.video_processor import extract_video_frames

    valid = []
    skipped = []
    for path in video_paths:
        try:
            result = extract_video_frames(path, max_frames=1)
        except (OSError, ValueError):
            result = {"frames": [], "duration": 0.0}
        if result["frames"] and result["duration"] <= 60:
            valid.append(path)
        else:
            skipped.append(path)
    return valid, skipped


def render_result(result, st):
    columns = st.columns([1, 2])
    with columns[0]:
        thumbnail = result.get("thumbnail_path")
        if thumbnail and Path(thumbnail).exists():
            st.image(thumbnail, use_container_width=True)
    with columns[1]:
        st.subheader(result["filename"])
        st.write(
            f"{result['start_time']:.1f}s - {result['end_time']:.1f}s  "
            f"| similarity {result['similarity']:.4f}  "
            f"| match {similarity_to_percentage(result['similarity'])}%"
        )
        st.caption(result["explanation"])
        st.video(result["video_path"], start_time=int(result["start_time"]))


def main():
    import streamlit as st

    st.set_page_config(
        page_title="B-roll AI Search",
        page_icon="🎬",
        layout="wide",
    )
    st.title("AI-Powered B-roll Search")
    st.write("Find the right footage using natural language.")

    uploaded_zip = st.file_uploader(
        "Upload your video library (ZIP)", type=["zip"]
    )
    if uploaded_zip and st.button("Index video library", type="primary"):
        try:
            with st.status("Extracting and indexing videos...", expanded=True) as status:
                paths = extract_video_zip(uploaded_zip)
                valid, skipped = validate_videos(paths)
                unique = unique_video_paths(valid)
                st.write(f"Readable videos: {len(valid)}")
                st.write(f"Unique videos: {len(unique)}")
                st.write(f"Skipped unreadable videos: {len(skipped)}")
                if not unique:
                    raise ValueError("The ZIP contains no readable videos")
                progress = st.progress(0.0)
                segments = []
                for index, path in enumerate(unique, start=1):
                    segments.extend(index_video(path))
                    progress.progress(index / len(unique))
                from ml.storage import save_library

                save_library(segments)
                st.session_state["indexed"] = True
                status.update(label="Indexing complete", state="complete")
                st.success(f"Indexed {len(unique)} videos into {len(segments)} segments.")
        except Exception as error:
            st.error(str(error))

    st.divider()
    from ml.storage import INDEX_PATH

    if not INDEX_PATH.exists():
        st.info("Upload and index a video library to begin searching.")

    mode = st.radio("Search mode", ["Text Search", "Script Search"], horizontal=True)
    threshold = st.slider("Minimum similarity", 0.0, 1.0, 0.20, 0.01)

    if mode == "Text Search":
        query = st.text_input(
            "Describe the footage you're looking for",
            placeholder="A person walking through a busy city",
        )
        if st.button("Search", type="primary") and query.strip():
            results = search_videos(query, threshold=threshold)
            if results:
                for result in results:
                    render_result(result, st)
            else:
                st.warning("No relevant footage found. Try another description.")
    else:
        script = st.text_area(
            "Paste your narration or script",
            placeholder="The city wakes up as people begin their morning commute.",
        )
        if st.button("Search script", type="primary") and script.strip():
            scenes = search_script(
                script,
                lambda sentence: search_videos(
                    sentence, threshold=threshold
                ),
            )
            for scene in scenes["scenes"]:
                st.markdown(f"**Scene {scene['scene_index']}:** {scene['sentence']}")
                if not scene["results"]:
                    st.info("No relevant footage found for this sentence.")
                for result in scene["results"]:
                    render_result(result, st)


if __name__ == "__main__":
    main()