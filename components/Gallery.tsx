"use client";

import { useMemo, useState } from "react";
import type { Photo } from "@/lib/types";
import { usePhoto } from "@/lib/usePhoto";
import { generateApplicationCoverDataUri } from "@/lib/generated-cover";
import PanoramaClient from "./PanoramaClient";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_HREF ?? "";

/** No application carries real photos yet — these bundled covers stand in for
 * the future per-application gallery so the layout can be previewed today.
 * The first slide is the generated per-application cover (same one shown on
 * the catalogue card); the rest stay generic. */
const GENERIC_SIMULATED_PHOTOS = [
  `${BASE_PATH}/covers/cover-2.svg`,
  `${BASE_PATH}/covers/cover-3.svg`,
  `${BASE_PATH}/covers/cover-4.svg`,
];

function SimulatedThumbnail({
  src,
  active,
  onClick,
}: {
  src: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative aspect-square rounded overflow-hidden border-2 transition-all ${
        active
          ? "border-accent opacity-100"
          : "border-transparent opacity-60 hover:opacity-100"
      }`}
      type="button"
    >
      <img src={src} alt="" className="w-full h-full object-cover" />
    </button>
  );
}

function PhotoSlide({ photo }: { photo: Photo }) {
  const src = usePhoto(photo.resourceId, photo.resourceUri);
  if (photo.is360) return <PanoramaClient src={src} />;
  return (
    <img
      src={src}
      alt={photo.alt ?? ""}
      className="w-full h-full object-cover"
    />
  );
}

function Thumbnail({
  photo,
  active,
  onClick,
}: {
  photo: Photo;
  active: boolean;
  onClick: () => void;
}) {
  const src = usePhoto(photo.resourceId, photo.resourceUri);
  return (
    <button
      onClick={onClick}
      title={photo.is360 ? "Image 360°" : undefined}
      className={`relative aspect-square rounded overflow-hidden border-2 transition-all ${
        active
          ? "border-accent opacity-100"
          : "border-transparent opacity-60 hover:opacity-100"
      }`}
      type="button"
    >
      <img src={src} alt={photo.alt ?? ""} className="w-full h-full object-cover" />
      {photo.is360 && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 px-1 py-0.5 rounded text-[10px] font-mono bg-accent text-accent-fg leading-none"
        >
          360°
        </span>
      )}
    </button>
  );
}

export type GalleryVideoOverride = {
  name: string;
  /** Canonical /preview embed URL, or null if extraction failed (fallback link). */
  embedUrl: string | null;
  /** Raw documentRef.url, used for the "Open video" fallback link. */
  rawUrl: string;
} | null;

export default function Gallery({
  photos,
  name,
  externalId,
  videoOverride = null,
  onPhotoSelect,
}: {
  photos: Photo[];
  name: string;
  externalId: string;
  videoOverride?: GalleryVideoOverride;
  onPhotoSelect?: () => void;
}) {
  const [active, setActive] = useState(0);
  const current = photos[active];
  const isSimulated = !current;

  const simulatedPhotos = useMemo(
    () => [generateApplicationCoverDataUri(name, externalId), ...GENERIC_SIMULATED_PHOTOS],
    [name, externalId],
  );

  const selectPhoto = (i: number) => {
    setActive(i);
    onPhotoSelect?.();
  };

  const thumbnailStrip = isSimulated ? (
    <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
      {simulatedPhotos.map((src, i) => (
        <SimulatedThumbnail
          key={src}
          src={src}
          active={i === active}
          onClick={() => selectPhoto(i)}
        />
      ))}
    </div>
  ) : photos.length > 1 ? (
    <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
      {photos.map((p, i) => (
        <Thumbnail
          key={i}
          photo={p}
          active={i === active}
          onClick={() => selectPhoto(i)}
        />
      ))}
    </div>
  ) : null;

  let heroContent: React.ReactNode;
  if (videoOverride) {
    heroContent = videoOverride.embedUrl ? (
      <iframe
        src={videoOverride.embedUrl}
        className="w-full h-full"
        allow="autoplay"
        title={videoOverride.name}
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center p-4 text-center">
        <a
          href={videoOverride.rawUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline break-all"
        >
          Ouvrir la vidéo
        </a>
      </div>
    );
  } else if (isSimulated) {
    const simulatedSrc = simulatedPhotos[active] ?? simulatedPhotos[0];
    heroContent = (
      <>
        <img src={simulatedSrc} alt="" className="w-full h-full object-cover" />
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-mono text-muted bg-surface/90 backdrop-blur-md">
          Preview
        </span>
      </>
    );
  } else {
    heroContent = <PhotoSlide photo={current} />;
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-video bg-surface-2 rounded-card overflow-hidden">
        {heroContent}
      </div>
      {thumbnailStrip}
    </div>
  );
}
