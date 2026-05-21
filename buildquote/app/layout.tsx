import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { GlobalNav } from "@/components/GlobalNav";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "BuildQuote — Request for Quotation, Made Simple",
  description: "Upload your Bill of Materials and we'll turn it into a professional RFQ sent directly to your suppliers. Built for Southwest WA builders.",
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "icon", url: "/android-chrome-192.png", sizes: "192x192" },
    ],
  },
  openGraph: {
    title: "BuildQuote — Request for Quotation, Made Simple",
    description: "Upload your Bill of Materials and we'll turn it into a professional RFQ sent directly to your suppliers.",
    url: "https://buildquote.com.au",
    siteName: "BuildQuote",
    locale: "en_AU",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${barlow.variable} ${barlowCondensed.variable} antialiased`}
        suppressHydrationWarning
      >
        <div className="w-full">
          <GlobalNav />
          {children}
          <Analytics />
        </div>
      </body>
    </html>
  );
}
