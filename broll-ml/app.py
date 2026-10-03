"""Streamlit application for uploading and searching a b-roll library."""
from pathlib import Path
import shutil
import uuid
from zipfile import ZipFile

from ml.indexing import index_videos_parallel, unique_video_paths
from ml.ranking import similarity_to_percentage
from ml.search import MAX_QUERY_WORDS, search_videos
from ml.script_processor import search_script
from ml.video_processor import SUPPORTED_VIDEO_EXTENSIONS
from ml.video_processor import MAX_VIDEO_DURATION


ROOT = Path(__file__).resolve().parent
VIDEO_ROOT = ROOT / "data" / "videos"
MAX_UPLOAD_BYTES = 500 * 1024 * 1024
MAX_VIDEO_COUNT = 50
INDEX_WORKERS = 4


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


def validate_videos(video_paths, include_reasons=False):
    """Return readable paths and optionally reasons for skipped videos."""
    from ml.video_processor import extract_video_frames

    valid = []
    skipped = []
    skip_reasons = {}
    for path in video_paths:
        try:
            result = extract_video_frames(path, max_frames=1)
        except (OSError, ValueError):
            result = {"frames": [], "duration": 0.0}
        if result["frames"] and result["duration"] <= MAX_VIDEO_DURATION:
            valid.append(path)
        else:
            skipped.append(path)
            if result.get("error") == "video_longer_than_60_seconds":
                skip_reasons[path] = (
                    f"longer than {MAX_VIDEO_DURATION:.0f} seconds "
                    f"({result['duration']:.1f}s)"
                )
            else:
                skip_reasons[path] = "OpenCV could not open or decode a frame"
    if include_reasons:
        return valid, skipped, skip_reasons
    return valid, skipped


def render_result(result, st):
    columns = st.columns([1, 2])
    video_path = Path(result["video_path"])
    with columns[0]:
        thumbnail = result.get("thumbnail_path")
        if thumbnail and Path(thumbnail).exists():
            st.image(thumbnail, use_container_width=True)
    with columns[1]:
        st.subheader(result["filename"])
        st.write(
            f"Relevant timestamp: {result['start_time']:.1f}s - "
            f"{result['end_time']:.1f}s  "
            f"| confidence {result['confidence_score']}%"
        )
        st.caption(
            "Why this clip was chosen: "
            f"{result['explanation']} The strongest match occurs from "
            f"{result['start_time']:.1f}s to {result['end_time']:.1f}s "
            f"with {result['confidence_score']}% confidence."
        )
        if result.get("caption"):
            st.caption(f"Context: {result['caption']}")
        if not video_path.is_file():
            st.warning(
                "This result is unavailable because its source video was "
                "removed. Upload and index the video library again."
            )
            return
        st.video(
            str(video_path),
            start_time=result["start_time"],
            end_time=result["end_time"],
        )


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
                valid, skipped, skip_reasons = validate_videos(
                    paths, include_reasons=True
                )
                unique = unique_video_paths(valid)
                st.write(f"Readable videos: {len(valid)}")
                st.write(f"Unique videos: {len(unique)}")
                st.write(f"Skipped videos: {len(skipped)}")
                for skipped_path in skipped:
                    st.warning(
                        f"Rejected {skipped_path.name}: "
                        f"{skip_reasons[skipped_path]}"
                    )
                if not unique:
                    raise ValueError(
                        "No videos were accepted. Check the rejection reasons above."
                    )
                st.write(
                    f"Indexing with {INDEX_WORKERS} parallel video workers..."
                )
                segments = index_videos_parallel(
                    unique, workers=INDEX_WORKERS
                )
                st.session_state["indexed"] = True
                status.update(label="Indexing complete", state="complete")
                st.success(f"Indexed {len(unique)} videos into {len(segments)} segments.")
        except Exception as error:
            st.error(str(error))

    st.divider()
    from ml.storage import INDEX_PATH

    if not INDEX_PATH.exists():
        st.info("Upload and index a video library to begin searching.")

    query = st.text_area(
        "Search your video library",
        placeholder=(
            "Describe footage or paste narration, for example: "
            "A person walking through a busy city."
        ),
    )
    st.caption(f"Maximum input: {MAX_QUERY_WORDS} words")
    if st.button("Search", type="primary") and query.strip():
        try:
            # One input supports both a short request and multi-sentence narration.
            script_results = search_script(query, search_videos)
            if len(script_results["scenes"]) > 1:
                for scene in script_results["scenes"]:
                    st.markdown(
                        f"**Scene {scene['scene_index']}:** {scene['sentence']}"
                    )
                    if not scene["results"]:
                        st.info("No relevant footage found for this sentence.")
                    for result in scene["results"]:
                        render_result(result, st)
            else:
                results = search_videos(query)
                if results:
                    for result in results:
                        render_result(result, st)
                else:
                    st.warning("No relevant footage found. Try another description.")
        except ValueError as error:
            st.error(str(error))


if __name__ == "__main__":
    main()