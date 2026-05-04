const pageTitle = document.querySelector("#pageTitle");
const summaryType = document.querySelector("#summaryType");
const summarizeButton = document.querySelector("#summarizeButton");
const buttonText = document.querySelector("#buttonText");
const spinner = document.querySelector("#spinner");
const copyButton = document.querySelector("#copyButton");
const highlightButton = document.querySelector("#highlightButton");
const clearButton = document.querySelector("#clearButton");
const statusEl = document.querySelector("#status");
const output = document.querySelector("#output");

let currentTab = null;
let currentSummary = null;

document.addEventListener("DOMContentLoaded", init);
summarizeButton.addEventListener("click", summarizePage);
copyButton.addEventListener("click", copySummary);
highlightButton.addEventListener("click", highlightPage);
clearButton.addEventListener("click", clearSummary);

async function init() {
  currentTab = await getActiveTab();
  pageTitle.textContent = currentTab?.title || "Untitled page";
}

async function summarizePage() {
  setLoading(true);
  setStatus("Extracting page content...");
  renderEmpty("Working on your summary...");

  try {
    const response = await chrome.runtime.sendMessage({
      action: "SUMMARIZE_PAGE",
      summaryType: summaryType.value
    });

    if (!response?.success) {
      throw new Error(response?.error || "Summary failed.");
    }

    currentSummary = response.summary;
    renderSummary(response.page, response.summary, response.cached);

    setStatus(response.cached ? "Loaded cached summary." : "Summary generated.");
    copyButton.disabled = false;
    highlightButton.disabled = !response.summary.highlights?.length;
  } catch (error) {
    setStatus(error.message, true);
    renderEmpty("Could not summarize this page.");
  } finally {
    setLoading(false);
  }
}

async function clearSummary() {
  currentSummary = null;
  copyButton.disabled = true;
  highlightButton.disabled = true;

  renderEmpty("Click Summarize Page to summarize this webpage.");
  setStatus("Cleared.");

  if (currentTab?.url) {
    await chrome.runtime.sendMessage({
      action: "CLEAR_CACHE",
      url: currentTab.url
    });
  }
}

async function copySummary() {
  if (!currentSummary) return;

  const text = [
    "Summary:",
    ...currentSummary.bullets.map((item) => `- ${item}`),
    "",
    "Key insights:",
    ...currentSummary.insights.map((item) => `- ${item}`),
    "",
    `Estimated reading time: ${currentSummary.readingTimeMinutes} minutes`
  ].join("\n");

  await navigator.clipboard.writeText(text);
  setStatus("Copied summary.");
}

async function highlightPage() {
  if (!currentTab?.id || !currentSummary?.highlights?.length) return;

  const response = await chrome.tabs.sendMessage(currentTab.id, {
    action: "HIGHLIGHT_TEXT",
    highlights: currentSummary.highlights
  });

  setStatus(
    response?.count
      ? `Highlighted ${response.count} section(s).`
      : "No matching sections found."
  );
}

function renderSummary(page, summary, cached) {
  output.replaceChildren();

  const meta = document.createElement("div");
  meta.className = "meta";

  meta.append(
    createPill(`${summary.readingTimeMinutes} min read`),
    createPill(`${page.wordCount || "Unknown"} words`),
    createPill(cached ? "Cached" : "Fresh")
  );

  output.append(meta);

  appendList("Bullet Summary", summary.bullets);
  appendList("Key Insights", summary.insights);
}

function appendList(title, items) {
  const heading = document.createElement("h2");
  heading.textContent = title;

  const list = document.createElement("ul");

  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    list.append(li);
  }

  output.append(heading, list);
}

function createPill(text) {
  const pill = document.createElement("span");
  pill.className = "pill";
  pill.textContent = text;
  return pill;
}

function renderEmpty(message) {
  const empty = document.createElement("p");
  empty.className = "empty";
  empty.textContent = message;
  output.replaceChildren(empty);
}

function setLoading(isLoading) {
  summarizeButton.disabled = isLoading;
  summarizeButton.classList.toggle("loading", isLoading);
  spinner.style.display = isLoading ? "inline-block" : "none";
  buttonText.textContent = isLoading ? "Summarizing..." : "Summarize Page";
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      resolve(tab);
    });
  });
}
