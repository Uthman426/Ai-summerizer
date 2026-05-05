// import { NextResponse } from "next/server";
// import { summarizeExtractedText, summarizeUrl } from "../../../lib/summarizer";

// export const runtime = "nodejs";

// export async function POST(request) {
//   try {
//     const body = await request.json();

//     if (!process.env.GEMINI_API_KEY) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: "Missing GEMINI_API_KEY. Add it to .env."
//         },
//         { status: 500 }
//       );
//     }

//     const summaryType = body.summaryType === "short" ? "short" : "standard";

//     let result;

//     if (body.source === "extension") {
//       result = await summarizeExtractedText({
//         title: String(body.title || "Untitled page"),
//         url: String(body.url || ""),
//         text: String(body.text || ""),
//         wordCount: Number(body.wordCount || 0),
//         summaryType
//       });
//     } else {
//       result = await summarizeUrl({
//         url: String(body.url || ""),
//         summaryType
//       });
//     }

//     return NextResponse.json({
//       success: true,
//       ...result
//     });
//   } catch (error) {
//     return NextResponse.json(
//       {
//         success: false,
//         error: error.message || "Unable to summarize."
//       },
//       { status: 500 }
//     );
//   }
// }
import { NextResponse } from "next/server";
import { summarizeExtractedText, summarizeUrl } from "../../../lib/summarizer";

export const runtime = "nodejs";

// Handle CORS preflight (REQUIRED for Chrome extension)
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

// Optional: so browser doesn't show 405
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "API is running"
  });
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing GEMINI_API_KEY"
        },
        {
          status: 500,
          headers: {
            "Access-Control-Allow-Origin": "*"
          }
        }
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

    return NextResponse.json(
      {
        success: true,
        ...result
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unable to summarize."
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}