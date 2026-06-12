import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { storeEventImage } from "@/lib/eventImageStorage";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ExtractedEventData {
  eventName: string | null;
  date: string | null;
  startTime: string | null;
  venueName: string | null;
  address: string | null;
  price: string | null;
  ticketLink: string | null;
  vibeTags: string[];
}

const VALID_VIBE_TAGS = [
  "drag show",
  "live music",
  "dance party",
  "chill",
  "rooftop",
  "comedy",
  "art",
  "sports",
  "food",
  "networking",
];

const EXTRACTION_PROMPT = `You are an event information extractor. Extract event details from the provided content and return ONLY a strict JSON object with these fields:
- eventName: string or null
- date: string in YYYY-MM-DD format or null
- startTime: string in 12-hour format (e.g. "7:00 PM") or null
- venueName: string or null
- address: string or null
- price: string (e.g. "$25", "FREE", "18+") or null
- ticketLink: string or null
- vibeTags: array of 2-4 strings from: drag show, live music, dance party, chill, rooftop, comedy, art, sports, food, networking

Important:
- Return null for any field you cannot confidently find — NEVER guess dates or prices
- Only include vibeTags that clearly apply
- Ensure date is in YYYY-MM-DD format
- Ensure startTime is in 12-hour format with AM/PM
- vibeTags must be lowercase
- Return ONLY valid JSON, no markdown or extra text

Content to extract from:`;

// Find a <meta> tag's content by name/property, regardless of attribute
// order or quote style (e.g. og:image vs description).
function extractMetaContent(
  html: string,
  key: string,
  attr: "property" | "name" = "property"
): string | null {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]*\\b${attr}=["']${escapedKey}["'][^>]*\\bcontent=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]*\\bcontent=["']([^"']+)["'][^>]*\\b${attr}=["']${escapedKey}["']`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }

  return null;
}

async function extractFromUrl(url: string): Promise<{
  content: string;
  ogImage: string | null;
}> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Extract og:image (attribute order and quote style vary by site)
    const ogImage = extractMetaContent(html, "og:image");

    // Extract title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : "";

    // Extract meta description
    const metaDesc = extractMetaContent(html, "description", "name") || "";

    // Extract og:description
    const ogDesc = extractMetaContent(html, "og:description") || "";

    // Remove script and style tags, extract visible text
    const cleanHtml = html
      .replace(/<script[^>]*>.*?<\/script>/gi, "")
      .replace(/<style[^>]*>.*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);

    const content = [title, metaDesc || ogDesc, cleanHtml]
      .filter(Boolean)
      .join("\n\n");

    return { content, ogImage };
  } catch (error) {
    throw new Error(
      `Failed to fetch URL: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function extractFromImage(base64Image: string, mimeType: string): Promise<string> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as
                  | "image/jpeg"
                  | "image/png"
                  | "image/gif"
                  | "image/webp",
                data: base64Image,
              },
            },
            {
              type: "text",
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }

    return textBlock.text;
  } catch (error) {
    throw new Error(
      `Claude vision extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function extractEventData(content: string): Promise<ExtractedEventData> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `${EXTRACTION_PROMPT}\n\n${content}`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Parse JSON response
    let jsonStr = textBlock.text.trim();
    // Remove markdown code blocks if present
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7);
    }
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const data = JSON.parse(jsonStr);

    // Validate and sanitize vibe tags
    if (Array.isArray(data.vibeTags)) {
      data.vibeTags = data.vibeTags
        .filter((tag: string) => VALID_VIBE_TAGS.includes(tag.toLowerCase()))
        .slice(0, 4);
    } else {
      data.vibeTags = [];
    }

    return data;
  } catch (error) {
    throw new Error(
      `Failed to extract event data: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, image, mimeType } = body;

    if (!url && !image) {
      return NextResponse.json(
        { error: "Either 'url' or 'image' is required" },
        { status: 400 }
      );
    }

    let content: string;
    let sourceImage: string | null = null;
    let storedImageUrl: string | null = null;

    if (url) {
      const extracted = await extractFromUrl(url);
      content = extracted.content;
      sourceImage = extracted.ogImage;
      if (sourceImage) {
        storedImageUrl = await storeEventImage({ url: sourceImage });
      }
    } else if (image) {
      // For images, send directly to Claude vision
      content = await extractFromImage(image, mimeType || "image/jpeg");
      storedImageUrl = await storeEventImage({ base64: image, mimeType: mimeType || "image/jpeg" });
    } else {
      return NextResponse.json(
        { error: "Either 'url' or 'image' is required" },
        { status: 400 }
      );
    }

    // Extract structured data
    const eventData = await extractEventData(content);

    return NextResponse.json({
      success: true,
      eventData,
      ogImage: storedImageUrl,
    });
  } catch (error) {
    console.error("Extract event error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to extract event data",
      },
      { status: 500 }
    );
  }
}
