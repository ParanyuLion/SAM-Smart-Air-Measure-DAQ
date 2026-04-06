import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // Use ip-api.com for free IP-based geolocation (added timezone field)
    const res = await fetch("http://ip-api.com/json/?fields=lat,lon,city,regionName,country,timezone", {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to determine location" },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
