import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET_NAME = "venue-images";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function extensionFromContentType(contentType: string): string {
  switch (contentType.split(";")[0].trim().toLowerCase()) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

/**
 * Uploads a base64-encoded venue-submission photo to the public
 * 'venue-images' bucket — the same bucket approve_pending_venue() copies
 * into venue_photos on approval. Returns the public URL, or null if
 * storage fails — callers should treat null as "no photo" rather than
 * failing the whole submission.
 */
export async function storeVenueSubmissionPhoto(base64: string, mimeType: string): Promise<string | null> {
  try {
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      console.error(`Venue submission photo size out of bounds: ${buffer.length} bytes`);
      return null;
    }

    const ext = extensionFromContentType(mimeType);
    const path = `submissions/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(path, buffer, { contentType: mimeType, upsert: false });

    if (uploadError) {
      console.error("Failed to upload venue submission photo to storage:", uploadError);
      return null;
    }

    const { data } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(path);
    return data.publicUrl;
  } catch (error) {
    console.error("Failed to store venue submission photo:", error);
    return null;
  }
}
