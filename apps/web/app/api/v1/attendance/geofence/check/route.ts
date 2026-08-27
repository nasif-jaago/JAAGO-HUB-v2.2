import { NextResponse } from 'next/server';
import { verifyGeofenceServerSide } from '@/lib/server-attendance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latStr = searchParams.get('latitude') || searchParams.get('lat');
    const lngStr = searchParams.get('longitude') || searchParams.get('lng');
    const accStr = searchParams.get('accuracy') || searchParams.get('acc');

    if (!latStr || !lngStr) {
      return NextResponse.json(
        { success: false, error: 'Missing latitude or longitude parameters' },
        { status: 400 }
      );
    }

    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lngStr);
    const accuracy = accStr ? parseFloat(accStr) : 10;

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { success: false, error: 'Invalid coordinate numbers' },
        { status: 400 }
      );
    }

    const result = await verifyGeofenceServerSide({
      latitude,
      longitude,
      accuracy,
    });

    return NextResponse.json({
      success: true,
      data: {
        isInsideGeofence: result.accepted,
        rejectionReason: result.rejectionReason || null,
        locationName: result.matchedLocationName || 'Authorized Office',
        locationId: result.matchedLocationId || null,
        distanceMeters: result.distanceMeters ?? null,
        allowedRadiusMeters: result.allowedRadiusMeters || 100,
        userCoordinates: {
          latitude,
          longitude,
          accuracy,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
