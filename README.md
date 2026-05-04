## AI Integration

This project uses the Gemini API through a secure Next.js API route.

The Chrome extension does not call Gemini directly. Instead, it sends extracted page text to:

```text
http://localhost:3000/api/summarize

# AI Page Summarizer Chrome Extension

A local Manifest V3 Chrome Extension that extracts readable content from the current webpage, sends it to a secure Next.js API route, and displays an AI-generated structured summary.

The extension can summarize article pages, show key insights, estimate reading time, cache summaries, copy the result, and optionally highlight important phrases on the page.

---

## Features

- Manifest V3 Chrome Extension
- Popup UI with page title, loading state, summary output, and reset button
- Extracts readable content from the active webpage
- Avoids common clutter like navigation, sidebars, headers, footers, ads, and comments
- Uses heuristic filtering to prefer article-like content
- Sends page content to a secure Next.js API route
- Keeps the AI API key out of the extension frontend
- Displays:
  - Bullet-point summary
  - Key insights
  - Estimated reading time
  - Word count
- Supports:
  - Copy summary
  - Clear/reset
  - Highlight key phrases on the page
  - 3-bullet summary mode
  - Light/dark mode popup styling
- Uses `chrome.storage.local` to cache summaries per URL
- Minimal permissions

---

## Tech Stack

- Chrome Extension Manifest V3
- JavaScript
- Next.js
- gemini Responses API
- Chrome Extension APIs:
  - `chrome.runtime`
  - `chrome.tabs`
  - `chrome.scripting`
  - `chrome.storage`

---

How It Works
The user opens a webpage and clicks the extension icon.
The popup displays the current page title.
When the user clicks Summarize Page, the popup sends a message to the background service worker.
The background service worker injects the content script into the active tab.
The content script extracts readable page content.
The background service worker sends the extracted content to the local Next.js API route.
The Next.js API route securely calls the AI provider using the API key stored in .env.
The AI returns a structured summary.
The popup displays the summary, insights, reading time, and word count.
The summary is cached with chrome.storage.local to avoid duplicate API calls.

Installation
This is a local Chrome Extension. It should not be uploaded to the Google Chrome Web Store.

1. Clone or Download the Project
git clone your-repository-url
cd your-project-folder
Or download the ZIP from GitHub and extract it.

2. Install Dependencies
npm install
3. Add Environment Variables
Create a .env.local file in the root of the project:

OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5.2
Do not commit .env.local to GitHub.

Your .gitignore should include:

.env
.env.local
.env.*.local
node_modules/
.next/
4. Start the Local Next.js Server
npm run dev
The local API should now be running at:

http://localhost:3000/api/summarize
Keep this server running while using the extension.

5. Load the Extension in Chrome
Open Google Chrome.
Go to:
chrome://extensions
Turn on Developer mode.
Click Load unpacked.
Select the extension folder inside this project.
Important: select this folder:

your-project-folder/extension
Do not select the root project folder.

6. Pin the Extension
Click the puzzle icon in the Chrome toolbar.
Find AI Page Summarizer.
Click the pin icon beside it.
7. Use the Extension
Open an article or documentation page.
Click the AI Page Summarizer extension icon.
Click Summarize Page.
Wait for the summary to appear.
Use Copy, Highlight, or Clear as needed.
Required Features Checklist
Manifest V3 Setup
Implemented in:

extension/manifest.json

Content Script
Implemented in:

extension/contentScript.js
Responsibilities:

Extracts readable page content
Prefers article, main, and [role="main"]
Avoids navigation, sidebars, headers, footers, forms, cookie banners, ads, comments, and social widgets
Uses heuristic scoring to find the best content area
Supports optional in-page highlighting
AI Integration
Implemented in:

app/api/summarize/route.js
lib/summarizer.js
Security approach:

The extension does not call OpenAI directly.
The extension sends extracted text to the local Next.js API route.
The API route calls OpenAI using process.env.OPENAI_API_KEY.
The API key stays in .env.local.
No secrets are hardcoded in extension files.
Background Service Worker
Implemented in:

extension/background.js
Responsibilities:

Receives messages from the popup
Gets the active browser tab
Injects the content script
Requests readable content from the page
Calls the secure Next.js API route
Returns the summary to the popup
Handles API and extraction errors
Caches summaries with chrome.storage.local
Storage
Implemented in:

extension/background.js
Uses:

chrome.storage.local
For:

Caching summaries per URL
Preventing duplicate API calls
Clearing cached summaries when the user clicks Clear
Cache expiry:

24 hours