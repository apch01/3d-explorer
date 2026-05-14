"use client";

import { useGestureControls } from "@/hooks/useGestureControls";
import { useViewerStore } from "@/stores/viewer-store";

const GESTURE_GUIDE = [
  {
    gesture: "✋ Open Palm",
    action: "Rotate mode — move hand left/right to spin model",
  },
  {
    gesture: "🤌 Pinch",
    action: "Zoom in — bring thumb & index finger together",
  },
  {
    gesture: "🤲 Two Hands Spread",
    action: "Scale up/down — move both hands apart or together",
  },
  {
    gesture: "✊ Closed Fist",
    action: "Zoom out — pull camera back",
  },
  {
    gesture: "👋 Swipe Left / Right",
    action: "Rotate model along Y axis",
  },
];

const MODE_COLORS: Record<string, string> = {
  rotate: "text-emerald-400",
  zoom: "text-yellow-400",
  pause: "text-rose-400",
  none: "text-slate-400",
};

export function WebcamGesturePanel() {
  const toggleGesture = useViewerStore((s) => s.toggleGesture);
  const gestureMode = useViewerStore((s) => s.gestureMode);
  const { enabled, lastEvent, error, ready, videoRef } = useGestureControls();

  return (
    <section className="rounded-xl border border-cyan-400/30 bg-slate-950/80 p-4 flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-cyan-200">Gesture Control</h2>
        <button
          onClick={toggleGesture}
          className="rounded-md bg-cyan-500 px-3 py-1 text-sm font-medium text-slate-950 hover:bg-cyan-400"
        >
          {enabled ? "Disable" : "Enable"}
        </button>
      </div>

      {/* Live status */}
      <div className="flex items-center gap-3 text-xs">
        <span className="text-slate-400">
          Webcam:{" "}
          <span className="font-semibold text-cyan-300">
            {enabled ? (ready ? "active" : "starting...") : "off"}
          </span>
        </span>
        <span className="text-slate-400">
          Mode:{" "}
          <span className={`font-semibold ${MODE_COLORS[gestureMode] ?? "text-slate-400"}`}>
            {gestureMode}
          </span>
        </span>
        {enabled && lastEvent && (
          <span className="ml-auto text-slate-500">
            {lastEvent.label} {Math.round(lastEvent.confidence * 100)}%
          </span>
        )}
      </div>

      {error && <p className="text-xs text-rose-300">{error}</p>}

      {/* Webcam preview */}
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        className="h-28 w-full rounded-lg border border-cyan-400/20 bg-slate-900 object-cover"
      />

      {/* Gesture reference guide */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Gesture Reference
        </p>
        <ul className="flex flex-col gap-1.5">
          {GESTURE_GUIDE.map(({ gesture, action }) => (
            <li key={gesture} className="flex gap-2 text-xs leading-snug">
              <span className="w-36 shrink-0 font-medium text-cyan-300">{gesture}</span>
              <span className="text-slate-400">{action}</span>
            </li>
          ))}
        </ul>
      </div>

    </section>
  );
}
