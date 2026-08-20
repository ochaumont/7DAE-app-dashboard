"use client";

import dynamic from "next/dynamic";

const PanoramaViewer = dynamic(() => import("./PanoramaViewer"), {
  ssr: false,
});

export default function PanoramaClient({ src }: { src: string }) {
  return <PanoramaViewer src={src} />;
}
