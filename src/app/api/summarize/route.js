import { NextResponse } from "next/server";
import { summarizeExtractedText, summarizeUrl } from "../../../lib/summarizer";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing GEMINI_API_KEY. Add it to .env."
        },
        { status: 500 }
      );
    }

    const summaryType = body.summaryType === "short" ? "short" : "standard";

    let result;

    if (body.source === "extension") {
      result = await summarizeExtractedText({
        title: String(body.title || "Untitled page"),
        url: String(body.url || ""),
        text: String(body.text || ""),
        wordCount: Number(body.wordCount || 0),
        summaryType
      });
    } else {
      result = await summarizeUrl({
        url: String(body.url || ""),
        summaryType
      });
    }

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unable to summarize."
      },
      { status: 500 }
    );
  }
}
