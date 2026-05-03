import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OPERATOR",
  description: "Personal performance command center",
  applicationName: "OPERATOR",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "OPERATOR",
  },
  // Favicon + apple-touch-icon are auto-detected from app/icon.png and
  // app/apple-icon.png by Next.js — no explicit `icons` metadata needed.
};

export const viewport: Viewport = {
  themeColor: "#f59e0b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] antialiased">
        {children}
      </body>
    </html>
  );
}
