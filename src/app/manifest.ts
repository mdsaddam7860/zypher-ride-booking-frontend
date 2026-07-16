import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zypher — Ride Booking",
    short_name: "Zypher",
    description:
      "Book rides, track your driver in real time, and manage your trips — installable as an app on your phone or desktop.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fdfdff",
    theme_color: "#1c6fef",
    lang: "en",
    categories: ["travel", "navigation", "lifestyle"],
    icons: [
      { src: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png", purpose: "any" },
      { src: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png", purpose: "any" },
      { src: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png", purpose: "any" },
      { src: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png", purpose: "any" },
      { src: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/maskable-icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Book a ride",
        short_name: "Book",
        description: "Jump straight to booking a new ride",
        url: "/rider",
        icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "Past rides",
        short_name: "History",
        description: "See your ride history",
        url: "/rider?tab=history",
        icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" }],
      },
    ],
  };
}
