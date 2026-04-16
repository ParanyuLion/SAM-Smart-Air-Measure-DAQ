"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* ─── AQI standard categories (US EPA) ─── */
interface AqiLevel {
  label: string;
  color: string;
  bg: string;
  min: number;
  max: number;
  advice: string;
}

const AQI_LEVELS: AqiLevel[] = [
  { label: "Good", color: "#16a34a", bg: "rgba(22,163,74,0.12)", min: 0, max: 50, advice: "Air quality is satisfactory. Enjoy outdoor activities." },
  { label: "Moderate", color: "#ca8a04", bg: "rgba(202,138,4,0.12)", min: 51, max: 100, advice: "Acceptable quality. Unusually sensitive people should limit outdoor exertion." },
  { label: "Unhealthy for Sensitive", color: "#ea580c", bg: "rgba(234,88,12,0.12)", min: 101, max: 150, advice: "Sensitive groups may experience health effects. General public less likely affected." },
  { label: "Unhealthy", color: "#dc2626", bg: "rgba(220,38,38,0.12)", min: 151, max: 200, advice: "Everyone may begin to experience health effects. Sensitive groups more seriously." },
  { label: "Very Unhealthy", color: "#7c3aed", bg: "rgba(124,58,237,0.12)", min: 201, max: 300, advice: "Health alert: everyone may experience serious health effects." },
  { label: "Hazardous", color: "#991b1b", bg: "rgba(153,27,27,0.18)", min: 301, max: 500, advice: "Health warning of emergency conditions. Entire population is likely to be affected." },
];

function getAqiLevel(aqi: number): AqiLevel {
  return AQI_LEVELS.find((l) => aqi >= l.min && aqi <= l.max) || AQI_LEVELS[AQI_LEVELS.length - 1];
}

/* ─── WMO Weather Code → Icon & Label ─── */
const WMO_CODES: Record<number, { icon: string; label: string }> = {
  0: { icon: "☀️", label: "Clear sky" },
  1: { icon: "🌤️", label: "Mainly clear" },
  2: { icon: "⛅", label: "Partly cloudy" },
  3: { icon: "☁️", label: "Overcast" },
  45: { icon: "🌫️", label: "Fog" },
  48: { icon: "🌫️", label: "Depositing rime fog" },
  51: { icon: "🌦️", label: "Light drizzle" },
  53: { icon: "🌦️", label: "Moderate drizzle" },
  55: { icon: "🌦️", label: "Dense drizzle" },
  56: { icon: "🌦️", label: "Freezing drizzle" },
  57: { icon: "🌦️", label: "Heavy freezing drizzle" },
  61: { icon: "🌧️", label: "Slight rain" },
  63: { icon: "🌧️", label: "Moderate rain" },
  65: { icon: "🌧️", label: "Heavy rain" },
  66: { icon: "🌧️", label: "Freezing rain" },
  67: { icon: "🌧️", label: "Heavy freezing rain" },
  71: { icon: "❄️", label: "Slight snow" },
  73: { icon: "❄️", label: "Moderate snow" },
  75: { icon: "❄️", label: "Heavy snow" },
  77: { icon: "❄️", label: "Snow grains" },
  80: { icon: "🌧️", label: "Slight rain showers" },
  81: { icon: "🌧️", label: "Moderate rain showers" },
  82: { icon: "🌧️", label: "Violent rain showers" },
  85: { icon: "❄️", label: "Slight snow showers" },
  86: { icon: "❄️", label: "Heavy snow showers" },
  95: { icon: "⛈️", label: "Thunderstorm" },
  96: { icon: "⛈️", label: "Thunderstorm + hail" },
  99: { icon: "⛈️", label: "Thunderstorm + heavy hail" },
};

function getWeatherInfo(code: number) {
  return WMO_CODES[code] || { icon: "🌡️", label: "Unknown" };
}

function windDirectionLabel(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

/* ─── Types ─── */
interface AqiData {
  aqi: number;
  station: string;
  stationUrl: string;
  dominantPol: string;
  pm25: number | null;
  pm10: number | null;
  o3: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  wind: number | null;
  updatedAt: string;
  attributions: { name: string; url: string }[];
  forecast: { day: string; avg: number; min: number; max: number }[];
}

interface WeatherCurrent {
  temperature: number;
  humidity: number;
  rain: number;
  weatherCode: number;
  windSpeed: number;
  windDirection: number;
  time: string;
}

interface WeatherDaily {
  date: string;
  weatherCode: number;
  tempMin: number;
  tempMax: number;
  windSpeedMax: number;
  precipProbMax: number;
  precipSum: number;
  uvIndexMax: number;
  windDirectionDominant: number;
}

export default function FeaturesPage() {
  const [aqiData, setAqiData] = useState<AqiData | null>(null);
  const [weatherCurrent, setWeatherCurrent] = useState<WeatherCurrent | null>(null);
  const [weatherDaily, setWeatherDaily] = useState<WeatherDaily[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number; city: string; timezone: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      try {
        // Step 1: get location by IP (includes timezone)
        const locRes = await fetch(`${API}/api/location`);
        const locData = await locRes.json();
        const lat = locData.lat ?? 13.75;
        const lon = locData.lon ?? 100.52;
        const timezone = locData.timezone || "Asia/Bangkok";
        setUserLocation({ lat, lon, city: locData.city || locData.regionName || "Unknown", timezone });

        // Step 2: get real AQI from AQICN
        const aqiRes = await fetch(`${API}/api/aqi?lat=${lat}&lng=${lon}`);
        const aqiJson = await aqiRes.json();

        if (aqiJson.status === "ok" && aqiJson.data) {
          const d = aqiJson.data;
          const iaqi = d.iaqi || {};
          setAqiData({
            aqi: d.aqi,
            station: d.city?.name || "Unknown Station",
            stationUrl: d.city?.url || "",
            dominantPol: d.dominentpol || "—",
            pm25: iaqi.pm25?.v ?? null,
            pm10: iaqi.pm10?.v ?? null,
            o3: iaqi.o3?.v ?? null,
            no2: iaqi.no2?.v ?? null,
            so2: iaqi.so2?.v ?? null,
            co: iaqi.co?.v ?? null,
            temperature: iaqi.t?.v ?? null,
            humidity: iaqi.h?.v ?? null,
            pressure: iaqi.p?.v ?? null,
            wind: iaqi.w?.v ?? null,
            updatedAt: d.time?.iso || d.time?.s || "—",
            attributions: d.attributions || [],
            forecast: d.forecast?.daily?.pm25?.slice(0, 7) || [],
          });
        }

        // Step 3: get Open-Meteo weather data
        const weatherRes = await fetch(`${API}/api/weather?lat=${lat}&lon=${lon}&timezone=${encodeURIComponent(timezone)}`);
        const weatherJson = await weatherRes.json();

        if (weatherJson.current) {
          const c = weatherJson.current;
          setWeatherCurrent({
            temperature: c.temperature_2m,
            humidity: c.relative_humidity_2m,
            rain: c.rain,
            weatherCode: c.weather_code,
            windSpeed: c.wind_speed_10m,
            windDirection: c.wind_direction_10m,
            time: c.time,
          });
        }

        if (weatherJson.daily) {
          const d = weatherJson.daily;
          const days: WeatherDaily[] = d.time.map((t: string, i: number) => ({
            date: t,
            weatherCode: d.weather_code[i],
            tempMin: d.temperature_2m_min[i],
            tempMax: d.temperature_2m_max[i],
            windSpeedMax: d.wind_speed_10m_max[i],
            precipProbMax: d.precipitation_probability_max[i],
            precipSum: d.precipitation_sum[i],
            uvIndexMax: d.uv_index_max[i],
            windDirectionDominant: d.wind_direction_10m_dominant[i],
          }));
          setWeatherDaily(days);
        }
      } catch (e) {
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "120px", textAlign: "center", minHeight: "80vh" }}>
        <div className="loading-spinner" />
        <p style={{ marginTop: "1.5rem", color: "var(--text-secondary)", fontSize: "1.1rem" }}>
          Detecting your location & fetching real-time data…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ paddingTop: "120px", textAlign: "center", minHeight: "80vh" }}>
        <p style={{ color: "var(--accent)", fontSize: "1.1rem" }}>{error}</p>
      </div>
    );
  }

  const aqi = aqiData?.aqi ?? 0;
  const level = getAqiLevel(aqi);

  return (
    <div className="container" style={{ paddingTop: "100px", paddingBottom: "60px" }}>
      {/* Page Header */}
      <section className="fade-in-up" style={{ marginBottom: "3rem" }}>
        <h1 className="hero-title" style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}>
          Air Quality <span className="text-gradient">Monitor</span>
        </h1>
        <p className="hero-subtitle" style={{ textAlign: "left", marginBottom: "0" }}>
          Real-time AQI data from <a href="https://aqicn.org/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", fontWeight: 600 }}>aqicn.org</a> + weather data from <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", fontWeight: 600 }}>Open-Meteo</a>.
          {userLocation && (
            <>
              <br />📍 Detected location: <strong>{userLocation.city}</strong> ({userLocation.lat.toFixed(2)}°N, {userLocation.lon.toFixed(2)}°E) · 🕐 {userLocation.timezone}
            </>
          )}
        </p>
      </section>

      {/* Big AQI Card */}
      {aqiData && (
        <section className="fade-in-up delay-100" style={{ marginBottom: "3rem" }}>
          <div className="glass-panel" style={{
            padding: "2.5rem",
            borderRadius: "24px",
            borderLeft: `6px solid ${level.color}`,
            background: level.bg,
          }}>
            <div className="flex items-center gap-4" style={{ flexWrap: "wrap" }}>
              {/* AQI Circle */}
              <div style={{
                width: "140px",
                height: "140px",
                borderRadius: "50%",
                background: `conic-gradient(${level.color} ${(aqi / 500) * 360}deg, var(--border) 0deg)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <div style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  background: "var(--surface)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(10px)",
                }}>
                  <span style={{ fontSize: "2.5rem", fontWeight: 800, color: level.color, lineHeight: 1 }}>
                    {aqi}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                    AQI
                  </span>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: "240px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                  <span style={{
                    padding: "0.25rem 0.75rem",
                    borderRadius: "999px",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: level.color,
                    background: level.bg,
                    border: `1px solid ${level.color}30`,
                  }}>{level.label}</span>
                  <span style={{
                    padding: "0.25rem 0.6rem",
                    borderRadius: "999px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}>Dominant: {aqiData.dominantPol.toUpperCase()}</span>
                </div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.5rem 0 0.25rem" }}>
                  <a href={aqiData.stationUrl} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>
                    {aqiData.station}
                  </a>
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", margin: 0 }}>
                  Last update: {new Date(aqiData.updatedAt).toLocaleString()}
                </p>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.75rem", lineHeight: 1.6 }}>
                  {level.advice}
                </p>
              </div>
            </div>

            {/* Pollutant readings */}
            <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: "1rem", marginTop: "2rem" }}>
              <StatCard icon="🫁" label="PM2.5" value={aqiData.pm25 !== null ? `${aqiData.pm25}` : "—"} unit="µg/m³" highlight={aqiData.dominantPol === "pm25"} />
              <StatCard icon="🌫️" label="PM10" value={aqiData.pm10 !== null ? `${aqiData.pm10}` : "—"} unit="µg/m³" highlight={aqiData.dominantPol === "pm10"} />
              <StatCard icon="🌤️" label="Ozone (O₃)" value={aqiData.o3 !== null ? `${aqiData.o3}` : "—"} unit="ppb" highlight={aqiData.dominantPol === "o3"} />
              <StatCard icon="🚗" label="NO₂" value={aqiData.no2 !== null ? `${aqiData.no2}` : "—"} unit="ppb" highlight={aqiData.dominantPol === "no2"} />
              <StatCard icon="🏭" label="SO₂" value={aqiData.so2 !== null ? `${aqiData.so2}` : "—"} unit="ppb" />
              <StatCard icon="💨" label="CO" value={aqiData.co !== null ? `${aqiData.co}` : "—"} unit="ppm" />
              <StatCard icon="🌡️" label="Temperature" value={aqiData.temperature !== null ? `${aqiData.temperature}` : "—"} unit="°C" />
              <StatCard icon="💧" label="Humidity" value={aqiData.humidity !== null ? `${aqiData.humidity}` : "—"} unit="%" />
            </div>
          </div>
        </section>
      )}

      {/* Current Weather + PM2.5 Forecast */}
      <section className="fade-in-up delay-200" style={{ marginBottom: "3rem" }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Current Weather from Open-Meteo */}
          <div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "1rem" }}>Current Weather</h2>
            {weatherCurrent ? (
              <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "16px", height: "calc(100% - 2.3rem)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
                  <div style={{
                    width: "64px", height: "64px", borderRadius: "16px",
                    background: "rgba(99,102,241,0.1)", display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: "2rem", flexShrink: 0,
                  }}>
                    {getWeatherInfo(weatherCurrent.weatherCode).icon}
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: "1.1rem", margin: 0 }}>
                      {getWeatherInfo(weatherCurrent.weatherCode).label}
                    </h3>
                    <p style={{ margin: 0, fontSize: "2rem", fontWeight: 800, lineHeight: 1.1, color: "var(--primary)" }}>
                      {weatherCurrent.temperature}°C
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2" style={{ gap: "0.75rem" }}>
                  <WeatherItem icon="💧" label="Humidity" value={`${weatherCurrent.humidity}%`} />
                  <WeatherItem icon="🌧️" label="Rain" value={`${weatherCurrent.rain} mm`} />
                  <WeatherItem icon="🌬️" label="Wind Speed" value={`${weatherCurrent.windSpeed} km/h`} />
                  <WeatherItem icon="🧭" label="Wind Dir." value={`${windDirectionLabel(weatherCurrent.windDirection)} (${weatherCurrent.windDirection}°)`} />
                </div>
                <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "1rem", marginBottom: 0 }}>
                  Source: Open-Meteo · Updated: {weatherCurrent.time.replace("T", " ")}
                  {userLocation && ` · Timezone: ${userLocation.timezone}`}
                </p>
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: "2rem", borderRadius: "16px", textAlign: "center", color: "var(--text-secondary)" }}>
                Weather data unavailable
              </div>
            )}
          </div>

          {/* PM2.5 Forecast */}
          <div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "1rem" }}>PM2.5 Forecast (7 days)</h2>
            {aqiData && aqiData.forecast.length > 0 ? (
              <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "16px", height: "calc(100% - 2.3rem)" }}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", height: "180px" }}>
                  {aqiData.forecast.map((f, i) => {
                    const maxVal = Math.max(...aqiData.forecast.map((x) => x.max), 1);
                    const barHeight = (f.avg / maxVal) * 140;
                    const fl = getAqiLevel(f.avg);
                    const dayLabel = new Date(f.day + "T00:00:00").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: fl.color }}>{f.avg}</span>
                        <div style={{
                          width: "100%",
                          maxWidth: "48px",
                          height: `${barHeight}px`,
                          borderRadius: "8px 8px 4px 4px",
                          background: `linear-gradient(to top, ${fl.color}, ${fl.color}aa)`,
                          transition: "height 0.5s ease",
                          position: "relative",
                        }}>
                          <div style={{
                            position: "absolute",
                            bottom: 0, left: 0, right: 0,
                            height: `${((f.min / maxVal) * 140)}px`,
                            background: `${fl.color}33`,
                            borderRadius: "0 0 4px 4px",
                          }} />
                        </div>
                        <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.2 }}>{dayLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: "2rem", borderRadius: "16px", textAlign: "center", color: "var(--text-secondary)", height: "calc(100% - 2.3rem)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                PM2.5 forecast data not available for this location
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ 7-Day Weather Forecast ═══ */}
      {weatherDaily.length > 0 && (
        <section className="fade-in-up delay-200" style={{ marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "1rem" }}>7-Day Weather Forecast</h2>
          <div className="forecast-row">
            {weatherDaily.map((day, i) => {
              const info = getWeatherInfo(day.weatherCode);
              const dateObj = new Date(day.date + "T00:00:00");
              const isToday = i === 0;
              const dayName = isToday ? "Today" : dateObj.toLocaleDateString("en", { weekday: "short" });
              const dateLabel = dateObj.toLocaleDateString("en", { month: "short", day: "numeric" });

              return (
                <div key={i} className={`forecast-day-card glass-panel${isToday ? " forecast-today" : ""}`}>
                  {/* Day label */}
                  <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: isToday ? "var(--primary)" : "var(--text-primary)" }}>
                      {dayName}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{dateLabel}</div>
                  </div>

                  {/* Weather icon */}
                  <div style={{ fontSize: "2.2rem", textAlign: "center", margin: "0.5rem 0", lineHeight: 1 }}>
                    {info.icon}
                  </div>
                  <div style={{ fontSize: "0.7rem", textAlign: "center", color: "var(--text-secondary)", marginBottom: "0.75rem", lineHeight: 1.2 }}>
                    {info.label}
                  </div>

                  {/* Temp range */}
                  <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
                    <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>
                      {Math.round(day.tempMax)}°
                    </span>
                    <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginLeft: "0.25rem" }}>
                      / {Math.round(day.tempMin)}°
                    </span>
                  </div>

                  {/* Details */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "var(--text-secondary)" }}>💧 Rain</span>
                      <span style={{ fontWeight: 600 }}>{day.precipProbMax}%</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "var(--text-secondary)" }}>🌧️ Precip</span>
                      <span style={{ fontWeight: 600 }}>{day.precipSum} mm</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "var(--text-secondary)" }}>☀️ UV Index</span>
                      <span style={{ fontWeight: 600 }}>{day.uvIndexMax.toFixed(1)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "var(--text-secondary)" }}>🌬️ Wind</span>
                      <span style={{ fontWeight: 600 }}>{Math.round(day.windSpeedMax)} km/h</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* AQI Scale Legend */}
      <section className="fade-in-up delay-200" style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "1rem" }}>AQI Scale (US EPA Standard)</h2>
        <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "16px" }}>
          <div style={{ display: "flex", gap: "2px", borderRadius: "8px", overflow: "hidden", height: "32px", marginBottom: "1rem" }}>
            {AQI_LEVELS.map((l) => (
              <div key={l.label} style={{
                flex: l.max - l.min,
                background: l.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: "0.65rem",
                fontWeight: 700,
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}>
                {l.min}–{l.max}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            {AQI_LEVELS.map((l) => (
              <span key={l.label} style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
              }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: l.color, display: "inline-block" }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Attribution */}
      <section className="fade-in-up delay-300" style={{ marginBottom: "2rem" }}>
        <div className="glass-panel" style={{ padding: "1.25rem 1.5rem", borderRadius: "12px" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
            <strong>Data sources:</strong>{" "}
            <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>Open-Meteo</a>
            {aqiData && aqiData.attributions.length > 0 && aqiData.attributions.map((a, i) => (
              <span key={i}>
                {" · "}
                <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>{a.name}</a>
              </span>
            ))}
          </p>
        </div>
      </section>

      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <Link href="/dashboard" className="btn btn-primary" id="btn-go-dashboard">
          Go to Dashboard →
        </Link>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, unit, highlight }: { icon: string; label: string; value: string; unit?: string; highlight?: boolean }) {
  return (
    <div className="glass-panel" style={{
      padding: "1rem",
      borderRadius: "12px",
      textAlign: "center",
      border: highlight ? "2px solid var(--primary)" : undefined,
      background: highlight ? "rgba(99,102,241,0.08)" : undefined,
    }}>
      <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>{icon}</div>
      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
        {label} {highlight && <span style={{ color: "var(--primary)", fontWeight: 700 }}>★</span>}
      </div>
      <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
        {value} {unit && <span style={{ fontSize: "0.7rem", fontWeight: 400, color: "var(--text-secondary)" }}>{unit}</span>}
      </div>
    </div>
  );
}

function WeatherItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.6rem",
      padding: "0.6rem 0.75rem",
      borderRadius: "10px",
      background: "var(--surface)",
      border: "1px solid var(--border)",
    }}>
      <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", lineHeight: 1 }}>{label}</div>
        <div style={{ fontSize: "0.95rem", fontWeight: 700, lineHeight: 1.3 }}>{value}</div>
      </div>
    </div>
  );
}
