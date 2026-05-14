"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  GizmoHelper,
  GizmoViewport,
  Stats,
} from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Spherical, Vector3 } from "three";
import { useViewerStore } from "@/stores/viewer-store";
import { ModelMesh } from "@/components/viewer/ModelMesh";
import { OBJModelMesh } from "@/components/viewer/OBJModelMesh";
import { FBXModelMesh } from "@/components/viewer/FBXModelMesh";

function ext(url: string) {
  return url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
}

function mtlUrlFrom(objUrl: string) {
  return objUrl.replace(/\.obj$/i, ".mtl");
}

function textureDirFor(fbxUrl: string): string | undefined {
  if (fbxUrl.includes("/ball/scenes/")) {
    return "/ball/textures/TEXTURES FOR MAYA";
  }
  return undefined;
}

function SceneContent() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const modelUrl = useViewerStore((s) => s.modelUrl);
  const autoRotate = useViewerStore((s) => s.autoRotate);
  const gestureMode = useViewerStore((s) => s.gestureMode);
  const modelScale = useViewerStore((s) => s.modelScale);
  const cameraDistance = useViewerStore((s) => s.cameraDistance);
  const resetRequestedAt = useViewerStore((s) => s.resetRequestedAt);
  const setFps = useViewerStore((s) => s.setFps);
  const previousTime = useRef(0);

  // Camera reset
  useEffect(() => {
    if (!controlsRef.current || !resetRequestedAt) return;
    controlsRef.current.reset();
  }, [resetRequestedAt]);

  // Gesture zoom — change distance along current view direction
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const dir = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target).addScaledVector(dir, cameraDistance);
    controls.update();
  }, [cameraDistance, camera]);

  const spherical = useRef(new Spherical());
  const offset = useRef(new Vector3());

  useFrame((state) => {
    const { gestureDeltaAzimuth, gestureDeltaPolar, clearGestureDeltas } =
      useViewerStore.getState();

    if (gestureDeltaAzimuth !== 0 || gestureDeltaPolar !== 0) {
      const controls = controlsRef.current;
      if (controls) {
        offset.current.copy(state.camera.position).sub(controls.target);
        spherical.current.setFromVector3(offset.current);
        // azimuth: hand right → theta decreases (camera orbits left → model spins right)
        spherical.current.theta -= gestureDeltaAzimuth;
        // polar: hand down → phi increases (camera dips lower → model tilts up)
        spherical.current.phi = Math.max(
          0.05,
          Math.min(Math.PI - 0.05, spherical.current.phi + gestureDeltaPolar),
        );
        offset.current.setFromSpherical(spherical.current);
        state.camera.position.copy(controls.target).add(offset.current);
        state.camera.lookAt(controls.target);
        controls.update();
      }
      clearGestureDeltas();
    }

    // FPS counter
    if (previousTime.current > 0) {
      const dt = state.clock.elapsedTime - previousTime.current;
      if (dt > 0) setFps(Math.round(1 / dt));
    }
    previousTime.current = state.clock.elapsedTime;
  });

  return (
    <>
      <color attach="background" args={["#020617"]} />

      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 3]} intensity={2.5} castShadow />
      <directionalLight position={[-4, 2, 3]} intensity={1.4} />
      <directionalLight position={[0, -4, -5]} intensity={1.0} />
      <pointLight position={[-3, 3, -3]} color="#22d3ee" intensity={1.2} />
      <pointLight position={[3, -2, 3]} color="#7c3aed" intensity={0.8} />

      <group scale={[modelScale, modelScale, modelScale]}>
        {modelUrl && ext(modelUrl) === "fbx" ? (
          <FBXModelMesh
            key={modelUrl}
            fbxUrl={modelUrl}
            texturePath={textureDirFor(modelUrl)}
          />
        ) : modelUrl && ext(modelUrl) === "obj" ? (
          <OBJModelMesh key={modelUrl} objUrl={modelUrl} mtlUrl={mtlUrlFrom(modelUrl)} />
        ) : modelUrl ? (
          <ModelMesh key={modelUrl} source={modelUrl} />
        ) : null}

        {/* XYZ axes at model origin */}
        <axesHelper args={[1.4]} />
      </group>

      <OrbitControls
        ref={controlsRef}
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.06}
        autoRotate={autoRotate}
        autoRotateSpeed={1.2}
        enableRotate={gestureMode !== "pause"}
        enablePan={gestureMode !== "pause"}
        enableZoom={gestureMode !== "pause"}
        minDistance={0.8}
        maxDistance={12}
      />

      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport
          axisColors={["#ef4444", "#22c55e", "#3b82f6"]}
          labelColor="#e2e8f0"
        />
      </GizmoHelper>

      <Stats />
    </>
  );
}

export function ViewerCanvas() {
  const dpr = useMemo(() => [1, 2] as [number, number], []);

  return (
    <div className="h-[60vh] w-full overflow-hidden rounded-xl border border-cyan-400/20">
      <Canvas camera={{ position: [0, 0, 3.5], fov: 45 }} dpr={dpr} shadows>
        <SceneContent />
      </Canvas>
    </div>
  );
}
