import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import Footer from "./footer"; // Assuming footer.tsx is in src/app/
// If you have a Header or Banner component, import it here too:
// import Banner from "./banner"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "hallod.hu - A Magyar Podcast Gyűjtő",
  description: "Az összes magyar nyelvű podcast egy helyen.",
  metadataBase: new URL('https://hallod.hu'), // Required for relative image paths
  
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
        {/* If you have a global Header/Banner, place it here */}
        
        <main className="min-h-screen">
          {children}
        </main>

        <Footer /> 

        {/* --- GOOGLE ANALYTICS (GA4) --- */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-C75922RTW0"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-C75922RTW0');
          `}
        </Script>
      </body>
    </html>
  );
}