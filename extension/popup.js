const backendStatus = document.getElementById("backendStatus");
const videoUrlInput = document.getElementById("videoUrl");
const fetchInfoBtn = document.getElementById("fetchInfo");
const videoInfo = document.getElementById("videoInfo");
const videoTitle = document.getElementById("videoTitle");
const formatsContainer = document.getElementById("formatsContainer");
const errorMsg = document.getElementById("errorMsg");

async function checkBackend() {
  try {
    const resp = await chrome.runtime.sendMessage({ action: "backendStatus" });
    if (resp.success) {
      backendStatus.textContent = "Online";
      backendStatus.className = "status-online";
    } else {
      throw new Error(resp.error);
    }
  } catch {
    backendStatus.textContent = "Offline";
    backendStatus.className = "status-offline";
  }
}

checkBackend();
setInterval(checkBackend, 5000);

async function fetchFormats() {
  const url = videoUrlInput.value.trim();
  if (!url) {
    showError("Please enter a YouTube URL");
    return;
  }

  videoInfo.classList.add("hidden");
  errorMsg.classList.add("hidden");
  fetchInfoBtn.disabled = true;
  fetchInfoBtn.textContent = "Loading...";

  try {
    const resp = await chrome.runtime.sendMessage({ action: "getInfo", url });
    if (!resp.success) {
      showError(resp.error || "Failed to fetch video info");
      return;
    }

    const data = resp.data;
    videoTitle.textContent = data.title;
    formatsContainer.innerHTML = "";

    const formats = data.formats || [];
    const heights = [...new Set(formats
      .filter((f) => f.resolution && f.vcodec && f.vcodec !== "none")
      .map((f) => parseInt(f.resolution.match(/\d+/)?.[0] || 0))
      .filter((h) => h > 0)
    )].sort((a, b) => b - a);

    const options = [];
    if (heights.length > 0) {
      for (const h of heights) {
        let label = h >= 2160 ? "4K" : h >= 1440 ? "1440p" : `${h}p`;
        if (h >= 2160) label = `4K (${h}p)`;
        else if (h >= 1440) label = `1440p (${h}p)`;
        else label = `${h}p`;
        const formatSpec = `bestvideo[height<=${h}]+bestaudio/best[height<=${h}]`;
        options.push({ label, format_id: formatSpec });
        if (h <= 720) break;
      }
    } else {
      options.push({ label: "Best quality", format_id: "bestvideo+bestaudio/best" });
    }
    options.push({ label: "Audio only", format_id: "bestaudio/best" });

    for (const opt of options) {
      const btn = document.createElement("button");
      btn.className = "format-btn";
      btn.textContent = opt.label;

      const formatSpec = opt.format_id;
      btn.addEventListener("click", async () => {
        btn.textContent = "Downloading...";
        btn.disabled = true;
        const dlResp = await chrome.runtime.sendMessage({
          action: "download",
          url,
          format_id: formatSpec,
        });
        if (dlResp.success && dlResp.url) {
          const win = window.open(dlResp.url, "_blank");
          if (!win) {
            chrome.tabs.create({ url: dlResp.url, active: false });
          }
          btn.textContent = "Download started!";
          btn.disabled = true;
        } else {
          showError(dlResp.error || "Download failed");
          btn.textContent = opt.label;
          btn.disabled = false;
        }
      });

      formatsContainer.appendChild(btn);
    }

    videoInfo.classList.remove("hidden");
  } catch (err) {
    showError(err.message);
  } finally {
    fetchInfoBtn.disabled = false;
    fetchInfoBtn.textContent = "Fetch";
  }
}

fetchInfoBtn.addEventListener("click", fetchFormats);
videoUrlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") fetchFormats();
});

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove("hidden");
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = tabs[0]?.url || "";
  if (url.includes("youtube.com/watch") && !url.includes("list=")) {
    videoUrlInput.value = url;
    fetchFormats();
  } else if (url.includes("youtube.com/watch")) {
    videoUrlInput.value = url.split("&list=")[0];
  }
});
