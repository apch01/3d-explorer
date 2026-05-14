"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  GestureRecognizer,
  type GestureRecognizerResult,
} from "@mediapipe/tasks-vision";
import type { GestureMode } from "@/stores/viewer-store";
import { useViewerStore } from "@/stores/viewer-store";

type GestureEvent = {
  mode: GestureMode;
  confidence: number;
  label: string;
};

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";

export function useGestureControls() {
  const enabled = useViewerStore((s) => s.gestureEnabled);
  const setMode = useViewerStore((s) => s.setGestureMode);
  const rotateModelBy = useViewerStore((s) => s.rotateModelBy);
  const scaleModelBy = useViewerStore((s) => s.scaleModelBy);
  const zoomCameraBy = useViewerStore((s) => s.zoomCameraBy);
  const [lastEvent, setLastEvent] = useState<GestureEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastWristX = useRef<number | null>(null);
  const lastTwoHandDistance = useRef<number | null>(null);
  const lastActionAt = useRef(0);

  const publishEvent = useCallback(
    (event: GestureEvent) => {
      setMode(event.mode);
      setLastEvent(event);
    },
    [setMode],
  );

  const detectFromResult = useCallback((result: GestureRecognizerResult) => {
    const now = performance.now();
    if (now - lastActionAt.current < 80) return;

    const landmarks = result.landmarks;
    const category = result.gestures[0]?.[0];
    const label = category?.categoryName ?? "NoGesture";
    const confidence = category?.score ?? 0.5;

    if (!landmarks.length) {
      publishEvent({ mode: "none", confidence: 0.5, label: "NoHand" });
      return;
    }

    if (landmarks.length >= 2) {
      const a = landmarks[0]?.[0];
      const b = landmarks[1]?.[0];
      if (a && b) {
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (lastTwoHandDistance.current !== null) {
          const delta = dist - lastTwoHandDistance.current;
          if (Math.abs(delta) > 0.01) {
            scaleModelBy(delta > 0 ? 1.03 : 0.97);
            publishEvent({
              mode: "zoom",
              confidence: Math.min(1, Math.abs(delta) * 12),
              label: "TwoHandSpread",
            });
            lastActionAt.current = now;
          }
        }
        lastTwoHandDistance.current = dist;
      }
      return;
    }

    const hand = landmarks[0];
    const wrist = hand?.[0];
    const thumbTip = hand?.[4];
    const indexTip = hand?.[8];

    if (thumbTip && indexTip) {
      const pinchDistance = Math.hypot(
        thumbTip.x - indexTip.x,
        thumbTip.y - indexTip.y,
      );
      if (pinchDistance < 0.06) {
        zoomCameraBy(-0.08);
        publishEvent({ mode: "zoom", confidence: 0.92, label: "Pinch" });
        lastActionAt.current = now;
        return;
      }
    }

    if (wrist && lastWristX.current !== null) {
      const xDelta = wrist.x - lastWristX.current;
      if (Math.abs(xDelta) > 0.02) {
        rotateModelBy(-xDelta * 2.4);
        publishEvent({
          mode: "rotate",
          confidence: Math.min(1, Math.abs(xDelta) * 16),
          label: xDelta > 0 ? "SwipeRight" : "SwipeLeft",
        });
        lastActionAt.current = now;
        lastWristX.current = wrist.x;
        return;
      }
    }
    if (wrist) lastWristX.current = wrist.x;

    if (label === "Closed_Fist") {
      publishEvent({ mode: "pause", confidence, label });
      lastActionAt.current = now;
      return;
    }

    if (label === "Open_Palm") {
      publishEvent({ mode: "rotate", confidence, label });
      lastActionAt.current = now;
      return;
    }

    publishEvent({ mode: "none", confidence, label });
  }, [rotateModelBy, scaleModelBy, publishEvent, zoomCameraBy]);

  useEffect(() => {
    if (!enabled) {
      setMode("none");
      return;
    }

    let active = true;
    let animationFrame = 0;
    let stream: MediaStream | null = null;
    let recognizer: GestureRecognizer | null = null;
    const videoElement = videoRef.current;

    const start = async () => {
      try {
        if (!videoElement) {
          throw new Error("Webcam view is not available.");
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Browser does not support webcam capture.");
        }

        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL },
          runningMode: "VIDEO",
          numHands: 2,
        });

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });

        videoElement.srcObject = stream;
        await videoElement.play();
        setReady(true);
        setError(null);

        const tick = () => {
          if (!active || !recognizer) return;
          if (videoElement.readyState >= 2) {
            const result = recognizer.recognizeForVideo(
              videoElement,
              performance.now(),
            );
            detectFromResult(result);
          }
          animationFrame = window.requestAnimationFrame(tick);
        };

        animationFrame = window.requestAnimationFrame(tick);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to initialize webcam gestures.";
        setError(message);
        setReady(false);
        setMode("none");
      }
    };

    void start();

    return () => {
      active = false;
      window.cancelAnimationFrame(animationFrame);
      recognizer?.close();
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (videoElement) {
        videoElement.pause();
        videoElement.srcObject = null;
      }
      lastWristX.current = null;
      lastTwoHandDistance.current = null;
      setReady(false);
    };
  }, [enabled, setMode, detectFromResult]);

  return { enabled, lastEvent, error, ready, videoRef };
}
