(function () {
  if (window.__AI_SUMMARIZER_CONTENT_SCRIPT__) return;
  window.__AI_SUMMARIZER_CONTENT_SCRIPT__ = true;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !["EXTRACT_PAGE_CONTENT", "HIGHLIGHT_TEXT"].includes(message.action)) {
      sendResponse({ success: false, error: "Invalid content script message." });
      return false;
    }

    if (message.action === "EXTRACT_PAGE_CONTENT") {
      sendResponse({
        success: true,
        page: extractPageContent()
      });
      return false;
    }

    if (message.action === "HIGHLIGHT_TEXT") {
      const count = highlightText(message.highlights || []);
      sendResponse({ success: true, count });
      return false;
    }
  });

  function extractPageContent() {
    const title =
      document.querySelector("meta[property='og:title']")?.content ||
      document.title ||
      "Untitled page";

    const root = findBestContentRoot();
    const text = collectReadableText(root);
    const wordCount = countWords(text);

    return {
      title: title.trim(),
      url: location.href,
      text: text.slice(0, 30000),
      wordCount,
      readingTimeMinutes: Math.max(1, Math.ceil(wordCount / 220))
    };
  }

  function findBestContentRoot() {
    const preferred = document.querySelector(
      "article, main, [role='main'], .article, .post, .entry-content"
    );

    if (preferred && getCleanText(preferred).length > 500) {
      return preferred;
    }

    const candidates = Array.from(
      document.body.querySelectorAll("article, main, section, div")
    )
      .filter((element) => !isClutter(element))
      .map((element) => ({
        element,
        score: scoreElement(element)
      }))
      .sort((a, b) => b.score - a.score);

    return candidates[0]?.score > 400 ? candidates[0].element : document.body;
  }

  function scoreElement(element) {
    const text = getCleanText(element);
    const paragraphs = element.querySelectorAll("p").length;
    const links = Array.from(element.querySelectorAll("a"))
      .map((link) => link.innerText || "")
      .join(" ");

    const linkDensity = text.length ? links.length / text.length : 1;

    return text.length + paragraphs * 120 - linkDensity * 900;
  }

  function collectReadableText(root) {
    const blocks = Array.from(root.querySelectorAll("h1, h2, h3, p, li, blockquote"))
      .filter((element) => !isClutter(element))
      .map((element) => getCleanText(element))
      .filter((text) => text.length > 60);

    const uniqueBlocks = [...new Set(blocks)];

    return uniqueBlocks.join("\n\n") || getCleanText(root);
  }

  function getCleanText(element) {
    return (element.innerText || element.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isClutter(element) {
    const hidden = element.closest("[hidden], [aria-hidden='true']");
    const clutterTag = element.closest(
      "nav, aside, footer, header, form, script, style, noscript"
    );

    const classAndId = `${element.className || ""} ${element.id || ""}`.toLowerCase();

    const clutterName =
      /(nav|menu|sidebar|footer|header|cookie|banner|modal|subscribe|newsletter|advert|promo|share|social|comment)/.test(
        classAndId
      );

    return Boolean(hidden || clutterTag || clutterName);
  }

  function countWords(text) {
    return (text.match(/\b[\w'-]+\b/g) || []).length;
  }

  function highlightText(highlights) {
    removeOldHighlights();

    const safeHighlights = highlights
      .map((item) => String(item).trim())
      .filter((item) => item.length >= 20)
      .slice(0, 5);

    let count = 0;

    for (const phrase of safeHighlights) {
      count += highlightPhrase(phrase);
    }

    return count;
  }

  function removeOldHighlights() {
    document.querySelectorAll("mark.ai-summary-highlight").forEach((mark) => {
      mark.replaceWith(document.createTextNode(mark.textContent || ""));
    });
  }

  function highlightPhrase(phrase) {
    const search = phrase.toLowerCase().slice(0, 80);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

    let count = 0;

    while (walker.nextNode() && count < 4) {
      const node = walker.currentNode;

      if (!node.parentElement || isClutter(node.parentElement)) continue;

      const text = node.nodeValue || "";
      const index = text.toLowerCase().indexOf(search.slice(0, 40));

      if (index === -1) continue;

      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, Math.min(text.length, index + search.length));

      const mark = document.createElement("mark");
      mark.className = "ai-summary-highlight";
      mark.style.background = "#fff2a8";
      mark.style.color = "inherit";
      mark.style.padding = "0.1em 0.2em";
      mark.style.borderRadius = "4px";

      try {
        range.surroundContents(mark);
        count += 1;
      } catch {
        // Skip difficult text nodes safely.
      }
    }

    return count;
  }
})();
