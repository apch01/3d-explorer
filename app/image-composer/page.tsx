import type { Metadata } from "next";
import ImageComposerPage from "@/components/image-composer/ImageComposerPage";

export const metadata: Metadata = {
  title: "Image Composer · 3D Explorer",
  description:
    "AI-powered portrait background removal and multi-layer image compositing tool",
};

export default function Page() {
  return <ImageComposerPage />;
}
