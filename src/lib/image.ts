"use client";

/**
 * Shrink a photo in the browser before upload. Phone camera shots are 3–6 MB;
 * this brings them to ~100–300 KB so they clear the Server Action body limit
 * and upload fast.
 */
export async function compressImage(
  input: Blob,
  { maxDim = 1280, quality = 0.82 }: { maxDim?: number; quality?: number } = {},
): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(input, { imageOrientation: "from-image" });
  } catch {
    bitmap = await createImageBitmap(input);
  }

  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, "image/jpeg", quality),
  );
  if (!blob) throw new Error("Could not process the image.");

  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}
