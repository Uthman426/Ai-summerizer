const MAX_TEXT_LENGTH = 22000;

export async function summarizeUrl({ url, summaryType }) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error("Please enter a valid http or https URL.");
  }

  const page = await extractPageText(url);

  const summary = await callGemini({
    title: page.title,
    url,
    text: page.text,
    summaryType
  });

  return {
    pageTitle: page.title,
    wordCount: page.wordCount,
    summary
  };
}

export async function summarizeExtractedText({
  title,
  url,
  text,
  wordCount,
  summaryType
}) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error("Invalid page URL.");
  }

  const cleanedText = text.replace(/\s+/g, " ").trim();

  if (cleanedText.length < 300) {
    throw new Error("This page does not have enough readable text to summarize.");
  }

  const summary = await callGemini({
    title,
    url,
    text: cleanedText.slice(0, MAX_TEXT_LENGTH),
    summaryType
  });

  return {
    pageTitle: title,
    wordCount,
    summary
  };
}

async function extractPageText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "AI Page Summarizer"
    }
  });

  if (!response.ok) {
    throw new Error(`The page could not be loaded. Status: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("text/html")) {
    throw new Error("This URL does not look like a normal HTML page.");
  }

  const html = await response.text();
  const title = getPageTitle(html);
  const text = htmlToReadableText(html);
  const wordCount = countWords(text);

  if (wordCount < 80) {
    throw new Error("This page does not have enough readable text to summarize.");
  }

  return {
    title,
    text: text.slice(0, MAX_TEXT_LENGTH),
    wordCount
  };
}

async function callGemini({ title, url, text, summaryType }) {
  const bulletCount = summaryType === "short" ? 3 : 6;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const prompt = `
Summarize this webpage.

Title: ${title}
URL: ${url}

Return valid JSON only. Do not include markdown, backticks, or explanation.

The JSON must match this exact shape:
{
  "bullets": ["point 1"],
  "insights": ["insight 1"],
  "readingTimeMinutes": 1,
  "highlights": ["important phrase copied from the page"]
}

Rules:
- Use exactly ${bulletCount} bullet summary points.
- Use exactly 3 key insights.
- Include up to 4 highlight phrases copied directly from the page text.
- Keep everything clear, useful, and practical.

Page text:
${text}
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message || "The Gemini AI request failed."
    );
  }

  const outputText =
    data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!outputText) {
    throw new Error("Gemini returned an empty response.");
  }

  return JSON.parse(outputText);
}

function getPageTitle(html) {
  const ogTitle = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
  )?.[1];

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];

  return decodeHtml(ogTitle || title || "Untitled page").trim();
}

function htmlToReadableText(html) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<(nav|header|footer|aside|form)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
  ).trim();
}

function decodeHtml(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function countWords(text) {
  return (text.match(/\b[\w'-]+\b/g) || []).length;
}
