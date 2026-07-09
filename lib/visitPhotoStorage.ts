import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET_NAME = "visit-photos";
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
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

/**
 * Uploads a base64-encoded visit photo to the public 'visit-photos' Supabase
 * Storage bucket. Returns the public URL, or null if storage fails —
 * callers should treat null as "no photo" rather than failing the whole
 * survey submission.
 */
export async function storeVisitPhoto(base64: string, mimeType: string): Promise<string | null> {
  try {
    await ensureBucketExists();

    const buffer = Buffer.from(base64, "base64");
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      console.error(`Visit photo size out of bounds: ${buffer.length} bytes`);
      return null;
    }

    const ext = extensionFromContentType(mimeType);
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(path, buffer, { contentType: mimeType, upsert: false });

    if (uploadError) {
      console.error("Failed to upload visit photo to storage:", uploadError);
      return null;
    }

    const { data } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(path);
    return data.publicUrl;
  } catch (error) {
    console.error("Failed to store visit photo:", error);
    return null;
  }
}
