let downloadBtn = null;
let formatPopup = null;

function getVideoUrl() {
  const url = new URL(window.location.href);
  const v = url.searchParams.get("v");
  if (v) return `https://www.youtube.com/watch?v=${v}`;
  return null;
}

function injectDownloadButton() {
  if (downloadBtn || !getVideoUrl()) return;

  const toolbar = document.querySelector("#top-level-buttons-computed");
  if (!toolbar) return;

  downloadBtn = document.createElement("button");
  downloadBtn.className = "yt-download-btn";
  downloadBtn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
    <span>Download</span>
  `;
  downloadBtn.addEventListener("click", async () => {
    const url = getVideoUrl();
    if (!url) return;
    const resp = await chrome.runtime.sendMessage({
      action: "getFormats",
      url,
    });
    if (resp.success) {
      showFormatPopup(resp.data.formats, url);
    } else {
      showToast("Backend offline. Start the backend server.");
    }
  });

  toolbar.appendChild(downloadBtn);
}

function showFormatPopup(formats, url) {
  removeFormatPopup();

  formatPopup = document.createElement("div");
  formatPopup.className = "yt-format-popup";

  const header = document.createElement("div");
  header.className = "yt-format-popup-header";
  header.innerHTML = "<h3>Select format</h3><button class='yt-format-close'>&times;</button>";
  header.querySelector(".yt-format-close").addEventListener("click", removeFormatPopup);
  formatPopup.appendChild(header);

  const list = document.createElement("div");
  list.className = "yt-format-list";

  const heights = [...new Set(formats
    .filter((f) => f.resolution && f.vcodec && f.vcodec !== "none")
    .map((f) => parseInt(f.resolution.match(/\d+/)?.[0] || 0))
    .filter((h) => h > 0)
  )].sort((a, b) => b - a);

  const options = [];
  if (heights.length > 0) {
    for (const h of heights) {
      const label = h >= 2160 ? `4K (${h}p)` : h >= 1440 ? `1440p (${h}p)` : `${h}p`;
      const formatSpec = `bestvideo[height<=${h}]+bestaudio/best[height<=${h}]`;
      options.push({ label, format_id: formatSpec });
      if (h <= 720) break;
    }
  } else {
    options.push({ label: "Best quality", format_id: "bestvideo+bestaudio/best" });
  }
  options.push({ label: "Audio only", format_id: "bestaudio/best" });

  options.forEach((opt) => {
    const item = document.createElement("div");
    item.className = "yt-format-item";
    item.innerHTML = `<span>${opt.label}</span>`;
    const formatSpec = opt.format_id;
    item.addEventListener("click", async () => {
      removeFormatPopup();
      showToast("Downloading...");
      const resp = await chrome.runtime.sendMessage({
        action: "download",
        url,
        format_id: formatSpec,
      });
      if (resp.success) {
        showToast("Download started!");
      } else {
        showToast(`Error: ${resp.error}`);
      }
    });
    list.appendChild(item);
  });

  formatPopup.appendChild(list);
  document.body.appendChild(formatPopup);
}

function removeFormatPopup() {
  if (formatPopup) {
    formatPopup.remove();
    formatPopup = null;
  }
}

function showToast(message) {
  const existing = document.querySelector(".yt-download-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "yt-download-toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

const observer = new MutationObserver(() => {
  if (!downloadBtn && getVideoUrl()) {
    injectDownloadButton();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

injectDownloadButton();

window.addEventListener("yt-navigate-finish", () => {
  downloadBtn = null;
  removeFormatPopup();
  setTimeout(injectDownloadButton, 500);
});
