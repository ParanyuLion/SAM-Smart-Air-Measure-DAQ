import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAM — Smart Air Measure",
  description: "Real-time air quality monitoring and analytics powered by weather station data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="main-wrapper">
          <header className="app-header glass-panel container" style={{ margin: '1rem auto', padding: '1rem 2rem', border: '1px solid var(--border)' }}>
            <div className="flex justify-between items-center">
              <Link href="/" style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em', textDecoration: 'none' }}>
                <span className="text-gradient">SAM</span> Project
              </Link>
              <nav className="flex gap-4">
                <Link href="/features" className="btn btn-secondary">Weather & AQI</Link>
                <Link href="/dashboard" className="btn btn-secondary">Database Connection</Link>
                <Link href="/predict" className="btn btn-primary">Sensor Data Analytics</Link>
              </nav>
            </div>
          </header>
          <main style={{ paddingTop: '6rem' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
