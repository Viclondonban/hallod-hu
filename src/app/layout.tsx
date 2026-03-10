import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "./footer"; // <--- 1. Imported your awesome new footer!

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Updated the metadata so it doesn't say "Create Next App" on Google!
export const metadata: Metadata = {
  title: "hallod.hu - A független magyar podcast tár",
  description: "Podcast csatornát ajánlanál? Fúdejóvagy! Gyere és böngéssz a legjobb magyar podcastok között.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
 return (
    <html lang="hu">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
        <div className="flex-grow">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}