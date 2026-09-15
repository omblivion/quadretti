import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "quadretti",
  description: "Disegna forme geometriche su un foglio a quadretti e riflettile con simmetria.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="antialiased">{children}</body>
    </html>
  );
}
