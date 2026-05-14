"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useViewerStore } from "@/stores/viewer-store";

type ControlPanelProps = {
  onFileLoaded: (file: File) => void;
};

export function ControlPanel({ onFileLoaded }: ControlPanelProps) {
  const modelName = useViewerStore((s) => s.modelName);
  const fps = useViewerStore((s) => s.fps);
  const autoRotate = useViewerStore((s) => s.autoRotate);
  const toggleAutoRotate = useViewerStore((s) => s.toggleAutoRotate);
  const requestCameraReset = useViewerStore((s) => s.requestCameraReset);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      onFileLoaded(file);
    },
    [onFileLoaded],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "model/stl": [".stl"],
      "application/sla": [".stl"],
      "model/obj": [".obj"],
      "application/octet-stream": [".obj", ".ply", ".fbx"],
    },
  });

  const openFullscreen = () => {
    document.documentElement.requestFullscreen?.();
  };

  return (
    <section className="grid gap-3 rounded-xl border border-cyan-400/30 bg-slate-950/80 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-cyan-200">Viewer Controls</h2>
        <span className="text-xs text-slate-300">FPS: {fps}</span>
      </div>

      <div
        {...getRootProps()}
        className="cursor-pointer rounded-lg border border-dashed border-cyan-400/40 p-3 text-xs text-slate-300 hover:border-cyan-300"
      >
        <input {...getInputProps()} />
        {isDragActive ? "Drop model here..." : "Drag STL / OBJ / FBX here or tap to upload"}
      </div>

      <p className="truncate text-xs text-slate-400">Model: {modelName}</p>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={requestCameraReset}
          className="rounded-md bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-600"
        >
          Reset Camera
        </button>
        <button
          onClick={toggleAutoRotate}
          className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
            autoRotate
              ? "bg-cyan-600 text-white hover:bg-cyan-500"
              : "bg-slate-700 text-white hover:bg-slate-600"
          }`}
        >
          {autoRotate ? "Stop Spin" : "Auto Spin"}
        </button>
        <button
          onClick={openFullscreen}
          className="rounded-md bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
        >
          Fullscreen
        </button>
      </div>
    </section>
  );
}
