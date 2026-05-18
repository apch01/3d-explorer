"use client";

/**
 * ImageComposerPage
 *
 * Full client-side image composition tool:
 *   1. User uploads a portrait, background and/or overlay.
 *   2. Portrait background is removed via a Next.js Server Action
 *      (`@imgly/background-removal-node` running on the server).
 *   3. The three layers are composited on an HTML5 Canvas element:
 *        Layer 1  →  Background image
 *        Layer 2  →  Human cutout (transparent PNG)
 *        Layer 3  →  Overlay PNG
 *   4. User can reposition / rescale the portrait by dragging & slider.
 *   5. The finished composition can be downloaded as a PNG.
 */

import React, {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { useDropzone } from "react-dropzone";
import { removePortraitBackground } from "@/app/actions/removeBackground";
import {
  loadImage,
  drawComposition,
  exportCanvas,
  createObjectUrl,
} from "@/lib/imageComposer/helpers";
import { PRESETS, type Preset } from "@/lib/imageComposer/presets";

// ---------------------------------------------------------------------------
// Types & state
// ---------------------------------------------------------------------------

interface LayerImages {
  background: HTMLImageElement | null;
  portrait: HTMLImageElement | null;
  overlay: HTMLImageElement | null;
}

interface ComposerState {
  portraitFile: File | null;
  backgroundFile: File | null;
  overlayFile: File | null;
  /** Transparent-background portrait data URL returned by the server action */
  processedPortraitUrl: string | null;
  isProcessing: boolean;
  processingStage: string;
  error: string | null;
  /** Portrait scale (1 = fit canvas height) */
  scale: number;
  /** Portrait position offset (canvas pixels) */
  position: { x: number; y: number };
  /** Active preset id, or null if none */
  activePresetId: string | null;
}

type ComposerAction =
  | { type: "SET_PORTRAIT_FILE"; file: File | null }
  | { type: "SET_BACKGROUND_FILE"; file: File | null }
  | { type: "SET_OVERLAY_FILE"; file: File | null }
  | { type: "SET_PROCESSED_PORTRAIT"; url: string | null }
  | { type: "START_PROCESSING"; stage: string }
  | { type: "SET_STAGE"; stage: string }
  | { type: "FINISH_PROCESSING" }
  | { type: "SET_ERROR"; error: string }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_SCALE"; scale: number }
  | { type: "SET_POSITION"; position: { x: number; y: number } }
  | { type: "SET_PRESET"; presetId: string };

function composerReducer(
  state: ComposerState,
  action: ComposerAction
): ComposerState {
  switch (action.type) {
    case "SET_PORTRAIT_FILE":
      return {
        ...state,
        portraitFile: action.file,
        processedPortraitUrl: null,
        error: null,
      };
    case "SET_BACKGROUND_FILE":
      return { ...state, backgroundFile: action.file, activePresetId: null };
    case "SET_OVERLAY_FILE":
      return { ...state, overlayFile: action.file, activePresetId: null };
    case "SET_PROCESSED_PORTRAIT":
      return { ...state, processedPortraitUrl: action.url };
    case "START_PROCESSING":
      return { ...state, isProcessing: true, processingStage: action.stage, error: null };
    case "SET_STAGE":
      return { ...state, processingStage: action.stage };
    case "FINISH_PROCESSING":
      return { ...state, isProcessing: false, processingStage: "" };
    case "SET_ERROR":
      return { ...state, isProcessing: false, error: action.error, processingStage: "" };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    case "SET_SCALE":
      return { ...state, scale: action.scale };
    case "SET_POSITION":
      return { ...state, position: action.position };
    case "SET_PRESET":
      return { ...state, activePresetId: action.presetId };
    default:
      return state;
  }
}

const initialState: ComposerState = {
  portraitFile: null,
  backgroundFile: null,
  overlayFile: null,
  processedPortraitUrl: null,
  isProcessing: false,
  processingStage: "",
  error: null,
  scale: 0.85,
  position: { x: 0, y: 0 },
  activePresetId: null,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface DropZoneProps {
  label: string;
  hint: string;
  icon: React.ReactNode;
  onFile: (file: File) => void;
  previewUrl: string | null;
  accept?: Record<string, string[]>;
}

function DropZone({ label, hint, icon, onFile, previewUrl, accept }: DropZoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: accept ?? { "image/*": [] },
    maxFiles: 1,
    onDropAccepted: ([file]) => onFile(file),
  });

  return (
    <div
      {...getRootProps()}
      className={[
        "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 overflow-hidden",
        "h-28 px-3 text-center",
        isDragActive
          ? "border-violet-400 bg-violet-900/20 scale-[1.02]"
          : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/8",
      ].join(" ")}
    >
      <input {...getInputProps()} />

      {previewUrl ? (
        /* Preview thumbnail */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={label}
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
      ) : null}

      <div className="relative z-10 flex flex-col items-center gap-1 pointer-events-none">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs font-semibold text-white/80 leading-tight">
          {label}
        </span>
        <span className="text-[10px] text-white/40">{hint}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ImageComposerPage() {
  const [state, dispatch] = useReducer(composerReducer, initialState);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layersRef = useRef<LayerImages>({
    background: null,
    portrait: null,
    overlay: null,
  });

  // Track object URLs so we can revoke them on change
  const objectUrlsRef = useRef<{ portrait?: string; background?: string; overlay?: string }>({});

  // Drag-to-reposition state
  const isDragging = useRef(false);
  const dragOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  // Preview URL states (for DropZone thumbnails)
  const [portraitPreviewUrl, setPortraitPreviewUrl] = useState<string | null>(null);
  const [backgroundPreviewUrl, setBackgroundPreviewUrl] = useState<string | null>(null);
  const [overlayPreviewUrl, setOverlayPreviewUrl] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Helpers: refresh one layer, then redraw
  // -----------------------------------------------------------------------

  const redraw = useCallback(() => {
    if (!canvasRef.current) return;
    drawComposition(canvasRef.current, {
      background: layersRef.current.background,
      portrait: layersRef.current.portrait,
      overlay: layersRef.current.overlay,
      scale: state.scale,
      position: state.position,
    });
  }, [state.scale, state.position]);

  /** Load an image URL into the specified layer slot, then redraw */
  const loadLayer = useCallback(
    async (slot: keyof LayerImages, url: string) => {
      try {
        const img = await loadImage(url);
        layersRef.current[slot] = img;
        redraw();
      } catch {
        // Non-fatal: just skip that layer
      }
    },
    [redraw]
  );

  // -----------------------------------------------------------------------
  // File change handlers
  // -----------------------------------------------------------------------

  const handlePortraitFile = useCallback(
    (file: File) => {
      // Revoke old object URL
      if (objectUrlsRef.current.portrait)
        URL.revokeObjectURL(objectUrlsRef.current.portrait);

      const { url, revoke: _ } = createObjectUrl(file);
      objectUrlsRef.current.portrait = url;

      dispatch({ type: "SET_PORTRAIT_FILE", file });
      setPortraitPreviewUrl(url);

      // Clear the processed portrait — user will need to re-run Generate
      layersRef.current.portrait = null;
      redraw();
    },
    [redraw]
  );

  const handleBackgroundFile = useCallback(
    async (file: File) => {
      if (objectUrlsRef.current.background)
        URL.revokeObjectURL(objectUrlsRef.current.background);

      const { url } = createObjectUrl(file);
      objectUrlsRef.current.background = url;

      dispatch({ type: "SET_BACKGROUND_FILE", file });
      setBackgroundPreviewUrl(url);
      await loadLayer("background", url);
    },
    [loadLayer]
  );

  const handleOverlayFile = useCallback(
    async (file: File) => {
      if (objectUrlsRef.current.overlay)
        URL.revokeObjectURL(objectUrlsRef.current.overlay);

      const { url } = createObjectUrl(file);
      objectUrlsRef.current.overlay = url;

      dispatch({ type: "SET_OVERLAY_FILE", file });
      setOverlayPreviewUrl(url);
      await loadLayer("overlay", url);
    },
    [loadLayer]
  );

  // -----------------------------------------------------------------------
  // Preset loader
  // -----------------------------------------------------------------------

  const applyPreset = useCallback(
    async (preset: Preset) => {
      dispatch({ type: "SET_PRESET", presetId: preset.id });

      // Generate and load background
      const bgUrl = preset.getBackground();
      setBackgroundPreviewUrl(bgUrl);
      const bgImg = await loadImage(bgUrl);
      layersRef.current.background = bgImg;

      // Generate and load overlay
      const ovUrl = preset.getOverlay();
      setOverlayPreviewUrl(ovUrl);
      const ovImg = await loadImage(ovUrl);
      layersRef.current.overlay = ovImg;

      redraw();
    },
    [redraw]
  );

  // -----------------------------------------------------------------------
  // Generate: remove portrait background → composite
  // -----------------------------------------------------------------------

  const handleGenerate = useCallback(async () => {
    if (!state.portraitFile) {
      dispatch({ type: "SET_ERROR", error: "Please upload a portrait image first." });
      return;
    }

    dispatch({ type: "START_PROCESSING", stage: "Uploading portrait to server…" });

    try {
      // Step 1 – Package the file into FormData and send to the Server Action
      const formData = new FormData();
      formData.append("image", state.portraitFile);

      dispatch({ type: "SET_STAGE", stage: "Running AI background removal…" });

      const result = await removePortraitBackground(formData);

      if ("error" in result) {
        dispatch({ type: "SET_ERROR", error: result.error });
        return;
      }

      // Step 2 – Store the processed data URL and load it as an HTMLImageElement
      dispatch({ type: "SET_STAGE", stage: "Compositing layers…" });
      dispatch({ type: "SET_PROCESSED_PORTRAIT", url: result.dataUrl });

      const portraitImg = await loadImage(result.dataUrl);
      layersRef.current.portrait = portraitImg;

      // Step 3 – Redraw with the new portrait in place
      redraw();

      dispatch({ type: "FINISH_PROCESSING" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      dispatch({ type: "SET_ERROR", error: message });
    }
  }, [state.portraitFile, redraw]);

  // -----------------------------------------------------------------------
  // Redraw when scale or position changes
  // -----------------------------------------------------------------------

  useEffect(() => {
    redraw();
  }, [redraw]);

  // -----------------------------------------------------------------------
  // Canvas drag-to-reposition
  // -----------------------------------------------------------------------

  /** Convert a mouse/pointer event's clientX/clientY into canvas-space deltas */
  const toCanvasSpace = useCallback(
    (clientX: number, clientY: number) => {
      const el = canvasRef.current;
      if (!el) return { x: clientX, y: clientY };
      const rect = el.getBoundingClientRect();
      const scaleX = el.width / rect.width;
      const scaleY = el.height / rect.height;
      return { x: clientX * scaleX, y: clientY * scaleY };
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!layersRef.current.portrait) return;
      (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
      isDragging.current = true;
      const cs = toCanvasSpace(e.clientX, e.clientY);
      dragOrigin.current = {
        mx: cs.x,
        my: cs.y,
        px: state.position.x,
        py: state.position.y,
      };
    },
    [state.position, toCanvasSpace]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDragging.current) return;
      const cs = toCanvasSpace(e.clientX, e.clientY);
      dispatch({
        type: "SET_POSITION",
        position: {
          x: dragOrigin.current.px + (cs.x - dragOrigin.current.mx),
          y: dragOrigin.current.py + (cs.y - dragOrigin.current.my),
        },
      });
    },
    [toCanvasSpace]
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // -----------------------------------------------------------------------
  // Download
  // -----------------------------------------------------------------------

  const handleDownload = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      const blob = await exportCanvas(canvasRef.current);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "composed-portrait.png";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed.";
      dispatch({ type: "SET_ERROR", error: message });
    }
  }, []);

  // -----------------------------------------------------------------------
  // Cleanup object URLs on unmount
  // -----------------------------------------------------------------------

  useEffect(() => {
    return () => {
      Object.values(objectUrlsRef.current).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, []);

  // -----------------------------------------------------------------------
  // Computed
  // -----------------------------------------------------------------------

  const canGenerate = Boolean(state.portraitFile) && !state.isProcessing;
  const canDownload =
    canvasRef.current !== null &&
    (layersRef.current.background !== null ||
      layersRef.current.portrait !== null);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6 lg:p-8">
      {/* ── Page header ── */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Image Composer
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Remove portrait backgrounds with AI · Layer backgrounds & overlays ·
          Download as PNG
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ══════════════════════════════════════════════════════════════
            LEFT PANEL – controls
        ══════════════════════════════════════════════════════════════ */}
        <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
          {/* ── Upload cards ── */}
          <section className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-4 flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
              Upload Images
            </h2>

            <DropZone
              label="Portrait (required)"
              hint="Drag & drop or click · JPG / PNG / WebP"
              icon={<span>🧑</span>}
              onFile={handlePortraitFile}
              previewUrl={portraitPreviewUrl}
            />

            <DropZone
              label="Background"
              hint="Drag & drop or click · any image"
              icon={<span>🌆</span>}
              onFile={handleBackgroundFile}
              previewUrl={backgroundPreviewUrl}
            />

            <DropZone
              label="Overlay PNG"
              hint="Transparent PNG recommended"
              icon={<span>✨</span>}
              onFile={handleOverlayFile}
              previewUrl={overlayPreviewUrl}
              accept={{ "image/png": [] }}
            />
          </section>

          {/* ── Preset examples ── */}
          <section className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-4 flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
              Quick Presets
            </h2>
            <p className="text-[11px] text-white/30 -mt-1">
              Load a generated background + overlay instantly
            </p>
            <div className="flex flex-col gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={[
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150",
                    state.activePresetId === preset.id
                      ? "bg-violet-600/30 border border-violet-400/50"
                      : "bg-white/5 border border-white/10 hover:bg-white/10",
                  ].join(" ")}
                >
                  <span className="text-2xl leading-none">{preset.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-white/90">
                      {preset.label}
                    </div>
                    <div className="text-[11px] text-white/40">
                      {preset.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* ── Portrait controls ── */}
          <section className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-4 flex flex-col gap-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
              Portrait Adjustments
            </h2>

            {/* Scale */}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-white/60 flex justify-between">
                <span>Scale</span>
                <span className="tabular-nums">{(state.scale * 100).toFixed(0)}%</span>
              </span>
              <input
                type="range"
                min={0.1}
                max={2}
                step={0.01}
                value={state.scale}
                onChange={(e) =>
                  dispatch({ type: "SET_SCALE", scale: parseFloat(e.target.value) })
                }
                className="w-full accent-violet-500"
              />
            </label>

            {/* Reset position */}
            <button
              onClick={() => dispatch({ type: "SET_POSITION", position: { x: 0, y: 0 } })}
              className="text-xs text-white/50 hover:text-white/80 underline underline-offset-2 self-start transition-colors"
            >
              Reset position
            </button>

            <p className="text-[11px] text-white/30">
              Drag the portrait on the canvas to reposition it
            </p>
          </section>

          {/* ── Generate button ── */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className={[
              "rounded-xl px-5 py-3.5 font-semibold text-sm transition-all duration-200",
              canGenerate
                ? "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40 hover:shadow-violet-700/40 active:scale-[0.98]"
                : "bg-white/10 text-white/30 cursor-not-allowed",
            ].join(" ")}
          >
            {state.isProcessing ? "Processing…" : "✦ Generate Composition"}
          </button>

          {/* ── Error message ── */}
          {state.error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-900/30 border border-red-500/40 px-3 py-2.5 text-sm text-red-300">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{state.error}</span>
              <button
                onClick={() => dispatch({ type: "CLEAR_ERROR" })}
                className="ml-auto shrink-0 text-red-400 hover:text-red-200"
              >
                ✕
              </button>
            </div>
          )}
        </aside>

        {/* ══════════════════════════════════════════════════════════════
            RIGHT PANEL – canvas preview
        ══════════════════════════════════════════════════════════════ */}
        <main className="flex-1 flex flex-col gap-4">
          {/* Canvas container */}
          <div className="relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 backdrop-blur-sm">
            {/* Processing overlay */}
            {state.isProcessing && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/60 backdrop-blur-sm">
                {/* Spinner */}
                <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-violet-500 animate-spin" />
                <p className="text-sm font-medium text-white/80">
                  {state.processingStage || "Processing…"}
                </p>
              </div>
            )}

            <canvas
              ref={canvasRef}
              width={1280}
              height={720}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className={[
                "w-full h-auto block",
                layersRef.current.portrait
                  ? "cursor-grab active:cursor-grabbing"
                  : "cursor-default",
              ].join(" ")}
              style={{ maxHeight: "65vh", objectFit: "contain" }}
            />

            {/* Empty state */}
            {!layersRef.current.background &&
              !layersRef.current.portrait &&
              !state.isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                  <span className="text-4xl opacity-30">🖼</span>
                  <p className="text-sm text-white/30">
                    Upload images or pick a preset, then click Generate
                  </p>
                </div>
              )}
          </div>

          {/* Download button + tips */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              onClick={handleDownload}
              disabled={!canDownload}
              className={[
                "rounded-xl px-5 py-2.5 font-semibold text-sm transition-all duration-200 flex items-center gap-2",
                canDownload
                  ? "bg-emerald-700 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-900/30 active:scale-[0.98]"
                  : "bg-white/10 text-white/30 cursor-not-allowed",
              ].join(" ")}
            >
              ⬇ Download PNG
            </button>

            <p className="text-xs text-white/30">
              Exports the full-resolution canvas (1280 × 720 px when using a
              preset background)
            </p>
          </div>

          {/* ── Processing steps info card ── */}
          <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">
              How It Works
            </h3>
            <ol className="flex flex-col gap-2">
              {[
                ["1", "Upload your portrait photo"],
                ["2", "Optionally pick a preset or upload a custom background & overlay"],
                ["3", 'Click "Generate Composition" to run AI background removal'],
                ["4", "Drag the cutout to reposition · use the Scale slider to resize"],
                ["5", "Download the final PNG"],
              ].map(([n, text]) => (
                <li key={n} className="flex items-start gap-3 text-xs text-white/50">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/70">
                    {n}
                  </span>
                  {text}
                </li>
              ))}
            </ol>
          </div>
        </main>
      </div>
    </div>
  );
}
