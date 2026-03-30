import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      "https://data.tmd.go.th/api/Weather3Hours/V2/?uid=api&ukey=api12345&format=json",
      { next: { revalidate: 900 } } // cache for 15 minutes
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch weather data from TMD" },
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
