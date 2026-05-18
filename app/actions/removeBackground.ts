"use server";

// NOTE: @imgly/background-removal-node is intentionally NOT imported at the
// module level.  It loads onnxruntime-node native binaries at import time, which
// can crash the serverless cold-start on Vercel before any request is handled.
// The dynamic import below defers binary loading until the action is actually
// called.

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

  // Belt-and-suspenders size guard (bodySizeLimit in next.config.ts is the
  // primary limit; this catches any bypass attempts)
  const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
  if (file.size > MAX_BYTES) {
    return { error: "Image exceeds the 20 MB size limit." };
  }

  try {
    // Deferred import: native ONNX binaries are loaded here, not at module
    // init time, so a missing/incompatible binary won't crash the cold start.
    const { removeBackground } = await import(
      "@imgly/background-removal-node"
    );

    // removeBackground returns a transparent-background PNG Blob
    const resultBlob = await removeBackground(file, {
      model: "medium",
      output: { format: "image/png" },
    });

    // Convert Blob → ArrayBuffer → base64 data URL for the client
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

