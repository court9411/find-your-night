const MAX_WIDTH = 1600;
const TARGET_BYTES = 4 * 1024 * 1024;

/**
 * Resizes an image to at most MAX_WIDTH wide (preserving aspect ratio) and
 * re-encodes it as JPEG, reducing quality until it fits under TARGET_BYTES.
 * Runs entirely in the browser via canvas so large flyer photos can be
 * uploaded without hitting server-side size limits.
 */
export async function compressImage(
  file: File
): Promise<{ base64: string; mimeType: string }> {
  const dataUrl = await readAsDataUrl(file);

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = dataUrl;
  });

  let width = img.naturalWidth;
  let height = img.naturalHeight;
  if (width > MAX_WIDTH) {
    height = Math.round((height * MAX_WIDTH) / width);
    width = MAX_WIDTH;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported");
  ctx.drawImage(img, 0, 0, width, height);

  let blob: Blob | null = null;
  let quality = 0.9;
  for (let attempt = 0; attempt < 6; attempt++) {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob || blob.size <= TARGET_BYTES) break;
    quality -= 0.15;
  }

  if (!blob) throw new Error("Failed to compress image");

  const base64 = (await readAsDataUrl(blob)).split(",")[1];
  return { base64, mimeType: "image/jpeg" };
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
