import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sadhana Card — IYF Guwahati",
    short_name: "Sadhana",
    description: "Daily sadhana tracking for ISKCON Youth Forum, Guwahati",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#8b5cf6",
    orientation: "portrait",
    // TODO: add rasterised 192/512 PNGs (any + maskable) before store-quality install.
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
