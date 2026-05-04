"use client";

import { useState } from "react";

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [summaryType, setSummaryType] = useState("standard");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url,
          summaryType
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Something went wrong.");
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function clearForm() {
    setUrl("");
    setSummaryType("standard");
    setResult(null);
    setError("");
  }

  async function copySummary() {
    if (!result) return;

    const text = [
      result.pageTitle,
      "",
      "Summary:",
      ...result.summary.bullets.map((item) => `- ${item}`),
      "",
      "Key Insights:",
      ...result.summary.insights.map((item) => `- ${item}`),
      "",
      `Estimated reading time: ${result.summary.readingTimeMinutes} minutes`
    ].join("\n");

    await navigator.clipboard.writeText(text);
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="label">Next.js AI Tool</p>
        <h1>AI Page Summarizer</h1>
        <p>
          Paste a webpage URL, send it to a secure server-side API route, and
          get a clean AI-generated summary.
        </p>
      </section>

      <section className="grid">
        <form className="card form" onSubmit={handleSubmit}>
          <label htmlFor="url">Webpage URL</label>
          <input
            id="url"
            type="url"
            placeholder="https://example.com/article"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            required
          />

          <label htmlFor="summaryType">Summary Type</label>
          <select
            id="summaryType"
            value={summaryType}
            onChange={(event) => setSummaryType(event.target.value)}
          >
            <option value="standard">Detailed summary</option>
            <option value="short">3 bullet points</option>
          </select>

          <div className="buttons">
            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Summarizing..." : "Summarize Page"}
            </button>

            <button type="button" onClick={clearForm}>
              Clear
            </button>
          </div>

          {error && <p className="error">{error}</p>}
        </form>

        <section className="card result" aria-live="polite">
          {!result ? (
            <p className="empty">
              Your summary will appear here after you submit a URL.
            </p>
          ) : (
            <article>
              <div className="resultHeader">
                <div>
                  <p className="label">Summary Result</p>
                  <h2>{result.pageTitle}</h2>
                </div>

                <button type="button" onClick={copySummary}>
                  Copy
                </button>
              </div>

              <div className="meta">
                <span>{result.wordCount} words</span>
                <span>{result.summary.readingTimeMinutes} min read</span>
              </div>

              <h3>Bullet Summary</h3>
              <ul>
                {result.summary.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>

              <h3>Key Insights</h3>
              <ul>
                {result.summary.insights.map((insight) => (
                  <li key={insight}>{insight}</li>
                ))}
              </ul>
            </article>
          )}
        </section>
      </section>
    </main>
  );
}
