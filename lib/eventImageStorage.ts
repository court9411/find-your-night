import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET_NAME = "event-images";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

let bucketEnsured = false;

async function ensureBucketExists(): Promise<void> {
  if (bucketEnsured) return;

  const { data: existing } = await supabaseAdmin.storage.getBucket(BUCKET_NAME);

  if (!existing) {
    const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: true,
    });
    if (createError && !/already exists/i.test(createError.message)) {
      throw createError;
    }
  }

  bucketEnsured = true;
}

function extensionFromContentType(contentType: string): string {
  switch (contentType.split(";")[0].trim().toLowerCase()) {
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

type ImageSource = { url: string } | { base64: string; mimeType: string };

/**
 * Downloads (or decodes) an event image and uploads it to the public
 * 'event-images' Supabase Storage bucket. Returns the public URL, or null
 * if the image can't be fetched/stored — callers should treat null as
 * "no image" rather than failing the whole submission.
 */
export async function storeEventImage(source: ImageSource): Promise<string | null> {
  try {
    await ensureBucketExists();

    let buffer: Buffer;
    let contentType: string;

    if ("base64" in source) {
      buffer = Buffer.from(source.base64, "base64");
      contentType = source.mimeType;
    } else {
      const response = await fetch(source.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        console.error(`Failed to download event image: HTTP ${response.status}`);
        return null;
      }

      contentType = response.headers.get("content-type") || "image/jpeg";
      if (!contentType.startsWith("image/")) {
        console.error(`Refusing to store non-image content-type: ${contentType}`);
        return null;
      }

      buffer = Buffer.from(await response.arrayBuffer());
    }

    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      console.error(`Event image size out of bounds: ${buffer.length} bytes`);
      return null;
    }

    const ext = extensionFromContentType(contentType);
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(path, buffer, { contentType, upsert: false });

    if (uploadError) {
      console.error("Failed to upload event image to storage:", uploadError);
      return null;
    }

    const { data } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(path);
    return data.publicUrl;
  } catch (error) {
    console.error("Failed to store event image:", error);
    return null;
  }
}
