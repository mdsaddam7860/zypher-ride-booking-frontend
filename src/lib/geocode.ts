import type { LatLng } from "@/types";

export interface PlaceSuggestion {
  id: string;
  label: string;
  sublabel: string;
  location: LatLng;
}

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

/**
 * Live "search as you type" place lookup, backed by OpenStreetMap's free
 * Nominatim geocoder — no API key required. Used by the From/To fields on
 * the rider map so results update as the rider types, the same way
 * Uber/Rapido's address search does.
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const params = new URLSearchParams({
    format: "jsonv2",
    q: trimmed,
    addressdetails: "1",
    limit: "6",
  });

  const response = await fetch(`${NOMINATIM_BASE}/search?${params.toString()}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Could not search for that place");

  const results: Array<{
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    address?: Record<string, string>;
  }> = await response.json();

  return results.map((result) => {
    const parts = result.display_name.split(",");
    const primary = parts[0] ?? result.display_name;
    const rest = parts.slice(1);
    return {
      id: String(result.place_id),
      label: primary.trim(),
      sublabel: rest.join(",").trim(),
      location: { lat: Number(result.lat), lng: Number(result.lon) },
    };
  });
}

/** Reverse-geocodes a dropped/dragged pin into a human-readable address. */
export async function reverseGeocode(location: LatLng, signal?: AbortSignal): Promise<string> {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(location.lat),
    lon: String(location.lng),
  });

  const response = await fetch(`${NOMINATIM_BASE}/reverse?${params.toString()}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Could not look up that location");

  const result: { display_name?: string } = await response.json();
  return result.display_name ?? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;
}

/** Road route geometry between two points, for drawing the live route line on the map. */
export async function fetchRoute(pickup: LatLng, destination: LatLng, signal?: AbortSignal): Promise<LatLng[] | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url, { signal });
    if (!response.ok) return null;
    const data = await response.json();
    const coords: [number, number][] | undefined = data?.routes?.[0]?.geometry?.coordinates;
    if (!coords) return null;
    return coords.map(([lng, lat]) => ({ lat, lng }));
  } catch {
    return null;
  }
}

export interface RouteSummary {
  geometry: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
}

/**
 * Same OSRM call as `fetchRoute`, but also surfaces distance/duration —
 * used by the driver console's live "distance & ETA to rider" readout,
 * which `fetchRoute` alone (geometry-only) can't provide.
 */
export async function fetchRouteSummary(
  origin: LatLng,
  destination: LatLng,
  signal?: AbortSignal
): Promise<RouteSummary | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url, { signal });
    if (!response.ok) return null;
    const data = await response.json();
    const route = data?.routes?.[0];
    const coords: [number, number][] | undefined = route?.geometry?.coordinates;
    if (!coords || typeof route.distance !== "number" || typeof route.duration !== "number") return null;
    return {
      geometry: coords.map(([lng, lat]) => ({ lat, lng })),
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    };
  } catch {
    return null;
  }
}

/** Deep-link to Google Maps turn-by-turn directions — opens the native app on mobile, a new tab on web. No API key needed for this URL scheme. */
export function googleMapsDirectionsUrl(origin: LatLng, destination: LatLng): string {
  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
