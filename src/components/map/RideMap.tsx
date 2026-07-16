"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import {
  carIcon,
  destinationIcon,
  pickupIcon,
} from "@/components/map/mapIcons";
import type { LatLng } from "@/types";

const DEFAULT_CENTER: LatLng = { lat: 37.7749, lng: -122.4194 };

export type ActiveField = "pickup" | "destination";

interface RideMapProps {
  pickup: LatLng | null;
  destination: LatLng | null;
  route: LatLng[] | null;
  activeField: ActiveField;
  /** Fired when the rider taps the map, or drags a pin, to set that field's location. */
  onPick: (field: ActiveField, location: LatLng) => void;
  /** Optional live driver GPS position — used by the driver console to show a car marker. */
  driverLocation?: LatLng | null;
  /** Disables click/drag-to-set behaviour — used on read-only maps like the driver console. */
  readOnly?: boolean;
}

function ClickToSetLocation({
  activeField,
  onPick,
}: Pick<RideMapProps, "activeField" | "onPick">) {
  useMapEvents({
    click(event) {
      onPick(activeField, { lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

/** Keeps the map framed around whatever pins/route/driver marker currently exist. */
function AutoFrame({
  pickup,
  destination,
  route,
  driverLocation,
}: Pick<RideMapProps, "pickup" | "destination" | "route" | "driverLocation">) {
  const map = useMap();
  const hasFramedOnce = useRef(false);

  // Keyed on the *trip context* (pickup/destination identity + whether a
  // route line exists) rather than on driverLocation itself — otherwise
  // every 5s GPS tick would yank the map back into a fitBounds(), fighting
  // any manual pan/zoom the driver just did.
  const tripKey = `${pickup ? `${pickup.lat},${pickup.lng}` : ""}|${
    destination ? `${destination.lat},${destination.lng}` : ""
  }|${route ? route.length : 0}`;

  useEffect(() => {
    const points: [number, number][] = [];
    if (route && route.length > 1) {
      route.forEach((point) => points.push([point.lat, point.lng]));
    } else {
      if (pickup) points.push([pickup.lat, pickup.lng]);
      if (destination) points.push([destination.lat, destination.lng]);
    }
    if (!pickup && !destination && driverLocation) {
      points.push([driverLocation.lat, driverLocation.lng]);
    }

    const firstPoint = points[0];
    if (points.length === 1 && firstPoint) {
      map.setView(firstPoint, 15, { animate: hasFramedOnce.current });
      hasFramedOnce.current = true;
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [64, 64], maxZoom: 16 });
      hasFramedOnce.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripKey, map]);

  return null;
}

/**
 * Self-contained "Center on me" control — recenters the map on the live
 * driver GPS marker on demand, without fighting AutoFrame's trip-context
 * framing or requiring the parent to hold a map ref.
 */
function RecenterControl({ driverLocation }: { driverLocation: LatLng | null }) {
  const map = useMap();
  if (!driverLocation) return null;
  return (
    <button
      type="button"
      onClick={() => map.setView([driverLocation.lat, driverLocation.lng], 16, { animate: true })}
      className="absolute bottom-4 right-4 z-[1000] flex h-11 w-11 items-center justify-center rounded-full border-2 border-foreground bg-card text-foreground shadow-md transition-transform hover:scale-105"
      aria-label="Center on my location"
      title="Center on my location"
    >
      <LocateFixedIcon />
    </button>
  );
}

function LocateFixedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Leaflet caches its container's pixel size and won't notice when that
 * container is resized by a CSS breakpoint change (our layouts switch
 * between stacked/side-by-side around `lg`) or the mobile nav drawer
 * toggling — without this it can render with stale tile alignment/blank
 * edges until the next manual pan/zoom.
 */
function ResizeAware() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);

    // Extra safety net: if the map was initialized against a stale/zero
    // container size (e.g. React StrictMode's dev-only double-mount
    // racing with the ssr:false dynamic import, or a mid-transition
    // layout that hadn't settled yet), a single delayed re-check fixes
    // it without waiting for an actual resize event.
    const timeout = setTimeout(() => map.invalidateSize(), 250);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [map]);
  return null;
}

export function RideMap({
  pickup,
  destination,
  route,
  activeField,
  onPick,
  driverLocation = null,
  readOnly = false,
}: RideMapProps) {
  const initialCenter = useMemo<LatLngExpression>(() => {
    const start = pickup ?? driverLocation ?? DEFAULT_CENTER;
    return [start.lat, start.lng];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const routeLine = useMemo<LatLngExpression[] | null>(() => {
    if (!route || route.length < 2) return null;
    return route.map((p) => [p.lat, p.lng]);
  }, [route]);

  return (
    <div className="relative isolate h-full w-full">
      <MapContainer
        center={initialCenter}
        zoom={13}
        scrollWheelZoom
        zoomControl={false}
        className="h-full w-full"
        style={{ background: "#e9e9e9" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {!readOnly && (
          <ClickToSetLocation activeField={activeField} onPick={onPick} />
        )}
        <AutoFrame
          pickup={pickup}
          destination={destination}
          route={route}
          driverLocation={driverLocation}
        />
        <ResizeAware />
        {driverLocation && <RecenterControl driverLocation={driverLocation} />}

        {routeLine && (
          <Polyline
            positions={routeLine}
            pathOptions={{ color: "#111111", weight: 4, opacity: 0.85 }}
          />
        )}

        {driverLocation && (
          <Marker
            position={[driverLocation.lat, driverLocation.lng]}
            icon={carIcon()}
          />
        )}

        {pickup && (
          <Marker
            position={[pickup.lat, pickup.lng]}
            icon={pickupIcon()}
            draggable={!readOnly}
            eventHandlers={{
              dragend: (event) => {
                const marker = event.target;
                const position = marker.getLatLng();
                onPick("pickup", { lat: position.lat, lng: position.lng });
              },
            }}
          />
        )}

        {destination && (
          <Marker
            position={[destination.lat, destination.lng]}
            icon={destinationIcon()}
            draggable={!readOnly}
            eventHandlers={{
              dragend: (event) => {
                const marker = event.target;
                const position = marker.getLatLng();
                onPick("destination", { lat: position.lat, lng: position.lng });
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
