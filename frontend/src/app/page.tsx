import Link from "next/link";

export default function Home() {
  return (
    <div className="container" style={{ paddingTop: '80px' }}>
      <section className="hero-section flex-col items-center text-center fade-in-up">
        <h1 className="hero-title" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span>SAM</span>
          <span className="text-gradient" style={{ marginTop: '0.5rem' }}>Smart Air Measure</span>
        </h1>
        <p className="hero-subtitle">
          Stay informed with our smart air monitoring system.<br></br>
          We blend real-time sensor data with external sources to bring you an accessible, visualized breakdown of your air quality.
        </p>
        <div className="flex gap-4 justify-center w-full">
          <Link href="/features" className="btn btn-primary" id="btn-get-started">Get Started</Link>
        </div>
      </section>

      <section id="features" className="card-grid fade-in-up delay-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12">

          <Link href="/features" className="feature-card glass-panel" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"></path><circle cx="12" cy="12" r="10"></circle></svg>
            </div>
            <h3 className="feature-title">Weather & AQI Forecast</h3>
            <p className="feature-desc">Real-time air quality index and current weather conditions for your location, updated every 15 minutes.</p>
          </Link>

          <Link href="/features" className="feature-card glass-panel delay-100" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
            </div>
            <h3 className="feature-title">7-Day Forecast</h3>
            <p className="feature-desc">7-day weather forecast with temperature, rain probability, UV index, and PM2.5 predictions powered by Open-Meteo.</p>
          </Link>

          <Link href="/dashboard" className="feature-card glass-panel delay-200" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            </div>
            <h3 className="feature-title">Sensor Data Analytics</h3>
            <p className="feature-desc">View and analyze sensor readings from your connected devices, stored in the MySQL database.</p>
          </Link>

        </div>
      </section>
    </div>
  );
}
