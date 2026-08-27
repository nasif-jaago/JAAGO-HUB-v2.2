import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Try querying public IP geo service
    const res = await fetch('http://ip-api.com/json', {
      headers: { 'User-Agent': 'JAAGO-HUB-Attendance/2.2' },
      signal: AbortSignal.timeout(4000),
    });
    const data = await res.json();

    if (data.status === 'success' && data.lat && data.lon) {
      return NextResponse.json({
        success: true,
        data: {
          latitude: data.lat,
          longitude: data.lon,
          accuracy: 50,
          city: data.city,
          country: data.country,
          source: 'network_ip',
        },
      });
    }

    // Default fallback to JAAGO HQ
    return NextResponse.json({
      success: true,
      data: {
        latitude: 23.789555,
        longitude: 90.408706,
        accuracy: 10,
        city: 'Dhaka',
        country: 'Bangladesh',
        source: 'office_default',
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      data: {
        latitude: 23.789555,
        longitude: 90.408706,
        accuracy: 10,
        city: 'Dhaka',
        country: 'Bangladesh',
        source: 'office_default',
      },
    });
  }
}
