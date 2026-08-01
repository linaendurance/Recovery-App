import type { Metadata } from "next";
import { Fraunces, Karla, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Fonts were loaded from fonts.googleapis.com at runtime, which sent every
// visitor's IP and user agent to a third party on every page of an app about
// their eating disorder, and forced any future Content-Security-Policy to
// allow an external stylesheet host. next/font downloads them at BUILD time
// and serves them from our own origin: no third-party request is made.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "500"],
  variable: "--font-display",
  display: "swap",
});
const karla = Karla({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Recovery Nutrition Tracker",
  description: "A private food, meal-timing and recovery journal.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${karla.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
