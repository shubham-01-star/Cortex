import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/lib/db-check"; // Check DB connection on startup

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "Cortex • The Visual Data Commander",
  description: "Stop writing SQL. Cortex is an identity-aware, generative UI database interface that turns natural language into interactive canvases. Powered by Tambo SDK.",
  keywords: ["Generative UI", "Database", "Tambo AI", "Hackathon", "Visual Interface", "DevTools"],
  openGraph: {
    title: "Cortex • The Visual Data Commander",
    description: "Experience the future of database management. No SQL. Just Command.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black relative`}
        suppressHydrationWarning
      >
        <div className="fixed inset-0 bg-starfield pointer-events-none" />
        {children}
      </body>
    </html>
  );
}
