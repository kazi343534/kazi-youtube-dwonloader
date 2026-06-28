# YouTube Downloader

Chrome extension + Python backend to download YouTube videos with yt-dlp and ffmpeg.

## Features

- Download button injected directly on YouTube video pages
- Popup for manual URL entry
- Simple quality selection: 4K / 1440p / 1080p / 720p / Audio only
- Auto-merges separate video and audio streams
- Invalid/private video errors shown in the extension popup

## Requirements

- Python 3.8+
- [ffmpeg](https://ffmpeg.org/) (`brew install ffmpeg`)
- Google Chrome

## Setup

### 1. Install Python dependencies

```bash
pip3 install flask flask-cors yt-dlp
```

### 2. Install ffmpeg

```bash
brew install ffmpeg
```

### 3. Start the backend server

```bash
cd backend
python3 server.py
```

Keep this terminal open. The server runs on `http://127.0.0.1:8765`.

### 4. Load the extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked**
4. Select the `extension` folder

## Usage

- Browse YouTube — a **Download** button appears below the video
- Click it to select a quality and start downloading
- Or click the extension icon to paste any YouTube URL manually

## Project Structure

```
youtube-downloader/
├── backend/
│   ├── server.py          # Flask API powered by yt-dlp
│   ├── requirements.txt
│   └── downloads/         # Temp download directory (auto-cleaned)
├── extension/
│   ├── manifest.json      # Chrome extension manifest v3
│   ├── background.js      # Service worker (bridges extension to backend)
│   ├── content.js         # Injects download button on YouTube pages
│   ├── content.css        # Styles for injected UI
│   ├── popup.html         # Popup UI
│   ├── popup.js
│   ├── popup.css
│   └── icons/
└── README.md
```
