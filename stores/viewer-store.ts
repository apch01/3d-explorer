"use client";

import { create } from "zustand";

export type GestureMode = "none" | "rotate" | "zoom" | "pause";

const DEFAULT_CAMERA_DISTANCE = 3.5;


type ViewerState = {
  modelUrl: string | null;
  modelName: string;
  autoRotate: boolean;
  gestureEnabled: boolean;
  gestureMode: GestureMode;
  // Accumulated gesture rotation deltas consumed each frame by SceneContent
  gestureDeltaAzimuth: number;
  gestureDeltaPolar: number;
  modelScale: number;
  cameraDistance: number;
  fps: number;
  resetRequestedAt: number;
  setModel: (url: string | null, name?: string) => void;
  toggleAutoRotate: () => void;
  toggleGesture: () => void;
  setGestureMode: (mode: GestureMode) => void;
  addGestureDelta: (azimuth: number, polar: number) => void;
  clearGestureDeltas: () => void;
  scaleModelBy: (factor: number) => void;
  zoomCameraBy: (delta: number) => void;
  setFps: (fps: number) => void;
  requestCameraReset: () => void;
};

export const useViewerStore = create<ViewerState>((set) => ({
  modelUrl: "/ball/scenes/Ball Euro CUP 2020 (Low).fbx",
  modelName: "Ball Euro CUP 2020 (Low).fbx",
  autoRotate: true,
  gestureEnabled: false,
  gestureMode: "none",
  gestureDeltaAzimuth: 0,
  gestureDeltaPolar: 0,
  modelScale: 1,
  cameraDistance: DEFAULT_CAMERA_DISTANCE,
  fps: 0,
  resetRequestedAt: 0,
  setModel: (url, name = "Uploaded model") =>
    set(() => ({ modelUrl: url, modelName: name })),
  toggleAutoRotate: () => set((state) => ({ autoRotate: !state.autoRotate })),
  toggleGesture: () =>
    set((state) => ({ gestureEnabled: !state.gestureEnabled })),
  setGestureMode: (mode) => set(() => ({ gestureMode: mode })),
  addGestureDelta: (azimuth, polar) =>
    set((state) => ({
      gestureDeltaAzimuth: state.gestureDeltaAzimuth + azimuth,
      gestureDeltaPolar: state.gestureDeltaPolar + polar,
    })),
  clearGestureDeltas: () =>
    set(() => ({ gestureDeltaAzimuth: 0, gestureDeltaPolar: 0 })),
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
      modelScale: 1,
      cameraDistance: DEFAULT_CAMERA_DISTANCE,
      gestureDeltaAzimuth: 0,
      gestureDeltaPolar: 0,
    })),
}));
