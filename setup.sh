#!/usr/bin/env bash
set -e

echo "=== YouTube Downloader - Setup ==="

# Install Python deps
echo "[1/3] Installing Python dependencies..."
pip3 install flask flask-cors yt-dlp 2>&1 | tail -1

# Install ffmpeg
echo "[2/3] Installing ffmpeg..."
if command -v brew &> /dev/null; then
  brew install ffmpeg 2>&1 | tail -1
elif command -v apt &> /dev/null; then
  sudo apt install -y ffmpeg 2>&1 | tail -1
elif command -v pacman &> /dev/null; then
  sudo pacman -S ffmpeg 2>&1 | tail -1
else
  echo "Please install ffmpeg manually: https://ffmpeg.org/download.html"
fi

# Start server
echo "[3/3] Starting backend server..."
cd "$(dirname "$0")/backend"
python3 server.py
