"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stats } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { MathUtils } from "three";
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

/** For known bundled FBX assets, return the co-located PBR texture folder. */
function textureDirFor(fbxUrl: string): string | undefined {
  if (fbxUrl.includes("/ball/scenes/")) {
    return "/ball/textures/TEXTURES FOR MAYA";
  }
  return undefined;
}

function SceneContent() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const modelUrl = useViewerStore((s) => s.modelUrl);
  const gestureMode = useViewerStore((s) => s.gestureMode);
  const modelRotationY = useViewerStore((s) => s.modelRotationY);
  const modelScale = useViewerStore((s) => s.modelScale);
  const cameraDistance = useViewerStore((s) => s.cameraDistance);
  const resetRequestedAt = useViewerStore((s) => s.resetRequestedAt);
  const setFps = useViewerStore((s) => s.setFps);
  const previousTime = useRef(0);

  useEffect(() => {
    if (!controlsRef.current || !resetRequestedAt) return;
    controlsRef.current.reset();
  }, [resetRequestedAt]);

  useFrame((state) => {
    state.camera.position.z = MathUtils.lerp(
      state.camera.position.z,
      cameraDistance,
      0.2,
    );
    controlsRef.current?.update();

    if (previousTime.current > 0) {
      const dt = state.clock.elapsedTime - previousTime.current;
      if (dt > 0) {
        setFps(Math.round(1 / dt));
      }
    }
    previousTime.current = state.clock.elapsedTime;
  }); 

  return (
    <>
      <color attach="background" args={["#020617"]} />

      {/* Broad fill — lifts the whole model out of darkness */}
      <ambientLight intensity={0.6} />

      {/* Key light — top-front-right, main highlights */}
      <directionalLight position={[4, 6, 3]} intensity={2.5} castShadow />

      {/* Fill light — left side, softens shadows */}
      <directionalLight position={[-4, 2, 3]} intensity={1.4} />

      {/* Rim / back light — makes the ball pop off the background */}
      <directionalLight position={[0, -4, -5]} intensity={1.0} color="#ffffff" />

      {/* Accent point lights for hologram glow feel */}
      <pointLight position={[-3, 3, -3]} color="#22d3ee" intensity={1.2} />
      <pointLight position={[3, -2, 3]} color="#7c3aed" intensity={0.8} />
      <group rotation={[0, modelRotationY, 0]} scale={[modelScale, modelScale, modelScale]}>
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
      </group>
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        enableRotate={gestureMode !== "pause"}
        enablePan={gestureMode !== "pause"}
        enableZoom={gestureMode !== "pause"}
      />
      <Stats />
    </>
  );
}

export function ViewerCanvas() {
  const dpr = useMemo(() => [1, 2] as [number, number], []);

  return (
    <div className="h-[60vh] w-full overflow-hidden rounded-xl border border-cyan-400/20">
      <Canvas camera={{ position: [0, 0, 2.2], fov: 45 }} dpr={dpr} shadows>
        <SceneContent />
      </Canvas>
    </div>
  );
}
