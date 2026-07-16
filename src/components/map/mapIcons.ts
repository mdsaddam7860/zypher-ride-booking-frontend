import L from "leaflet";

/** Small green "current location"-style dot, used for the pickup pin (matches Uber/Rapido). */
export function pickupIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:26px;height:26px;">
        <div style="position:absolute;inset:0;border-radius:9999px;background:hsl(142 71% 45% / 0.25);"></div>
        <div style="position:absolute;top:5px;left:5px;width:16px;height:16px;border-radius:9999px;background:hsl(142 71% 45%);border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

/** Black teardrop pin for the destination, echoing Uber's drop-off marker. */
export function destinationIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:28px;height:38px;">
        <svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 24 14 24s14-13.5 14-24c0-7.7-6.3-14-14-14z" fill="#111111"/>
          <circle cx="14" cy="14" r="5.5" fill="white"/>
        </svg>
      </div>
    `,
    iconSize: [28, 38],
    iconAnchor: [14, 36],
  });
}

/** Small car marker used to show a "nearby driver" hint on the map, à la Uber. */
export function carIcon(rotation = 0): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `
      <div style="width:22px;height:22px;transform:rotate(${rotation}deg);display:flex;align-items:center;justify-content:center;background:white;border-radius:9999px;box-shadow:0 1px 4px rgba(0,0,0,0.35);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 13l1.5-4.5A2 2 0 0 1 6.4 7h11.2a2 2 0 0 1 1.9 1.5L21 13v6a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z" fill="#111111"/>
          <circle cx="7" cy="16" r="1.5" fill="white"/>
          <circle cx="17" cy="16" r="1.5" fill="white"/>
        </svg>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}
