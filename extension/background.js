const BACKEND_URL = "http://127.0.0.1:8765";
const TIMEOUT_MS = 60000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handlers = {
    async getInfo() {
      const r = await fetchWithTimeout(`${BACKEND_URL}/info?url=${encodeURIComponent(message.url)}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to get video info");
      return { success: true, data };
    },
    async getFormats() {
      const r = await fetchWithTimeout(`${BACKEND_URL}/formats?url=${encodeURIComponent(message.url)}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to get formats");
      return { success: true, data };
    },
    async download() {
      const dlUrl = `${BACKEND_URL}/download?url=${encodeURIComponent(message.url)}&format_id=${encodeURIComponent(message.format_id)}`;
      return { success: true, url: dlUrl };
    },
    async backendStatus() {
      const r = await fetchWithTimeout(`${BACKEND_URL}/status`);
      return { success: true, data: await r.json() };
    },
  };

  const handler = handlers[message.action];
  if (handler) {
    handler()
      .then((result) => sendResponse(result))
      .catch((err) => {
        if (err.name === "AbortError") {
          sendResponse({ success: false, error: "Request timed out. Is the backend running?" });
        } else {
          sendResponse({ success: false, error: err.message });
        }
      });
    return true;
  }
});
