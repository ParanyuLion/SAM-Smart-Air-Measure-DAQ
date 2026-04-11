"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface FeatureValues {
  temp: number;
  humidity: number;
  gas_co: number;
  temp_tmd: number;
  humidity_tmd: number;
  rainfall_tmd: number;
  place_enc: string;
  pm25: number;
  pm10: number;
  place: string;
  ts: string | null;
  actual_aqi: number | null;
  actual_ts: string | null;
}

interface PredictResult {
  pm25_aqi_rf:  number | null;
  pm25_aqi_mlr: number | null;
  place: string;
}

interface AqiLevel {
  label: string;
  color: string;
  bg: string;
  min: number;
  max: number;
}

const AQI_LEVELS: AqiLevel[] = [
  { label: "Good",                    color: "#16a34a", bg: "rgba(22,163,74,0.12)",   min: 0,   max: 50  },
  { label: "Moderate",                color: "#ca8a04", bg: "rgba(202,138,4,0.12)",   min: 51,  max: 100 },
  { label: "Unhealthy for Sensitive", color: "#ea580c", bg: "rgba(234,88,12,0.12)",   min: 101, max: 150 },
  { label: "Unhealthy",               color: "#dc2626", bg: "rgba(220,38,38,0.12)",   min: 151, max: 200 },
  { label: "Very Unhealthy",          color: "#7c3aed", bg: "rgba(124,58,237,0.12)",  min: 201, max: 300 },
  { label: "Hazardous",               color: "#991b1b", bg: "rgba(153,27,27,0.18)",   min: 301, max: 500 },
];

function getAqiLevel(aqi: number): AqiLevel {
  return AQI_LEVELS.find((l) => aqi >= l.min && aqi <= l.max) ?? AQI_LEVELS[AQI_LEVELS.length - 1];
}

type NumericFeatureKey = Exclude<keyof FeatureValues, "place_enc" | "place" | "ts" | "actual_aqi" | "actual_ts">;

const FEATURE_ROWS: { key: NumericFeatureKey | "place_enc" | "ts"; label: string; unit: string; step: string }[] = [
  { key: "ts",            label: "Timestamp",             unit: "",      step: ""    },
  { key: "temp",          label: "Temperature (sensor)",  unit: "°C",    step: "0.1" },
  { key: "humidity",      label: "Humidity (sensor)",     unit: "%",     step: "1"   },
  { key: "gas_co",        label: "CO Gas",                unit: "ppm",   step: "1"   },
  { key: "temp_tmd",      label: "Temperature (TMD)",     unit: "°C",    step: "0.1" },
  { key: "humidity_tmd",  label: "Humidity (TMD)",        unit: "%",     step: "0.1" },
  { key: "rainfall_tmd",  label: "Rainfall (TMD)",        unit: "mm",    step: "0.1" },
  { key: "place_enc",     label: "Location",              unit: "",      step: ""    },
  { key: "pm25",          label: "PM2.5 (sensor)",        unit: "µg/m³", step: "1"   },
  { key: "pm10",          label: "PM10 (sensor)",         unit: "µg/m³", step: "1"   },
];

export default function PredictPage() {
  const [mode, setMode] = useState<"live" | "edit">("live");
  const [features, setFeatures] = useState<FeatureValues | null>(null);
  const [loading, setLoading] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLatest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/predict/latest`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: FeatureValues = await res.json();
      setFeatures(data);
    } catch {
      setError("Could not fetch latest sensor data. Showing defaults.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLatest(); }, []);

  const handlePredict = async () => {
    if (!features) return;
    setPredicting(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temp: features.temp,
          humidity: features.humidity,
          gas_co: features.gas_co,
          temp_tmd: features.temp_tmd,
          humidity_tmd: features.humidity_tmd,
          rainfall_tmd: features.rainfall_tmd,
          place_enc: features.place_enc,
          pm25: features.pm25,
          pm10: features.pm10,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PredictResult = await res.json();
      setResult(data);
    } catch {
      setError("Prediction failed. Is the backend running?");
    } finally {
      setPredicting(false);
    }
  };

  const handleNumberChange = (key: NumericFeatureKey, value: string) => {
    if (!features) return;
    setFeatures({ ...features, [key]: parseFloat(value) || 0 });
  };

  const handlePlaceChange = (value: string) => {
    if (!features) return;
    setFeatures({ ...features, place_enc: value, place: value });
  };

  const handleTsChange = async (value: string) => {
    if (!features) return;
    // datetime-local gives "2026-04-09T08:45" → convert to "2026-04-09 08:45:00"
    const tsForDb = value.replace("T", " ") + ":00";
    setFeatures({ ...features, ts: tsForDb, actual_aqi: null, actual_ts: null });
    try {
      const res = await fetch(`${API}/api/predict/actual?ts=${encodeURIComponent(tsForDb)}`);
      if (res.ok) {
        const data = await res.json();
        setFeatures((prev) => prev ? { ...prev, actual_aqi: data.actual_aqi, actual_ts: data.actual_ts } : null);
      }
    } catch { /* silently ignore */ }
  };

  const toggleMode = () => {
    if (mode === "edit") {
      fetchLatest();
    }
    setMode((m) => (m === "live" ? "edit" : "live"));
  };

  return (
    <div className="container fade-in-up" style={{ padding: "2rem 1rem", maxWidth: "860px" }}>

      {/* Header */}
      <div className="flex justify-between items-center" style={{ marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.25rem" }}>
            <span className="text-gradient">PM2.5 AQI</span> Prediction
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Random Forest · R² = 0.86 · 9 features
          </p>
        </div>
        <button className="btn btn-secondary" onClick={toggleMode}>
          {mode === "live" ? "Edit Values" : "Use Live Data"}
        </button>
      </div>

      {/* Input Panel */}
      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div className="flex justify-between items-center" style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>
            {mode === "live" ? "Latest Sensor Reading" : "Manual Input"}
          </h2>
          {mode === "live" && (
            <button
              className="btn btn-secondary"
              onClick={fetchLatest}
              disabled={loading}
              style={{ fontSize: "0.85rem", padding: "0.35rem 0.85rem" }}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          )}
        </div>

        {features ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left",  padding: "0.5rem 0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>Feature</th>
                <th style={{ textAlign: "right", padding: "0.5rem 0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>Value</th>
                <th style={{ textAlign: "left",  padding: "0.5rem 0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>Unit</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map(({ key, label, unit, step }) => (
                <tr key={key} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.5rem 0.75rem" }}>{label}</td>
                  <td style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>
                    {mode === "edit" ? (
                      key === "ts" ? (
                        <input
                          type="datetime-local"
                          value={(features.ts ?? "").replace(" ", "T").slice(0, 16)}
                          onChange={(e) => handleTsChange(e.target.value)}
                          style={{
                            background: "var(--surface)",
                            color: "var(--text-primary)",
                            border: "1px solid var(--border)",
                            borderRadius: "4px",
                            padding: "0.2rem 0.4rem",
                          }}
                        />
                      ) : key === "place_enc" ? (
                        <select
                          value={features.place_enc}
                          onChange={(e) => handlePlaceChange(e.target.value)}
                          style={{
                            background: "var(--surface)",
                            color: "var(--text-primary)",
                            border: "1px solid var(--border)",
                            borderRadius: "4px",
                            padding: "0.2rem 0.4rem",
                          }}
                        >
                          <option value="inside">Inside</option>
                          <option value="outdoor">Outdoor</option>
                        </select>
                      ) : (
                        <input
                          type="number"
                          step={step}
                          value={features[key] as number}
                          onChange={(e) => handleNumberChange(key as NumericFeatureKey, e.target.value)}
                          style={{
                            width: "90px",
                            textAlign: "right",
                            background: "var(--surface)",
                            color: "var(--text-primary)",
                            border: "1px solid var(--border)",
                            borderRadius: "4px",
                            padding: "0.2rem 0.4rem",
                          }}
                        />
                      )
                    ) : (
                      key === "ts" ? (
                        <span style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                          {features.ts ? features.ts.slice(0, 16) : "—"}
                        </span>
                      ) : key === "place_enc" ? (
                        <span style={{ fontWeight: 600 }}>
                          {features.place_enc === "inside" ? "Inside" : "Outdoor"}
                        </span>
                      ) : (
                        <span style={{ fontWeight: 600 }}>{features[key] as number}</span>
                      )
                    )}
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-secondary)" }}>{unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "var(--text-secondary)" }}>
            {loading ? "Loading sensor data..." : "No data available."}
          </p>
        )}

        {error && (
          <p style={{ color: "#dc2626", marginTop: "0.75rem", fontSize: "0.9rem" }}>{error}</p>
        )}

        <div style={{ marginTop: "1.25rem" }}>
          <button
            className="btn btn-primary"
            onClick={handlePredict}
            disabled={!features || predicting}
            style={{ minWidth: "140px" }}
          >
            {predicting ? "Predicting..." : "Predict AQI"}
          </button>
        </div>
      </div>

      {/* Result Panel */}
      {result && (() => {
        const rfLevel  = result.pm25_aqi_rf  != null ? getAqiLevel(result.pm25_aqi_rf)  : null;
        const mlrLevel = result.pm25_aqi_mlr != null ? getAqiLevel(result.pm25_aqi_mlr) : null;
        const actual   = features?.actual_aqi != null ? getAqiLevel(features.actual_aqi) : null;
        const ts       = features?.actual_ts ?? null;
        const borderColor = rfLevel?.color ?? "var(--border)";

        return (
          <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem", borderLeft: `4px solid ${borderColor}` }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Prediction Result</h2>

            {/* 3-col: RF | MLR | Actual */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>

              {/* RF */}
              <div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                  Random Forest
                </div>
                {rfLevel && result.pm25_aqi_rf != null ? (
                  <>
                    <div style={{ fontSize: "2.75rem", fontWeight: 800, color: rfLevel.color, lineHeight: 1 }}>{result.pm25_aqi_rf}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0.2rem 0 0.4rem" }}>PM2.5 AQI</div>
                    <span style={{ display: "inline-block", background: rfLevel.bg, color: rfLevel.color, border: `1px solid ${rfLevel.color}`, borderRadius: "6px", padding: "0.2rem 0.55rem", fontWeight: 700, fontSize: "0.85rem" }}>
                      {rfLevel.label}
                    </span>
                  </>
                ) : <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Unavailable</div>}
              </div>

              {/* MLR */}
              <div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                  Linear Regression
                </div>
                {mlrLevel && result.pm25_aqi_mlr != null ? (
                  <>
                    <div style={{ fontSize: "2.75rem", fontWeight: 800, color: mlrLevel.color, lineHeight: 1 }}>{result.pm25_aqi_mlr}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0.2rem 0 0.4rem" }}>PM2.5 AQI</div>
                    <span style={{ display: "inline-block", background: mlrLevel.bg, color: mlrLevel.color, border: `1px solid ${mlrLevel.color}`, borderRadius: "6px", padding: "0.2rem 0.55rem", fontWeight: 700, fontSize: "0.85rem" }}>
                      {mlrLevel.label}
                    </span>
                  </>
                ) : <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Unavailable</div>}
              </div>

              {/* Actual */}
              <div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                  Actual {ts && <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>· {ts.replace("T", " ").slice(0, 16)}</span>}
                </div>
                {actual && features?.actual_aqi != null ? (
                  <>
                    <div style={{ fontSize: "2.75rem", fontWeight: 800, color: actual.color, lineHeight: 1 }}>{features.actual_aqi}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0.2rem 0 0.4rem" }}>PM2.5 AQI</div>
                    <span style={{ display: "inline-block", background: actual.bg, color: actual.color, border: `1px solid ${actual.color}`, borderRadius: "6px", padding: "0.2rem 0.55rem", fontWeight: 700, fontSize: "0.85rem" }}>
                      {actual.label}
                    </span>
                  </>
                ) : (
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem", paddingTop: "0.25rem" }}>No data</div>
                )}
              </div>

            </div>

            {/* Model performance */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.85rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Model Performance:&nbsp;
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>RF (R² = 0.86)</span>
              &nbsp;|&nbsp;
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>MLR (R² = 0.61)</span>
              &nbsp;· Random Forest captures non-linear interactions (+0.25 R²)
            </div>
          </div>
        );
      })()}

      {/* Feature Importance */}
      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Feature Importance</h2>
        <img
          src={`${API}/static/feature_importance.png`}
          alt="Feature importance chart for PM2.5 prediction model"
          style={{ width: "100%", borderRadius: "8px" }}
        />
      </div>

      {/* Model Comparison */}
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Model Comparison (5-Fold CV)</h2>
        <img
          src={`${API}/static/model_comparison.png`}
          alt="R² comparison: Random Forest vs Linear Regression"
          style={{ width: "100%", borderRadius: "8px" }}
        />
      </div>

    </div>
  );
}
