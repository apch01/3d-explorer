"use client";

import { create } from "zustand";

export type GestureMode = "none" | "rotate" | "zoom" | "pause";

const DEFAULT_CAMERA_DISTANCE = 4;
const DEFAULT_ROTATION_Y = -1.6; // ~28° right

type ViewerState = {
  modelUrl: string | null;
  modelName: string;
  gestureEnabled: boolean;
  gestureMode: GestureMode;
  modelRotationY: number;
  modelScale: number;
  cameraDistance: number;
  fps: number;
  resetRequestedAt: number;
  setModel: (url: string | null, name?: string) => void;
  toggleGesture: () => void;
  setGestureMode: (mode: GestureMode) => void;
  rotateModelBy: (delta: number) => void;
  scaleModelBy: (factor: number) => void;
  zoomCameraBy: (delta: number) => void;
  setFps: (fps: number) => void;
  requestCameraReset: () => void;
};

export const useViewerStore = create<ViewerState>((set) => ({
  modelUrl: "/ball/scenes/Ball Euro CUP 2020 (Low).fbx",
  modelName: "Ball Euro CUP 2020 (Low).fbx",
  gestureEnabled: false,
  gestureMode: "none",
  modelRotationY: DEFAULT_ROTATION_Y,
  modelScale: 1,
  cameraDistance: DEFAULT_CAMERA_DISTANCE,
  fps: 0,
  resetRequestedAt: 0,
  setModel: (url, name = "Uploaded model") =>
    set(() => ({ modelUrl: url, modelName: name })),
  toggleGesture: () =>
    set((state) => ({ gestureEnabled: !state.gestureEnabled })),
  setGestureMode: (mode) => set(() => ({ gestureMode: mode })),
  rotateModelBy: (delta) =>
    set((state) => ({ modelRotationY: state.modelRotationY + delta })),
  scaleModelBy: (factor) =>
    set((state) => ({
      modelScale: Math.max(0.4, Math.min(3, state.modelScale * factor)),
    })),
  zoomCameraBy: (delta) =>
    set((state) => ({
      cameraDistance: Math.max(1.2, Math.min(10, state.cameraDistance + delta)),
    })),
  setFps: (fps) => set(() => ({ fps })),
  requestCameraReset: () =>
    set(() => ({
      resetRequestedAt: Date.now(),
      modelRotationY: DEFAULT_ROTATION_Y,
      modelScale: 1,
      cameraDistance: DEFAULT_CAMERA_DISTANCE,
    })),
}));
