import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LostNet — things find their way back",
  description:
    "A lost-and-found board where lost and found items physically pull toward each other and reunite.",
  openGraph: {
    title: "LostNet — things find their way back",
    description: "A lost-and-found board where lost and found items physically pull toward each other and reunite.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
