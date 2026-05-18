"use server";

import { removeBackground } from "@imgly/background-removal-node";

/**
 * Server Action: Remove the background from a portrait image.
 *
 * Accepts FormData with a single "image" File entry, runs it through the
 * @imgly/background-removal-node ONNX pipeline on the server, and returns the
 * result as a base64-encoded PNG data URL that the client can load directly.
 *
 * Security note: this endpoint performs CPU-intensive work.  In production,
 * add authentication / rate-limiting before exposing it publicly.
 */
export async function removePortraitBackground(
  formData: FormData
): Promise<{ dataUrl: string } | { error: string }> {
  const rawEntry = formData.get("image");

  // FormDataEntryValue is string | File; we require a File with binary data
  if (!rawEntry || typeof rawEntry === "string") {
    return { error: "No image file provided." };
  }

  const file = rawEntry satisfies File;

  // Reject suspiciously large uploads (belt-and-suspenders on top of the
  // bodySizeLimit set in next.config.ts)
  const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
  if (file.size > MAX_BYTES) {
    return { error: "Image exceeds the 20 MB size limit." };
  }

  try {
    // Step 1 – Run AI background removal; the package returns a transparent PNG Blob
    // Run background removal; the library returns a transparent PNG Blob.
    // The 'medium' model gives the best quality; swap to 'small' for speed.
    const resultBlob = await removeBackground(file, {
      model: "medium",
      output: { format: "image/png" },
    });

    // Step 2 – Convert the Blob → ArrayBuffer → base64 string
    const arrayBuffer = await resultBlob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return { dataUrl: `data:image/png;base64,${base64}` };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error during processing.";
    console.error("[removePortraitBackground]", err);
    return { error: `Background removal failed: ${message}` };
  }
}
