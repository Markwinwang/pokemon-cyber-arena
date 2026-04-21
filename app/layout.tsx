import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pokemon Cyber Arena",
  description:
    "Next.js + Tailwind + Framer Motion + React Three Fiber powered Chinese cyberpunk Pokedex and card battle for the first 50 Pokemon.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full font-sans text-slate-100">{children}</body>
    </html>
  );
}
