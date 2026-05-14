"use client";

import { useEffect, useMemo, useState } from "react";
import { BufferGeometry, MeshStandardMaterial, Vector3 } from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { Html } from "@react-three/drei";

type ModelMeshProps = {
  source: string;
};

export function ModelMesh({ source }: ModelMeshProps) {
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);
  const [hasVertexColors, setHasVertexColors] = useState(false);
  const [loading, setLoading] = useState(true); // true by default — remount via key resets this

  useEffect(() => {
    let active = true;
    const loader = new STLLoader();

    loader.load(
      source,
      (loadedGeometry) => {
        if (!active) return;

        // Center geometry vertices at origin, then scale
        loadedGeometry.center();
        loadedGeometry.computeBoundingBox();
        const box = loadedGeometry.boundingBox;
        if (!box) return;
        const size = new Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        loadedGeometry.scale(2 / maxDim, 2 / maxDim, 2 / maxDim);
        loadedGeometry.computeVertexNormals();
        setHasVertexColors(loadedGeometry.hasAttribute("color"));
        setGeometry(loadedGeometry);
        setLoading(false);
      },
      undefined,
      () => {
        setHasVertexColors(false);
        setGeometry(null);
        setLoading(false);
      },
    );

    return () => {
      active = false;
      setGeometry((current) => {
        current?.dispose();
        return null;
      });
      setHasVertexColors(false);
    };
  }, [source]);

  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: hasVertexColors ? "#ffffff" : "#7dd3fc",
        metalness: 0.45,
        roughness: 0.18,
        vertexColors: hasVertexColors,
      }),
    [hasVertexColors],
  );

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  if (loading) {
    return (
      <Html center>
        <p className="text-sm text-cyan-300 animate-pulse">Loading model…</p>
      </Html>
    );
  }

  if (!geometry) return null;

  return <mesh geometry={geometry} material={material} castShadow receiveShadow />;
}
