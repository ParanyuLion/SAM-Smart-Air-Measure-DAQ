import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat") || "13.754";
  const lon = searchParams.get("lon") || "100.5014";
  const timezone = searchParams.get("timezone") || "Asia/Bangkok";

  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", lat);
    url.searchParams.set("longitude", lon);
    url.searchParams.set("timezone", timezone);
    url.searchParams.set("forecast_days", "7");
    url.searchParams.set(
      "current",
      "temperature_2m,relative_humidity_2m,rain,weather_code,wind_speed_10m,wind_direction_10m"
    );
    url.searchParams.set(
      "daily",
      "weather_code,temperature_2m_min,temperature_2m_max,wind_speed_10m_max,precipitation_probability_max,precipitation_sum,uv_index_max,wind_direction_10m_dominant"
    );
    url.searchParams.set(
      "hourly",
      "temperature_2m,relative_humidity_2m,rain,wind_speed_10m,wind_direction_10m"
    );

    const res = await fetch(url.toString(), {
      next: { revalidate: 900 }, // cache for 15 minutes
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch weather data from Open-Meteo" },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error fetching weather data" },
      { status: 500 }
    );
  }
}
