const API_URL = "http://localhost:3000/api/summarize";
const CACHE_TTL = 1000 * 60 * 60 * 24;

const allowedActions = new Set([
  "SUMMARIZE_PAGE",
  "CLEAR_CACHE"
]);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !allowedActions.has(message.action)) {
    sendResponse({ success: false, error: "Invalid message." });
    return false;
  }

  if (message.action === "CLEAR_CACHE") {
    clearCache(message.url).then(sendResponse);
    return true;
  }

  summarizePage(message).then(sendResponse);
  return true;
});

async function summarizePage(message) {
  try {
    const tab = await getActiveTab();

    if (!tab?.id || !tab.url?.startsWith("http")) {
      return {
        success: false,
        error: "Open a normal webpage before summarizing."
      };
    }

    const mode = message.summaryType === "short" ? "short" : "standard";
    const cacheKey = await createCacheKey(tab.url, mode);
    const cached = await getCachedSummary(cacheKey);

    if (cached) {
      return {
        success: true,
        cached: true,
        page: cached.page,
        summary: cached.summary
      };
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["contentScript.js"]
    });

    const extracted = await sendMessageToTab(tab.id, {
      action: "EXTRACT_PAGE_CONTENT"
    });

    if (!extracted?.success) {
      return {
        success: false,
        error: extracted?.error || "Could not extract page content."
      };
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        source: "extension",
        url: tab.url,
        title: extracted.page.title,
        text: extracted.page.text,
        wordCount: extracted.page.wordCount,
        summaryType: mode
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || "AI summary failed."
      };
    }

    const page = {
      title: extracted.page.title,
      url: tab.url,
      wordCount: extracted.page.wordCount
    };

    await chrome.storage.local.set({
      [cacheKey]: {
        page,
        summary: data.summary,
        createdAt: Date.now()
      }
    });

    return {
      success: true,
      cached: false,
      page,
      summary: data.summary
    };
  } catch (error) {
    return {
      success: false,
      error: friendlyError(error)
    };
  }
}

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      resolve(tab);
    });
  });
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: "Refresh the page and try again."
        });
        return;
      }

      resolve(response);
    });
  });
}

async function createCacheKey(url, mode) {
  const encoded = new TextEncoder().encode(`${mode}:${url}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return `summary:${hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

async function getCachedSummary(cacheKey) {
  const item = await chrome.storage.local.get(cacheKey);
  const cached = item[cacheKey];

  if (!cached) return null;

  const expired = Date.now() - cached.createdAt > CACHE_TTL;

  if (expired) {
    await chrome.storage.local.remove(cacheKey);
    return null;
  }

  return cached;
}

async function clearCache(url) {
  if (!url) {
    await chrome.storage.local.clear();
    return { success: true };
  }

  const standardKey = await createCacheKey(url, "standard");
  const shortKey = await createCacheKey(url, "short");

  await chrome.storage.local.remove([standardKey, shortKey]);

  return { success: true };
}

function friendlyError(error) {
  if (String(error.message).includes("Failed to fetch")) {
    return "Could not reach the Next.js server. Run npm run dev first.";
  }

  return error.message || "Something went wrong.";
}
