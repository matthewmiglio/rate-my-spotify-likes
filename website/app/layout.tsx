import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spotify Rater & Unliker",
  description: "Rate your liked songs, then purge the ones you don't love anymore.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="noise-bg min-h-full flex flex-col relative">{children}</body>
    </html>
  );
}
