"use client";

import { useEffect, useRef, useState } from "react";
import { Box3, Group, Vector3 } from "three";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { Html } from "@react-three/drei";

type OBJModelMeshProps = {
  objUrl: string;
  mtlUrl?: string;
};

function isBlobUrl(url: string) {
  return url.startsWith("blob:");
}

export function OBJModelMesh({ objUrl, mtlUrl }: OBJModelMeshProps) {
  // loading/error start as initial values — parent uses key={objUrl} to remount on URL change
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const groupRef = useRef<Group | null>(null);

  useEffect(() => {
    let active = true;

    const capturedGroupRef = groupRef;

    const load = async () => {
      try {
        const objLoader = new OBJLoader();

        // Only attempt MTL loading for non-blob URLs where the .mtl is reliably accessible
        if (mtlUrl && !isBlobUrl(objUrl)) {
          try {
            const mtlLoader = new MTLLoader();
            const materials = await mtlLoader.loadAsync(mtlUrl);
            materials.preload();
            objLoader.setMaterials(materials);
          } catch {
            // MTL load failed — continue loading OBJ without materials
          }
        }

        const loadedGroup = await objLoader.loadAsync(objUrl);

        if (!active) {
          loadedGroup.traverse((child) => {
            if ("geometry" in child && child.geometry) {
              (child.geometry as { dispose: () => void }).dispose();
            }
          });
          return;
        }

        // Scale first, then center — order matters because position is in local space
        const rawBox = new Box3().setFromObject(loadedGroup);
        const rawSize = new Vector3();
        rawBox.getSize(rawSize);
        const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z) || 1;
        loadedGroup.scale.setScalar(2 / maxDim);

        // Recompute box after scaling so the centering offset is in scaled coordinates
        const scaledBox = new Box3().setFromObject(loadedGroup);
        const center = new Vector3();
        scaledBox.getCenter(center);
        loadedGroup.position.sub(center);

        if (!active) return;
        setGroup(loadedGroup);
        setLoading(false);
      } catch (err) {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : "Failed to load OBJ");
        setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
      if (capturedGroupRef.current) {
        capturedGroupRef.current.traverse((child) => {
          if ("geometry" in child && child.geometry) {
            (child.geometry as { dispose: () => void }).dispose();
          }
          if ("material" in child) {
            const mat = (child as { material?: unknown }).material;
            if (Array.isArray(mat)) {
              mat.forEach((m: { dispose?: () => void }) => m.dispose?.());
            } else if (mat && typeof mat === "object" && "dispose" in mat) {
              (mat as { dispose: () => void }).dispose();
            }
          }
        });
      }
    };
  }, [objUrl, mtlUrl]);

  if (loading) {
    return (
      <Html center>
        <p className="text-sm text-cyan-300 animate-pulse">Loading model…</p>
      </Html>
    );
  }

  if (loadError) {
    return (
      <Html center>
        <p className="max-w-xs text-center text-xs text-rose-400">{loadError}</p>
      </Html>
    );
  }

  if (!group) return null;

  return <primitive ref={groupRef} object={group} />;
}
