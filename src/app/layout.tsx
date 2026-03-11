import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script"; // Import the Next.js Script component

const inter = Inter({ subsets: ["latin"] });

// SEO and Favicon Metadata
export const metadata: Metadata = {
  title: "Hallod - A Magyar Podcast Gyűjtő",
  description: "Az összes magyar nyelvű podcast egy helyen.",
  icons: {
    icon: "/favicon.png", 
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
        {children}

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