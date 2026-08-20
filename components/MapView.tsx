"use client";

import MapGL, { NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Application } from "@/lib/types";
import { useTheme } from "@/lib/useTheme";

const TILE_STYLES = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
} as const;

export default function MapView({
  applications,
}: {
  applications: Application[];
}) {
  const theme = useTheme();
  // No Application currently carries lat/lng (no "Airbus Site" field in the
  // API yet - see spec section Decisions). Once the backend exposes a site/geo
  // field, group `applications` by site here (same pattern as the removed
  // LabTestMean SiteGroup logic) and render Marker/Popup again.
  return (
    <div className="relative w-full h-full">
      <MapGL
        initialViewState={{ longitude: 5, latitude: 47, zoom: 3.5 }}
        mapStyle={TILE_STYLES[theme]}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" />
      </MapGL>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="px-5 py-3 rounded-card bg-surface/90 border border-border text-sm text-muted backdrop-blur-md pointer-events-auto">
          No location data available yet ({applications.length} applications loaded)
        </div>
      </div>
    </div>
  );
}
