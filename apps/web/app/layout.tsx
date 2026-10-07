import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "KINTSUGI", description: "KINTSUGI: a Blender-to-web demo. All data is synthetic." };
export const viewport: Viewport = { themeColor: "#12110F", width: "device-width", initialScale: 1 };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
