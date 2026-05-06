import type { MetadataRoute } from "next";

/** PWA-style manifest for installable admin shell; internal-only (robots noindex on HTML). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SpinVault Admin",
    short_name: "SV Admin",
    description:
      "Internal content operations dashboard for SpinVault.",
    start_url: "/admin/dashboard",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#3f0f14",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
