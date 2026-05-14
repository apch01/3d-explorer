import type { GestureMode } from "@/stores/viewer-store";

export type GestureEvent = {
  mode: GestureMode;
  confidence: number;
  label: string;
};

const mockModes: GestureEvent[] = [
  { mode: "rotate", confidence: 0.96, label: "OpenPalm" },
  { mode: "zoom", confidence: 0.91, label: "Pinch" },
  { mode: "pause", confidence: 0.89, label: "ClosedFist" },
  { mode: "none", confidence: 0.6, label: "NoGesture" },
];

export function createMockGestureStream(onEvent: (event: GestureEvent) => void) {
  const interval = window.setInterval(() => {
    const event = mockModes[Math.floor(Math.random() * mockModes.length)];
    onEvent(event);
  }, 1800);

  return () => window.clearInterval(interval);
}
