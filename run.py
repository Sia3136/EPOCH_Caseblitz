"""
Start the FrameFind backend.

Usage (from the repo root):
    python run.py               # default: port 8000, auto-reload on
    python run.py --port 8001   # custom port
    python run.py --no-reload   # production-style (no file watcher)

Why this file exists:
    uvicorn must be launched from the repo root so that both
    `backend.*` and `ml.*` are importable as top-level packages.
    Running `uvicorn backend.main:app` from inside /backend would
    break all `from ml.xxx import` statements in backend/ml.py.
"""
import argparse
import sys
import uvicorn


def main():
    parser = argparse.ArgumentParser(description="Run the FrameFind FastAPI backend.")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Bind port (default: 8000)")
    parser.add_argument("--no-reload", dest="reload", action="store_false",
                        help="Disable auto-reload (use in production)")
    parser.set_defaults(reload=True)
    args = parser.parse_args()

    print(f"\n  FrameFind backend starting on http://{args.host}:{args.port}")
    print(f"  Auto-reload: {'on' if args.reload else 'off'}")
    print(f"  API docs:    http://{args.host}:{args.port}/docs\n")

    uvicorn.run(
        "backend.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        reload_dirs=["."],   # watch both backend/ and ml/
    )


if __name__ == "__main__":
    main()
