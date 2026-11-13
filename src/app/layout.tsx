import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

const serif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Absolute base for the preview images that X and other apps fetch.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://ch3ss.netlify.app"),
  title: "Ch3ss",
  description: "A multiplayer chess game. Share a code, play a friend.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${serif.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  );
}
