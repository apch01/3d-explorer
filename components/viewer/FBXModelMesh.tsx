"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box3,
  Group,
  Mesh,
  MeshStandardMaterial,
  TextureLoader,
  Vector3,
  SRGBColorSpace,
} from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { Html } from "@react-three/drei";

type FBXModelMeshProps = {
  fbxUrl: string;
  /**
   * Optional base path (no trailing slash) where PBR texture sets live.
   * Expects files named <prefix>_BaseColor.png, _Normal.png, _Metallic.png, _Roughness.png.
   * If omitted, the FBX embedded materials are kept as-is.
   */
  texturePath?: string;
};

type PBRSet = {
  prefix: string;
  /** Mesh name substrings that should use this set */
  matHints: string[];
};

const TEXTURE_SETS: PBRSet[] = [
  { prefix: "Ball", matHints: ["ball", "Ball", "Material"] },
  { prefix: "Pimpa", matHints: ["pimpa", "Pimpa", "bump", "Bump"] },
];

function applyPBRTextures(group: Group, texturePath: string) {
  const loader = new TextureLoader();

  const loadedSets = TEXTURE_SETS.map(({ prefix, matHints }) => {
    const base = loader.load(`${texturePath}/${prefix}_BaseColor.png`, (t) => {
      t.colorSpace = SRGBColorSpace;
    });
    const normal = loader.load(`${texturePath}/${prefix}_Normal.png`);
    const metallic = loader.load(`${texturePath}/${prefix}_Metallic.png`);
    const roughness = loader.load(`${texturePath}/${prefix}_Roughness.png`);
    return {
      matHints,
      material: new MeshStandardMaterial({
        map: base,
        normalMap: normal,
        metalnessMap: metallic,
        roughnessMap: roughness,
        metalness: 1,
        roughness: 1,
      }),
    };
  });

  const fallback = loadedSets[0]!.material;

  group.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const matName =
      Array.isArray(child.material)
        ? (child.material[0] as MeshStandardMaterial)?.name ?? ""
        : (child.material as MeshStandardMaterial)?.name ?? "";
    const childName = child.name;

    const match =
      loadedSets.find(({ matHints }) =>
        matHints.some(
          (h) =>
            matName.toLowerCase().includes(h.toLowerCase()) ||
            childName.toLowerCase().includes(h.toLowerCase()),
        ),
      ) ?? { material: fallback };

    child.material = match.material;
    child.castShadow = true;
    child.receiveShadow = true;
  });

  return () => {
    loadedSets.forEach(({ material }) => material.dispose());
  };
}

export function FBXModelMesh({ fbxUrl, texturePath }: FBXModelMeshProps) {
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const groupRef = useRef<Group | null>(null);

  useEffect(() => {
    let active = true;
    const capturedGroupRef = groupRef;

    const load = async () => {
      try {
        const loader = new FBXLoader();
        const loadedGroup = await loader.loadAsync(fbxUrl);

        if (!active) return;

        if (texturePath) {
          const dispose = applyPBRTextures(loadedGroup, texturePath);
          cleanupRef.current = dispose;
        }

        // Scale first, then re-center in scaled space
        const rawBox = new Box3().setFromObject(loadedGroup);
        const rawSize = new Vector3();
        rawBox.getSize(rawSize);
        const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z) || 1;
        loadedGroup.scale.setScalar(2 / maxDim);

        const scaledBox = new Box3().setFromObject(loadedGroup);
        const center = new Vector3();
        scaledBox.getCenter(center);
        loadedGroup.position.sub(center);

        setGroup(loadedGroup);
        setLoading(false);
      } catch (err) {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load FBX model",
        );
        setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
      cleanupRef.current?.();
      cleanupRef.current = null;
      if (capturedGroupRef.current) {
        capturedGroupRef.current.traverse((child) => {
          if (child instanceof Mesh) {
            child.geometry?.dispose();
          }
        });
      }
    };
  }, [fbxUrl, texturePath]);

  if (loading) {
    return (
      <Html center>
        <p className="animate-pulse text-sm text-cyan-300">Loading model…</p>
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
