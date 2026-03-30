"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

/* ─── AQI standard categories based on US EPA PM2.5 breakpoints ─── */
interface AqiLevel {
  label: string;
  color: string;
  bg: string;
  min: number;
  max: number;
  advice: string;
}

const AQI_LEVELS: AqiLevel[] = [
  { label: "Good",                  color: "#16a34a", bg: "rgba(22,163,74,0.12)",   min: 0,   max: 50,  advice: "Air quality is satisfactory. Enjoy outdoor activities." },
  { label: "Moderate",              color: "#ca8a04", bg: "rgba(202,138,4,0.12)",    min: 51,  max: 100, advice: "Acceptable quality. Unusually sensitive people should limit outdoor exertion." },
  { label: "Unhealthy for Sensitive", color: "#ea580c", bg: "rgba(234,88,12,0.12)", min: 101, max: 150, advice: "Sensitive groups may experience health effects. General public less likely affected." },
  { label: "Unhealthy",             color: "#dc2626", bg: "rgba(220,38,38,0.12)",    min: 151, max: 200, advice: "Everyone may begin to experience health effects. Sensitive groups more seriously." },
  { label: "Very Unhealthy",        color: "#7c3aed", bg: "rgba(124,58,237,0.12)",   min: 201, max: 300, advice: "Health alert: everyone may experience serious health effects." },
  { label: "Hazardous",             color: "#991b1b", bg: "rgba(153,27,27,0.18)",    min: 301, max: 500, advice: "Health warning of emergency conditions. Entire population is likely to be affected." },
];

function getAqiLevel(aqi: number): AqiLevel {
  return AQI_LEVELS.find((l) => aqi >= l.min && aqi <= l.max) || AQI_LEVELS[AQI_LEVELS.length - 1];
}

/* ─── Estimate AQI from weather parameters (heuristic) ─── */
function estimateAqi(station: any): number {
  const obs = station.Observation;
  const humidity = parseFloat(obs.RelativeHumidity) || 50;
  const temp = parseFloat(obs.AirTemperature) || 30;
  const visibility = parseFloat(obs.LandVisibility) || 10;
  const windSpeed = parseFloat(obs.WindSpeed) || 0;

  // Low visibility → higher pollution estimate
  let visScore = Math.max(0, (10 - visibility) * 15);
  // High humidity + high temp → worse air quality (tropical haze)
  let humidityTempScore = (humidity > 75 && temp > 30) ? 20 : (humidity > 60 ? 10 : 0);
  // Low wind → pollutants don't disperse
  let windPenalty = windSpeed < 2 ? 15 : (windSpeed < 5 ? 8 : 0);
  // High temperature contributes to ozone
  let tempScore = temp > 35 ? 20 : (temp > 32 ? 10 : 0);

  let estimatedAqi = Math.round(25 + visScore + humidityTempScore + windPenalty + tempScore);
  return Math.min(500, Math.max(0, estimatedAqi));
}

/* ─── Haversine distance in km ─── */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface StationData {
  name: string;
  nameThai: string;
  province: string;
  lat: number;
  lon: number;
  distance: number;
  aqi: number;
  temperature: number;
  humidity: number;
  pressure: number;
  visibility: number;
  windSpeed: number;
  windDirection: string;
  rainfall: number;
  rainfall24h: number;
  dateTime: string;
}

export default function FeaturesPage() {
  const [stations, setStations] = useState<StationData[]>([]);
  const [nearest, setNearest] = useState<StationData | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number; city: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const processData = useCallback((weatherStations: any[], lat: number, lon: number) => {
    const processed: StationData[] = weatherStations.map((s: any) => {
      const obs = s.Observation;
      return {
        name: s.StationNameEnglish,
        nameThai: s.StationNameThai,
        province: s.Province,
        lat: parseFloat(s.Latitude),
        lon: parseFloat(s.Longitude),
        distance: haversine(lat, lon, parseFloat(s.Latitude), parseFloat(s.Longitude)),
        aqi: estimateAqi(s),
        temperature: parseFloat(obs.AirTemperature) || 0,
        humidity: parseFloat(obs.RelativeHumidity) || 0,
        pressure: parseFloat(obs.MeanSeaLevelPressure) || 0,
        visibility: parseFloat(obs.LandVisibility) || 0,
        windSpeed: parseFloat(obs.WindSpeed) || 0,
        windDirection: typeof obs.WindDirection === 'string' ? obs.WindDirection : '—',
        rainfall: parseFloat(obs.Rainfall) || 0,
        rainfall24h: parseFloat(obs.Rainfall24Hr) || 0,
        dateTime: obs.DateTime,
      };
    });

    processed.sort((a, b) => a.distance - b.distance);
    setStations(processed);
    setNearest(processed[0] || null);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        // Step 1: get location by IP
        const locRes = await fetch("/api/location");
        const locData = await locRes.json();
        const lat = locData.lat ?? 13.75;
        const lon = locData.lon ?? 100.52;
        setUserLocation({ lat, lon, city: locData.city || locData.regionName || "Unknown" });

        // Step 2: get TMD weather data
        const weatherRes = await fetch("/api/weather");
        const weatherData = await weatherRes.json();
        const weatherStations = weatherData?.Stations?.Station || [];

        processData(weatherStations, lat, lon);
      } catch (e) {
        setError("Failed to load weather data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [processData]);

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '120px', textAlign: 'center', minHeight: '80vh' }}>
        <div className="loading-spinner" />
        <p style={{ marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          Detecting your location & loading weather data…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ paddingTop: '120px', textAlign: 'center', minHeight: '80vh' }}>
        <p style={{ color: 'var(--accent)', fontSize: '1.1rem' }}>{error}</p>
      </div>
    );
  }

  const level = nearest ? getAqiLevel(nearest.aqi) : AQI_LEVELS[0];
  const topStations = stations.slice(0, 8);

  return (
    <div className="container" style={{ paddingTop: '100px', paddingBottom: '60px' }}>
      {/* Page Header */}
      <section className="fade-in-up" style={{ marginBottom: '3rem' }}>
        <h1 className="hero-title" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}>
          Air Quality <span className="text-gradient">Analytics</span>
        </h1>
        <p className="hero-subtitle" style={{ textAlign: 'left', marginBottom: '0' }}>
          Real-time estimation based on {stations.length} TMD weather stations across Thailand.
          {userLocation && <><br />📍 Detected location: <strong>{userLocation.city}</strong> ({userLocation.lat.toFixed(2)}°N, {userLocation.lon.toFixed(2)}°E)</>}
        </p>
      </section>

      {/* Big AQI Card for nearest station */}
      {nearest && (
        <section className="fade-in-up delay-100" style={{ marginBottom: '3rem' }}>
          <div className="glass-panel" style={{
            padding: '2.5rem',
            borderRadius: '24px',
            borderLeft: `6px solid ${level.color}`,
            background: level.bg,
          }}>
            <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
              {/* AQI Circle */}
              <div style={{
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                background: `conic-gradient(${level.color} ${(nearest.aqi / 500) * 360}deg, var(--border) 0deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: 'var(--surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(10px)',
                }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: level.color, lineHeight: 1 }}>
                    {nearest.aqi}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    EST. AQI
                  </span>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: '240px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: level.color,
                    background: level.bg,
                    border: `1px solid ${level.color}30`,
                  }}>{level.label}</span>
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0 0.25rem' }}>
                  {nearest.name}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
                  Nearest station · {nearest.distance.toFixed(1)} km away · Last update: {nearest.dateTime}
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.75rem', lineHeight: 1.6 }}>
                  {level.advice}
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: '1rem', marginTop: '2rem' }}>
              <StatCard icon="🌡️" label="Temperature" value={`${nearest.temperature}°C`} />
              <StatCard icon="💧" label="Humidity" value={`${nearest.humidity}%`} />
              <StatCard icon="🌬️" label="Wind Speed" value={`${nearest.windSpeed} km/h`} />
              <StatCard icon="👁️" label="Visibility" value={`${nearest.visibility} km`} />
              <StatCard icon="📊" label="Pressure" value={`${nearest.pressure} hPa`} />
              <StatCard icon="🌧️" label="Rain (24h)" value={`${nearest.rainfall24h} mm`} />
              <StatCard icon="🧭" label="Wind Dir" value={`${nearest.windDirection}°`} />
              <StatCard icon="🌧️" label="Rain (now)" value={`${nearest.rainfall} mm`} />
            </div>
          </div>
        </section>
      )}

      {/* AQI Scale Legend */}
      <section className="fade-in-up delay-200" style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem' }}>AQI Scale Reference</h2>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px' }}>
          <div style={{ display: 'flex', gap: '2px', borderRadius: '8px', overflow: 'hidden', height: '32px', marginBottom: '1rem' }}>
            {AQI_LEVELS.map((l) => (
              <div key={l.label} style={{
                flex: l.max - l.min,
                background: l.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}>
                {l.min}–{l.max}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {AQI_LEVELS.map((l) => (
              <span key={l.label} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
              }}>
                <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: l.color,
                  display: 'inline-block',
                }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Nearby stations table */}
      <section className="fade-in-up delay-300" style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem' }}>Nearest Weather Stations</h2>
        <div className="glass-panel" style={{ padding: '0', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" id="stations-table">
              <thead>
                <tr>
                  <th>Station</th>
                  <th>Distance</th>
                  <th>Est. AQI</th>
                  <th>Temp</th>
                  <th>Humidity</th>
                  <th>Visibility</th>
                  <th>Wind</th>
                  <th>Rain 24h</th>
                </tr>
              </thead>
              <tbody>
                {topStations.map((s, i) => {
                  const sl = getAqiLevel(s.aqi);
                  return (
                    <tr key={i}>
                      <td>
                        <strong>{s.name}</strong>
                        <br />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.nameThai}</span>
                      </td>
                      <td>{s.distance.toFixed(1)} km</td>
                      <td>
                        <span style={{
                          padding: '0.15rem 0.6rem',
                          borderRadius: '999px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: sl.color,
                          background: sl.bg,
                        }}>{s.aqi}</span>
                      </td>
                      <td>{s.temperature}°C</td>
                      <td>{s.humidity}%</td>
                      <td>{s.visibility} km</td>
                      <td>{s.windSpeed} km/h</td>
                      <td>{s.rainfall24h} mm</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <Link href="/dashboard" className="btn btn-primary" id="btn-go-dashboard">
          Go to Dashboard →
        </Link>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="glass-panel" style={{
      padding: '1rem',
      borderRadius: '12px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{icon}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{value}</div>
    </div>
  );
}
