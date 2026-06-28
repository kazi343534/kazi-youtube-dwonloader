import os
import subprocess
import json
import tempfile
import shutil
from pathlib import Path
from flask import Flask, request, jsonify, send_file, Response, after_this_request
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)
CORS(app)

DOWNLOAD_DIR = Path(__file__).parent / "downloads"
DOWNLOAD_DIR.mkdir(exist_ok=True)


@app.route("/info", methods=["GET"])
def get_video_info():
    url = request.args.get("url")
    if not url:
        return jsonify({"error": "Missing url parameter"}), 400

    try:
        ydl_opts = {"quiet": True, "no_warnings": True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            formats = []
            for f in info.get("formats", []):
                formats.append({
                    "format_id": f.get("format_id"),
                    "ext": f.get("ext"),
                    "resolution": f.get("resolution") or f.get("format_note", ""),
                    "filesize": f.get("filesize") or f.get("filesize_approx"),
                    "vcodec": f.get("vcodec"),
                    "acodec": f.get("acodec"),
                    "fps": f.get("fps"),
                })
            return jsonify({
                "title": info.get("title"),
                "duration": info.get("duration"),
                "thumbnail": info.get("thumbnail"),
                "formats": formats,
                "url": url,
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/download", methods=["GET", "POST"])
def download_video():
    if request.method == "GET":
        url = request.args.get("url")
        format_id = request.args.get("format_id", "best")
    else:
        data = request.get_json()
        url = data.get("url")
        format_id = data.get("format_id", "best")

    if not url:
        return jsonify({"error": "Missing url"}), 400

    try:
        with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True}) as ydl:
            info = ydl.extract_info(url, download=False)
            selected = next((f for f in info.get("formats", []) if f.get("format_id") == format_id), None)
            if selected:
                has_video = selected.get("vcodec") and selected["vcodec"] != "none"
                has_audio = selected.get("acodec") and selected["acodec"] != "none"
                if has_video and not has_audio:
                    format_id = f"{format_id}+bestaudio/best"

        tmp_dir = Path(tempfile.mkdtemp(dir=DOWNLOAD_DIR))
        output_template = str(tmp_dir / "%(title)s.%(ext)s")

        ydl_opts = {
            "format": format_id,
            "outtmpl": output_template,
            "quiet": True,
            "no_warnings": True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            ext = info.get("ext", "mp4")
            final_path = tmp_dir / f"{info['title']}.{ext}"

            if not final_path.exists():
                files = list(tmp_dir.iterdir())
                if files:
                    final_path = files[0]
                else:
                    shutil.rmtree(tmp_dir, ignore_errors=True)
                    return jsonify({"error": "Downloaded file not found"}), 500

            @after_this_request
            def cleanup(response):
                shutil.rmtree(tmp_dir, ignore_errors=True)
                return response

            return send_file(
                str(final_path),
                as_attachment=True,
                download_name=final_path.name,
            )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/formats", methods=["GET"])
def get_formats():
    url = request.args.get("url")
    if not url:
        return jsonify({"error": "Missing url parameter"}), 400

    try:
        ydl_opts = {"quiet": True, "no_warnings": True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            formats = []
            for f in info.get("formats", []):
                formats.append({
                    "format_id": f.get("format_id"),
                    "ext": f.get("ext"),
                    "resolution": f.get("resolution") or f.get("format_note", ""),
                    "filesize": f.get("filesize"),
                    "vcodec": f.get("vcodec"),
                    "acodec": f.get("acodec"),
                })
            return jsonify({
                "title": info.get("title"),
                "formats": formats,
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/status")
def status():
    return jsonify({"status": "running", "download_dir": str(DOWNLOAD_DIR)})


if __name__ == "__main__":
    print(f"Downloads will be saved to: {DOWNLOAD_DIR}")
    print("Starting YouTube Downloader API on http://127.0.0.1:8765")
    app.run(host="127.0.0.1", port=8765, debug=False)
