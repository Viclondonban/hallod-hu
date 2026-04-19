import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import Footer from "./footer";
import { PlayerProvider } from "@/context/player-context";
import PersistentPlayer from "@/components/persistent-player";
// If you have a Header or Banner component, import it here too:
// import Banner from "./banner"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "hallod.hu - A Magyar Podcast Gyűjtő",
  description: "Az összes magyar nyelvű podcast egy helyen.",
  metadataBase: new URL('https://www.hallod.hu'), // Required for relative image paths
  
  // OpenGraph (Facebook, LinkedIn, Slack)
  openGraph: {
    title: "hallod.hu - A Magyar Podcast Gyűjtő",
    description: "Az összes magyar nyelvű podcast egy helyen.",
    url: "https://hallod.hu",
    siteName: "Hallod.hu",
    images: [
      {
        url: "/metacover.png", 
        width: 1200,
        height: 630,
        alt: "hallod.hu - A Magyar Podcast Gyűjtő",
      },
    ],
    locale: "hu_HU",
    type: "website",
  },
  
  // Twitter / X
  twitter: {
    card: "summary_large_image",
    title: "Hallod.hu - A Magyar Podcast Gyűjtő",
    description: "Az összes magyar nyelvű podcast egy helyen.",
    images: ["/metacover.png"], 
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hu">
      <body className={inter.className}>
        <PlayerProvider>
          <main className="min-h-screen pb-20 bg-gray-100">
            {children}
          </main>

          <Footer />
          <PersistentPlayer />
        </PlayerProvider>

        {/* --- GOOGLE ANALYTICS (GA4) --- */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}