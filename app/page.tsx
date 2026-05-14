"use client";

import { useEffect, useState } from "react";
import { ViewerCanvas } from "@/components/viewer/ViewerCanvas";
import { ControlPanel } from "@/components/ui/ControlPanel";
import { WebcamGesturePanel } from "@/components/gestures/WebcamGesturePanel";
import { useViewerStore } from "@/stores/viewer-store";

export default function Home() {
  const setModel = useViewerStore((s) => s.setModel);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const handleFileLoaded = (file: File) => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setModel(url, file.name);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 p-4 md:p-6">
      <header className="rounded-xl border border-cyan-400/30 bg-slate-950/90 p-4">
        <h1 className="text-xl font-semibold text-cyan-100 md:text-2xl">
          Hologram 3D Explorer
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          Touch-first 3D viewer with live webcam gesture control.
        </p>
      </header>

      <ViewerCanvas />

      <div className="grid gap-4 md:grid-cols-2">
        <ControlPanel onFileLoaded={handleFileLoaded} />
        <WebcamGesturePanel />
      </div>
    </main>
  );
}
